// convex/ownerDashboard/lib/cache.ts — TTL-based cache for upstream API responses.
//
// All upstream API calls (Sentry, PostHog, Vercel, Paddle) go through this
// cache. TTLs are tuned per data type:
//   - Sentry issues/events: 30s (fast-moving, but rate-limited)
//   - PostHog DAU/MAU/retention: 60s (changes slowly)
//   - Vercel deploys: 60s
//   - Paddle MRR/subscriptions: 300s (5 min — billing data changes slowly)
//   - Stats/timeseries: 300s
//
// Cache misses call the fetcher function, store the result, and return it.
// Cache hits return immediately (no upstream call). This protects against
// rate limits (429s) and keeps the dashboard snappy.

import { QueryCtx, MutationCtx } from "../../_generated/server";

export const CACHE_TTL = {
  SENTRY_ISSUES: 30, // 30 seconds
  SENTRY_EVENTS: 30,
  SENTRY_STATS: 300, // 5 minutes
  SENTRY_RELEASES: 120, // 2 minutes
  POSTHOG_DAU: 60,
  POSTHOG_RETENTION: 300,
  POSTHOG_FUNNEL: 120,
  POSTHOG_PAGES: 120,
  VERCEL_DEPLOYS: 60,
  VERCEL_ANALYTICS: 300,
  PADDLE_MRR: 300,
  PADDLE_SUBSCRIPTIONS: 120,
  PADDLE_TRANSACTIONS: 120,
  CONVEX_INTERNAL: 30, // users/workspaces counts
} as const;

/**
 * Get a cached value or fetch + cache it.
 *
 * Call from a mutation (needs write access). For queries, use getCacheOnly
 * (read-only) and fall back to a mutation if cache is stale.
 */
export async function getOrFetch<T>(
  ctx: MutationCtx,
  cacheKey: string,
  source: string,
  ttlSeconds: number,
  fetcher: () => Promise<{ data: T; latencyMs?: number }>
): Promise<{ data: T; fromCache: boolean; fetchedAt: number; latencyMs?: number }> {
  // Check cache
  const cached = await ctx.db
    .query("dashboardCache")
    .withIndex("by_cacheKey", (q) => q.eq("cacheKey", cacheKey))
    .first();

  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return {
      data: cached.data as T,
      fromCache: true,
      fetchedAt: cached.fetchedAt,
      latencyMs: cached.latencyMs,
    };
  }

  // Cache miss — fetch
  const start = Date.now();
  const result = await fetcher();
  const latencyMs = result.latencyMs ?? Date.now() - start;

  // Store in cache (upsert)
  if (cached) {
    await ctx.db.patch(cached._id, {
      data: result.data,
      fetchedAt: now,
      expiresAt: now + ttlSeconds * 1000,
      source,
      latencyMs,
    });
  } else {
    await ctx.db.insert("dashboardCache", {
      cacheKey,
      data: result.data,
      fetchedAt: now,
      expiresAt: now + ttlSeconds * 1000,
      source,
      latencyMs,
    });
  }

  return {
    data: result.data,
    fromCache: false,
    fetchedAt: now,
    latencyMs,
  };
}

/**
 * Read-only cache check (for queries). Returns null if stale or missing.
 */
export async function getCacheOnly<T>(
  ctx: QueryCtx,
  cacheKey: string
): Promise<{ data: T; fetchedAt: number; latencyMs?: number } | null> {
  const cached = await ctx.db
    .query("dashboardCache")
    .withIndex("by_cacheKey", (q) => q.eq("cacheKey", cacheKey))
    .first();

  if (!cached) return null;
  return {
    data: cached.data as T,
    fetchedAt: cached.fetchedAt,
    latencyMs: cached.latencyMs,
  };
}
