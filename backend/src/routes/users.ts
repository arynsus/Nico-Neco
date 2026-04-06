import { Router } from 'express';
import { db, rowToUser, rowToSource, rowToTier } from '../config/database';
import { requireAuth } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { MarzbanClient } from '../services/marzbanClient';

/**
 * Helper: find all active Marzban sources that the user's tier allows,
 * then create/update the user on each of them.
 */
async function syncUserToMarzbanSources(userName: string, uuid: string, tierId: string) {
  const tierRow = db.prepare('SELECT * FROM tiers WHERE id = ?').get(tierId) as any;
  if (!tierRow) return;
  const tier = rowToTier(tierRow);

  for (const sourceId of tier.allowedSourceIds) {
    const sourceRow = db.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId) as any;
    if (!sourceRow) continue;
    const source = rowToSource(sourceRow);
    if (source.type !== 'marzban' || !source.credentials || !source.isActive) continue;

    try {
      const client = new MarzbanClient(source.url, source.credentials.username, source.credentials.password);
      const existing = await client.getUser(userName);
      if (existing) {
        await client.modifyUser(userName, uuid);
      } else {
        await client.createUser(userName, uuid);
      }
    } catch (err: any) {
      console.error(`Failed to sync user ${userName} to Marzban ${source.name}: ${err.message}`);
    }
  }
}

/**
 * Helper: delete a user from all Marzban sources accessible via their tier.
 */
async function removeUserFromMarzbanSources(userName: string, tierId: string) {
  const tierRow = db.prepare('SELECT * FROM tiers WHERE id = ?').get(tierId) as any;
  if (!tierRow) return;
  const tier = rowToTier(tierRow);

  for (const sourceId of tier.allowedSourceIds) {
    const sourceRow = db.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId) as any;
    if (!sourceRow) continue;
    const source = rowToSource(sourceRow);
    if (source.type !== 'marzban' || !source.credentials || !source.isActive) continue;

    try {
      const client = new MarzbanClient(source.url, source.credentials.username, source.credentials.password);
      await client.deleteUser(userName);
    } catch (err: any) {
      console.error(`Failed to remove user ${userName} from Marzban ${source.name}: ${err.message}`);
    }
  }
}

const router = Router();

// List all users
router.get('/', requireAuth, (req, res) => {
  try {
    const { tierId, search } = req.query;

    let rows: any[];
    if (tierId) {
      rows = db.prepare('SELECT * FROM users WHERE tier_id = ? ORDER BY created_at DESC').all(tierId as string);
    } else {
      rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    }

    let users = rows.map(rowToUser);

    if (search) {
      const s = (search as string).toLowerCase();
      users = users.filter(
        (u) => u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s),
      );
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get a single user
router.get('/:id', requireAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json(rowToUser(row));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create a user
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, email, tierId, note } = req.body;
    if (!name || !tierId) {
      return res.status(400).json({ error: 'name and tierId are required' });
    }

    // Verify tier exists
    const tierRow = db.prepare('SELECT id FROM tiers WHERE id = ?').get(tierId) as any;
    if (!tierRow) {
      return res.status(400).json({ error: 'Tier not found' });
    }

    const id = uuidv4();
    const subscriptionToken = uuidv4();
    const createdAt = new Date().toISOString();

    db.prepare(
      'INSERT INTO users (id, name, email, tier_id, subscription_token, is_active, note, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
    ).run(id, name, email || '', tierId, subscriptionToken, note || '', createdAt);

    await syncUserToMarzbanSources(name, subscriptionToken, tierId);

    res.status(201).json({ id, name, email: email || '', tierId, subscriptionToken, isActive: true, note: note || '', createdAt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update a user
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: 'User not found' });

    // Verify tier exists if changing
    if (req.body.tierId !== undefined) {
      const tierRow = db.prepare('SELECT id FROM tiers WHERE id = ?').get(req.body.tierId) as any;
      if (!tierRow) {
        return res.status(400).json({ error: 'Tier not found' });
      }
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name', email: 'email', tierId: 'tier_id',
      isActive: 'is_active', note: 'note',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (req.body[key] !== undefined) {
        setClauses.push(`${col} = ?`);
        values.push(key === 'isActive' ? (req.body[key] ? 1 : 0) : req.body[key]);
      }
    }

    if (setClauses.length > 0) {
      values.push(req.params.id);
      db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
    res.json(rowToUser(updated));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete a user
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'User not found' });

    await removeUserFromMarzbanSources(row.name, row.tier_id);

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Regenerate subscription token
router.post('/:id/regenerate-token', requireAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'User not found' });

    const newToken = uuidv4();
    db.prepare('UPDATE users SET subscription_token = ? WHERE id = ?').run(newToken, req.params.id);
    res.json({ subscriptionToken: newToken });
  } catch (err) {
    res.status(500).json({ error: 'Failed to regenerate token' });
  }
});

export default router;
