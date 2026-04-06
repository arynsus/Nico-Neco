import { Router } from 'express';
import fs from 'fs/promises';
import { db } from '../config/database';
import { requireAuth } from '../middleware/auth';
import { generateAndCacheUserConfig } from '../services/configGenerator';
import { getUserConfigFile, slugify } from '../services/dataPaths';

const router = Router();

/**
 * Rebuild cached YAML for all users.
 */
router.post('/rebuild-all', requireAuth, async (_req, res) => {
  try {
    const rows = db.prepare('SELECT id, name FROM users').all() as any[];
    const results: { userId: string; name: string; slug?: string; error?: string }[] = [];
    let success = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const slug = await generateAndCacheUserConfig(row.id);
        results.push({ userId: row.id, name: row.name, slug });
        success += 1;
      } catch (err: any) {
        results.push({ userId: row.id, name: row.name, error: err.message });
        failed += 1;
      }
    }

    res.json({ total: rows.length, success, failed, results });
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
    const rows = db.prepare('SELECT id, name FROM users').all() as any[];
    const results = await Promise.all(
      rows.map(async (row) => {
        const slug = slugify(row.name || 'user');
        const file = getUserConfigFile(slug);
        try {
          const stat = await fs.stat(file);
          return { userId: row.id, name: row.name, slug, filename: `${slug}.yaml`, exists: true, size: stat.size, modifiedAt: stat.mtime.toISOString() };
        } catch {
          return { userId: row.id, name: row.name, slug, filename: `${slug}.yaml`, exists: false, size: 0, modifiedAt: null };
        }
      }),
    );
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: `Status failed: ${err.message}` });
  }
});

export default router;
