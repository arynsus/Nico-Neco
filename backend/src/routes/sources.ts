import { Router } from 'express';
import { db } from '../config/firebase';
import { requireAuth } from '../middleware/auth';
import { Source } from '../types';
import { fetchSubscriptionProxies } from '../services/sourceParser';
import { MarzbanClient } from '../services/marzbanClient';

const router = Router();

// List all sources
router.get('/', requireAuth, async (_req, res) => {
  try {
    const snapshot = await db.collection('sources').orderBy('createdAt', 'desc').get();
    const sources = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

// Get a single source
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('sources').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Source not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch source' });
  }
});

// Create a new source
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, type, url, credentials, tags } = req.body;
    if (!name || !type || !url) {
      return res.status(400).json({ error: 'name, type, and url are required' });
    }

    const source: Omit<Source, 'id'> = {
      name,
      type,
      url,
      credentials: credentials || null,
      isActive: true,
      lastFetched: null,
      proxyCount: 0,
      tags: tags || [],
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection('sources').add(source);
    res.status(201).json({ id: ref.id, ...source });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create source' });
  }
});

// Update a source
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('sources').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Source not found' });

    const updates: Partial<Source> = {};
    const allowed = ['name', 'type', 'url', 'credentials', 'isActive', 'tags'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (updates as Record<string, unknown>)[key] = req.body[key];
      }
    }

    await db.collection('sources').doc(req.params.id).update(updates);
    const updated = await db.collection('sources').doc(req.params.id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update source' });
  }
});

// Delete a source
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('sources').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Source not found' });
    await db.collection('sources').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

// Test a source (fetch and count proxies)
router.post('/:id/test', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('sources').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Source not found' });

    const source = doc.data() as Source;
    let proxyCount = 0;

    if (source.type === 'subscription') {
      const proxies = await fetchSubscriptionProxies(source.url);
      proxyCount = proxies.length;
    } else if (source.type === 'marzban' && source.credentials) {
      const client = new MarzbanClient(source.url, source.credentials.username, source.credentials.password);
      const proxies = await client.getProxyNodes();
      proxyCount = proxies.length;
    }

    await db.collection('sources').doc(req.params.id).update({
      lastFetched: new Date().toISOString(),
      proxyCount,
    });

    res.json({ success: true, proxyCount });
  } catch (err: any) {
    res.status(500).json({ error: `Test failed: ${err.message}` });
  }
});

export default router;
