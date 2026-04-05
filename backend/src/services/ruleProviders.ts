import fs from 'fs/promises';
import yaml from 'js-yaml';
import { RuleEntry, RuleType } from '../types';
import { getRuleProviderDir, getRuleProviderFile } from './dataPaths';

/**
 * The complete set of Clash rule types we accept. Anything else (e.g. IP-ASN,
 * AND, OR, NOT, provider-specific extensions) is dropped during parsing so it
 * never enters a cache file or a generated user config.
 */
const VALID_RULE_TYPES: ReadonlySet<string> = new Set<RuleType>([
  'DOMAIN',
  'DOMAIN-SUFFIX',
  'DOMAIN-KEYWORD',
  'GEOIP',
  'IP-CIDR',
  'IP-CIDR6',
  'SRC-IP-CIDR',
  'SRC-PORT',
  'DST-PORT',
  'PROCESS-NAME',
  'PROCESS-PATH',
  'IPSET',
  'RULE-SET',
  'SCRIPT',
  'MATCH',
]);

export function isValidRuleType(t: string): t is RuleType {
  return VALID_RULE_TYPES.has(t);
}

interface ParseResult {
  rules: RuleEntry[];
  skipped: number;
}

export interface ProviderCacheFile {
  url: string;
  fetchedAt: string;
  rules: RuleEntry[];
  skipped: number;
}

export interface ProviderStatus {
  exists: boolean;
  lastFetched: string | null;
  ruleCount: number;
  skipped: number;
  fileSize: number | null;
}

/**
 * Parse text content from a rule provider URL into RuleEntry list.
 * STRICT: any line whose prefix is not in VALID_RULE_TYPES is dropped
 * (counted as "skipped") so unsupported types like IP-ASN never reach the
 * cache or a generated user config.
 *
 * Supports:
 *   - YAML `payload:` lists with `- TYPE,VALUE` entries (blackmatrix7 format)
 *   - Plain Clash rule lines (TYPE,VALUE[,policy])
 */
export function parseProviderContent(text: string): ParseResult {
  const rules: RuleEntry[] = [];
  let skipped = 0;

  // Try YAML parse first — blackmatrix7 files use `payload:`.
  let yamlUsed = false;
  try {
    const parsed = yaml.load(text) as { payload?: unknown };
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).payload)) {
      yamlUsed = true;
      for (const item of (parsed as any).payload as unknown[]) {
        if (typeof item !== 'string') {
          skipped += 1;
          continue;
        }
        const entry = parseRuleLine(item);
        if (entry) rules.push(entry);
        else skipped += 1;
      }
    }
  } catch {
    // fall through to line-based parsing
  }

  if (!yamlUsed) {
    for (const rawLine of text.split(/\r?\n/)) {
      let line = rawLine.trim();
      if (!line || line.startsWith('#') || line.toLowerCase() === 'payload:') continue;
      if (line.startsWith('- ')) line = line.slice(2).trim();
      const entry = parseRuleLine(line);
      if (entry) rules.push(entry);
      else skipped += 1;
    }
  }

  return { rules, skipped };
}

/**
 * Parse a single rule line. Returns null (and caller counts as skipped) if
 * the line has no comma, has an unrecognized type prefix, or has no value.
 */
function parseRuleLine(line: string): RuleEntry | null {
  line = line.trim();
  if (!line) return null;

  const commaIdx = line.indexOf(',');
  if (commaIdx <= 0) return null; // must be TYPE,VALUE form

  const possibleType = line.slice(0, commaIdx).toUpperCase();
  if (!isValidRuleType(possibleType)) return null;

  let value = line.slice(commaIdx + 1).trim();
  if (!value) return null;

  // Strip trailing ",no-resolve" or ",<policy>" tokens.
  value = value.replace(/,(no-resolve|DIRECT|REJECT|PROXY)$/i, '').trim();
  if (!value) return null;

  return { type: possibleType, value };
}

/**
 * Fetch a provider URL, parse it, and save to disk.
 * Returns the resulting status.
 */
export async function fetchAndCacheProvider(
  categoryId: string,
  providerId: string,
  url: string,
): Promise<ProviderStatus> {
  const response = await fetch(url, { headers: { 'User-Agent': 'NicoNeco/1.0' } });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const { rules, skipped } = parseProviderContent(text);

  const dir = getRuleProviderDir(categoryId);
  await fs.mkdir(dir, { recursive: true });
  const file = getRuleProviderFile(categoryId, providerId);
  const payload: ProviderCacheFile = {
    url,
    fetchedAt: new Date().toISOString(),
    rules,
    skipped,
  };
  await fs.writeFile(file, JSON.stringify(payload), 'utf-8');

  return readProviderStatus(categoryId, providerId);
}

/**
 * Read a provider's cached rules. Returns empty list if not fetched yet.
 */
export async function readProviderRules(
  categoryId: string,
  providerId: string,
): Promise<RuleEntry[]> {
  try {
    const file = getRuleProviderFile(categoryId, providerId);
    const raw = await fs.readFile(file, 'utf-8');
    const parsed = JSON.parse(raw) as ProviderCacheFile;
    return Array.isArray(parsed.rules) ? parsed.rules : [];
  } catch {
    return [];
  }
}

/**
 * Read on-disk metadata for a provider (mtime, rule count, size).
 */
export async function readProviderStatus(
  categoryId: string,
  providerId: string,
): Promise<ProviderStatus> {
  const file = getRuleProviderFile(categoryId, providerId);
  try {
    const [stat, raw] = await Promise.all([fs.stat(file), fs.readFile(file, 'utf-8')]);
    const parsed = JSON.parse(raw) as ProviderCacheFile;
    return {
      exists: true,
      lastFetched: stat.mtime.toISOString(),
      ruleCount: Array.isArray(parsed.rules) ? parsed.rules.length : 0,
      skipped: typeof parsed.skipped === 'number' ? parsed.skipped : 0,
      fileSize: stat.size,
    };
  } catch {
    return { exists: false, lastFetched: null, ruleCount: 0, skipped: 0, fileSize: null };
  }
}

/**
 * Remove a provider's cache file (best-effort).
 */
export async function deleteProviderCache(
  categoryId: string,
  providerId: string,
): Promise<void> {
  try {
    await fs.unlink(getRuleProviderFile(categoryId, providerId));
  } catch {
    // ignore
  }
}

/**
 * Best-effort remove of an entire category's provider directory.
 */
export async function deleteCategoryProviderDir(categoryId: string): Promise<void> {
  try {
    await fs.rm(getRuleProviderDir(categoryId), { recursive: true, force: true });
  } catch {
    // ignore
  }
}

/**
 * Get statuses for all providers in a category (lookup each by id).
 */
export async function getCategoryProviderStatuses(
  categoryId: string,
  providerIds: string[],
): Promise<Record<string, ProviderStatus>> {
  const out: Record<string, ProviderStatus> = {};
  await Promise.all(
    providerIds.map(async (pid) => {
      out[pid] = await readProviderStatus(categoryId, pid);
    }),
  );
  return out;
}

