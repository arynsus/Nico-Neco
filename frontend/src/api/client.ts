import { getIdToken } from '../firebase';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getIdToken();
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

// Rules / Service Categories
export const rulesApi = {
  list: () => request<any[]>('/rules'),
  get: (id: string) => request<any>(`/rules/${id}`),
  create: (data: any) => request<any>('/rules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/rules/${id}`, { method: 'DELETE' }),
  preview: () => request<string>('/rules/config/preview'),
};
