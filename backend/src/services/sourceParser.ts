import yaml from 'js-yaml';
import { ProxyNode } from '../types';

/**
 * Fetches and parses a Clash subscription YAML URL into proxy nodes.
 */
export async function fetchSubscriptionProxies(url: string): Promise<ProxyNode[]> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'clash' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch subscription: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  return parseClashYaml(text);
}

/**
 * Parses a Clash YAML config string and extracts proxy nodes.
 */
export function parseClashYaml(yamlText: string): ProxyNode[] {
  const config = yaml.load(yamlText) as Record<string, unknown>;
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid YAML configuration');
  }

  const proxies = config.proxies as ProxyNode[] | undefined;
  if (!Array.isArray(proxies)) {
    return [];
  }

  return proxies.filter((p) => p && p.name && p.type && p.server && p.port);
}

/**
 * Decodes a base64-encoded subscription (common for v2ray-style links)
 * and converts them to Clash proxy node format.
 */
export function decodeBase64Subscription(encoded: string): ProxyNode[] {
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const lines = decoded.split('\n').filter(Boolean);
  const proxies: ProxyNode[] = [];

  for (const line of lines) {
    const proxy = parseShareLink(line.trim());
    if (proxy) proxies.push(proxy);
  }

  return proxies;
}

function parseShareLink(link: string): ProxyNode | null {
  if (link.startsWith('vmess://')) {
    return parseVmessLink(link);
  }
  if (link.startsWith('trojan://')) {
    return parseTrojanLink(link);
  }
  if (link.startsWith('ss://')) {
    return parseShadowsocksLink(link);
  }
  return null;
}

function parseVmessLink(link: string): ProxyNode | null {
  try {
    const b64 = link.replace('vmess://', '');
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    return {
      name: json.ps || `vmess-${json.add}`,
      type: 'vmess',
      server: json.add,
      port: parseInt(json.port, 10),
      uuid: json.id,
      alterId: parseInt(json.aid || '0', 10),
      cipher: 'auto',
      tls: json.tls === 'tls',
      'skip-cert-verify': false,
      servername: json.sni || json.host || '',
      network: json.net || 'tcp',
      ...(json.net === 'ws' && {
        'ws-opts': {
          path: json.path || '/',
          headers: json.host ? { Host: json.host } : undefined,
        },
      }),
    };
  } catch {
    return null;
  }
}

function parseTrojanLink(link: string): ProxyNode | null {
  try {
    const url = new URL(link);
    const name = decodeURIComponent(url.hash.replace('#', '')) || `trojan-${url.hostname}`;
    return {
      name,
      type: 'trojan',
      server: url.hostname,
      port: parseInt(url.port, 10),
      password: url.username,
      sni: url.searchParams.get('sni') || url.hostname,
      'skip-cert-verify': false,
    };
  } catch {
    return null;
  }
}

function parseShadowsocksLink(link: string): ProxyNode | null {
  try {
    const stripped = link.replace('ss://', '');
    const [encoded, rest] = stripped.split('#');
    const name = rest ? decodeURIComponent(rest) : '';

    let method: string, password: string, server: string, port: number;

    if (encoded.includes('@')) {
      const [userinfo, hostport] = encoded.split('@');
      const decoded = Buffer.from(userinfo, 'base64').toString('utf-8');
      [method, password] = decoded.split(':');
      const [h, p] = hostport.split(':');
      server = h;
      port = parseInt(p, 10);
    } else {
      const decoded = Buffer.from(encoded.split('?')[0], 'base64').toString('utf-8');
      const match = decoded.match(/^(.+?):(.+?)@(.+?):(\d+)$/);
      if (!match) return null;
      [, method, password, server, port] = match as unknown as [string, string, string, string, number];
      port = parseInt(String(port), 10);
    }

    return {
      name: name || `ss-${server}`,
      type: 'ss',
      server,
      port,
      cipher: method,
      password,
    };
  } catch {
    return null;
  }
}
