import { Router } from 'express';
import { db } from '../config/firebase';
import { generateClashConfig } from '../services/configGenerator';

const router = Router();

/**
 * Public subscription endpoint.
 * Users add this URL to their Clash client: /sub/{token}
 * No authentication required - the token IS the auth.
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find user by subscription token
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

    if (!user.isActive) {
      return res.status(403).send('# Subscription is inactive');
    }

    // Generate the Clash config
    const yamlConfig = await generateClashConfig(userDoc.id);

    // Set appropriate headers for Clash client
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="clash-config.yaml"`);
    res.setHeader('Profile-Update-Interval', '6'); // hours
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
