import { db } from '../config/firebase';
import { Source, ProxyNode, Tier } from '../types';
import { fetchSubscriptionProxies } from './sourceParser';
import { MarzbanClient } from './marzbanClient';

interface AggregatedResult {
  proxies: ProxyNode[];
  sourceMap: Map<string, ProxyNode[]>;
}

/**
 * Fetches proxies from all active sources and returns them grouped by source.
 */
export async function fetchAllProxies(): Promise<AggregatedResult> {
  const snapshot = await db.collection('sources').where('isActive', '==', true).get();
  const sources = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Source);

  const sourceMap = new Map<string, ProxyNode[]>();
  const allProxies: ProxyNode[] = [];

  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const proxies = await fetchFromSource(source);
      return { sourceId: source.id, sourceName: source.name, proxies };
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { sourceId, sourceName, proxies } = result.value;
      // Tag proxy names with source for uniqueness
      const taggedProxies = proxies.map((p) => ({
        ...p,
        name: `[${sourceName}] ${p.name}`,
        _sourceId: sourceId,
      }));
      sourceMap.set(sourceId, taggedProxies);
      allProxies.push(...taggedProxies);

      // Update source stats
      await db.collection('sources').doc(sourceId).update({
        lastFetched: new Date().toISOString(),
        proxyCount: proxies.length,
      });
    } else {
      console.error('Failed to fetch from source:', result.reason);
    }
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

async function fetchFromSource(source: Source): Promise<ProxyNode[]> {
  switch (source.type) {
    case 'subscription':
      return fetchSubscriptionProxies(source.url);

    case 'marzban': {
      if (!source.credentials) {
        throw new Error(`Marzban source ${source.name} has no credentials`);
      }
      const client = new MarzbanClient(source.url, source.credentials.username, source.credentials.password);
      return client.getProxyNodes();
    }

    default:
      throw new Error(`Unknown source type: ${source.type}`);
  }
}
