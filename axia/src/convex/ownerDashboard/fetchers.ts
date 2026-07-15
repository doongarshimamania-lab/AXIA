// convex/ownerDashboard/fetchers.ts — Node-runtime actions that actually
// call upstream APIs (Sentry, PostHog, Vercel) and cache results.
//
// These run with "use node" so they can use fetch(). They:
//   1. Check owner auth (via requireOwner)
//   2. Call the upstream API client
//   3. Write results to dashboardCache via ctx.runMutation
//   4. Write an audit log entry
//   5. Return the data

"use node";

import { action } from "../_generated/server";
import { requireOwner } from "./lib/guard";
import { writeAuditLog } from "./lib/audit";
import { CACHE_TTL } from "./lib/cache";
import * as SentryLib from "./lib/sentry";
import * as PostHogLib from "./lib/posthog";
import * as VercelLib from "./lib/vercel";

// ── Helper: upsert cache entry via a mutation ──────────────────────────────
// We can't write to the db directly from an action, so we use an internal
// mutation. But to keep it simple, we inline a mutation registration here.
// Actually, Convex actions CAN'T call ctx.db directly. We need to use
// ctx.runMutation. Let's define the internal mutations inline.

import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Internal: write to cache
const _writeCache = mutation({
  args: {
    cacheKey: v.string(),
    data: v.any(),
    source: v.string(),
    ttlSeconds: v.number(),
    latencyMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cached = await ctx.db
      .query("dashboardCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", args.cacheKey))
      .first();
    if (cached) {
      await ctx.db.patch(cached._id, {
        data: args.data,
        fetchedAt: now,
        expiresAt: now + args.ttlSeconds * 1000,
        source: args.source,
        latencyMs: args.latencyMs,
      });
    } else {
      await ctx.db.insert("dashboardCache", {
        cacheKey: args.cacheKey,
        data: args.data,
        fetchedAt: now,
        expiresAt: now + args.ttlSeconds * 1000,
        source: args.source,
        latencyMs: args.latencyMs,
      });
    }
  },
});

// Internal: write audit log
const _writeAudit = mutation({
  args: {
    actorUserId: v.optional(v.string()),
    actorEmail: v.optional(v.string()),
    action: v.string(),
    tab: v.optional(v.string()),
    details: v.optional(v.any()),
    latencyMs: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await writeAuditLog(ctx, args);
  },
});

// ── Fetch Sentry data ──────────────────────────────────────────────────────
export const fetchSentry = action({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    const start = Date.now();
    let error: string | undefined;

    try {
      const [stats, issuesResult, trend, release] = await Promise.allSettled([
        SentryLib.getIssueStats(),
        SentryLib.getIssues({ limit: 5, sort: "freq" }),
        SentryLib.getEventTrend(),
        SentryLib.getLatestRelease(),
      ]);

      const data = {
        stats: stats.status === "fulfilled" ? stats.value : { total: 0, fatal: 0, error: 0, warning: 0, info: 0 },
        issues: issuesResult.status === "fulfilled" ? issuesResult.value.issues : [],
        trend: trend.status === "fulfilled" ? trend.value.points : [],
        release: release.status === "fulfilled" ? release.value.release : null,
        fetchedAt: Date.now(),
      };

      const latencyMs = Date.now() - start;

      await ctx.runMutation(_writeCache, {
        cacheKey: "sentry:errors",
        data,
        source: "sentry",
        ttlSeconds: CACHE_TTL.SENTRY_ISSUES,
        latencyMs,
      });

      await ctx.runMutation(_writeAudit, {
        actorUserId: owner.userId,
        actorEmail: owner.email,
        action: "sentry.errors.fetch",
        tab: "errors",
        latencyMs,
      });

      return { data, fromCache: false, latencyMs };
    } catch (err: any) {
      error = err.message?.slice(0, 200);
      await ctx.runMutation(_writeAudit, {
        actorUserId: owner.userId,
        actorEmail: owner.email,
        action: "sentry.errors.fetch",
        tab: "errors",
        latencyMs: Date.now() - start,
        status: "error",
        details: { error },
      });
      return { data: null, fromCache: false, latencyMs: Date.now() - start, error };
    }
  },
});

// ── Fetch PostHog data ─────────────────────────────────────────────────────
export const fetchPostHog = action({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    const start = Date.now();
    let error: string | undefined;

    try {
      const [dauMau, retention, funnel, topPages, featureAdoption] = await Promise.allSettled([
        PostHogLib.getDauMau(),
        PostHogLib.getRetention(),
        PostHogLib.getFunnel(),
        PostHogLib.getTopPages(),
        PostHogLib.getFeatureAdoption(),
      ]);

      const data = {
        dauMau: dauMau.status === "fulfilled" ? dauMau.value : { dau: 0, wau: 0, mau: 0, stickiness: 0, trend: [] },
        retention: retention.status === "fulfilled" ? retention.value.cohort : [],
        funnel: funnel.status === "fulfilled" ? funnel.value.steps : [],
        topPages: topPages.status === "fulfilled" ? topPages.value.pages : [],
        featureAdoption: featureAdoption.status === "fulfilled" ? featureAdoption.value.events : [],
        fetchedAt: Date.now(),
      };

      const latencyMs = Date.now() - start;

      await ctx.runMutation(_writeCache, {
        cacheKey: "posthog:product",
        data,
        source: "posthog",
        ttlSeconds: CACHE_TTL.POSTHOG_DAU,
        latencyMs,
      });

      await ctx.runMutation(_writeAudit, {
        actorUserId: owner.userId,
        actorEmail: owner.email,
        action: "posthog.product.fetch",
        tab: "product",
        latencyMs,
      });

      return { data, fromCache: false, latencyMs };
    } catch (err: any) {
      error = err.message?.slice(0, 200);
      await ctx.runMutation(_writeAudit, {
        actorUserId: owner.userId,
        actorEmail: owner.email,
        action: "posthog.product.fetch",
        tab: "product",
        latencyMs: Date.now() - start,
        status: "error",
        details: { error },
      });
      return { data: null, fromCache: false, latencyMs: Date.now() - start, error };
    }
  },
});

// ── Fetch Vercel + Convex infrastructure data ──────────────────────────────
export const fetchInfrastructure = action({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    const start = Date.now();
    let error: string | undefined;

    try {
      const [vercelDeploys, vercelAnalytics] = await Promise.allSettled([
        VercelLib.getDeploySummary(),
        VercelLib.getWebAnalytics(),
      ]);

      // Convex internal: table sizes
      const convexStats = await ctx.runQuery(
        (await import("./queries")).getConvexInternalStatsAsAction,
        {}
      ).catch(() => null);

      const data = {
        vercel: vercelDeploys.status === "fulfilled" ? vercelDeploys.value : null,
        vercelAnalytics: vercelAnalytics.status === "fulfilled" ? vercelAnalytics.value : null,
        convex: convexStats,
        fetchedAt: Date.now(),
      };

      const latencyMs = Date.now() - start;

      await ctx.runMutation(_writeCache, {
        cacheKey: "infrastructure:full",
        data,
        source: "vercel",
        ttlSeconds: CACHE_TTL.VERCEL_DEPLOYS,
        latencyMs,
      });

      await ctx.runMutation(_writeAudit, {
        actorUserId: owner.userId,
        actorEmail: owner.email,
        action: "infrastructure.fetch",
        tab: "infrastructure",
        latencyMs,
      });

      return { data, fromCache: false, latencyMs };
    } catch (err: any) {
      error = err.message?.slice(0, 200);
      await ctx.runMutation(_writeAudit, {
        actorUserId: owner.userId,
        actorEmail: owner.email,
        action: "infrastructure.fetch",
        tab: "infrastructure",
        latencyMs: Date.now() - start,
        status: "error",
        details: { error },
      });
      return { data: null, fromCache: false, latencyMs: Date.now() - start, error };
    }
  },
});

// ── Fetch realtime data ────────────────────────────────────────────────────
export const fetchRealtime = action({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx);
    const start = Date.now();
    let error: string | undefined;

    try {
      const [posthogLive, sentryRecent] = await Promise.allSettled([
        PostHogLib.getLiveUsers(),
        SentryLib.getIssues({ limit: 5, sort: "date" }),
      ]);

      const data = {
        liveUsers: posthogLive.status === "fulfilled" ? posthogLive.value : { count: 0, topPages: [] },
        recentErrors: sentryRecent.status === "fulfilled" ? sentryRecent.value.issues : [],
        fetchedAt: Date.now(),
      };

      const latencyMs = Date.now() - start;

      await ctx.runMutation(_writeCache, {
        cacheKey: "realtime:full",
        data,
        source: "posthog",
        ttlSeconds: 15, // 15 seconds for realtime
        latencyMs,
      });

      return { data, fromCache: false, latencyMs };
    } catch (err: any) {
      error = err.message?.slice(0, 200);
      return { data: null, fromCache: false, latencyMs: Date.now() - start, error };
    }
  },
});
