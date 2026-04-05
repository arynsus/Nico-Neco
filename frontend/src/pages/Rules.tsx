import { useEffect, useState } from 'react';
import { rulesApi } from '../api/client';

interface RuleEntry {
  type: string;
  value: string;
}

interface ProviderStatus {
  exists: boolean;
  lastFetched: string | null;
  ruleCount: number;
  skipped: number;
  fileSize: number | null;
}

interface RuleProvider {
  id: string;
  name: string;
  url: string;
  status?: ProviderStatus;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  ruleProviders: RuleProvider[];
  extraRules: RuleEntry[];
  order: number;
}

function Icon({ name }: { name: string }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

const ruleTypes = [
  'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'GEOIP',
  'IP-CIDR', 'IP-CIDR6', 'SRC-IP-CIDR', 'SRC-PORT', 'DST-PORT',
  'PROCESS-NAME', 'PROCESS-PATH', 'IPSET', 'RULE-SET', 'SCRIPT', 'MATCH',
];

function formatBytes(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function Rules() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServiceCategory | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fetchingProvider, setFetchingProvider] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', icon: 'category', description: '', extraRules: [] as RuleEntry[], order: 99,
  });
  const [newRule, setNewRule] = useState({ type: 'DOMAIN-SUFFIX', value: '' });
  const [newProvider, setNewProvider] = useState({ name: '', url: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await rulesApi.list();
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', icon: 'category', description: '', extraRules: [], order: categories.length + 1 });
    setNewRule({ type: 'DOMAIN-SUFFIX', value: '' });
    setShowForm(true);
  }

  function openEdit(cat: ServiceCategory) {
    setEditing(cat);
    setForm({
      name: cat.name, icon: cat.icon, description: cat.description,
      extraRules: [...(cat.extraRules || [])], order: cat.order,
    });
    setNewRule({ type: 'DOMAIN-SUFFIX', value: '' });
    setShowForm(true);
  }

  function addExtraRule() {
    if (!newRule.value.trim()) return;
    setForm((prev) => ({
      ...prev,
      extraRules: [...prev.extraRules, { type: newRule.type, value: newRule.value.trim() }],
    }));
    setNewRule({ ...newRule, value: '' });
  }

  function removeExtraRule(index: number) {
    setForm((prev) => ({
      ...prev,
      extraRules: prev.extraRules.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await rulesApi.update(editing.id, form);
      } else {
        await rulesApi.create(form);
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this routing category? Its cached provider files will also be removed.')) return;
    try {
      await rulesApi.delete(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleAddProvider(categoryId: string) {
    if (!newProvider.url.trim()) return;
    try {
      await rulesApi.addProvider(categoryId, {
        name: newProvider.name.trim() || undefined,
        url: newProvider.url.trim(),
      });
      setNewProvider({ name: '', url: '' });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleFetchProvider(categoryId: string, providerId: string) {
    setFetchingProvider(providerId);
    try {
      await rulesApi.fetchProvider(categoryId, providerId);
      load();
    } catch (err: any) {
      alert(`Fetch failed: ${err.message}`);
    } finally {
      setFetchingProvider(null);
    }
  }

  async function handleRemoveProvider(categoryId: string, providerId: string) {
    if (!confirm('Remove this provider and delete its cached file?')) return;
    try {
      await rulesApi.removeProvider(categoryId, providerId);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function loadPreview() {
    setPreviewLoading(true);
    setShowPreview(true);
    try {
      const yaml = await rulesApi.preview();
      setPreview(yaml);
    } catch (err: any) {
      setPreview(`# Error: ${err.message}`);
    } finally {
      setPreviewLoading(false);
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
          <span className="page-subtitle">Routing Rules</span>
          <h2 className="page-title">
            Traffic <span className="text-primary italic">Routes</span>
          </h2>
          <p className="text-on-surface-variant mt-3 max-w-md">
            Define service categories and attach external rule-provider URLs. Rules are cached locally — Firestore only stores the URL references.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadPreview} className="btn-secondary">
            <Icon name="preview" />
            <span>Preview Config</span>
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Icon name="add" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-surface-container-low rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-tertiary-container flex items-center justify-center shrink-0">
          <Icon name="info" />
        </div>
        <div className="text-sm text-on-surface-variant">
          <strong className="text-on-surface">How it works:</strong> Each category can hold any number of external rule-provider URLs
          (e.g. <code className="bg-surface-container-highest px-1.5 py-0.5 rounded text-xs">blackmatrix7/ios_rule_script</code> YAML files)
          plus extra custom entries. Providers are fetched with a click and cached as files under <code className="bg-surface-container-highest px-1.5 py-0.5 rounded text-xs">backend/data/rule-providers/</code>.
        </div>
      </div>

      {/* Route visualization */}
      <div className="space-y-3 mb-8">
        {/* Fixed: LAN */}
        <div className="card bg-surface-container-low flex items-center gap-4 opacity-60">
          <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center">
            <Icon name="lan" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-sm">Local Network</span>
            <span className="text-xs text-on-surface-variant ml-2">192.168.0.0/16, 10.0.0.0/8, etc.</span>
          </div>
          <span className="chip-outline">DIRECT</span>
        </div>

        {/* Service categories */}
        {categories.map((cat) => {
          const providers = cat.ruleProviders || [];
          const extraRules = cat.extraRules || [];
          const totalCached = providers.reduce((sum, p) => sum + (p.status?.ruleCount || 0), 0);
          const totalRules = totalCached + extraRules.length;
          const isExpanded = expandedId === cat.id;

          return (
            <div key={cat.id} className="card card-hover">
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : cat.id)}
              >
                <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-primary">
                  <Icon name={cat.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">{cat.name}</span>
                  <div className="text-xs text-on-surface-variant truncate">{cat.description}</div>
                </div>
                <span className="chip-outline text-[10px]">
                  {providers.length} provider{providers.length !== 1 ? 's' : ''}
                </span>
                <span className="chip-secondary text-[10px]">
                  {totalRules.toLocaleString()} rules
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(cat); }}
                    className="btn-ghost"
                    title="Edit"
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}
                    className="btn-ghost hover:!text-error"
                    title="Delete"
                  >
                    <Icon name="delete" />
                  </button>
                </div>
              </div>

              {/* Expanded: providers + extras */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-outline-variant/10 space-y-4">
                  {/* Providers list */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-on-surface">Rule Providers</h4>
                    </div>
                    {providers.length === 0 && (
                      <p className="text-xs text-on-surface-variant italic py-2">
                        No providers yet. Add a URL below (e.g. a blackmatrix7 YAML file).
                      </p>
                    )}
                    <div className="space-y-2">
                      {providers.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 px-3 py-2 bg-surface-container rounded-lg"
                        >
                          <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
                            <Icon name="cloud_download" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{p.name}</div>
                            <div className="text-[10px] font-mono text-on-surface-variant truncate">{p.url}</div>
                          </div>
                          <div className="text-right text-[10px] text-on-surface-variant shrink-0 mr-2">
                            <div className="font-semibold text-on-surface">
                              {p.status?.exists ? `${p.status.ruleCount.toLocaleString()} rules` : 'Not fetched'}
                              {p.status?.exists && p.status.skipped > 0 && (
                                <span
                                  className="ml-1 text-error"
                                  title={`${p.status.skipped} lines dropped — unsupported rule type`}
                                >
                                  (−{p.status.skipped})
                                </span>
                              )}
                            </div>
                            <div>
                              {formatRelative(p.status?.lastFetched || null)} · {formatBytes(p.status?.fileSize ?? null)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleFetchProvider(cat.id, p.id)}
                            className="btn-ghost"
                            disabled={fetchingProvider === p.id}
                            title="Fetch / refresh"
                          >
                            <Icon name={fetchingProvider === p.id ? 'hourglass_empty' : 'refresh'} />
                          </button>
                          <button
                            onClick={() => handleRemoveProvider(cat.id, p.id)}
                            className="btn-ghost hover:!text-error"
                            title="Remove"
                          >
                            <Icon name="close" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add provider inline form */}
                    <div className="flex gap-2 mt-3">
                      <input
                        className="input-field !w-auto md:w-40"
                        placeholder="Name (optional)"
                        value={newProvider.name}
                        onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                      />
                      <input
                        className="input-field flex-1"
                        placeholder="https://raw.githubusercontent.com/.../YouTube.yaml"
                        value={newProvider.url}
                        onChange={(e) => setNewProvider({ ...newProvider, url: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddProvider(cat.id); } }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddProvider(cat.id)}
                        className="btn-primary !px-4"
                        title="Add provider"
                      >
                        <Icon name="add" />
                      </button>
                    </div>
                  </div>

                  {/* Extra rules */}
                  <div>
                    <h4 className="text-sm font-semibold text-on-surface mb-2">
                      Extra Rules ({extraRules.length})
                    </h4>
                    {extraRules.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic">
                        No custom entries. Use the Edit button above to add individual rules.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {extraRules.map((rule, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container-highest rounded-lg text-xs font-mono">
                            <span className="text-primary font-bold">{rule.type}</span>
                            <span className="text-on-surface-variant">{rule.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Fixed: GeoIP CN */}
        <div className="card bg-surface-container-low flex items-center gap-4 opacity-60">
          <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center">
            <Icon name="flag" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-sm">China IPs</span>
            <span className="text-xs text-on-surface-variant ml-2">GEOIP,CN</span>
          </div>
          <span className="chip-outline">DIRECT</span>
        </div>

        {/* Fixed: MATCH fallback */}
        <div className="card bg-tertiary-container/30 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-tertiary-container flex items-center justify-center text-tertiary">
            <Icon name="alt_route" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-sm">Everything Else</span>
            <span className="text-xs text-on-surface-variant ml-2">MATCH (catch-all)</span>
          </div>
          <span className="chip-tertiary">Fallback (DIRECT default)</span>
        </div>
      </div>

      {/* Edit/Create form modal (category metadata + extra rules only) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface rounded-xl shadow-ambient-lg w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-on-surface mb-6">
              {editing ? 'Edit Category' : 'New Category'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Name</label>
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Streaming"
                    required
                  />
                </div>
                <div>
                  <label className="label-text">Icon (Material Symbol)</label>
                  <input
                    className="input-field"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="e.g., movie"
                  />
                </div>
              </div>

              <div>
                <label className="label-text">Description</label>
                <input
                  className="input-field"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What kind of traffic this category handles"
                />
              </div>

              <div>
                <label className="label-text">Priority Order</label>
                <input
                  className="input-field"
                  type="number"
                  min={1}
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 99 })}
                />
              </div>

              {/* Extra rules editor (custom one-off rules only) */}
              <div>
                <label className="label-text">Extra Rules ({form.extraRules.length})</label>
                <p className="text-xs text-on-surface-variant mb-2">
                  Individual custom entries. For bulk rules, add a provider URL after saving.
                </p>

                <div className="flex gap-2 mb-3">
                  <select
                    className="input-field !w-auto"
                    value={newRule.type}
                    onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                  >
                    {ruleTypes.map((rt) => (
                      <option key={rt} value={rt}>{rt}</option>
                    ))}
                  </select>
                  <input
                    className="input-field flex-1"
                    value={newRule.value}
                    onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                    placeholder="e.g., netflix.com"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtraRule(); } }}
                  />
                  <button type="button" onClick={addExtraRule} className="btn-primary !px-4">
                    <Icon name="add" />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {form.extraRules.map((rule, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 bg-surface-container rounded-lg text-sm group"
                    >
                      <span className="text-primary font-bold font-mono text-xs">{rule.type}</span>
                      <span className="flex-1 font-mono text-xs text-on-surface">{rule.value}</span>
                      <button
                        type="button"
                        onClick={() => removeExtraRule(i)}
                        className="opacity-0 group-hover:opacity-100 text-error transition-opacity"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                  {form.extraRules.length === 0 && (
                    <p className="text-on-surface-variant text-xs text-center py-4 italic">
                      No extra rules yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editing ? 'Save Changes' : 'Create Category'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config preview modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface rounded-xl shadow-ambient-lg w-full max-w-4xl p-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-on-surface">Config Preview</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(preview); }}
                  className="btn-secondary text-sm"
                >
                  <Icon name="content_copy" /> Copy
                </button>
                <button onClick={() => setShowPreview(false)} className="btn-ghost">
                  <Icon name="close" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-surface-container rounded-[1rem] p-6">
              {previewLoading ? (
                <div className="flex items-center justify-center h-32">
                  <span className="material-symbols-outlined text-tertiary animate-pulse text-4xl">pets</span>
                </div>
              ) : (
                <pre className="text-xs font-mono text-on-surface whitespace-pre-wrap leading-relaxed">
                  {preview}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
