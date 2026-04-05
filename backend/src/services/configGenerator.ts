import fs from 'fs/promises';
import yaml from 'js-yaml';
import { db } from '../config/firebase';
import { ProxyNode, ServiceCategory, ClashConfig, ProxyGroup, RuleEntry } from '../types';
import { fetchProxiesForTier } from './proxyAggregator';
import { readProviderRules } from './ruleProviders';
import { getUserConfigFile, slugify } from './dataPaths';

/**
 * Resolve all rules for a category: merge cached provider rules + inline extraRules.
 */
async function resolveCategoryRules(category: ServiceCategory): Promise<RuleEntry[]> {
  const out: RuleEntry[] = [];

  const providers = category.ruleProviders || [];
  for (const provider of providers) {
    const rules = await readProviderRules(category.id, provider.id);
    out.push(...rules);
  }

  const extras = category.extraRules || [];
  out.push(...extras);

  return out;
}

/**
 * Load service categories from Firestore, tolerating legacy documents that
 * stored rules under `rules` and `groupType`/`isBuiltIn` fields.
 */
async function loadCategories(): Promise<ServiceCategory[]> {
  const snap = await db.collection('serviceCategories').orderBy('order').get();
  return snap.docs.map((doc) => {
    const raw = doc.data() as Record<string, unknown>;
    const legacyRules = Array.isArray(raw.rules) ? (raw.rules as RuleEntry[]) : [];
    const extraRules = Array.isArray(raw.extraRules)
      ? (raw.extraRules as RuleEntry[])
      : legacyRules;
    return {
      id: doc.id,
      name: (raw.name as string) || '',
      icon: (raw.icon as string) || 'category',
      description: (raw.description as string) || '',
      ruleProviders: Array.isArray(raw.ruleProviders) ? (raw.ruleProviders as any[]) : [],
      extraRules,
      order: typeof raw.order === 'number' ? raw.order : 99,
      createdAt: (raw.createdAt as string) || '',
    };
  });
}

/**
 * Generate a complete Clash YAML configuration for a given user.
 */
export async function generateClashConfig(userId: string): Promise<string> {
  // 1. Get user and tier
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) throw new Error('User not found');
  const user = userDoc.data()!;

  // 2. Fetch proxies allowed for this tier
  const rawProxies = await fetchProxiesForTier(user.tierId);
  if (rawProxies.length === 0) {
    throw new Error('No proxies available for this tier');
  }

  // Fill in user UUID for self-hosted (Marzban) proxies
  const userUuid = user.subscriptionToken;
  const proxies = rawProxies.map((p) => {
    const proxy = { ...p };
    if (proxy.uuid === '__USER_UUID__') proxy.uuid = userUuid;
    if ((proxy as any).password === '__USER_UUID__') (proxy as any).password = userUuid;
    return proxy;
  });

  // 3. Get service categories + resolve their rules from disk
  const categories = await loadCategories();
  const resolvedRules = new Map<string, RuleEntry[]>();
  for (const cat of categories) {
    resolvedRules.set(cat.id, await resolveCategoryRules(cat));
  }

  // 4. Build the config
  const proxyNames = proxies.map((p) => p.name);
  const config = buildConfig(proxies, proxyNames, categories, resolvedRules);

  // 5. Serialize to YAML
  return yaml.dump(config, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
}

/**
 * Build config and write it to the on-disk user-configs cache as <slug>.yaml.
 * Returns the slug used.
 */
export async function generateAndCacheUserConfig(userId: string): Promise<string> {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) throw new Error('User not found');
  const user = userDoc.data()!;
  const yamlText = await generateClashConfig(userId);

  const slug = slugify(user.name || 'user');
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
  // Clean proxy objects: remove internal fields
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
    ipv6: false,
    dns: {
      enable: true,
      listen: '0.0.0.0:53',
      'default-nameserver': [
        '114.114.114.114',
        '8.8.8.8'
      ],
      'fake-ip-range': '198.18.0.1/16',
      fallback: [
        '1.1.1.1',
        '8.8.8.8'
      ],
      'fake-ip-filter': [
        '*.lan',
        'localhost.ptlogin2.qq.com'
      ],
      nameserver: [
        '114.114.114.114',
        '8.8.8.8'
      ]
    },
    proxies: cleanProxies,
    'proxy-groups': proxyGroups,
    rules,
  };
}

function buildProxyGroups(
  proxyNames: string[],
  categories: ServiceCategory[],
): ProxyGroup[] {
  const groups: ProxyGroup[] = [];

  // 1. "最低延迟节点" - url-test group that picks the fastest proxy
  groups.push({
    name: '最低延迟节点',
    type: 'url-test',
    proxies: [...proxyNames],
    url: 'http://www.gstatic.com/generate_204',
    interval: 300,
    tolerance: 50,
  });

  // 2. "默认节点" - master selector for general proxied traffic
  groups.push({
    name: '默认节点',
    type: 'select',
    proxies: ['最低延迟节点', ...proxyNames, 'DIRECT'],
  });

  // 3. One select group per service category
  for (const category of categories) {
    groups.push({
      name: category.name,
      type: 'select',
      proxies: ['默认节点', '最低延迟节点', ...proxyNames, 'DIRECT'],
    });
  }

  // 4. "其他网站" - final catch-all selector, defaults to DIRECT
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

  // Private/local network rules first
  rules.push(
    'IP-CIDR,127.0.0.0/8,DIRECT',
    'IP-CIDR,192.168.0.0/16,DIRECT',
    'IP-CIDR,10.0.0.0/8,DIRECT',
    'IP-CIDR,172.16.0.0/12,DIRECT',
    'IP-CIDR,100.64.0.0/10,DIRECT',
    'IP-CIDR6,::1/128,DIRECT',
    'IP-CIDR6,fc00::/7,DIRECT',
  );

  // Service category rules (merged providers + extraRules)
  for (const category of categories) {
    const entries = resolvedRules.get(category.id) || [];
    for (const rule of entries) {
      rules.push(`${rule.type},${rule.value},${category.name}`);
    }
  }

  // China-direct rules
  rules.push('GEOIP,CN,DIRECT');

  // Final catch-all
  rules.push('MATCH,其他网站');

  return rules;
}

/**
 * Generates a config for preview purposes (with dummy proxies).
 */
export async function generatePreviewConfig(): Promise<string> {
  const categories = await loadCategories();
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
