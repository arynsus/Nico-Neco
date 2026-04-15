import fs from 'fs/promises';
import yaml from 'js-yaml';
import { db, rowToCategory } from '../config/database';
import { ProxyNode, ServiceCategory, ClashConfig, ProxyGroup, RuleEntry } from '../types';
import { fetchProxiesForTier } from './proxyAggregator';
import { readProviderRules } from './ruleProviders';
import { getUserConfigFile, slugify } from './dataPaths';

/**
 * Resolve all rules for a category: merge cached provider rules + inline extraRules.
 */
async function resolveCategoryRules(category: ServiceCategory): Promise<RuleEntry[]> {
  const out: RuleEntry[] = [];

  for (const provider of (category.ruleProviders || [])) {
    const rules = await readProviderRules(category.id, provider.id);
    out.push(...rules);
  }

  out.push(...(category.extraRules || []));

  return out;
}

/**
 * Load service categories from SQLite.
 */
function loadCategories(): ServiceCategory[] {
  const rows = db.prepare('SELECT * FROM service_categories ORDER BY order_num').all() as any[];
  return rows.map(rowToCategory);
}

/**
 * Generate a complete Clash YAML configuration for a given user.
 */
export async function generateClashConfig(userId: string): Promise<string> {
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!userRow) throw new Error('User not found');

  const rawProxies = fetchProxiesForTier(userRow.tier_id);
  if (rawProxies.length === 0) {
    throw new Error('No proxies available for this tier');
  }

  const userUuid = userRow.subscription_token;
  const proxies = rawProxies.map((p) => {
    const proxy = { ...p };
    if (proxy.uuid === '__USER_UUID__') proxy.uuid = userUuid;
    if ((proxy as any).password === '__USER_UUID__') (proxy as any).password = userUuid;
    return proxy;
  });

  const categories = loadCategories();
  const resolvedRules = new Map<string, RuleEntry[]>();
  for (const cat of categories) {
    resolvedRules.set(cat.id, await resolveCategoryRules(cat));
  }

  const proxyNames = proxies.map((p) => p.name);
  const config = buildConfig(proxies, proxyNames, categories, resolvedRules);

  return yaml.dump(config, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
}

/**
 * Build config and write it to the on-disk user-configs cache as <slug>.yaml.
 */
export async function generateAndCacheUserConfig(userId: string): Promise<string> {
  const userRow = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
  if (!userRow) throw new Error('User not found');

  const yamlText = await generateClashConfig(userId);
  const slug = slugify(userRow.name || 'user');
  const file = getUserConfigFile(slug);
  await fs.writeFile(file, yamlText, 'utf-8');
  return slug;
}

function buildConfig(
  proxies: ProxyNode[],
  proxyNames: string[],
  categories: ServiceCategory[],
  resolvedRules: Map<string, RuleEntry[]>,
): ClashConfig {
  const cleanProxies = proxies.map((p) => {
    const clean = { ...p };
    delete (clean as Record<string, unknown>)['_sourceId'];
    delete (clean as Record<string, unknown>)['_sourceType'];
    return clean;
  });

  const proxyGroups = buildProxyGroups(proxyNames, categories);
  const rules = buildRules(categories, resolvedRules);

  return {
    port: 7890,
    'socks-port': 7891,
    mode: 'rule',
    'external-controller': '127.0.0.1:9090',
    ipv6: true,
    dns: {
      enable: true,
      ipv6: true,
      listen: '0.0.0.0:53',
      'enhanced-mode': 'redir-host',
      'default-nameserver': ['114.114.114.114', '8.8.8.8'],
      'fake-ip-range': '198.18.0.1/16',
      fallback: ['1.1.1.1', '8.8.8.8'],
      'fake-ip-filter': ['*.lan', 'localhost.ptlogin2.qq.com'],
      nameserver: ['114.114.114.114', '8.8.8.8'],
    },
    proxies: cleanProxies,
    'proxy-groups': proxyGroups,
    rules,
  };
}

function buildProxyGroups(proxyNames: string[], categories: ServiceCategory[]): ProxyGroup[] {
  const groups: ProxyGroup[] = [];

  groups.push({
    name: '最低延迟节点',
    type: 'url-test',
    proxies: [...proxyNames],
    url: 'http://www.gstatic.com/generate_204',
    interval: 300,
    tolerance: 50,
  });

  groups.push({
    name: '默认节点',
    type: 'select',
    proxies: ['最低延迟节点', ...proxyNames, 'DIRECT'],
  });

  for (const category of categories) {
    groups.push({
      name: category.name,
      type: 'select',
      proxies: ['默认节点', '最低延迟节点', ...proxyNames, 'DIRECT'],
    });
  }

  groups.push({
    name: '其他网站',
    type: 'select',
    proxies: ['DIRECT', '默认节点', '最低延迟节点', ...proxyNames],
  });

  return groups;
}

function buildRules(
  categories: ServiceCategory[],
  resolvedRules: Map<string, RuleEntry[]>,
): string[] {
  const rules: string[] = [];

  rules.push(
    'IP-CIDR,127.0.0.0/8,DIRECT',
    'IP-CIDR,192.168.0.0/16,DIRECT',
    'IP-CIDR,10.0.0.0/8,DIRECT',
    'IP-CIDR,172.16.0.0/12,DIRECT',
    'IP-CIDR,100.64.0.0/10,DIRECT',
    'IP-CIDR6,::1/128,DIRECT',
    'IP-CIDR6,fc00::/7,DIRECT',
    'IP-CIDR6,fe80::/10,DIRECT',
  );

  for (const category of categories) {
    const entries = resolvedRules.get(category.id) || [];
    for (const rule of entries) {
      rules.push(`${rule.type},${rule.value},${category.name}`);
    }
  }

  rules.push('GEOIP,CN,DIRECT');
  rules.push('MATCH,其他网站');

  return rules;
}

/**
 * Generates a config for preview purposes (with dummy proxies).
 */
export async function generatePreviewConfig(): Promise<string> {
  const categories = loadCategories();
  const resolvedRules = new Map<string, RuleEntry[]>();
  for (const cat of categories) {
    resolvedRules.set(cat.id, await resolveCategoryRules(cat));
  }

  const dummyProxies: ProxyNode[] = [
    { name: 'Example-HK-01', type: 'trojan', server: '0.0.0.0', port: 443, password: 'xxx' },
    { name: 'Example-US-01', type: 'vmess', server: '0.0.0.0', port: 443, uuid: 'xxx', alterId: 0, cipher: 'auto' },
  ];
  const proxyNames = dummyProxies.map((p) => p.name);

  const config = buildConfig(dummyProxies, proxyNames, categories, resolvedRules);

  return yaml.dump(config, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
}
