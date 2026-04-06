import { Router } from 'express';
import { db, rowToTier } from '../config/database';
import { requireAuth } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// List all tiers
router.get('/', requireAuth, (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM tiers ORDER BY created_at').all() as any[];
    res.json(rows.map(rowToTier));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tiers' });
  }
});

// Create a tier
router.post('/', requireAuth, (req, res) => {
  try {
    const { name, description, allowedSourceIds, icon, color, isDefault } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Unset other defaults if this is the new default
    if (isDefault) {
      db.prepare('UPDATE tiers SET is_default = 0 WHERE is_default = 1').run();
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    db.prepare(
      'INSERT INTO tiers (id, name, description, allowed_source_ids, icon, color, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      id, name, description || '',
      JSON.stringify(allowedSourceIds || []),
      icon || 'coffee', color || 'primary',
      isDefault ? 1 : 0,
      createdAt,
    );

    res.status(201).json({ id, name, description: description || '', allowedSourceIds: allowedSourceIds || [], icon: icon || 'coffee', color: color || 'primary', isDefault: !!isDefault, createdAt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tier' });
  }
});

// Update a tier
router.put('/:id', requireAuth, (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM tiers WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: 'Tier not found' });

    // Unset other defaults if this is becoming the default
    if (req.body.isDefault) {
      db.prepare('UPDATE tiers SET is_default = 0 WHERE is_default = 1 AND id != ?').run(req.params.id);
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name', description: 'description', allowedSourceIds: 'allowed_source_ids',
      icon: 'icon', color: 'color', isDefault: 'is_default',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (req.body[key] !== undefined) {
        setClauses.push(`${col} = ?`);
        if (key === 'isDefault') {
          values.push(req.body[key] ? 1 : 0);
        } else if (key === 'allowedSourceIds') {
          values.push(JSON.stringify(req.body[key]));
        } else {
          values.push(req.body[key]);
        }
      }
    }

    if (setClauses.length > 0) {
      values.push(req.params.id);
      db.prepare(`UPDATE tiers SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM tiers WHERE id = ?').get(req.params.id) as any;
    res.json(rowToTier(updated));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

// Delete a tier
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT id FROM tiers WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Tier not found' });

    const userOnTier = db.prepare('SELECT id FROM users WHERE tier_id = ? LIMIT 1').get(req.params.id) as any;
    if (userOnTier) {
      return res.status(400).json({ error: 'Cannot delete a tier with users assigned to it' });
    }

    db.prepare('DELETE FROM tiers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tier' });
  }
});

export default router;
