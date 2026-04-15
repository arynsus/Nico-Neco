import { getToken } from '../auth';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.headers.get('content-type')?.includes('text/yaml')) {
    return (await res.text()) as unknown as T;
  }

  return res.json();
}

// Sources
export const sourcesApi = {
  list: () => request<any[]>('/sources'),
  get: (id: string) => request<any>(`/sources/${id}`),
  create: (data: any) => request<any>('/sources', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/sources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/sources/${id}`, { method: 'DELETE' }),
  test: (id: string) => request<{ success: boolean; proxyCount: number }>(`/sources/${id}/test`, { method: 'POST' }),
  getProxies: (id: string) => request<any[]>(`/sources/${id}/proxies`),
  updateProxies: (id: string, proxies: any[]) =>
    request<{ success: boolean; proxyCount: number }>(`/sources/${id}/proxies`, { method: 'PUT', body: JSON.stringify({ proxies }) }),
  syncUsers: (id: string) => request<{ created: number; updated: number; deleted: number; errors: string[] }>(`/sources/${id}/sync-users`, { method: 'POST' }),
};

// Tiers
export const tiersApi = {
  list: () => request<any[]>('/tiers'),
  create: (data: any) => request<any>('/tiers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/tiers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/tiers/${id}`, { method: 'DELETE' }),
};

// Users
export const usersApi = {
  list: (params?: { tierId?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.tierId) query.set('tierId', params.tierId);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<any[]>(`/users${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<any>(`/users/${id}`),
  create: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
  regenerateToken: (id: string) => request<{ subscriptionToken: string }>(`/users/${id}/regenerate-token`, { method: 'POST' }),
};

// Auth / Admin
export const authApi = {
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// Rules / Service Categories
export const rulesApi = {
  list: () => request<any[]>('/rules'),
  get: (id: string) => request<any>(`/rules/${id}`),
  create: (data: any) => request<any>('/rules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/rules/${id}`, { method: 'DELETE' }),
  preview: () => request<string>('/rules/config/preview'),
  // Rule providers (external URL refs)
  addProvider: (categoryId: string, data: { name?: string; url: string }) =>
    request<any>(`/rules/${categoryId}/providers`, { method: 'POST', body: JSON.stringify(data) }),
  fetchProvider: (categoryId: string, providerId: string) =>
    request<any>(`/rules/${categoryId}/providers/${providerId}/fetch`, { method: 'POST' }),
  removeProvider: (categoryId: string, providerId: string) =>
    request<void>(`/rules/${categoryId}/providers/${providerId}`, { method: 'DELETE' }),
  // Local network rules (always DIRECT)
  getLocalNetwork: () => request<any[]>('/rules/local-network'),
  updateLocalNetwork: (rules: any[]) =>
    request<any[]>('/rules/local-network', { method: 'PUT', body: JSON.stringify(rules) }),
  resetLocalNetwork: () =>
    request<any[]>('/rules/local-network/reset', { method: 'POST' }),
};

// Cached user config files
export const configsApi = {
  status: () => request<any[]>('/configs/status'),
  rebuildAll: () =>
    request<{ total: number; success: number; failed: number; results: any[] }>(
      '/configs/rebuild-all',
      { method: 'POST' },
    ),
  rebuildOne: (userId: string) =>
    request<{ success: boolean; slug: string; filename: string; size: number; modifiedAt: string }>(
      `/configs/rebuild/${userId}`,
      { method: 'POST' },
    ),
};
