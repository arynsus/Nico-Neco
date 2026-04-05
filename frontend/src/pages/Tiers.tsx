import { useEffect, useState } from 'react';
import { tiersApi, sourcesApi } from '../api/client';

interface Tier {
  id: string;
  name: string;
  description: string;
  allowedSourceIds: string[];
  icon: string;
  color: string;
  isDefault: boolean;
}

interface Source {
  id: string;
  name: string;
  type: string;
  proxyCount: number;
}

function Icon({ name }: { name: string }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

const colorOptions = [
  { value: 'primary', label: 'Espresso', bg: 'bg-primary-container', text: 'text-on-primary-container' },
  { value: 'secondary', label: 'Latte', bg: 'bg-secondary-container', text: 'text-on-secondary-container' },
  { value: 'tertiary', label: 'Matcha', bg: 'bg-tertiary-container', text: 'text-on-tertiary-container' },
  { value: 'outline', label: 'Neutral', bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' },
];

const iconOptions = ['bolt', 'coffee', 'eco', 'star', 'diamond', 'workspace_premium', 'local_fire_department'];

export default function Tiers() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tier | null>(null);

  const [form, setForm] = useState({
    name: '', description: '', icon: 'coffee', color: 'primary',
    allowedSourceIds: [] as string[], isDefault: false,
  });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [t, s] = await Promise.all([tiersApi.list(), sourcesApi.list()]);
      setTiers(t);
      setSources(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', description: '', icon: 'coffee', color: 'primary', allowedSourceIds: [], isDefault: false });
    setShowForm(true);
  }

  function openEdit(tier: Tier) {
    setEditing(tier);
    setForm({
      name: tier.name, description: tier.description, icon: tier.icon,
      color: tier.color, allowedSourceIds: tier.allowedSourceIds, isDefault: tier.isDefault,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await tiersApi.update(editing.id, form);
      } else {
        await tiersApi.create(form);
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tier?')) return;
    try {
      await tiersApi.delete(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function toggleSource(sourceId: string) {
    setForm((prev) => ({
      ...prev,
      allowedSourceIds: prev.allowedSourceIds.includes(sourceId)
        ? prev.allowedSourceIds.filter((id) => id !== sourceId)
        : [...prev.allowedSourceIds, sourceId],
    }));
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
          <span className="page-subtitle">Access Tiers</span>
          <h2 className="page-title">
            Roast <span className="text-primary italic">Tiers</span>
          </h2>
          <p className="text-on-surface-variant mt-3 max-w-md">
            Define access levels that control which proxy sources each user can access.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary w-fit">
          <Icon name="add" />
          <span>New Tier</span>
        </button>
      </div>

      {/* Tier cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const colorOpt = colorOptions.find((c) => c.value === tier.color) || colorOptions[0];
          const allowedSources = sources.filter((s) => tier.allowedSourceIds.includes(s.id));
          const totalProxies = allowedSources.reduce((sum, s) => sum + s.proxyCount, 0);

          return (
            <div key={tier.id} className="card flex flex-col gap-4 relative overflow-hidden">
              {tier.isDefault && (
                <div className="absolute top-4 right-4">
                  <span className="chip-tertiary text-[10px]">
                    <Icon name="check_circle" /> Default
                  </span>
                </div>
              )}

              <div className={`w-14 h-14 rounded-xl ${colorOpt.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${colorOpt.text} text-2xl`}>{tier.icon}</span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-on-surface">{tier.name}</h3>
                <p className="text-on-surface-variant text-sm mt-1">{tier.description}</p>
              </div>

              <div className="flex-1">
                <p className="label-text">Allowed Sources</p>
                {allowedSources.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allowedSources.map((s) => (
                      <span key={s.id} className="chip-outline text-[10px]">{s.name}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-xs italic">No sources assigned</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/15">
                <span className="text-sm text-on-surface-variant">
                  <span className="font-bold text-on-surface">{totalProxies}</span> proxies available
                </span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(tier)} className="btn-ghost" title="Edit">
                    <Icon name="edit" />
                  </button>
                  <button onClick={() => handleDelete(tier.id)} className="btn-ghost hover:!text-error" title="Delete">
                    <Icon name="delete" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface rounded-xl shadow-ambient-lg w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-on-surface mb-6">
              {editing ? 'Edit Tier' : 'New Tier'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">Name</label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Tier name"
                  required
                />
              </div>
              <div>
                <label className="label-text">Description</label>
                <textarea
                  className="input-field !rounded-[1rem] min-h-[60px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What this tier includes..."
                />
              </div>

              <div>
                <label className="label-text">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        form.icon === icon
                          ? 'bg-primary text-on-primary scale-110'
                          : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-text">Color</label>
                <div className="flex gap-3">
                  {colorOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, color: opt.value })}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${opt.bg} ${opt.text} ${
                        form.color === opt.value ? 'ring-2 ring-primary scale-105' : ''
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-text">Allowed Sources</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sources.length === 0 && (
                    <p className="text-on-surface-variant text-xs italic">No sources available. Add sources first.</p>
                  )}
                  {sources.map((source) => (
                    <label
                      key={source.id}
                      className={`flex items-center gap-3 p-3 rounded-[1rem] cursor-pointer transition-all ${
                        form.allowedSourceIds.includes(source.id)
                          ? 'bg-primary-container/50'
                          : 'bg-surface-container hover:bg-surface-container-high'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.allowedSourceIds.includes(source.id)}
                        onChange={() => toggleSource(source.id)}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-sm">{source.name}</span>
                        <span className="text-on-surface-variant text-xs ml-2">({source.proxyCount} proxies)</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 bg-surface-container rounded-[1rem] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded"
                />
                <div>
                  <span className="font-semibold text-sm">Default tier</span>
                  <p className="text-on-surface-variant text-xs">New users will be assigned this tier automatically</p>
                </div>
              </label>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editing ? 'Save Changes' : 'Create Tier'}
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
