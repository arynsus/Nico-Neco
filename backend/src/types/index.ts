export interface ProxyNode {
  name: string;
  type: 'ss' | 'ssr' | 'vmess' | 'trojan' | 'snell' | 'socks5' | 'http';
  server: string;
  port: number;
  [key: string]: unknown;
}

export interface Source {
  id: string;
  name: string;
  type: 'subscription' | 'marzban';
  url: string;
  credentials?: { username: string; password: string };
  isActive: boolean;
  lastFetched: string | null;
  proxyCount: number;
  cachedProxies: ProxyNode[];
  tags: string[];
  createdAt: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  ruleProviders: RuleProvider[];
  extraRules: RuleEntry[];
  order: number;
  createdAt: string;
}

export interface RuleProvider {
  id: string;
  name: string;
  url: string;
}

export type RuleType =
  | 'DOMAIN'
  | 'DOMAIN-SUFFIX'
  | 'DOMAIN-KEYWORD'
  | 'GEOIP'
  | 'IP-CIDR'
  | 'IP-CIDR6'
  | 'SRC-IP-CIDR'
  | 'SRC-PORT'
  | 'DST-PORT'
  | 'PROCESS-NAME'
  | 'PROCESS-PATH'
  | 'IPSET'
  | 'RULE-SET'
  | 'SCRIPT'
  | 'MATCH';

export interface RuleEntry {
  type: RuleType;
  value: string;
}

export interface Tier {
  id: string;
  name: string;
  description: string;
  allowedSourceIds: string[];
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  tierId: string;
  subscriptionToken: string;
  isActive: boolean;
  note: string;
  createdAt: string;
}

export interface ClashConfig {
  port: number;
  'socks-port': number;
  'allow-lan': boolean;
  mode: string;
  'log-level': string;
  'external-controller': string;
  dns: Record<string, unknown>;
  proxies: ProxyNode[];
  'proxy-groups': ProxyGroup[];
  rules: string[];
}

export interface ProxyGroup {
  name: string;
  type: 'select' | 'url-test' | 'fallback' | 'load-balance';
  proxies: string[];
  url?: string;
  interval?: number;
  tolerance?: number;
}

export interface Admin {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface AppSettings {
  clashBase: {
    port: number;
    socksPort: number;
    allowLan: boolean;
    mode: string;
    logLevel: string;
    externalController: string;
  };
  dns: {
    enable: boolean;
    nameserver: string[];
    fallback: string[];
  };
}
