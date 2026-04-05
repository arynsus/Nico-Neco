import { useEffect, useState } from 'react';
import { usersApi, tiersApi } from '../api/client';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  tierId: string;
  subscriptionToken: string;
  isActive: boolean;
  note: string;
}

interface Tier {
  id: string;
  name: string;
  icon: string;
  color: string;
}

function Icon({ name }: { name: string }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

const colorMap: Record<string, string> = {
  primary: 'chip-primary',
  secondary: 'chip-secondary',
  tertiary: 'chip-tertiary',
  outline: 'chip-outline',
};

export default function Users() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [search, setSearch] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', email: '', tierId: '', note: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [u, t] = await Promise.all([usersApi.list(), tiersApi.list()]);
      setUsers(u);
      setTiers(t);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getTier(tierId: string) {
    return tiers.find((t) => t.id === tierId);
  }

  function getSubUrl(token: string) {
    return `${window.location.origin}/sub/${token}`;
  }

  async function copySubUrl(token: string) {
    await navigator.clipboard.writeText(getSubUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', email: '', tierId: tiers[0]?.id || '', note: '' });
    setShowForm(true);
  }

  function openEdit(user: UserRecord) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, tierId: user.tierId, note: user.note });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await usersApi.update(editing.id, form);
      } else {
        await usersApi.create(form);
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this user?')) return;
    try {
      await usersApi.delete(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleToggle(user: UserRecord) {
    try {
      await usersApi.update(user.id, { isActive: !user.isActive });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleRegenToken(id: string) {
    if (!confirm('Regenerate subscription token? The old URL will stop working.')) return;
    try {
      await usersApi.regenerateToken(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-tertiary animate-pulse text-4xl">pets</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <span className="page-subtitle">User Management</span>
          <h2 className="page-title">
            Curated <span className="text-primary italic">Members</span>
          </h2>
          <p className="text-on-surface-variant mt-3 max-w-md">
            Manage subscription users and their access tiers.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary w-fit">
          <Icon name="person_add" />
          <span>Add User</span>
        </button>
      </div>

      {/* Search / filter toolbar */}
      <div className="bg-surface-container rounded-[1rem] p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:min-w-[320px]">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              className="input-field !pl-12"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="text-sm font-medium text-on-surface-variant">
          Showing <span className="text-on-surface font-bold">{filtered.length}</span> of{' '}
          <span className="text-on-surface font-bold">{users.length}</span> members
        </div>
      </div>

      {/* User list */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="card text-center py-12 text-on-surface-variant">
            <Icon name="group_off" />
            <p className="mt-2">
              {users.length === 0 ? 'No users yet. Add your first member.' : 'No users match your search.'}
            </p>
          </div>
        )}

        {filtered.map((user) => {
          const tier = getTier(user.tierId);
          return (
            <div
              key={user.id}
              className="card card-hover flex flex-col lg:flex-row lg:items-center gap-6"
            >
              <div className="flex items-center gap-5 flex-1">
                <div className="w-14 h-14 rounded-xl bg-primary-container flex items-center justify-center text-primary font-bold text-xl shrink-0 relative">
                  {user.name[0]?.toUpperCase()}
                  <div className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-surface-container ${
                    user.isActive ? 'bg-tertiary' : 'bg-outline-variant'
                  }`} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-lg font-bold text-on-surface tracking-tight">{user.name}</h4>
                  <p className="text-on-surface-variant text-sm truncate">{user.email || 'No email'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 flex-[2]">
                <div>
                  <p className="label-text">Tier</p>
                  <div className={colorMap[tier?.color || 'outline'] || 'chip-outline'}>
                    <Icon name={tier?.icon || 'coffee'} />
                    {tier?.name || 'Unknown'}
                  </div>
                </div>
                <div>
                  <p className="label-text">Subscription</p>
                  <button
                    onClick={() => copySubUrl(user.subscriptionToken)}
                    className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Icon name={copiedToken === user.subscriptionToken ? 'check' : 'content_copy'} />
                    {copiedToken === user.subscriptionToken ? 'Copied!' : 'Copy URL'}
                  </button>
                </div>
                <div className="hidden lg:block">
                  <p className="label-text">Status</p>
                  <div className={`flex items-center gap-2 text-sm font-semibold ${
                    user.isActive ? 'text-tertiary' : 'text-error'
                  }`}>
                    <span className={`status-dot ${user.isActive ? 'bg-tertiary' : 'bg-error'}`} />
                    {user.isActive ? 'Active' : 'Paused'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(user)} className="btn-ghost" title="Edit">
                  <Icon name="edit" />
                </button>
                <button onClick={() => handleToggle(user)} className="btn-ghost" title={user.isActive ? 'Pause' : 'Activate'}>
                  <Icon name={user.isActive ? 'pause_circle' : 'play_circle'} />
                </button>
                <button onClick={() => handleRegenToken(user.id)} className="btn-ghost" title="Regenerate token">
                  <Icon name="refresh" />
                </button>
                <button onClick={() => handleDelete(user.id)} className="btn-ghost hover:!text-error" title="Delete">
                  <Icon name="delete" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface rounded-xl shadow-ambient-lg w-full max-w-lg p-8">
            <h3 className="text-2xl font-bold text-on-surface mb-6">
              {editing ? 'Edit User' : 'Add User'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">Name</label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="User name"
                  required
                />
              </div>
              <div>
                <label className="label-text">Email (optional)</label>
                <input
                  className="input-field"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="label-text">Tier</label>
                <select
                  className="input-field"
                  value={form.tierId}
                  onChange={(e) => setForm({ ...form, tierId: e.target.value })}
                  required
                >
                  <option value="">Select a tier</option>
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">Note (optional)</label>
                <textarea
                  className="input-field !rounded-[1rem] min-h-[80px]"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Internal notes about this user..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editing ? 'Save Changes' : 'Add User'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
