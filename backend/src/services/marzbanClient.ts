import { ProxyNode } from '../types';
import { parseClashYaml } from './sourceParser';

interface MarzbanTokenResponse {
  access_token: string;
  token_type: string;
}

interface MarzbanHost {
  remark: string;
  address: string;
  port: number | null;
  sni: string;
  host: string;
  path: string;
  security: string;
  alpn: string;
  fingerprint: string;
  is_disabled: boolean;
}

interface MarzbanInbound {
  tag: string;
  protocol: string;
  network: string;
  tls: string;
  port: number;
}

export class MarzbanClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(
    baseUrl: string,
    private username: string,
    private password: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async authenticate(): Promise<void> {
    const params = new URLSearchParams();
    params.append('username', this.username);
    params.append('password', this.password);
    params.append('grant_type', 'password');

    const res = await fetch(`${this.baseUrl}/api/admin/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`Marzban auth failed: ${res.status}`);
    }

    const data = (await res.json()) as MarzbanTokenResponse;
    this.token = data.access_token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.token) {
      await this.authenticate();
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (res.status === 401) {
      await this.authenticate();
      const retry = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      if (!retry.ok) throw new Error(`Marzban request failed: ${retry.status}`);
      return retry.json() as T;
    }

    if (!res.ok) {
      throw new Error(`Marzban request failed: ${res.status}`);
    }

    return res.json() as T;
  }

  async getHosts(): Promise<Record<string, MarzbanHost[]>> {
    return this.request('/api/hosts');
  }

  async getInbounds(): Promise<Record<string, MarzbanInbound[]>> {
    return this.request('/api/inbounds');
  }

  /**
   * Fetches proxy nodes from a Marzban instance by using a temporary user's
   * Clash subscription, or by constructing proxies from hosts + inbounds info.
   */
  async getProxyNodes(): Promise<ProxyNode[]> {
    const [hosts, inbounds] = await Promise.all([this.getHosts(), this.getInbounds()]);

    const proxies: ProxyNode[] = [];

    for (const [tag, hostList] of Object.entries(hosts)) {
      const inboundList = Object.values(inbounds).flat();
      const inbound = inboundList.find((ib) => ib.tag === tag);
      if (!inbound) continue;

      for (const host of hostList) {
        if (host.is_disabled) continue;

        const proxy = this.buildProxyFromHost(host, inbound);
        if (proxy) proxies.push(proxy);
      }
    }

    return proxies;
  }

  /**
   * Alternative: fetch proxies via a Marzban user subscription endpoint
   * (if you have a known user token).
   */
  async getProxiesViaSubscription(userToken: string): Promise<ProxyNode[]> {
    const res = await fetch(`${this.baseUrl}/sub/${userToken}/clash`, {
      headers: { 'User-Agent': 'clash' },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Marzban subscription: ${res.status}`);
    }

    const text = await res.text();
    return parseClashYaml(text);
  }

  private buildProxyFromHost(host: MarzbanHost, inbound: MarzbanInbound): ProxyNode | null {
    const name = host.remark || `${inbound.protocol}-${host.address}`;
    const server = host.address;
    const port = host.port || inbound.port;

    switch (inbound.protocol) {
      case 'vmess':
        return {
          name,
          type: 'vmess',
          server,
          port,
          uuid: '', // UUID comes from user-level config; this will be filled via subscription
          alterId: 0,
          cipher: 'auto',
          tls: host.security === 'tls',
          servername: host.sni || server,
          network: inbound.network || 'tcp',
          ...(inbound.network === 'ws' && {
            'ws-opts': {
              path: host.path || '/',
              headers: host.host ? { Host: host.host } : undefined,
            },
          }),
        };

      case 'trojan':
        return {
          name,
          type: 'trojan',
          server,
          port,
          password: '', // Filled via subscription
          sni: host.sni || server,
          'skip-cert-verify': false,
          ...(inbound.network === 'ws' && {
            network: 'ws',
            'ws-opts': { path: host.path || '/' },
          }),
        };

      case 'vless':
        // Clash doesn't support VLESS natively; skip or handle via Clash.Meta
        return null;

      case 'shadowsocks':
        return {
          name,
          type: 'ss',
          server,
          port,
          cipher: 'chacha20-ietf-poly1305',
          password: '', // Filled via subscription
        };

      default:
        return null;
    }
  }
}
