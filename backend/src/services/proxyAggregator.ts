import { db, rowToSource, rowToTier } from '../config/database';
import { ProxyNode, Tier } from '../types';

interface AggregatedResult {
  proxies: ProxyNode[];
  sourceMap: Map<string, ProxyNode[]>;
}

/**
 * Gets proxies from all active sources using their cached proxies.
 * No remote fetching — uses what's stored in SQLite.
 */
export function fetchAllProxies(): AggregatedResult {
  const rows = db.prepare('SELECT * FROM sources WHERE is_active = 1').all() as any[];
  const sources = rows.map(rowToSource);

  const sourceMap = new Map<string, ProxyNode[]>();
  const allProxies: ProxyNode[] = [];

  for (const source of sources) {
    const cached = source.cachedProxies || [];
    const taggedProxies = cached.map((p: ProxyNode) => ({
      ...p,
      name: `[${source.name}] ${p.name}`,
      _sourceId: source.id,
      _sourceType: source.type,
    }));
    sourceMap.set(source.id, taggedProxies);
    allProxies.push(...taggedProxies);
  }

  return { proxies: allProxies, sourceMap };
}

/**
 * Fetches proxies filtered by tier (only from sources the tier allows).
 */
export function fetchProxiesForTier(tierId: string): ProxyNode[] {
  const tierRow = db.prepare('SELECT * FROM tiers WHERE id = ?').get(tierId) as any;
  if (!tierRow) {
    throw new Error(`Tier ${tierId} not found`);
  }

  const tier = rowToTier(tierRow);
  const { sourceMap } = fetchAllProxies();

  const allowedProxies: ProxyNode[] = [];
  for (const sourceId of tier.allowedSourceIds) {
    const proxies = sourceMap.get(sourceId);
    if (proxies) {
      allowedProxies.push(...proxies);
    }
  }

  return allowedProxies;
}
