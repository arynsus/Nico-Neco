import { useEffect, useState } from 'react';
import { sourcesApi, usersApi, tiersApi, rulesApi } from '../api/client';

function Icon({ name, filled }: { name: string; filled?: boolean }) {
  return (
    <span
      className="material-symbols-outlined"
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}

interface Stats {
  sources: number;
  users: number;
  tiers: number;
  categories: number;
  activeUsers: number;
  totalProxies: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    sources: 0, users: 0, tiers: 0, categories: 0, activeUsers: 0, totalProxies: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sources, users, tiers, categories] = await Promise.all([
          sourcesApi.list(),
          usersApi.list(),
          tiersApi.list(),
          rulesApi.list(),
        ]);

        const activeUsers = users.filter((u: any) => u.isActive).length;
        const totalProxies = sources.reduce((sum: number, s: any) => sum + (s.proxyCount || 0), 0);

        setStats({
          sources: sources.length,
          users: users.length,
          tiers: tiers.length,
          categories: categories.length,
          activeUsers,
          totalProxies,
        });
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-tertiary animate-pulse text-4xl">pets</span>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-12">
        <span className="page-subtitle">Overview</span>
        <h2 className="page-title">
          Your <span className="text-primary italic">Brew</span> at a Glance
        </h2>
        <p className="text-on-surface-variant mt-3 max-w-md">
          Monitor your proxy network, manage users, and keep everything running smoothly.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Large card: Network Capacity */}
        <div className="col-span-1 md:col-span-2 bg-surface-container-low rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="flex-1 relative z-10">
            <h3 className="text-2xl font-bold mb-2">Network Capacity</h3>
            <p className="text-on-surface-variant text-sm mb-6">
              {stats.totalProxies} proxies from {stats.sources} source{stats.sources !== 1 ? 's' : ''}, serving {stats.activeUsers} active user{stats.activeUsers !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <div className="chip-primary">
                  <Icon name="bolt" /> {stats.totalProxies} Proxies
                </div>
                <div className="chip-secondary">
                  <Icon name="group" /> {stats.users} Users
                </div>
              </div>
            </div>
          </div>
          <div className="w-full md:w-48 h-32 bg-primary-container rounded-[1rem] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent" />
            <Icon name="monitoring" />
            <div className="absolute bottom-4 left-4 right-4 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: stats.totalProxies > 0 ? '66%' : '0%' }}
              />
            </div>
          </div>
        </div>

        {/* Categories card */}
        <div className="bg-tertiary-container rounded-xl p-8 flex flex-col justify-between relative overflow-hidden">
          <Icon name="route" />
          <div className="mt-4">
            <div className="text-3xl font-black text-on-tertiary-container">{stats.categories}</div>
            <div className="text-sm font-medium text-on-tertiary-container/80">Routing Categories</div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <span className="material-symbols-outlined text-[120px]">pets</span>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { icon: 'cloud_sync', label: 'Sources', value: stats.sources, color: 'primary' },
          { icon: 'group', label: 'Total Users', value: stats.users, color: 'secondary' },
          { icon: 'coffee', label: 'Roast Tiers', value: stats.tiers, color: 'tertiary' },
          { icon: 'person_check', label: 'Active Users', value: stats.activeUsers, color: 'primary' },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-${stat.color}-container flex items-center justify-center`}>
              <span className={`material-symbols-outlined text-${stat.color}`}>{stat.icon}</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-on-surface">{stat.value}</div>
              <div className="text-xs text-on-surface-variant font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-12">
        <h3 className="text-lg font-bold text-on-surface mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/sources" className="card card-hover flex items-center gap-4 cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center">
              <Icon name="add_circle" />
            </div>
            <div>
              <div className="font-semibold text-on-surface">Add Source</div>
              <div className="text-xs text-on-surface-variant">Connect a subscription or Marzban instance</div>
            </div>
          </a>
          <a href="/users" className="card card-hover flex items-center gap-4 cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center">
              <Icon name="person_add" />
            </div>
            <div>
              <div className="font-semibold text-on-surface">Add User</div>
              <div className="text-xs text-on-surface-variant">Create a new subscription user</div>
            </div>
          </a>
          <a href="/rules" className="card card-hover flex items-center gap-4 cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-tertiary-container flex items-center justify-center">
              <Icon name="tune" />
            </div>
            <div>
              <div className="font-semibold text-on-surface">Edit Rules</div>
              <div className="text-xs text-on-surface-variant">Manage routing categories and rules</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
