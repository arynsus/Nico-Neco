import { Router } from 'express';
import fs from 'fs/promises';
import { db } from '../config/firebase';
import { generateAndCacheUserConfig, generateClashConfig } from '../services/configGenerator';
import { getUserConfigFile, slugify } from '../services/dataPaths';

const router = Router();

/**
 * Public subscription endpoint.
 * Users add this URL to their Clash client: /sub/{token}
 * Serves the pre-built YAML from disk cache for minimum latency.
 * If the cache is missing, builds it on-demand and caches it.
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const snapshot = await db
      .collection('users')
      .where('subscriptionToken', '==', token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).send('# Invalid subscription token');
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    if (user.isActive === false) {
      return res.status(403).send('# Subscription is inactive');
    }

    const slug = slugify(user.name || 'user');
    const file = getUserConfigFile(slug);

    // Try cache first
    let yamlConfig: string;
    try {
      yamlConfig = await fs.readFile(file, 'utf-8');
    } catch {
      // Cache miss: build on demand and cache it
      try {
        await generateAndCacheUserConfig(userDoc.id);
        yamlConfig = await fs.readFile(file, 'utf-8');
      } catch (err: any) {
        // Last-ditch: generate without caching
        yamlConfig = await generateClashConfig(userDoc.id);
      }
    }

    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${slug}.yaml"`);
    res.setHeader('Profile-Update-Interval', '6');
    res.setHeader(
      'Subscription-Userinfo',
      `upload=0; download=0; total=0; expire=0`,
    );

    return res.send(yamlConfig);
  } catch (err: any) {
    console.error('Subscription error:', err);
    return res.status(500).send(`# Error generating config: ${err.message}`);
  }
});

export default router;
