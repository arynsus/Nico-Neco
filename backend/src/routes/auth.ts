import { Router } from 'express';
import { auth } from '../config/firebase';

const router = Router();

// Verify a Firebase ID token and return user info
router.post('/verify', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    return res.json({
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
    });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
