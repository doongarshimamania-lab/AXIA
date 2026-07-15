// convex/ownerDashboard/actions.ts — Server-side actions that fetch from
// upstream APIs (Sentry, PostHog, Vercel, Paddle) and cache the results.
//
// These run in the Node.js runtime ("use node") so they can make HTTP calls.
// They use the cache helper (getOrFetch) to avoid hammering upstream APIs.
//
// Frontend pattern:
//   const cached = useQuery(api.ownerDashboard.queries.getRevenue);
//   const refresh = useMutation(api.ownerDashboard.actions.refreshRevenue);
//   // Call refresh when cached is null or on tab focus
//   // Show cached data immediately when available

import { action, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireOwner } from "./lib/guard";
import { getOrFetch, CACHE_TTL } from "./lib/cache";
import { writeAuditLog } from "./lib/audit";
import * as Sentry from "./lib/sentry";
import * as PostHog from "./lib/posthog";
import * as Vercel from "./lib/vercel";
import * as Paddle from "./lib/paddle";

// ── Helper: run an upstream fetch with rate-limit-aware caching ────────────
async function fetchWithCache<T>(
  ctx: any,
  cacheKey: string,
  source: string,
  ttl: number,
  fetcher: () => Promise<{ data: T; latencyMs?: number }>,
  owner: { userId: string; email?: string }
): Promise<{ data: T; fromCache: boolean; latencyMs?: number; error?: string }> {
  try {
    const result = await getOrFetch(ctx.db, cacheKey, source, ttl, fetcher);
    return { data: result.data, fromCache: result.fromCache, latencyMs: result.latencyMs };
  } catch (err: any) {
    // If rate-limited, return cached data (even if stale) if available
    if (err.retryAfterMs) {
      const stale = await ctx.db
        .query("dashboardCache")
        .withIndex("by_cacheKey", (q) => q.eq("cacheKey", cacheKey))
        .first();
      if (stale) {
        return {
          data: stale.data as T,
          fromCache: true,
          latencyMs: stale.latencyMs,
          error: `rate_limited (retry in ${Math.ceil(err.retryAfterMs / 1000)}s)`,
        };
      }
    }
    // Log the error
    await writeAuditLog(ctx, {
      actorUserId: owner.userId,
      actorEmail: owner.email,
      action: `${source}.fetch_error`,
      details: { cacheKey, error: err.message?.slice(0, 200) },
      status: "error",
    });
    throw err;
  }
}

// ── Refresh Revenue tab ────────────────────────────────────────────────────
export const refreshRevenue = action({
  args: {},
  handler: async (ctx, _args) => {
    const owner = await requireOwner(ctx);

    return await ctx.runMutation(
      (await import("./mutations"))._refreshRevenueInternal,
      { owner }
    );
  },
});

// ── Refresh Product tab ────────────────────────────────────────────────────
export const refreshProduct = action({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    return await ctx.runMutation(
      (await import("./mutations"))._refreshProductInternal,
      { owner }
    );
  },
});

// ── Refresh Errors tab ─────────────────────────────────────────────────────
export const refreshErrors = action({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    return await ctx.runMutation(
      (await import("./mutations"))._refreshErrorsInternal,
      { owner }
    );
  },
});

// ── Refresh Infrastructure tab ─────────────────────────────────────────────
export const refreshInfrastructure = action({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    return await ctx.runMutation(
      (await import("./mutations"))._refreshInfrastructureInternal,
      { owner }
    );
  },
});

// ── Refresh Realtime tab ───────────────────────────────────────────────────
export const refreshRealtime = action({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    return await ctx.runMutation(
      (await import("./mutations"))._refreshRealtimeInternal,
      { owner }
    );
  },
});

// ── Refresh Overview (aggregates all sources) ──────────────────────────────
export const refreshOverview = action({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    return await ctx.runMutation(
      (await import("./mutations"))._refreshOverviewInternal,
      { owner }
    );
  },
});

// ── Refresh Hero KPIs (lightweight, for the top bar) ───────────────────────
export const refreshHeroKpis = action({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    return await ctx.runMutation(
      (await import("./mutations"))._refreshHeroKpisInternal,
      { owner }
    );
  },
});

// ── Refresh Alerts ─────────────────────────────────────────────────────────
export const refreshAlerts = action({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    return await ctx.runMutation(
      (await import("./mutations"))._refreshAlertsInternal,
      { owner }
    );
  },
});
