import { Router } from 'express';
import { db } from '../config/firebase';
import { requireAuth } from '../middleware/auth';
import { Source } from '../types';
import { fetchSubscriptionProxies } from '../services/sourceParser';
import { MarzbanClient } from '../services/marzbanClient';

/** Recursively strip undefined values (Firestore rejects them). */
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined) as unknown as T;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value !== undefined) {
      clean[key] = stripUndefined(value);
    }
  }
  return clean as T;
}

const router = Router();

// List all sources
router.get('/', requireAuth, async (_req, res) => {
  try {
    const snapshot = await db.collection('sources').orderBy('createdAt', 'desc').get();
    const sources = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Don't send full cached proxies in list view — just metadata
      return {
        id: doc.id,
        ...data,
        cachedProxies: undefined,
        proxyCount: data.cachedProxies?.length ?? data.proxyCount ?? 0,
      };
    });
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

// Get cached proxies for a source (must be before /:id to avoid route conflict)
router.get('/:id/proxies', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('sources').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Source not found' });
    const data = doc.data()!;
    res.json(data.cachedProxies || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch proxies' });
  }
});

// Update cached proxies (remove or reorder) (must be before /:id)
router.put('/:id/proxies', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('sources').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Source not found' });

    const { proxies } = req.body;
    if (!Array.isArray(proxies)) {
      return res.status(400).json({ error: 'proxies must be an array' });
    }

    await db.collection('sources').doc(req.params.id).update({
      cachedProxies: proxies,
      proxyCount: proxies.length,
    });

    res.json({ success: true, proxyCount: proxies.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update proxies' });
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
      cachedProxies: [],
      tags: tags || [],
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection('sources').add(source);
    res.status(201).json({ id: ref.id, ...source, cachedProxies: undefined });
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
    const data = updated.data()!;
    res.json({ id: updated.id, ...data, cachedProxies: undefined });
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

// Test/refresh a source (fetch proxies and cache them).
// Automatically marks the source Active on success, Offline on failure.
router.post('/:id/test', requireAuth, async (req, res) => {
  const sourceId = req.params.id;
  try {
    const doc = await db.collection('sources').doc(sourceId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Source not found' });

    const source = doc.data() as Source;
    let proxies: any[] = [];

    try {
      if (source.type === 'subscription') {
        proxies = await fetchSubscriptionProxies(source.url);
      } else if (source.type === 'marzban' && source.credentials) {
        const client = new MarzbanClient(source.url, source.credentials.username, source.credentials.password);
        proxies = await client.getProxyNodes();
      }
    } catch (fetchErr: any) {
      // Mark offline
      await db.collection('sources').doc(sourceId).update({
        lastFetched: new Date().toISOString(),
        isActive: false,
      });
      return res.status(500).json({ error: `Test failed: ${fetchErr.message}` });
    }

    // Cache the proxies and mark active
    await db.collection('sources').doc(sourceId).update({
      lastFetched: new Date().toISOString(),
      proxyCount: proxies.length,
      cachedProxies: stripUndefined(proxies),
      isActive: proxies.length > 0,
    });

    res.json({ success: true, proxyCount: proxies.length, isActive: proxies.length > 0 });
  } catch (err: any) {
    res.status(500).json({ error: `Test failed: ${err.message}` });
  }
});

// Marzban: sync users
router.post('/:id/sync-users', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('sources').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Source not found' });

    const source = doc.data() as Source;
    if (source.type !== 'marzban' || !source.credentials) {
      return res.status(400).json({ error: 'User sync is only available for Marzban sources' });
    }

    const client = new MarzbanClient(source.url, source.credentials.username, source.credentials.password);

    // Get all NicoNeco users whose tier allows this source
    const tiersSnap = await db.collection('tiers').get();
    const allowedTierIds: string[] = [];
    for (const tierDoc of tiersSnap.docs) {
      const tier = tierDoc.data();
      if (tier.allowedSourceIds?.includes(req.params.id)) {
        allowedTierIds.push(tierDoc.id);
      }
    }

    const nicoUsers: { name: string; subscriptionToken: string; isActive: boolean }[] = [];
    if (allowedTierIds.length > 0) {
      // Firestore 'in' queries support max 30 values at a time
      for (let i = 0; i < allowedTierIds.length; i += 30) {
        const chunk = allowedTierIds.slice(i, i + 30);
        const usersSnap = await db.collection('users').where('tierId', 'in', chunk).get();
        for (const userDoc of usersSnap.docs) {
          const u = userDoc.data();
          nicoUsers.push({
            name: u.name,
            subscriptionToken: u.subscriptionToken,
            isActive: u.isActive,
          });
        }
      }
    }

    // Get current remote users
    const remoteUsers = await client.listUsers();
    const remoteMap = new Map(remoteUsers.map((u) => [u.username, u]));

    const results = { created: 0, updated: 0, deleted: 0, errors: [] as string[] };
    const nicoUsernames = new Set(nicoUsers.filter((u) => u.isActive).map((u) => u.name));

    // Create or update NicoNeco users on Marzban
    for (const user of nicoUsers) {
      if (!user.isActive) continue;

      try {
        const remote = remoteMap.get(user.name);
        if (!remote) {
          // Create user on Marzban
          await client.createUser(user.name, user.subscriptionToken);
          results.created++;
        } else {
          // Check if uuid matches - if not, update
          const needsUpdate = Object.values(remote.proxies).some((p: any) => {
            if (p.id && p.id !== user.subscriptionToken) return true;
            if (p.password && p.password !== user.subscriptionToken) return true;
            return false;
          });

          if (needsUpdate) {
            await client.modifyUser(user.name, user.subscriptionToken);
            results.updated++;
          }
        }
      } catch (err: any) {
        results.errors.push(`${user.name}: ${err.message}`);
      }
    }

    // Delete remote users that don't exist in NicoNeco (or are inactive)
    for (const [remoteUsername] of remoteMap) {
      // Skip the admin user itself
      if (remoteUsername === source.credentials.username) continue;

      if (!nicoUsernames.has(remoteUsername)) {
        try {
          await client.deleteUser(remoteUsername);
          results.deleted++;
        } catch (err: any) {
          results.errors.push(`delete ${remoteUsername}: ${err.message}`);
        }
      }
    }

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: `Sync failed: ${err.message}` });
  }
});

export default router;
