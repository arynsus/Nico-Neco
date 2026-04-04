import yaml from 'js-yaml';
import { db } from '../config/firebase';
import { ProxyNode, ServiceCategory, ClashConfig, ProxyGroup } from '../types';
import { fetchProxiesForTier } from './proxyAggregator';

/**
 * Generates a complete Clash YAML configuration for a given user.
 */
export async function generateClashConfig(userId: string): Promise<string> {
  // 1. Get user and tier
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) throw new Error('User not found');
  const user = userDoc.data()!;

  // 2. Fetch proxies allowed for this tier
  const proxies = await fetchProxiesForTier(user.tierId);
  if (proxies.length === 0) {
    throw new Error('No proxies available for this tier');
  }

  // 3. Get service categories (sorted by order)
  const categoriesSnap = await db.collection('serviceCategories').orderBy('order').get();
  const categories = categoriesSnap.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as ServiceCategory,
  );

  // 4. Build the config
  const proxyNames = proxies.map((p) => p.name);
  const config = buildConfig(proxies, proxyNames, categories);

  // 5. Serialize to YAML
  return yaml.dump(config, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
}

function buildConfig(
  proxies: ProxyNode[],
  proxyNames: string[],
  categories: ServiceCategory[],
): ClashConfig {
  // Clean proxy objects: remove internal fields
  const cleanProxies = proxies.map((p) => {
    const clean = { ...p };
    delete (clean as Record<string, unknown>)['_sourceId'];
    return clean;
  });

  // Build proxy groups
  const proxyGroups = buildProxyGroups(proxyNames, categories);

  // Build rules from categories
  const rules = buildRules(categories);

  return {
    port: 7890,
    'socks-port': 7891,
    'allow-lan': false,
    mode: 'rule',
    'log-level': 'info',
    'external-controller': '127.0.0.1:9090',
    dns: {
      enable: true,
      listen: '0.0.0.0:53',
      'enhanced-mode': 'fake-ip',
      'fake-ip-range': '198.18.0.1/16',
      nameserver: ['https://dns.alidns.com/dns-query', 'https://doh.pub/dns-query'],
      fallback: [
        'https://1.1.1.1/dns-query',
        'https://dns.google/dns-query',
        'tls://8.8.8.8:853',
      ],
      'fallback-filter': {
        geoip: true,
        'geoip-code': 'CN',
        ipcidr: ['240.0.0.0/4'],
      },
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

  // 1. "Auto Best" - url-test group that picks the fastest proxy
  groups.push({
    name: 'Auto Best',
    type: 'url-test',
    proxies: [...proxyNames],
    url: 'http://www.gstatic.com/generate_204',
    interval: 300,
    tolerance: 50,
  });

  // 2. "Global" - master selector for general proxied traffic
  groups.push({
    name: 'Global',
    type: 'select',
    proxies: ['Auto Best', ...proxyNames, 'DIRECT'],
  });

  // 3. Service category groups - each one is a selector
  for (const category of categories) {
    groups.push({
      name: category.name,
      type: category.groupType,
      proxies:
        category.groupType === 'select'
          ? ['Global', 'Auto Best', ...proxyNames, 'DIRECT']
          : [...proxyNames],
      ...(category.groupType === 'url-test' && {
        url: 'http://www.gstatic.com/generate_204',
        interval: 300,
      }),
      ...(category.groupType === 'fallback' && {
        url: 'http://www.gstatic.com/generate_204',
        interval: 300,
      }),
    });
  }

  // 4. "Fallback" - the final catch-all selector, defaults to DIRECT
  groups.push({
    name: 'Fallback',
    type: 'select',
    proxies: ['DIRECT', 'Global', 'Auto Best', ...proxyNames],
  });

  return groups;
}

function buildRules(categories: ServiceCategory[]): string[] {
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

  // Service category rules
  for (const category of categories) {
    for (const rule of category.rules) {
      rules.push(`${rule.type},${rule.value},${category.name}`);
    }
  }

  // China-direct rules
  rules.push('GEOIP,CN,DIRECT');

  // Final catch-all
  rules.push('MATCH,Fallback');

  return rules;
}

/**
 * Generates a config for preview purposes (with dummy proxies).
 */
export async function generatePreviewConfig(): Promise<string> {
  const categoriesSnap = await db.collection('serviceCategories').orderBy('order').get();
  const categories = categoriesSnap.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as ServiceCategory,
  );

  const dummyProxies: ProxyNode[] = [
    { name: 'Example-HK-01', type: 'trojan', server: '0.0.0.0', port: 443, password: 'xxx' },
    { name: 'Example-US-01', type: 'vmess', server: '0.0.0.0', port: 443, uuid: 'xxx', alterId: 0, cipher: 'auto' },
  ];
  const proxyNames = dummyProxies.map((p) => p.name);

  const config = buildConfig(dummyProxies, proxyNames, categories);

  return yaml.dump(config, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
}
