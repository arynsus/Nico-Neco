import express from 'express';
import cors from 'cors';

import { ensureDefaultAdmin } from './config/database';
import { ensureDataDirs } from './services/dataPaths';
import authRoutes from './routes/auth';
import sourcesRoutes from './routes/sources';
import tiersRoutes from './routes/tiers';
import usersRoutes from './routes/users';
import rulesRoutes from './routes/rules';
import configsRoutes from './routes/configs';
import subscriptionRoutes from './routes/subscription';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sources', sourcesRoutes);
app.use('/api/tiers', tiersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/configs', configsRoutes);

// Public subscription endpoint
app.use('/sub', subscriptionRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  await ensureDataDirs();
  await ensureDefaultAdmin();
  app.listen(PORT, () => {
    console.log(`NicoNeco backend running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
