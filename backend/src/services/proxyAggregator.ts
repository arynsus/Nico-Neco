import { db } from '../config/firebase';
import { Source, ProxyNode, Tier } from '../types';

interface AggregatedResult {
  proxies: ProxyNode[];
  sourceMap: Map<string, ProxyNode[]>;
}

/**
 * Gets proxies from all active sources using their cached proxies.
 * No remote fetching — uses what's stored in Firestore.
 */
export async function fetchAllProxies(): Promise<AggregatedResult> {
  const snapshot = await db.collection('sources').where('isActive', '==', true).get();
  const sources = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Source);

  const sourceMap = new Map<string, ProxyNode[]>();
  const allProxies: ProxyNode[] = [];

  for (const source of sources) {
    const cached = source.cachedProxies || [];
    // Tag proxy names with source for uniqueness
    const taggedProxies = cached.map((p) => ({
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
export async function fetchProxiesForTier(tierId: string): Promise<ProxyNode[]> {
  const tierDoc = await db.collection('tiers').doc(tierId).get();
  if (!tierDoc.exists) {
    throw new Error(`Tier ${tierId} not found`);
  }

  const tier = { id: tierDoc.id, ...tierDoc.data() } as Tier;
  const { sourceMap } = await fetchAllProxies();

  const allowedProxies: ProxyNode[] = [];
  for (const sourceId of tier.allowedSourceIds) {
    const proxies = sourceMap.get(sourceId);
    if (proxies) {
      allowedProxies.push(...proxies);
    }
  }

  return allowedProxies;
}
