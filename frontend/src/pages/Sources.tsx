import { useEffect, useState } from 'react';
import { sourcesApi } from '../api/client';

interface Source {
  id: string;
  name: string;
  type: 'subscription' | 'marzban';
  url: string;
  credentials?: { username: string; password: string };
  isActive: boolean;
  lastFetched: string | null;
  proxyCount: number;
  tags: string[];
}

function Icon({ name }: { name: string }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

export default function Sources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', type: 'subscription' as 'subscription' | 'marzban', url: '',
    username: '', password: '', tags: '',
  });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await sourcesApi.list();
      setSources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', type: 'subscription', url: '', username: '', password: '', tags: '' });
    setShowForm(true);
  }

  function openEdit(source: Source) {
    setEditing(source);
    setForm({
      name: source.name,
      type: source.type,
      url: source.url,
      username: source.credentials?.username || '',
      password: source.credentials?.password || '',
      tags: source.tags.join(', '),
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: any = {
      name: form.name,
      type: form.type,
      url: form.url,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    if (form.type === 'marzban') {
      data.credentials = { username: form.username, password: form.password };
    }

    try {
      if (editing) {
        await sourcesApi.update(editing.id, data);
      } else {
        await sourcesApi.create(data);
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this source?')) return;
    try {
      await sourcesApi.delete(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleTest(id: string) {
    setTesting(id);
    try {
      const result = await sourcesApi.test(id);
      alert(`Found ${result.proxyCount} proxies`);
      load();
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setTesting(null);
    }
  }

  async function handleToggle(source: Source) {
    try {
      await sourcesApi.update(source.id, { isActive: !source.isActive });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

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
          <span className="page-subtitle">Proxy Sources</span>
          <h2 className="page-title">
            Source <span className="text-primary italic">Beans</span>
          </h2>
          <p className="text-on-surface-variant mt-3 max-w-md">
            Manage subscription URLs and Marzban instances that supply your proxy nodes.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary w-fit">
          <Icon name="add" />
          <span>Add Source</span>
        </button>
      </div>

      {/* Source list */}
      <div className="space-y-4">
        {sources.length === 0 && (
          <div className="card text-center py-12 text-on-surface-variant">
            <Icon name="cloud_off" />
            <p className="mt-2">No sources yet. Add your first subscription or Marzban instance.</p>
          </div>
        )}

        {sources.map((source) => (
          <div
            key={source.id}
            className="card card-hover flex flex-col lg:flex-row lg:items-center gap-6"
          >
            <div className="flex items-center gap-5 flex-1">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                source.type === 'marzban' ? 'bg-primary-container text-primary' : 'bg-secondary-container text-secondary'
              }`}>
                <Icon name={source.type === 'marzban' ? 'dns' : 'cloud_download'} />
              </div>
              <div className="min-w-0">
                <h4 className="text-lg font-bold text-on-surface tracking-tight truncate">{source.name}</h4>
                <p className="text-on-surface-variant text-sm truncate">{source.url}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 flex-[2]">
              <div>
                <p className="label-text">Type</p>
                <div className={source.type === 'marzban' ? 'chip-primary' : 'chip-secondary'}>
                  <Icon name={source.type === 'marzban' ? 'dns' : 'link'} />
                  {source.type === 'marzban' ? 'Marzban' : 'Subscription'}
                </div>
              </div>
              <div>
                <p className="label-text">Proxies</p>
                <span className="text-lg font-bold text-on-surface">{source.proxyCount}</span>
              </div>
              <div className="hidden lg:block">
                <p className="label-text">Status</p>
                <div className={`flex items-center gap-2 text-sm font-semibold ${
                  source.isActive ? 'text-tertiary' : 'text-error'
                }`}>
                  <span className={`status-dot ${source.isActive ? 'bg-tertiary' : 'bg-error'}`} />
                  {source.isActive ? 'Active' : 'Paused'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTest(source.id)}
                className="btn-ghost"
                title="Test connection"
                disabled={testing === source.id}
              >
                <span className={`material-symbols-outlined ${testing === source.id ? 'animate-spin' : ''}`}>
                  {testing === source.id ? 'progress_activity' : 'speed'}
                </span>
              </button>
              <button onClick={() => handleToggle(source)} className="btn-ghost" title={source.isActive ? 'Pause' : 'Resume'}>
                <Icon name={source.isActive ? 'pause_circle' : 'play_circle'} />
              </button>
              <button onClick={() => openEdit(source)} className="btn-ghost" title="Edit">
                <Icon name="edit" />
              </button>
              <button onClick={() => handleDelete(source.id)} className="btn-ghost hover:!text-error" title="Delete">
                <Icon name="delete" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface rounded-xl shadow-ambient-lg w-full max-w-lg p-8">
            <h3 className="text-2xl font-bold text-on-surface mb-6">
              {editing ? 'Edit Source' : 'Add Source'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">Name</label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My Provider"
                  required
                />
              </div>

              <div>
                <label className="label-text">Type</label>
                <select
                  className="input-field"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                >
                  <option value="subscription">Subscription URL</option>
                  <option value="marzban">Marzban Instance</option>
                </select>
              </div>

              <div>
                <label className="label-text">URL</label>
                <input
                  className="input-field"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder={form.type === 'marzban' ? 'https://panel.example.com:8000' : 'https://provider.com/sub/xxx'}
                  required
                />
              </div>

              {form.type === 'marzban' && (
                <>
                  <div>
                    <label className="label-text">Admin Username</label>
                    <input
                      className="input-field"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <label className="label-text">Admin Password</label>
                    <input
                      className="input-field"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="label-text">Tags (comma separated)</label>
                <input
                  className="input-field"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="premium, hk, us"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editing ? 'Save Changes' : 'Add Source'}
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
