import { ProxyNode } from '../types';
import { parseClashYaml } from './sourceParser';

/**
 * Recursively strip undefined values from an object (Firestore rejects them).
 */
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined) as unknown as T;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value !== undefined) {
      clean[key] = stripUndefined(value);
    }
  }
  return clean as T;
}

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

interface MarzbanUser {
  username: string;
  status: string;
  proxies: Record<string, { id?: string; flow?: string }>;
  inbounds: Record<string, string[]>;
  subscription_url?: string;
  links?: string[];
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
   * Fetches proxy nodes from a Marzban instance by constructing from hosts + inbounds.
   * The uuid/password fields are left as placeholders — they get filled per-user at config time.
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
   * Fetch proxies via a specific Marzban user's Clash subscription.
   * This gives us fully populated proxies (with uuid, passwords, etc).
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

  // ---------- User management ----------

  async getUser(username: string): Promise<MarzbanUser | null> {
    try {
      return await this.request<MarzbanUser>(`/api/user/${username}`);
    } catch {
      return null;
    }
  }

  async listUsers(): Promise<MarzbanUser[]> {
    const data = await this.request<{ users: MarzbanUser[] }>('/api/users?limit=1000');
    return data.users || [];
  }

  /**
   * Create a user on the Marzban panel.
   * @param username - username to create
   * @param uuid - the NicoNeco subscription token to use as the user's uuid/password
   * @param inbounds - inbound mapping (fetched from getInbounds, protocol -> tags)
   */
  async createUser(username: string, uuid: string, inbounds?: Record<string, string[]>): Promise<MarzbanUser> {
    // If inbounds not provided, fetch them
    if (!inbounds) {
      const ib = await this.getInbounds();
      inbounds = {};
      for (const [protocol, list] of Object.entries(ib)) {
        inbounds[protocol] = list.map((i) => i.tag);
      }
    }

    // Build proxies object: for each protocol, provide the uuid
    const proxies: Record<string, { id?: string; password?: string; flow?: string }> = {};
    for (const protocol of Object.keys(inbounds)) {
      if (protocol === 'vmess' || protocol === 'vless') {
        proxies[protocol] = { id: uuid };
      } else if (protocol === 'trojan') {
        proxies[protocol] = { password: uuid };
      } else if (protocol === 'shadowsocks') {
        proxies[protocol] = { password: uuid };
      }
    }

    return this.request<MarzbanUser>('/api/user', {
      method: 'POST',
      body: JSON.stringify({
        username,
        proxies,
        inbounds,
        status: 'active',
        data_limit: 0,
        expire: 0,
      }),
    });
  }

  /**
   * Modify an existing user's proxy credentials to match a specific uuid.
   */
  async modifyUser(username: string, uuid: string): Promise<MarzbanUser> {
    // First get the user to know their current inbounds/proxies
    const existing = await this.getUser(username);
    if (!existing) throw new Error(`User ${username} not found on Marzban`);

    const proxies: Record<string, { id?: string; password?: string; flow?: string }> = {};
    for (const protocol of Object.keys(existing.proxies)) {
      if (protocol === 'vmess' || protocol === 'vless') {
        proxies[protocol] = { id: uuid, ...(existing.proxies[protocol]?.flow ? { flow: existing.proxies[protocol].flow } : {}) };
      } else if (protocol === 'trojan') {
        proxies[protocol] = { password: uuid };
      } else if (protocol === 'shadowsocks') {
        proxies[protocol] = { password: uuid };
      }
    }

    return this.request<MarzbanUser>(`/api/user/${username}`, {
      method: 'PUT',
      body: JSON.stringify({
        proxies,
        status: 'active',
      }),
    });
  }

  /**
   * Delete a user from the Marzban panel.
   */
  async deleteUser(username: string): Promise<void> {
    await this.request(`/api/user/${username}`, { method: 'DELETE' });
  }

  private buildProxyFromHost(host: MarzbanHost, inbound: MarzbanInbound): ProxyNode | null {
    const name = host.remark || `${inbound.protocol}-${host.address}`;
    const server = host.address;
    const port = host.port || inbound.port;

    switch (inbound.protocol) {
      case 'vmess': {
        const wsOpts: Record<string, unknown> = { path: host.path || '/' };
        if (host.host) wsOpts.headers = { Host: host.host };

        return stripUndefined({
          name,
          type: 'vmess' as const,
          server,
          port,
          uuid: '__USER_UUID__',
          alterId: 0,
          cipher: 'auto',
          udp: true,
          tls: host.security === 'tls',
          servername: host.sni || server,
          network: inbound.network || 'tcp',
          ...(inbound.network === 'ws' && { 'ws-opts': wsOpts }),
        });
      }

      case 'trojan':
        return {
          name,
          type: 'trojan',
          server,
          port,
          password: '__USER_UUID__',
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
          password: '__USER_UUID__',
        };

      default:
        return null;
    }
  }
}
