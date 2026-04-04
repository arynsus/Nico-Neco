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
  tags: string[];
  createdAt: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  groupType: 'select' | 'url-test' | 'fallback' | 'load-balance';
  description: string;
  rules: RuleEntry[];
  order: number;
  isBuiltIn: boolean;
  createdAt: string;
}

export interface RuleEntry {
  type: 'DOMAIN' | 'DOMAIN-SUFFIX' | 'DOMAIN-KEYWORD' | 'GEOIP' | 'IP-CIDR' | 'IP-CIDR6' | 'DST-PORT' | 'PROCESS-NAME';
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
