import { Router } from 'express';
import { db } from '../config/firebase';
import { requireAuth } from '../middleware/auth';
import { Tier } from '../types';

const router = Router();

// List all tiers
router.get('/', requireAuth, async (_req, res) => {
  try {
    const snapshot = await db.collection('tiers').orderBy('createdAt').get();
    const tiers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(tiers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tiers' });
  }
});

// Create a tier
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, allowedSourceIds, icon, color, isDefault } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    // If this is set as default, unset other defaults
    if (isDefault) {
      const existing = await db.collection('tiers').where('isDefault', '==', true).get();
      const batch = db.batch();
      existing.docs.forEach((doc) => batch.update(doc.ref, { isDefault: false }));
      await batch.commit();
    }

    const tier: Omit<Tier, 'id'> = {
      name,
      description: description || '',
      allowedSourceIds: allowedSourceIds || [],
      icon: icon || 'coffee',
      color: color || 'primary',
      isDefault: isDefault || false,
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection('tiers').add(tier);
    res.status(201).json({ id: ref.id, ...tier });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tier' });
  }
});

// Update a tier
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('tiers').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Tier not found' });

    const updates: Partial<Tier> = {};
    const allowed = ['name', 'description', 'allowedSourceIds', 'icon', 'color', 'isDefault'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (updates as Record<string, unknown>)[key] = req.body[key];
      }
    }

    // If this is set as default, unset other defaults
    if (updates.isDefault) {
      const existing = await db.collection('tiers').where('isDefault', '==', true).get();
      const batch = db.batch();
      existing.docs.forEach((d) => {
        if (d.id !== req.params.id) batch.update(d.ref, { isDefault: false });
      });
      await batch.commit();
    }

    await db.collection('tiers').doc(req.params.id).update(updates);
    const updated = await db.collection('tiers').doc(req.params.id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

// Delete a tier
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('tiers').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Tier not found' });

    // Check no users are on this tier
    const usersOnTier = await db.collection('users').where('tierId', '==', req.params.id).limit(1).get();
    if (!usersOnTier.empty) {
      return res.status(400).json({ error: 'Cannot delete a tier with users assigned to it' });
    }

    await db.collection('tiers').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tier' });
  }
});

export default router;
