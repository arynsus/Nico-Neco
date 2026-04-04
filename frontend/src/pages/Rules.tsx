import { useEffect, useState } from 'react';
import { rulesApi } from '../api/client';

interface RuleEntry {
  type: string;
  value: string;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  groupType: 'select' | 'url-test' | 'fallback' | 'load-balance';
  description: string;
  rules: RuleEntry[];
  order: number;
  isBuiltIn: boolean;
}

function Icon({ name }: { name: string }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

const ruleTypes = [
  'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'GEOIP',
  'IP-CIDR', 'IP-CIDR6', 'DST-PORT', 'PROCESS-NAME',
];

const groupTypes = [
  { value: 'select', label: 'Select (manual)', desc: 'User picks which proxy to use' },
  { value: 'url-test', label: 'URL Test (auto)', desc: 'Auto-picks fastest proxy' },
  { value: 'fallback', label: 'Fallback (auto)', desc: 'Uses first available proxy' },
  { value: 'load-balance', label: 'Load Balance', desc: 'Distributes across proxies' },
];

export default function Rules() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServiceCategory | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', icon: 'category', groupType: 'select' as ServiceCategory['groupType'],
    description: '', rules: [] as RuleEntry[], order: 99,
  });
  const [newRule, setNewRule] = useState({ type: 'DOMAIN-SUFFIX', value: '' });

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
    setForm({ name: '', icon: 'category', groupType: 'select', description: '', rules: [], order: categories.length + 1 });
    setNewRule({ type: 'DOMAIN-SUFFIX', value: '' });
    setShowForm(true);
  }

  function openEdit(cat: ServiceCategory) {
    setEditing(cat);
    setForm({
      name: cat.name, icon: cat.icon, groupType: cat.groupType,
      description: cat.description, rules: [...cat.rules], order: cat.order,
    });
    setNewRule({ type: 'DOMAIN-SUFFIX', value: '' });
    setShowForm(true);
  }

  function addRule() {
    if (!newRule.value.trim()) return;
    setForm((prev) => ({
      ...prev,
      rules: [...prev.rules, { type: newRule.type, value: newRule.value.trim() }],
    }));
    setNewRule({ ...newRule, value: '' });
  }

  function removeRule(index: number) {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  }

  function addBulkRules() {
    const text = prompt('Paste domain suffixes (one per line):');
    if (!text) return;
    const newRules = text.split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((value) => ({ type: newRule.type, value }));
    setForm((prev) => ({ ...prev, rules: [...prev.rules, ...newRules] }));
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
    if (!confirm('Delete this routing category?')) return;
    try {
      await rulesApi.delete(id);
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
            Define service categories and their routing rules. Each category becomes a proxy-group selector in the Clash config.
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
          <strong className="text-on-surface">How routing works:</strong> Rules are evaluated top-to-bottom.
          Each category generates a <code className="bg-surface-container-highest px-1.5 py-0.5 rounded text-xs">proxy-group</code> of
          type "select" by default, so users can choose which proxy to use for that category.
          Traffic not matching any category falls through to the <strong>Fallback</strong> group (DIRECT by default).
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
        {categories.map((cat) => (
          <div key={cat.id} className="card card-hover">
            <div
              className="flex items-center gap-4 cursor-pointer"
              onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
            >
              <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-primary">
                <Icon name={cat.icon} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{cat.name}</span>
                  {cat.isBuiltIn && (
                    <span className="text-[9px] uppercase tracking-widest text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">
                      Built-in
                    </span>
                  )}
                </div>
                <span className="text-xs text-on-surface-variant">{cat.description}</span>
              </div>
              <span className="chip-outline text-[10px]">
                {cat.rules.length} rules
              </span>
              <span className="chip-secondary text-[10px]">
                {groupTypes.find((g) => g.value === cat.groupType)?.label || cat.groupType}
              </span>
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); openEdit(cat); }} className="btn-ghost" title="Edit">
                  <Icon name="edit" />
                </button>
                {!cat.isBuiltIn && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }} className="btn-ghost hover:!text-error" title="Delete">
                    <Icon name="delete" />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded rules list */}
            {expandedId === cat.id && (
              <div className="mt-4 pt-4 border-t border-outline-variant/10">
                <div className="flex flex-wrap gap-2">
                  {cat.rules.map((rule, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container-highest rounded-lg text-xs font-mono">
                      <span className="text-primary font-bold">{rule.type}</span>
                      <span className="text-on-surface-variant">{rule.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

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

      {/* Edit/Create form modal */}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Group Type</label>
                  <select
                    className="input-field"
                    value={form.groupType}
                    onChange={(e) => setForm({ ...form, groupType: e.target.value as any })}
                  >
                    {groupTypes.map((gt) => (
                      <option key={gt.value} value={gt.value}>{gt.label} - {gt.desc}</option>
                    ))}
                  </select>
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
              </div>

              {/* Rules editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label-text !mb-0">Rules ({form.rules.length})</label>
                  <button type="button" onClick={addBulkRules} className="text-xs text-primary font-semibold hover:underline">
                    Bulk add...
                  </button>
                </div>

                {/* Add new rule */}
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
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRule(); } }}
                  />
                  <button type="button" onClick={addRule} className="btn-primary !px-4">
                    <Icon name="add" />
                  </button>
                </div>

                {/* Rules list */}
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {form.rules.map((rule, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 bg-surface-container rounded-lg text-sm group"
                    >
                      <span className="text-primary font-bold font-mono text-xs">{rule.type}</span>
                      <span className="flex-1 font-mono text-xs text-on-surface">{rule.value}</span>
                      <button
                        type="button"
                        onClick={() => removeRule(i)}
                        className="opacity-0 group-hover:opacity-100 text-error transition-opacity"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                  {form.rules.length === 0 && (
                    <p className="text-on-surface-variant text-xs text-center py-4 italic">
                      No rules added yet. Add domains or IPs above.
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
