import { Router } from 'express';
import { db } from '../config/firebase';
import { requireAuth } from '../middleware/auth';
import { ServiceCategory } from '../types';
import { generatePreviewConfig } from '../services/configGenerator';

const router = Router();

// List all service categories
router.get('/', requireAuth, async (_req, res) => {
  try {
    const snapshot = await db.collection('serviceCategories').orderBy('order').get();
    const categories = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get a single service category
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('serviceCategories').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Category not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create a service category
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, icon, groupType, description, rules, order } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const category: Omit<ServiceCategory, 'id'> = {
      name,
      icon: icon || 'category',
      groupType: groupType || 'select',
      description: description || '',
      rules: rules || [],
      order: order ?? 99,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection('serviceCategories').add(category);
    res.status(201).json({ id: ref.id, ...category });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a service category
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('serviceCategories').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Category not found' });

    const updates: Partial<ServiceCategory> = {};
    const allowed = ['name', 'icon', 'groupType', 'description', 'rules', 'order'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (updates as Record<string, unknown>)[key] = req.body[key];
      }
    }

    await db.collection('serviceCategories').doc(req.params.id).update(updates);
    const updated = await db.collection('serviceCategories').doc(req.params.id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a service category
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('serviceCategories').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Category not found' });

    const data = doc.data() as ServiceCategory;
    if (data.isBuiltIn) {
      return res.status(400).json({ error: 'Cannot delete built-in categories' });
    }

    await db.collection('serviceCategories').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Preview the generated Clash config
router.get('/config/preview', requireAuth, async (_req, res) => {
  try {
    const yamlConfig = await generatePreviewConfig();
    res.type('text/yaml').send(yamlConfig);
  } catch (err: any) {
    res.status(500).json({ error: `Preview failed: ${err.message}` });
  }
});

export default router;
