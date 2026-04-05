import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../config/firebase';
import { requireAuth } from '../middleware/auth';
import { ServiceCategory, RuleProvider } from '../types';
import { generatePreviewConfig } from '../services/configGenerator';
import {
  fetchAndCacheProvider,
  getCategoryProviderStatuses,
  deleteProviderCache,
  deleteCategoryProviderDir,
} from '../services/ruleProviders';

const router = Router();

/**
 * Normalize a raw Firestore doc into a ServiceCategory with defaults
 * (tolerates legacy documents that stored rules/groupType/isBuiltIn).
 */
function normalizeCategory(id: string, raw: Record<string, unknown>): ServiceCategory {
  const legacyRules = Array.isArray(raw.rules) ? (raw.rules as any[]) : [];
  return {
    id,
    name: (raw.name as string) || '',
    icon: (raw.icon as string) || 'category',
    description: (raw.description as string) || '',
    ruleProviders: Array.isArray(raw.ruleProviders) ? (raw.ruleProviders as RuleProvider[]) : [],
    extraRules: Array.isArray(raw.extraRules) ? (raw.extraRules as any[]) : legacyRules,
    order: typeof raw.order === 'number' ? (raw.order as number) : 99,
    createdAt: (raw.createdAt as string) || '',
  };
}

/**
 * Attach per-provider on-disk status (lastFetched, ruleCount, fileSize) to
 * the serialized category for frontend display.
 */
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
    const snapshot = await db.collection('serviceCategories').orderBy('order').get();
    const categories = snapshot.docs.map((doc) => normalizeCategory(doc.id, doc.data()));
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
    const doc = await db.collection('serviceCategories').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Category not found' });
    const cat = normalizeCategory(doc.id, doc.data()!);
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

    const category: Omit<ServiceCategory, 'id'> = {
      name,
      icon: icon || 'category',
      description: description || '',
      ruleProviders: Array.isArray(ruleProviders) ? ruleProviders : [],
      extraRules: Array.isArray(extraRules) ? extraRules : [],
      order: order ?? 99,
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection('serviceCategories').add(category);
    res.status(201).json({ id: ref.id, ...category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a service category
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('serviceCategories').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Category not found' });

    const updates: Record<string, unknown> = {};
    const allowed = ['name', 'icon', 'description', 'ruleProviders', 'extraRules', 'order'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        // Strip any stale `status` field off incoming provider objects.
        if (key === 'ruleProviders' && Array.isArray(req.body[key])) {
          updates[key] = (req.body[key] as any[]).map((p) => ({
            id: p.id,
            name: p.name,
            url: p.url,
          }));
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    await db.collection('serviceCategories').doc(req.params.id).update(updates);
    const updated = await db.collection('serviceCategories').doc(req.params.id).get();
    const cat = normalizeCategory(updated.id, updated.data()!);
    res.json(await enrichCategory(cat));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a service category (also clears its on-disk provider cache)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('serviceCategories').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Category not found' });

    await db.collection('serviceCategories').doc(req.params.id).delete();
    await deleteCategoryProviderDir(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/**
 * Add a new rule provider URL to a category. Fetches immediately.
 */
router.post('/:id/providers', requireAuth, async (req, res) => {
  try {
    const { name, url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const docRef = db.collection('serviceCategories').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Category not found' });
    const cat = normalizeCategory(doc.id, doc.data()!);

    const provider: RuleProvider = {
      id: randomUUID(),
      name: name || url.split('/').pop() || 'Provider',
      url,
    };

    const newProviders = [...cat.ruleProviders, provider];
    await docRef.update({ ruleProviders: newProviders });

    // Fetch immediately so the UI shows a populated status.
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

/**
 * Refresh (re-fetch) a provider's cache file.
 */
router.post('/:id/providers/:providerId/fetch', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('serviceCategories').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Category not found' });
    const cat = normalizeCategory(doc.id, doc.data()!);

    const provider = cat.ruleProviders.find((p) => p.id === req.params.providerId);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const status = await fetchAndCacheProvider(cat.id, provider.id, provider.url);
    res.json({ ...provider, status });
  } catch (err: any) {
    res.status(500).json({ error: `Fetch failed: ${err.message}` });
  }
});

/**
 * Remove a provider from a category (and delete its cached file).
 */
router.delete('/:id/providers/:providerId', requireAuth, async (req, res) => {
  try {
    const docRef = db.collection('serviceCategories').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Category not found' });
    const cat = normalizeCategory(doc.id, doc.data()!);

    const newProviders = cat.ruleProviders.filter((p) => p.id !== req.params.providerId);
    await docRef.update({ ruleProviders: newProviders });
    await deleteProviderCache(cat.id, req.params.providerId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove provider' });
  }
});

export default router;
