import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../config/firebase';
import { signToken, requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();

// Login with username & password
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const snapshot = await db.collection('admins').where('username', '==', username).limit(1).get();
    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const doc = snapshot.docs[0];
    const admin = doc.data();
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken({ id: doc.id, username: admin.username });
    return res.json({
      token,
      admin: { id: doc.id, username: admin.username },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify current token is valid
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  return res.json({ id: req.adminId, username: req.adminUsername });
});

// Change password
router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }

  try {
    const doc = await db.collection('admins').doc(req.adminId!).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = doc.data()!;
    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.collection('admins').doc(req.adminId!).update({ passwordHash });

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
