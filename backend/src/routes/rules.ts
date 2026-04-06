import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db, rowToCategory } from '../config/database';
import { requireAuth } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { ServiceCategory, RuleProvider } from '../types';
import { generatePreviewConfig } from '../services/configGenerator';
import {
  fetchAndCacheProvider,
  getCategoryProviderStatuses,
  deleteProviderCache,
  deleteCategoryProviderDir,
} from '../services/ruleProviders';

const router = Router();

async function enrichCategory(cat: ServiceCategory) {
  const providerIds = cat.ruleProviders.map((p) => p.id);
  const statuses = await getCategoryProviderStatuses(cat.id, providerIds);
  return {
    ...cat,
    ruleProviders: cat.ruleProviders.map((p) => ({ ...p, status: statuses[p.id] })),
  };
}

// List all service categories
router.get('/', requireAuth, async (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM service_categories ORDER BY order_num').all() as any[];
    const categories = rows.map(rowToCategory);
    const enriched = await Promise.all(categories.map(enrichCategory));
    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Preview the generated Clash config (must come BEFORE /:id)
router.get('/config/preview', requireAuth, async (_req, res) => {
  try {
    const yamlConfig = await generatePreviewConfig();
    res.type('text/yaml').send(yamlConfig);
  } catch (err: any) {
    res.status(500).json({ error: `Preview failed: ${err.message}` });
  }
});

// Get a single service category
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM service_categories WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Category not found' });
    const cat = rowToCategory(row);
    res.json(await enrichCategory(cat));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create a service category
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, icon, description, ruleProviders, extraRules, order } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const orderNum = order ?? 99;

    db.prepare(
      'INSERT INTO service_categories (id, name, icon, description, rule_providers, extra_rules, order_num, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      id, name, icon || 'category', description || '',
      JSON.stringify(Array.isArray(ruleProviders) ? ruleProviders : []),
      JSON.stringify(Array.isArray(extraRules) ? extraRules : []),
      orderNum, createdAt,
    );

    res.status(201).json({ id, name, icon: icon || 'category', description: description || '', ruleProviders: ruleProviders || [], extraRules: extraRules || [], order: orderNum, createdAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a service category
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM service_categories WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    const setClauses: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name', icon: 'icon', description: 'description',
      ruleProviders: 'rule_providers', extraRules: 'extra_rules', order: 'order_num',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (req.body[key] !== undefined) {
        setClauses.push(`${col} = ?`);
        if (key === 'ruleProviders') {
          // Strip any stale `status` field off incoming provider objects
          const cleaned = (req.body[key] as any[]).map((p) => ({ id: p.id, name: p.name, url: p.url }));
          values.push(JSON.stringify(cleaned));
        } else if (key === 'extraRules') {
          values.push(JSON.stringify(req.body[key]));
        } else {
          values.push(req.body[key]);
        }
      }
    }

    if (setClauses.length > 0) {
      values.push(req.params.id);
      db.prepare(`UPDATE service_categories SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM service_categories WHERE id = ?').get(req.params.id) as any;
    const cat = rowToCategory(updated);
    res.json(await enrichCategory(cat));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a service category (also clears its on-disk provider cache)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const row = db.prepare('SELECT id FROM service_categories WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Category not found' });

    db.prepare('DELETE FROM service_categories WHERE id = ?').run(req.params.id);
    await deleteCategoryProviderDir(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Add a new rule provider URL to a category — fetches immediately
router.post('/:id/providers', requireAuth, async (req, res) => {
  try {
    const { name, url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const row = db.prepare('SELECT * FROM service_categories WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Category not found' });
    const cat = rowToCategory(row);

    const provider: RuleProvider = {
      id: randomUUID(),
      name: name || url.split('/').pop() || 'Provider',
      url,
    };

    const newProviders = [...cat.ruleProviders, provider];
    db.prepare('UPDATE service_categories SET rule_providers = ? WHERE id = ?')
      .run(JSON.stringify(newProviders), req.params.id);

    let status;
    try {
      status = await fetchAndCacheProvider(cat.id, provider.id, provider.url);
    } catch (err: any) {
      status = { exists: false, lastFetched: null, ruleCount: 0, skipped: 0, fileSize: null, error: err.message };
    }

    res.status(201).json({ ...provider, status });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: `Failed to add provider: ${err.message}` });
  }
});

// Refresh (re-fetch) a provider's cache file
router.post('/:id/providers/:providerId/fetch', requireAuth, async (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM service_categories WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Category not found' });
    const cat = rowToCategory(row);

    const provider = cat.ruleProviders.find((p) => p.id === req.params.providerId);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const status = await fetchAndCacheProvider(cat.id, provider.id, provider.url);
    res.json({ ...provider, status });
  } catch (err: any) {
    res.status(500).json({ error: `Fetch failed: ${err.message}` });
  }
});

// Remove a provider from a category (and delete its cached file)
router.delete('/:id/providers/:providerId', requireAuth, async (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM service_categories WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Category not found' });
    const cat = rowToCategory(row);

    const newProviders = cat.ruleProviders.filter((p) => p.id !== req.params.providerId);
    db.prepare('UPDATE service_categories SET rule_providers = ? WHERE id = ?')
      .run(JSON.stringify(newProviders), req.params.id);
    await deleteProviderCache(cat.id, req.params.providerId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove provider' });
  }
});

export default router;
