import { Router } from 'express';
import fs from 'fs/promises';
import { db } from '../config/firebase';
import { requireAuth } from '../middleware/auth';
import { generateAndCacheUserConfig } from '../services/configGenerator';
import { getUserConfigFile, slugify } from '../services/dataPaths';

const router = Router();

/**
 * Rebuild cached YAML for all users.
 * Returns counts and any per-user errors. Safe to call repeatedly.
 */
router.post('/rebuild-all', requireAuth, async (_req, res) => {
  try {
    const snap = await db.collection('users').get();
    const results: { userId: string; name: string; slug?: string; error?: string }[] = [];
    let success = 0;
    let failed = 0;

    for (const doc of snap.docs) {
      const user = doc.data();
      try {
        const slug = await generateAndCacheUserConfig(doc.id);
        results.push({ userId: doc.id, name: user.name, slug });
        success += 1;
      } catch (err: any) {
        results.push({ userId: doc.id, name: user.name, error: err.message });
        failed += 1;
      }
    }

    res.json({ total: snap.size, success, failed, results });
  } catch (err: any) {
    res.status(500).json({ error: `Rebuild failed: ${err.message}` });
  }
});

/**
 * Rebuild cached YAML for a single user.
 */
router.post('/rebuild/:userId', requireAuth, async (req, res) => {
  try {
    const slug = await generateAndCacheUserConfig(req.params.userId);
    const file = getUserConfigFile(slug);
    const stat = await fs.stat(file);
    res.json({
      success: true,
      slug,
      filename: `${slug}.yaml`,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: `Rebuild failed: ${err.message}` });
  }
});

/**
 * Return cache status (mtime, size) for every user.
 */
router.get('/status', requireAuth, async (_req, res) => {
  try {
    const snap = await db.collection('users').get();
    const results = await Promise.all(
      snap.docs.map(async (doc) => {
        const user = doc.data();
        const slug = slugify(user.name || 'user');
        const file = getUserConfigFile(slug);
        try {
          const stat = await fs.stat(file);
          return {
            userId: doc.id,
            name: user.name,
            slug,
            filename: `${slug}.yaml`,
            exists: true,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          };
        } catch {
          return {
            userId: doc.id,
            name: user.name,
            slug,
            filename: `${slug}.yaml`,
            exists: false,
            size: 0,
            modifiedAt: null,
          };
        }
      }),
    );
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: `Status failed: ${err.message}` });
  }
});

export default router;
