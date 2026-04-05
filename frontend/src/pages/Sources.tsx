import { useEffect, useState } from 'react';
import { sourcesApi } from '../api/client';

interface ProxyNode {
  name: string;
  type: string;
  server: string;
  port: number;
  [key: string]: unknown;
}

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
  const [syncing, setSyncing] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Proxy viewer state
  const [proxyViewSource, setProxyViewSource] = useState<Source | null>(null);
  const [proxies, setProxies] = useState<ProxyNode[]>([]);
  const [proxyLoading, setProxyLoading] = useState(false);
  const [proxySearch, setProxySearch] = useState('');
  const [savingProxies, setSavingProxies] = useState(false);

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

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 1500);
    } catch {
      alert('Failed to copy URL');
    }
  }

  async function openProxyViewer(source: Source) {
    setProxyViewSource(source);
    setProxyLoading(true);
    setProxySearch('');
    try {
      const data = await sourcesApi.getProxies(source.id);
      setProxies(data);
    } catch (err: any) {
      alert(`Failed to load proxies: ${err.message}`);
      setProxies([]);
    } finally {
      setProxyLoading(false);
    }
  }

  async function saveProxies(updated: ProxyNode[]) {
    if (!proxyViewSource) return;
    setSavingProxies(true);
    try {
      await sourcesApi.updateProxies(proxyViewSource.id, updated);
      setProxies(updated);
      setSources((prev) =>
        prev.map((s) =>
          s.id === proxyViewSource.id ? { ...s, proxyCount: updated.length } : s,
        ),
      );
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSavingProxies(false);
    }
  }

  async function handleRemoveProxy(index: number) {
    const updated = proxies.filter((_, i) => i !== index);
    await saveProxies(updated);
  }

  async function handleChangePort(index: number, newPort: number) {
    if (!Number.isFinite(newPort) || newPort < 1 || newPort > 65535) return;
    const updated = proxies.map((p, i) => (i === index ? { ...p, port: newPort } : p));
    await saveProxies(updated);
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
      alert(`Fetched and cached ${result.proxyCount} proxies. Source marked Active.`);
      load();
    } catch (err: any) {
      alert(`Test failed: ${err.message}\n\nSource marked Offline.`);
      load();
    } finally {
      setTesting(null);
    }
  }

  async function handleSyncUsers(source: Source) {
    setSyncing(source.id);
    try {
      const result = await sourcesApi.syncUsers(source.id);
      let msg = `Sync complete: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted.`;
      if (result.errors.length > 0) {
        msg += `\n\nErrors:\n${result.errors.join('\n')}`;
      }
      alert(msg);
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(null);
    }
  }

  const filteredProxies = proxies.filter(
    (p) =>
      !proxySearch ||
      p.name.toLowerCase().includes(proxySearch.toLowerCase()) ||
      p.server.toLowerCase().includes(proxySearch.toLowerCase()) ||
      p.type.toLowerCase().includes(proxySearch.toLowerCase()),
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
            className="card card-hover grid items-center gap-4"
            style={{
              gridTemplateColumns: 'minmax(0, 1fr) 130px 90px 110px 220px',
            }}
          >
            {/* Col 1: Icon + name + url (clickable to copy) */}
            <div className="flex items-center gap-4 min-w-0">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                source.type === 'marzban' ? 'bg-primary-container text-primary' : 'bg-secondary-container text-secondary'
              }`}>
                <Icon name={source.type === 'marzban' ? 'dns' : 'cloud_download'} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-on-surface tracking-tight truncate">{source.name}</h4>
                <button
                  onClick={() => copyUrl(source.url)}
                  className="text-on-surface-variant text-xs truncate max-w-full text-left hover:text-primary transition-colors flex items-center gap-1 group"
                  title="Click to copy URL"
                >
                  <span className="truncate">{source.url}</span>
                  <span className="material-symbols-outlined text-sm shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {copiedUrl === source.url ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>

            {/* Col 2: Type */}
            <div className="min-w-0">
              <p className="label-text">Type</p>
              <div className={source.type === 'marzban' ? 'chip-primary' : 'chip-secondary'}>
                <Icon name={source.type === 'marzban' ? 'dns' : 'link'} />
                {source.type === 'marzban' ? 'Marzban' : 'Subscription'}
              </div>
            </div>

            {/* Col 3: Proxies (clickable) */}
            <div>
              <p className="label-text">Proxies</p>
              <button
                onClick={() => openProxyViewer(source)}
                className="text-lg font-bold text-primary hover:underline cursor-pointer"
                title="View & manage proxies"
              >
                {source.proxyCount}
              </button>
            </div>

            {/* Col 4: Status */}
            <div>
              <p className="label-text">Status</p>
              <div className={`flex items-center gap-2 text-sm font-semibold ${
                source.isActive ? 'text-tertiary' : 'text-on-surface-variant'
              }`}>
                <span className={`status-dot ${source.isActive ? 'bg-tertiary' : 'bg-outline-variant'}`} />
                {source.isActive ? 'Active' : 'Offline'}
              </div>
            </div>

            {/* Col 5: Actions (fixed width) */}
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => handleTest(source.id)}
                className="btn-ghost"
                title="Fetch & cache proxies (refreshes status)"
                disabled={testing === source.id}
              >
                <span className={`material-symbols-outlined ${testing === source.id ? 'animate-spin' : ''}`}>
                  {testing === source.id ? 'progress_activity' : 'speed'}
                </span>
              </button>
              {source.type === 'marzban' ? (
                <button
                  onClick={() => handleSyncUsers(source)}
                  className="btn-ghost"
                  title="Sync users to Marzban"
                  disabled={syncing === source.id}
                >
                  <span className={`material-symbols-outlined ${syncing === source.id ? 'animate-spin' : ''}`}>
                    {syncing === source.id ? 'progress_activity' : 'sync'}
                  </span>
                </button>
              ) : (
                <div className="w-10" />
              )}
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

      {/* Proxy viewer modal */}
      {proxyViewSource && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface rounded-xl shadow-ambient-lg w-full max-w-4xl p-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-on-surface">
                  Proxies — {proxyViewSource.name}
                </h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  {proxies.length} proxies cached. Edit ports or remove unwanted entries.
                  {savingProxies && <span className="ml-2 text-primary">Saving...</span>}
                </p>
              </div>
              <button onClick={() => setProxyViewSource(null)} className="btn-ghost">
                <Icon name="close" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                className="input-field !pl-12"
                placeholder="Filter proxies by name, server, type..."
                value={proxySearch}
                onChange={(e) => setProxySearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-auto">
              {proxyLoading ? (
                <div className="flex items-center justify-center h-32">
                  <span className="material-symbols-outlined text-tertiary animate-pulse text-4xl">pets</span>
                </div>
              ) : filteredProxies.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <Icon name="dns" />
                  <p className="mt-2">{proxies.length === 0 ? 'No cached proxies. Hit the speed test button to fetch them.' : 'No proxies match your filter.'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Table header */}
                  <div
                    className="grid gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
                    style={{ gridTemplateColumns: '70px minmax(0, 1fr) minmax(0, 1fr) 110px 40px' }}
                  >
                    <div>Type</div>
                    <div>Name</div>
                    <div>Server</div>
                    <div>Port</div>
                    <div></div>
                  </div>

                  {filteredProxies.map((proxy) => {
                    const realIndex = proxies.indexOf(proxy);
                    return (
                      <ProxyRow
                        key={realIndex}
                        proxy={proxy}
                        onChangePort={(p) => handleChangePort(realIndex, p)}
                        onRemove={() => handleRemoveProxy(realIndex)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

// Individual proxy row component with inline port editing
function ProxyRow({
  proxy,
  onChangePort,
  onRemove,
}: {
  proxy: ProxyNode;
  onChangePort: (port: number) => void;
  onRemove: () => void;
}) {
  const [portValue, setPortValue] = useState(String(proxy.port));
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setPortValue(String(proxy.port));
    setIsDirty(false);
  }, [proxy.port]);

  function commit() {
    const newPort = parseInt(portValue, 10);
    if (Number.isFinite(newPort) && newPort >= 1 && newPort <= 65535 && newPort !== proxy.port) {
      onChangePort(newPort);
    } else {
      setPortValue(String(proxy.port));
      setIsDirty(false);
    }
  }

  return (
    <div
      className="grid gap-3 items-center px-4 py-2.5 bg-surface-container rounded-lg text-sm group hover:bg-surface-container-high transition-colors"
      style={{ gridTemplateColumns: '70px minmax(0, 1fr) minmax(0, 1fr) 110px 40px' }}
    >
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide w-fit ${
          proxy.type === 'vmess'
            ? 'bg-primary-container text-primary'
            : proxy.type === 'trojan'
            ? 'bg-tertiary-container text-tertiary'
            : 'bg-secondary-container text-secondary'
        }`}
      >
        {proxy.type}
      </span>
      <span className="font-medium text-on-surface truncate" title={proxy.name}>
        {proxy.name}
      </span>
      <span className="text-on-surface-variant text-xs font-mono truncate" title={proxy.server}>
        {proxy.server}
      </span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={65535}
          value={portValue}
          onChange={(e) => {
            setPortValue(e.target.value);
            setIsDirty(e.target.value !== String(proxy.port));
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setPortValue(String(proxy.port));
              setIsDirty(false);
              e.currentTarget.blur();
            }
          }}
          className={`w-20 px-2 py-1 rounded border bg-surface text-on-surface font-mono text-xs outline-none transition-colors ${
            isDirty ? 'border-primary ring-1 ring-primary/30' : 'border-outline-variant/30'
          }`}
          title="Edit port (Enter to save, Esc to cancel)"
        />
        {isDirty && <span className="material-symbols-outlined text-primary text-sm">edit</span>}
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 text-error transition-opacity justify-self-end"
        title="Remove this proxy"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}
