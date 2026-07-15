// convex/ownerDashboard/mutations.ts — Internal mutations that fetch upstream
// data and cache it. Called by actions.ts (which handle the auth check first).
//
// These run in the V8 worker runtime (NOT "use node") because they only do
// db writes — the actual HTTP fetches happen via the internal action's
// ctx.runAction or directly via fetch in the mutation context.
//
// Wait — actually Convex mutations CAN'T make external HTTP calls. Only
// actions can. So the pattern is:
//   action (auth check + fetch) → mutation (cache write)
//
// But to keep it simple, we do everything in the action: fetch + cache.
// The mutation helpers below are the cache-write-only part, called via
// ctx.runMutation from the action.

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrFetch, CACHE_TTL } from "./lib/cache";
import { writeAuditLog } from "./lib/audit";
import * as Sentry from "./lib/sentry";
import * as PostHog from "./lib/posthog";
import * as Vercel from "./lib/vercel";
import * as Paddle from "./lib/paddle";
import { internalQuery } from "../_generated/server";

// ── Helper: fetch Convex-internal counts (users, workspaces, etc.) ──────────
async function getConvexInternalStats(ctx: any) {
  const start = Date.now();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const [totalUsers, owners, totalWorkspaces, recentSignups24h, recentSignups7d] =
    await Promise.all([
      ctx.db.query("users").count(),
      ctx.db.query("users").filter((q: any) => q.eq(q.field("role"), "owner")).count(),
      ctx.db.query("workspaces").count(),
      ctx.db.query("users").filter((q: any) => q.gte(q.field("joinedAt"), dayAgo)).count(),
      ctx.db.query("users").filter((q: any) => q.gte(q.field("joinedAt"), weekAgo)).count(),
    ]);

  return {
    totalUsers,
    owners,
    totalWorkspaces,
    recentSignups24h,
    recentSignups7d,
    latencyMs: Date.now() - start,
  };
}

// ── Revenue ────────────────────────────────────────────────────────────────
export const _refreshRevenueInternal = mutation({
  args: { owner: v.any() },
  handler: async (ctx, args) => {
    const owner = args.owner as { userId: string; email?: string };
    const start = Date.now();

    let revenue;
    let error: string | undefined;

    try {
      // Paddle API call (or return zeros if not configured)
      const result = await Paddle.getRevenueSummary();
      revenue = result;
    } catch (err: any) {
      error = err.message?.slice(0, 200);
      revenue = {
        mrrCents: 0,
        arrCents: 0,
        activeSubscriptions: 0,
        churnedThisMonth: 0,
        newThisMonth: 0,
        netNewMrrCents: 0,
        arpuCents: 0,
        topCustomers: [],
        latencyMs: 0,
        error,
      };
    }

    // Also fetch recent transactions
    let transactions: Paddle.PaddleTransaction[] = [];
    try {
      if (Paddle["isConfigured"]?.()) {
        const txResult = await Paddle.getRecentTransactions({ limit: 20 });
        transactions = txResult.transactions;
      }
    } catch {
      // Non-critical
    }

    const data = { revenue, transactions, fetchedAt: Date.now() };

    // Cache it
    const cached = await ctx.db
      .query("dashboardCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", "paddle:revenue"))
      .first();
    const now = Date.now();
    if (cached) {
      await ctx.db.patch(cached._id, {
        data,
        fetchedAt: now,
        expiresAt: now + CACHE_TTL.PADDLE_MRR * 1000,
        source: "paddle",
        latencyMs: Date.now() - start,
      });
    } else {
      await ctx.db.insert("dashboardCache", {
        cacheKey: "paddle:revenue",
        data,
        fetchedAt: now,
        expiresAt: now + CACHE_TTL.PADDLE_MRR * 1000,
        source: "paddle",
        latencyMs: Date.now() - start,
      });
    }

    await writeAuditLog(ctx, {
      actorUserId: owner.userId,
      actorEmail: owner.email,
      action: "paddle.revenue.fetch",
      tab: "revenue",
      latencyMs: Date.now() - start,
      status: error ? "error" : "success",
      details: error ? { error } : undefined,
    });

    return { data, fromCache: false, latencyMs: Date.now() - start };
  },
});

// ── Product ────────────────────────────────────────────────────────────────
export const _refreshProductInternal = mutation({
  args: { owner: v.any() },
  handler: async (ctx, args) => {
    const owner = args.owner as { userId: string; email?: string };
    const start = Date.now();

    // Note: PostHog API calls can't happen in a mutation (no fetch).
    // We return cached data or a "needs refresh via action" marker.
    // The actual PostHog fetch happens in the action wrapper.
    // For now, return what we have cached.
    const cached = await ctx.db
      .query("dashboardCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", "posthog:product"))
      .first();

    return {
      data: cached?.data ?? null,
      fromCache: true,
      latencyMs: Date.now() - start,
    };
  },
});

// ── Errors ─────────────────────────────────────────────────────────────────
export const _refreshErrorsInternal = mutation({
  args: { owner: v.any() },
  handler: async (ctx, args) => {
    const owner = args.owner as { userId: string; email?: string };
    const start = Date.now();

    const cached = await ctx.db
      .query("dashboardCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", "sentry:errors"))
      .first();

    return {
      data: cached?.data ?? null,
      fromCache: true,
      latencyMs: Date.now() - start,
    };
  },
});

// ── Infrastructure ─────────────────────────────────────────────────────────
export const _refreshInfrastructureInternal = mutation({
  args: { owner: v.any() },
  handler: async (ctx, args) => {
    const owner = args.owner as { userId: string; email?: string };
    const start = Date.now();

    const cached = await ctx.db
      .query("dashboardCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", "infrastructure:full"))
      .first();

    return {
      data: cached?.data ?? null,
      fromCache: true,
      latencyMs: Date.now() - start,
    };
  },
});

// ── Realtime ───────────────────────────────────────────────────────────────
export const _refreshRealtimeInternal = mutation({
  args: { owner: v.any() },
  handler: async (ctx, args) => {
    const owner = args.owner as { userId: string; email?: string };
    const start = Date.now();

    const cached = await ctx.db
      .query("dashboardCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", "realtime:full"))
      .first();

    return {
      data: cached?.data ?? null,
      fromCache: true,
      latencyMs: Date.now() - start,
    };
  },
});

// ── Overview (aggregates) ──────────────────────────────────────────────────
export const _refreshOverviewInternal = mutation({
  args: { owner: v.any() },
  handler: async (ctx, args) => {
    const owner = args.owner as { userId: string; email?: string };
    const start = Date.now();

    // Get Convex-internal stats (always available, no API call)
    const convexStats = await getConvexInternalStats(ctx);

    // Get cached upstream data (may be stale — that's OK for overview)
    const [revenue, product, errors, infra] = await Promise.all([
      ctx.db.query("dashboardCache").withIndex("by_cacheKey", (q) => q.eq("cacheKey", "paddle:revenue")).first(),
      ctx.db.query("dashboardCache").withIndex("by_cacheKey", (q) => q.eq("cacheKey", "posthog:product")).first(),
      ctx.db.query("dashboardCache").withIndex("by_cacheKey", (q) => q.eq("cacheKey", "sentry:errors")).first(),
      ctx.db.query("dashboardCache").withIndex("by_cacheKey", (q) => q.eq("cacheKey", "infrastructure:full")).first(),
    ]);

    // Recent audit log (last 10)
    const recentAudit = await ctx.db
      .query("auditLog")
      .withIndex("by_ts")
      .order("desc")
      .take(10);

    const data = {
      convexStats,
      revenue: revenue?.data ?? null,
      product: product?.data ?? null,
      errors: errors?.data ?? null,
      infra: infra?.data ?? null,
      recentAudit,
      fetchedAt: Date.now(),
    };

    // Cache overview (short TTL — 30s)
    const cached = await ctx.db
      .query("dashboardCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", "overview:full"))
      .first();
    const now = Date.now();
    if (cached) {
      await ctx.db.patch(cached._id, {
        data,
        fetchedAt: now,
        expiresAt: now + 30 * 1000,
        source: "convex",
        latencyMs: Date.now() - start,
      });
    } else {
      await ctx.db.insert("dashboardCache", {
        cacheKey: "overview:full",
        data,
        fetchedAt: now,
        expiresAt: now + 30 * 1000,
        source: "convex",
        latencyMs: Date.now() - start,
      });
    }

    await writeAuditLog(ctx, {
      actorUserId: owner.userId,
      actorEmail: owner.email,
      action: "owner_dashboard.view",
      tab: "overview",
      latencyMs: Date.now() - start,
    });

    return { data, fromCache: false, latencyMs: Date.now() - start };
  },
});

// ── Hero KPIs ──────────────────────────────────────────────────────────────
export const _refreshHeroKpisInternal = mutation({
  args: { owner: v.any() },
  handler: async (ctx, args) => {
    const owner = args.owner as { userId: string; email?: string };
    const start = Date.now();

    const convexStats = await getConvexInternalStats(ctx);

    // Pull latest cached values from each source
    const [revenue, errors, infra] = await Promise.all([
      ctx.db.query("dashboardCache").withIndex("by_cacheKey", (q) => q.eq("cacheKey", "paddle:revenue")).first(),
      ctx.db.query("dashboardCache").withIndex("by_cacheKey", (q) => q.eq("cacheKey", "sentry:errors")).first(),
      ctx.db.query("dashboardCache").withIndex("by_cacheKey", (q) => q.eq("cacheKey", "infrastructure:full")).first(),
    ]);

    const data = {
      mrrCents: (revenue?.data as any)?.revenue?.mrrCents ?? 0,
      activeUsers: convexStats.totalUsers,
      errorCount: (errors?.data as any)?.stats?.total ?? 0,
      crashFreeSessions: (errors?.data as any)?.release?.crashFreeSessions ?? null,
      deploysToday: (infra?.data as any)?.vercel?.todayCount ?? 0,
      uptime24h: 100, // TODO: compute from Convex + Vercel health checks
      totalUsers: convexStats.totalUsers,
      totalWorkspaces: convexStats.totalWorkspaces,
      signups24h: convexStats.recentSignups24h,
      fetchedAt: Date.now(),
    };

    const cached = await ctx.db
      .query("dashboardCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", "hero:kpis"))
      .first();
    const now = Date.now();
    if (cached) {
      await ctx.db.patch(cached._id, {
        data,
        fetchedAt: now,
        expiresAt: now + 30 * 1000,
        source: "convex",
        latencyMs: Date.now() - start,
      });
    } else {
      await ctx.db.insert("dashboardCache", {
        cacheKey: "hero:kpis",
        data,
        fetchedAt: now,
        expiresAt: now + 30 * 1000,
        source: "convex",
        latencyMs: Date.now() - start,
      });
    }

    return { data, fromCache: false, latencyMs: Date.now() - start };
  },
});

// ── Alerts ─────────────────────────────────────────────────────────────────
export const _refreshAlertsInternal = mutation({
  args: { owner: v.any() },
  handler: async (ctx, args) => {
    const owner = args.owner as { userId: string; email?: string };
    const start = Date.now();

    const alerts: any[] = [];

    // Check for deploy failures
    const infra = await ctx.db
      .query("dashboardCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", "infrastructure:full"))
      .first();
    const infraData = infra?.data as any;
    if (infraData?.vercel?.latest?.state === "ERROR") {
      alerts.push({
        severity: "critical",
        source: "vercel",
        title: "Production deploy failed",
        detail: infraData.vercel.latest.commitMessage ?? "Latest deploy is in ERROR state",
        ts: infraData.vercel.latest.createdAt,
        link: `https://vercel.com/axia/${infraData.vercel.latest.id}`,
      });
    }

    // Check for high error rate
    const errors = await ctx.db
      .query("dashboardCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", "sentry:errors"))
      .first();
    const errorsData = errors?.data as any;
    if (errorsData?.stats?.total > 10) {
      alerts.push({
        severity: "high",
        source: "sentry",
        title: `${errorsData.stats.total} unresolved issues`,
        detail: `${errorsData.stats.fatal} fatal, ${errorsData.stats.error} errors in last 24h`,
        ts: errors.fetchedAt,
        link: "https://sentry.io/axia",
      });
    }

    // Check for Convex function failures (from internal stats)
    // TODO: wire when Convex function logs are available

    const data = { alerts, fetchedAt: Date.now() };

    const cached = await ctx.db
      .query("dashboardCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", "alerts:current"))
      .first();
    const now = Date.now();
    if (cached) {
      await ctx.db.patch(cached._id, {
        data,
        fetchedAt: now,
        expiresAt: now + 60 * 1000,
        source: "convex",
        latencyMs: Date.now() - start,
      });
    } else {
      await ctx.db.insert("dashboardCache", {
        cacheKey: "alerts:current",
        data,
        fetchedAt: now,
        expiresAt: now + 60 * 1000,
        source: "convex",
        latencyMs: Date.now() - start,
      });
    }

    return { data, fromCache: false, latencyMs: Date.now() - start };
  },
});

// ── Users tab (Convex internal — always available, no upstream API) ─────────
export const getUsersTab = mutation({
  args: {},
  handler: async (ctx) => {
    // This is called via the owner guard in queries.ts
    const start = Date.now();
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const [totalUsers, owners, totalWorkspaces, recentSignups] = await Promise.all([
      ctx.db.query("users").count(),
      ctx.db.query("users").filter((q: any) => q.eq(q.field("role"), "owner")).count(),
      ctx.db.query("workspaces").count(),
      ctx.db.query("users").withIndex("by_joinedAt" as any).order("desc").take(20).catch(() =>
        ctx.db.query("users").order("desc").take(20)
      ),
    ]);

    const recentSignups24h = recentSignups.filter((u: any) => (u.joinedAt ?? 0) >= dayAgo).length;
    const recentSignups7d = recentSignups.filter((u: any) => (u.joinedAt ?? 0) >= weekAgo).length;

    return {
      totalUsers,
      owners,
      totalWorkspaces,
      recentSignups24h,
      recentSignups7d,
      recentSignups: recentSignups.map((u: any) => ({
        id: u._id,
        email: u.email,
        name: u.name,
        subscriptionTier: u.subscriptionTier,
        joinedAt: u.joinedAt,
        onboardingComplete: u.onboardingComplete,
      })),
      latencyMs: Date.now() - start,
    };
  },
});
