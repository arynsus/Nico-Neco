import { Router } from 'express';
import { db, rowToSource, rowToTier } from '../config/database';
import { requireAuth } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { fetchSubscriptionProxies } from '../services/sourceParser';
import { MarzbanClient } from '../services/marzbanClient';

const router = Router();

// List all sources (no cachedProxies in list view — metadata only)
router.get('/', requireAuth, (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM sources ORDER BY created_at DESC').all() as any[];
    const sources = rows.map((row) => {
      const s = rowToSource(row);
      const { cachedProxies, ...meta } = s;
      return { ...meta, proxyCount: s.proxyCount };
    });
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

// Get cached proxies for a source (must be before /:id)
router.get('/:id/proxies', requireAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT cached_proxies FROM sources WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Source not found' });
    res.json(JSON.parse(row.cached_proxies));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch proxies' });
  }
});

// Update cached proxies (must be before /:id)
router.put('/:id/proxies', requireAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT id FROM sources WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Source not found' });

    const { proxies } = req.body;
    if (!Array.isArray(proxies)) {
      return res.status(400).json({ error: 'proxies must be an array' });
    }

    db.prepare('UPDATE sources SET cached_proxies = ?, proxy_count = ? WHERE id = ?')
      .run(JSON.stringify(proxies), proxies.length, req.params.id);

    res.json({ success: true, proxyCount: proxies.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update proxies' });
  }
});

// Get a single source
router.get('/:id', requireAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM sources WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Source not found' });
    res.json(rowToSource(row));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch source' });
  }
});

// Create a new source
router.post('/', requireAuth, (req, res) => {
  try {
    const { name, type, url, credentials, tags } = req.body;
    if (!name || !type || !url) {
      return res.status(400).json({ error: 'name, type, and url are required' });
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    db.prepare(
      'INSERT INTO sources (id, name, type, url, credentials, is_active, last_fetched, proxy_count, cached_proxies, tags, created_at) VALUES (?, ?, ?, ?, ?, 1, NULL, 0, ?, ?, ?)',
    ).run(
      id, name, type, url,
      credentials ? JSON.stringify(credentials) : null,
      '[]',
      JSON.stringify(tags || []),
      createdAt,
    );

    res.status(201).json({ id, name, type, url, credentials: credentials || null, isActive: true, lastFetched: null, proxyCount: 0, tags: tags || [], createdAt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create source' });
  }
});

// Update a source
router.put('/:id', requireAuth, (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM sources WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: 'Source not found' });

    const setClauses: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name', type: 'type', url: 'url', isActive: 'is_active', tags: 'tags', credentials: 'credentials',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (req.body[key] !== undefined) {
        setClauses.push(`${col} = ?`);
        if (key === 'isActive') {
          values.push(req.body[key] ? 1 : 0);
        } else if (key === 'tags' || key === 'credentials') {
          values.push(req.body[key] !== null ? JSON.stringify(req.body[key]) : null);
        } else {
          values.push(req.body[key]);
        }
      }
    }

    if (setClauses.length > 0) {
      values.push(req.params.id);
      db.prepare(`UPDATE sources SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM sources WHERE id = ?').get(req.params.id) as any;
    const { cachedProxies, ...meta } = rowToSource(updated);
    res.json(meta);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update source' });
  }
});

// Delete a source
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT id FROM sources WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Source not found' });
    db.prepare('DELETE FROM sources WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

// Test/refresh a source — fetches proxies and caches them
router.post('/:id/test', requireAuth, async (req, res) => {
  const sourceId = req.params.id;
  try {
    const row = db.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId) as any;
    if (!row) return res.status(404).json({ error: 'Source not found' });

    const source = rowToSource(row);
    let proxies: any[] = [];

    try {
      if (source.type === 'subscription') {
        proxies = await fetchSubscriptionProxies(source.url);
      } else if (source.type === 'marzban' && source.credentials) {
        const client = new MarzbanClient(source.url, source.credentials.username, source.credentials.password);
        proxies = await client.getProxyNodes();
      }
    } catch (fetchErr: any) {
      db.prepare('UPDATE sources SET last_fetched = ?, is_active = 0 WHERE id = ?')
        .run(new Date().toISOString(), sourceId);
      return res.status(500).json({ error: `Test failed: ${fetchErr.message}` });
    }

    db.prepare('UPDATE sources SET last_fetched = ?, proxy_count = ?, cached_proxies = ?, is_active = ? WHERE id = ?')
      .run(new Date().toISOString(), proxies.length, JSON.stringify(proxies), proxies.length > 0 ? 1 : 0, sourceId);

    res.json({ success: true, proxyCount: proxies.length, isActive: proxies.length > 0 });
  } catch (err: any) {
    res.status(500).json({ error: `Test failed: ${err.message}` });
  }
});

// Marzban: sync users
router.post('/:id/sync-users', requireAuth, async (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM sources WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Source not found' });

    const source = rowToSource(row);
    if (source.type !== 'marzban' || !source.credentials) {
      return res.status(400).json({ error: 'User sync is only available for Marzban sources' });
    }

    const client = new MarzbanClient(source.url, source.credentials.username, source.credentials.password);

    // Find all tiers that allow this source
    const tierRows = db.prepare('SELECT * FROM tiers').all() as any[];
    const allowedTierIds: string[] = [];
    for (const tierRow of tierRows) {
      const tier = rowToTier(tierRow);
      if (tier.allowedSourceIds.includes(req.params.id)) {
        allowedTierIds.push(tier.id);
      }
    }

    const nicoUsers: { name: string; subscriptionToken: string; isActive: boolean }[] = [];
    if (allowedTierIds.length > 0) {
      const placeholders = allowedTierIds.map(() => '?').join(',');
      const userRows = db.prepare(`SELECT * FROM users WHERE tier_id IN (${placeholders})`).all(...allowedTierIds) as any[];
      for (const u of userRows) {
        nicoUsers.push({ name: u.name, subscriptionToken: u.subscription_token, isActive: u.is_active === 1 });
      }
    }

    const remoteUsers = await client.listUsers();
    const remoteMap = new Map(remoteUsers.map((u) => [u.username, u]));

    const results = { created: 0, updated: 0, deleted: 0, errors: [] as string[] };
    const nicoUsernames = new Set(nicoUsers.filter((u) => u.isActive).map((u) => u.name));

    for (const user of nicoUsers) {
      if (!user.isActive) continue;
      try {
        const remote = remoteMap.get(user.name);
        if (!remote) {
          await client.createUser(user.name, user.subscriptionToken);
          results.created++;
        } else {
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

    for (const [remoteUsername] of remoteMap) {
      if (remoteUsername === source.credentials!.username) continue;
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
