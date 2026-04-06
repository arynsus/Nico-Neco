import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../config/database';
import { signToken, requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();

// Login with username & password
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const row = db.prepare('SELECT * FROM admins WHERE username = ? LIMIT 1').get(username) as any;
    if (!row) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken({ id: row.id, username: row.username });
    return res.json({ token, admin: { id: row.id, username: row.username } });
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
    const row = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.adminId!) as any;
    if (!row) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const valid = await bcrypt.compare(currentPassword, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(passwordHash, req.adminId!);

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
