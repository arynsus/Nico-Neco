import { Router } from 'express';
import { db } from '../config/firebase';
import { requireAuth } from '../middleware/auth';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// List all users
router.get('/', requireAuth, async (req, res) => {
  try {
    const { tierId, search } = req.query;
    let query: FirebaseFirestore.Query = db.collection('users').orderBy('createdAt', 'desc');

    if (tierId) {
      query = db.collection('users').where('tierId', '==', tierId).orderBy('createdAt', 'desc');
    }

    const snapshot = await query.get();
    let users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (search) {
      const s = (search as string).toLowerCase();
      users = users.filter(
        (u: any) =>
          u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s),
      );
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get a single user
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    res.json({ id: doc.id, ...doc.data() });
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
    const tierDoc = await db.collection('tiers').doc(tierId).get();
    if (!tierDoc.exists) {
      return res.status(400).json({ error: 'Tier not found' });
    }

    const user: Omit<User, 'id'> = {
      name,
      email: email || '',
      tierId,
      subscriptionToken: uuidv4(),
      isActive: true,
      note: note || '',
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection('users').add(user);
    res.status(201).json({ id: ref.id, ...user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update a user
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });

    const updates: Partial<User> = {};
    const allowed = ['name', 'email', 'tierId', 'isActive', 'note'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (updates as Record<string, unknown>)[key] = req.body[key];
      }
    }

    // Verify tier exists if changing
    if (updates.tierId) {
      const tierDoc = await db.collection('tiers').doc(updates.tierId).get();
      if (!tierDoc.exists) {
        return res.status(400).json({ error: 'Tier not found' });
      }
    }

    await db.collection('users').doc(req.params.id).update(updates);
    const updated = await db.collection('users').doc(req.params.id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete a user
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    await db.collection('users').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Regenerate subscription token
router.post('/:id/regenerate-token', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });

    const newToken = uuidv4();
    await db.collection('users').doc(req.params.id).update({ subscriptionToken: newToken });
    res.json({ subscriptionToken: newToken });
  } catch (err) {
    res.status(500).json({ error: 'Failed to regenerate token' });
  }
});

export default router;
