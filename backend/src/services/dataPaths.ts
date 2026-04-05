import path from 'path';
import fs from 'fs/promises';

/**
 * Centralized on-disk storage paths for NicoNeco data.
 * Layout:
 *   backend/data/
 *     rule-providers/<categoryId>/<providerId>.json     parsed rules + metadata
 *     user-configs/<slug>.yaml                          cached per-user Clash config
 */
const DATA_ROOT = path.resolve(__dirname, '..', '..', 'data');
const RULE_PROVIDERS_DIR = path.join(DATA_ROOT, 'rule-providers');
const USER_CONFIGS_DIR = path.join(DATA_ROOT, 'user-configs');

export function getRuleProviderDir(categoryId: string): string {
  return path.join(RULE_PROVIDERS_DIR, categoryId);
}

export function getRuleProviderFile(categoryId: string, providerId: string): string {
  return path.join(RULE_PROVIDERS_DIR, categoryId, `${providerId}.json`);
}

export function getUserConfigsDir(): string {
  return USER_CONFIGS_DIR;
}

export function getUserConfigFile(slug: string): string {
  return path.join(USER_CONFIGS_DIR, `${slug}.yaml`);
}

/**
 * Ensure the base data directories exist. Called on server start.
 */
export async function ensureDataDirs(): Promise<void> {
  await fs.mkdir(RULE_PROVIDERS_DIR, { recursive: true });
  await fs.mkdir(USER_CONFIGS_DIR, { recursive: true });
}

/**
 * Slugify a string for use as a filename (lowercase, alphanum + hyphen).
 */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'user'
  );
}
