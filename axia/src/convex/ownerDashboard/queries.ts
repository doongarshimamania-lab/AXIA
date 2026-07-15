// convex/ownerDashboard/queries.ts — Read-only queries for the owner dashboard.
//
// These run in the V8 worker runtime (fast, cheap). They either:
//   1. Read directly from Convex tables (Users tab, audit log)
//   2. Return cached data from dashboardCache (if fresh)
//   3. Return null (if stale) — the frontend then calls the corresponding
//      mutation in actions.ts to refresh the cache.
//
// This split (query = read cache, mutation = fetch + cache) is required because
// Convex queries cannot make external HTTP calls — only actions can. And
// actions can't be used with useQuery (they need useAction). So we use:
//   - useQuery(api.ownerDashboard.queries.getXxx) — returns cached or null
//   - useMutation(api.ownerDashboard.actions.refreshXxx) — fetches + caches
//   - Frontend calls refresh when query returns null or on tab focus.

import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireOwner, isOwner } from "./lib/guard";
import { getCacheOnly } from "./lib/cache";
import { queryAuditLog } from "./lib/audit";

// ── Check if current user is an owner (for sidebar link) ───────────────────
export const checkOwner = query({
  args: {},
  handler: async (ctx) => {
    return await isOwner(ctx);
  },
});

// ── Overview tab (cached) ──────────────────────────────────────────────────
export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await getCacheOnly(ctx, "overview:full");
  },
});

// ── Revenue tab (cached) ───────────────────────────────────────────────────
export const getRevenue = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await getCacheOnly(ctx, "paddle:revenue");
  },
});

// ── Product tab (cached) ───────────────────────────────────────────────────
export const getProduct = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await getCacheOnly(ctx, "posthog:product");
  },
});

// ── Errors tab (cached) ────────────────────────────────────────────────────
export const getErrors = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await getCacheOnly(ctx, "sentry:errors");
  },
});

// ── Infrastructure tab (cached) ────────────────────────────────────────────
export const getInfrastructure = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await getCacheOnly(ctx, "infrastructure:full");
  },
});

// ── Realtime tab (cached, short TTL) ───────────────────────────────────────
export const getRealtime = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await getCacheOnly(ctx, "realtime:full");
  },
});

// ── Audit log ──────────────────────────────────────────────────────────────
export const getAuditLog = query({
  args: {
    limit: v.optional(v.number()),
    actionPrefix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    return await queryAuditLog(ctx, {
      limit: args.limit ?? 50,
      actionPrefix: args.actionPrefix,
    });
  },
});

// ── Hero KPIs (aggregated, cached) ─────────────────────────────────────────
export const getHeroKpis = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await getCacheOnly(ctx, "hero:kpis");
  },
});

// ── Alerts (cached) ────────────────────────────────────────────────────────
export const getAlerts = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await getCacheOnly(ctx, "alerts:current");
  },
});
