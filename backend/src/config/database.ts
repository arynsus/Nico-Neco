import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import type { RuleProvider, RuleEntry, ProxyNode } from '../types';

const DATA_DIR = process.env.DATA_DIR ||
  (process.env.NODE_ENV === 'production' ? '/app/data' : path.join(process.cwd(), 'data'));
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'nico-neco.db');

export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for better write performance; enable foreign keys
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id           TEXT PRIMARY KEY,
    username     TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id                 TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    email              TEXT NOT NULL DEFAULT '',
    tier_id            TEXT NOT NULL,
    subscription_token TEXT UNIQUE NOT NULL,
    is_active          INTEGER NOT NULL DEFAULT 1,
    note               TEXT NOT NULL DEFAULT '',
    created_at         TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sources (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    type           TEXT NOT NULL,
    url            TEXT NOT NULL,
    credentials    TEXT,
    is_active      INTEGER NOT NULL DEFAULT 1,
    last_fetched   TEXT,
    proxy_count    INTEGER NOT NULL DEFAULT 0,
    cached_proxies TEXT NOT NULL DEFAULT '[]',
    tags           TEXT NOT NULL DEFAULT '[]',
    created_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tiers (
    id                 TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    description        TEXT NOT NULL DEFAULT '',
    allowed_source_ids TEXT NOT NULL DEFAULT '[]',
    icon               TEXT NOT NULL DEFAULT 'coffee',
    color              TEXT NOT NULL DEFAULT 'primary',
    is_default         INTEGER NOT NULL DEFAULT 0,
    created_at         TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS service_categories (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    icon           TEXT NOT NULL DEFAULT 'category',
    description    TEXT NOT NULL DEFAULT '',
    rule_providers TEXT NOT NULL DEFAULT '[]',
    extra_rules    TEXT NOT NULL DEFAULT '[]',
    order_num      INTEGER NOT NULL DEFAULT 99,
    created_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ─── Row deserializers ────────────────────────────────────────────────────────

export function rowToUser(row: any) {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    tierId: row.tier_id as string,
    subscriptionToken: row.subscription_token as string,
    isActive: row.is_active === 1,
    note: row.note as string,
    createdAt: row.created_at as string,
  };
}

export function rowToSource(row: any) {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as string,
    url: row.url as string,
    credentials: row.credentials ? JSON.parse(row.credentials) as { username: string; password: string } : null,
    isActive: row.is_active === 1,
    lastFetched: row.last_fetched as string | null,
    proxyCount: row.proxy_count as number,
    cachedProxies: JSON.parse(row.cached_proxies) as ProxyNode[],
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at as string,
  };
}

export function rowToTier(row: any) {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    allowedSourceIds: JSON.parse(row.allowed_source_ids) as string[],
    icon: row.icon as string,
    color: row.color as string,
    isDefault: row.is_default === 1,
    createdAt: row.created_at as string,
  };
}

export function rowToCategory(row: any) {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    description: row.description as string,
    ruleProviders: JSON.parse(row.rule_providers) as RuleProvider[],
    extraRules: JSON.parse(row.extra_rules) as RuleEntry[],
    order: row.order_num as number,
    createdAt: row.created_at as string,
  };
}

// ─── Firebase export auto-import ─────────────────────────────────────────────

function maybeImportFromFirebase() {
  const exportFile = path.join(DATA_DIR, 'firebase-export.json');
  if (!fs.existsSync(exportFile)) return;

  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  const tierCount = (db.prepare('SELECT COUNT(*) as count FROM tiers').get() as any).count;
  const catCount  = (db.prepare('SELECT COUNT(*) as count FROM service_categories').get() as any).count;

  if (userCount > 0 || tierCount > 0 || catCount > 0) {
    console.log('Database already has data — skipping firebase-export.json import.');
    return;
  }

  console.log('Found firebase-export.json. Importing Firestore data into SQLite...');

  let data: any;
  try {
    data = JSON.parse(fs.readFileSync(exportFile, 'utf-8'));
  } catch (err) {
    console.error('Failed to parse firebase-export.json:', err);
    return;
  }

  try {
    db.exec('BEGIN');
    // Admins
    for (const a of (data.admins || [])) {
      db.prepare(`INSERT OR IGNORE INTO admins (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)`)
        .run(a.id || uuidv4(), a.username, a.passwordHash, a.createdAt || new Date().toISOString());
    }
    // Users
    for (const u of (data.users || [])) {
      db.prepare(`INSERT OR IGNORE INTO users (id, name, email, tier_id, subscription_token, is_active, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(u.id || uuidv4(), u.name, u.email || '', u.tierId, u.subscriptionToken, u.isActive !== false ? 1 : 0, u.note || '', u.createdAt || new Date().toISOString());
    }
    // Sources
    for (const s of (data.sources || [])) {
      db.prepare(`INSERT OR IGNORE INTO sources (id, name, type, url, credentials, is_active, last_fetched, proxy_count, cached_proxies, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          s.id || uuidv4(), s.name, s.type, s.url,
          s.credentials ? JSON.stringify(s.credentials) : null,
          s.isActive !== false ? 1 : 0,
          s.lastFetched || null,
          s.proxyCount || 0,
          JSON.stringify(s.cachedProxies || []),
          JSON.stringify(s.tags || []),
          s.createdAt || new Date().toISOString(),
        );
    }
    // Tiers
    for (const t of (data.tiers || [])) {
      db.prepare(`INSERT OR IGNORE INTO tiers (id, name, description, allowed_source_ids, icon, color, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          t.id || uuidv4(), t.name, t.description || '',
          JSON.stringify(t.allowedSourceIds || []),
          t.icon || 'coffee', t.color || 'primary',
          t.isDefault ? 1 : 0,
          t.createdAt || new Date().toISOString(),
        );
    }
    // Service categories
    for (const c of (data.serviceCategories || [])) {
      const extraRules = Array.isArray(c.extraRules) ? c.extraRules : (Array.isArray(c.rules) ? c.rules : []);
      db.prepare(`INSERT OR IGNORE INTO service_categories (id, name, icon, description, rule_providers, extra_rules, order_num, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          c.id || uuidv4(), c.name, c.icon || 'category', c.description || '',
          JSON.stringify(c.ruleProviders || []),
          JSON.stringify(extraRules),
          typeof c.order === 'number' ? c.order : 99,
          c.createdAt || new Date().toISOString(),
        );
    }
    db.exec('COMMIT');
    // Rename to prevent re-import on next restart
    fs.renameSync(exportFile, exportFile.replace('.json', '.imported.json'));
    console.log('Firebase data imported successfully. File renamed to firebase-export.imported.json');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Failed to import Firebase data:', err);
  }
}

maybeImportFromFirebase();

// ─── Local network rules ──────────────────────────────────────────────────────

export const DEFAULT_LOCAL_NETWORK_RULES: RuleEntry[] = [
  { type: 'IP-CIDR',        value: '127.0.0.0/8' },
  { type: 'IP-CIDR',        value: '192.168.0.0/16' },
  { type: 'IP-CIDR',        value: '10.0.0.0/8' },
  { type: 'IP-CIDR',        value: '172.16.0.0/12' },
  { type: 'IP-CIDR',        value: '100.64.0.0/10' },
  { type: 'IP-CIDR6',       value: '::1/128' },
  { type: 'IP-CIDR6',       value: 'fc00::/7' },
  { type: 'IP-CIDR6',       value: 'fe80::/10' },
  { type: 'DOMAIN-SUFFIX',  value: 'mirhardt.com' },
];

// Seed defaults on first run
const existing = db.prepare("SELECT value FROM settings WHERE key = 'local_network_rules'").get();
if (!existing) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('local_network_rules', ?)")
    .run(JSON.stringify(DEFAULT_LOCAL_NETWORK_RULES));
}

export function getLocalNetworkRules(): RuleEntry[] {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'local_network_rules'").get() as any;
  return row ? JSON.parse(row.value) as RuleEntry[] : [...DEFAULT_LOCAL_NETWORK_RULES];
}

export function setLocalNetworkRules(rules: RuleEntry[]): void {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('local_network_rules', ?)")
    .run(JSON.stringify(rules));
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

export async function ensureDefaultAdmin() {
  const existing = db.prepare('SELECT id FROM admins LIMIT 1').get();
  if (!existing) {
    const passwordHash = await bcrypt.hash('admin', 12);
    db.prepare('INSERT INTO admins (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), 'admin', passwordHash, new Date().toISOString());
    console.log('Default admin created (username: admin, password: admin)');
    console.log('⚠️  Please change the default password after first login!');
  }
}
