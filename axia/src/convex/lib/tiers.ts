// src/convex/lib/tiers.ts — Backend tier helpers (mirrors src/lib/tiers.ts).
//
// WHY: Convex functions cannot import from `src/lib/` (which is a frontend
// module). So we keep a separate, identical definition here. The two files
// MUST stay in sync — when adding a tier or gate, update both.
//
// ponytail: instead of duplicating every field, we keep only what the backend
// needs: the tier ID set, the gate→min-tier map, and the Creem product ID
// resolver. The frontend's `src/lib/tiers.ts` has the full marketing copy.
//
// ponytail (2026-07-26): added Enterprise tier + route-based gates + the
// assertUnderLimit / assertFeatureAccess helpers used by Convex mutations
// for server-side enforcement. These helpers are the ACTUAL security
// boundary — client-side gating in useTierGate is just UX.

import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getAuthUserId } from "./auth";

export type Tier = "solo" | "agency" | "scale" | "enterprise";

export type GateKey =
  | "scope_creep_protection"
  | "full_truth_layer"
  | "unlimited_proposals"
  | "evidence_library_unlimited"
  | "github_integration"
  | "figma_integration"
  | "slack_integration"
  | "stripe_integration"
  | "priority_support"
  | "multi_brand_workspaces"
  | "sso_scim"
  | "advanced_reports"
  | "dedicated_success_manager"
  | "custom_integrations_sla"
  // ponytail (2026-07-26): route-based gates — map to real app pages.
  | "route_scope"
  | "route_payment_patterns"
  | "route_team_management"
  | "route_messages"
  | "route_reports"
  | "route_multi_workspace"
  | "route_custom_fields"
  | "route_compliance_alerts"
  | "route_profitability_reports";

// Legacy tier aliases → new tier names. Used by getTierForUser to normalize
// old user records (free/starter/pro/expert) to the current tier set.
const LEGACY_TIER_MAP: Record<string, Tier> = {
  free: "solo", // free beta users get Solo equivalent during beta
  starter: "solo",
  pro: "agency",
  expert: "scale",
};

const TIER_LEVEL: Record<Tier, number> = { solo: 1, agency: 2, scale: 3, enterprise: 4 };

const GATE_MIN_TIER: Record<GateKey, Tier> = {
  scope_creep_protection: "agency",
  full_truth_layer: "agency",
  unlimited_proposals: "agency",
  evidence_library_unlimited: "agency",
  github_integration: "agency",
  figma_integration: "agency",
  slack_integration: "agency",
  stripe_integration: "agency",
  priority_support: "agency",
  multi_brand_workspaces: "scale",
  sso_scim: "scale",
  advanced_reports: "scale",
  dedicated_success_manager: "scale",
  custom_integrations_sla: "scale",
  route_scope: "agency",
  route_payment_patterns: "agency",
  route_team_management: "agency",
  route_messages: "agency",
  route_reports: "agency",
  route_multi_workspace: "scale",
  route_custom_fields: "scale",
  route_compliance_alerts: "scale",
  route_profitability_reports: "scale",
};

export function isValidTier(value: string | undefined | null): value is Tier {
  return (
    !!value &&
    (value === "solo" || value === "agency" || value === "scale" || value === "enterprise")
  );
}

// ponytail: normalize a raw tier string from the user record. Maps legacy
// values (free/starter/pro/expert) to the current tier set. Returns null
// for unrecognized values (= no paid tier = Solo-equivalent during beta).
export function normalizeTier(raw: string | undefined | null): Tier | null {
  if (!raw) return null;
  if (isValidTier(raw)) return raw;
  return LEGACY_TIER_MAP[raw] ?? null;
}

export function tierAtLeast(have: Tier | undefined | null, want: Tier): boolean {
  if (!have) return false;
  return (TIER_LEVEL[have] ?? 0) >= (TIER_LEVEL[want] ?? 0);
}

export function hasTierGate(
  have: Tier | undefined | null,
  gate: GateKey,
): boolean {
  return tierAtLeast(have, GATE_MIN_TIER[gate]);
}

// ponytail: returns the Creem env var name for a tier — the caller reads
// process.env[envKey] so this works in both dev (no env) and prod (env set).
export function creemProductEnvKey(tier: Tier): string {
  return `CREEM_PRODUCT_ID_${tier.toUpperCase()}`;
}

// Hard-coded limit constants used by gating mutations.
// ponytail: these match the marketing copy on the Pricing page.
// Updated 2026-07-26 to reflect the 4-tier model (Solo=3 clients, Agency+=unlimited).
export const TIER_LIMITS = {
  SOLO_MAX_CLIENTS: 3,
  SOLO_MAX_PROJECTS: 5,
  SOLO_PROPOSALS_PER_MONTH: 5,
  SOLO_EVIDENCE_RETENTION_DAYS: 90,
  // ponytail (2026-07-26): seat caps per tier. -1 = unlimited.
  SOLO_MAX_SEATS: 1,
  AGENCY_MAX_SEATS: 10,
  SCALE_MAX_SEATS: 25,
  ENTERPRISE_MAX_SEATS: -1,
} as const;

// ─── Server-side enforcement helpers ──────────────────────────────────────
// These are the ACTUAL security boundary. Client-side gating in useTierGate
// is a UX nicety that can be bypassed with DevTools. Every gated mutation
// MUST call one of these before inserting.

/** Read a user's normalized tier from the users table. */
export async function getTierForUser(
  ctx: MutationCtx | QueryCtx,
  userId: string,
): Promise<Tier | null> {
  const user = await ctx.db.get(userId as any);
  if (!user) return null;
  return normalizeTier(user.subscriptionTier ?? null);
}

/** Read the CURRENT authenticated user's tier. Returns null if not signed in. */
export async function getMyTier(ctx: MutationCtx | QueryCtx): Promise<Tier | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return getTierForUser(ctx, userId);
}

/**
 * Throw a user-facing error if the current user's tier doesn't include
 * `gate`. Use this at the top of any mutation that creates tier-gated data.
 */
export async function assertFeatureAccess(
  ctx: MutationCtx,
  gate: GateKey,
): Promise<Tier | null> {
  const tier = await getMyTier(ctx);
  if (tier === null) {
    throw new Error("Not authenticated");
  }
  if (!hasTierGate(tier, gate)) {
    const minTier = GATE_MIN_TIER[gate];
    throw new Error(
      `This feature requires the ${minTier} plan. Upgrade to access it.`,
    );
  }
  return tier;
}

/**
 * Throw a user-facing error if the current user is at or over their tier's
 * limit for a creation cap. Caller supplies the current count.
 *
 * `limit` is one of: "maxClients", "maxProjects", "maxProposalsPerMonth".
 */
export type CreationLimit =
  | "maxClients"
  | "maxProjects"
  | "maxProposalsPerMonth";

export async function assertUnderLimit(
  ctx: MutationCtx,
  limit: CreationLimit,
  currentCount: number,
): Promise<void> {
  const tier = await getMyTier(ctx);
  if (tier === null) throw new Error("Not authenticated");

  // Agency and above = unlimited for all creation limits.
  if (tierAtLeast(tier, "agency")) return;

  // Solo limits:
  let max: number;
  let label: string;
  if (limit === "maxClients") {
    max = TIER_LIMITS.SOLO_MAX_CLIENTS;
    label = "client";
  } else if (limit === "maxProjects") {
    max = TIER_LIMITS.SOLO_MAX_PROJECTS;
    label = "project";
  } else {
    max = TIER_LIMITS.SOLO_PROPOSALS_PER_MONTH;
    label = "proposal per month";
  }

  if (currentCount >= max) {
    throw new Error(
      `You've reached your ${label} limit (${max}) on the ${tier} plan. ` +
        `Upgrade to Agency for unlimited ${label}s.`,
    );
  }
}

/**
 * Convenience: count a user's existing records of a given table+index, then
 * assert they're under their tier's limit. Avoids the boilerplate of
 * "query → count → assertUnderLimit" in every create mutation.
 *
 * Usage:
 *   await assertUnderLimitFor(ctx, "maxClients", "clients", "by_user", "userId");
 */
export async function assertUnderLimitFor(
  ctx: MutationCtx,
  limit: CreationLimit,
  tableName: string,
  indexName: string,
  fieldName: string,
): Promise<void> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");

  // Agency+ = unlimited — skip the count entirely (saves a query).
  const tier = await getMyTier(ctx);
  if (tier && tierAtLeast(tier, "agency")) return;

  // Solo: count up to (max + 1) records via the index. take(N+1) lets us
  // detect "at limit" without fetching the full set.
  let max: number;
  if (limit === "maxClients") max = TIER_LIMITS.SOLO_MAX_CLIENTS;
  else if (limit === "maxProjects") max = TIER_LIMITS.SOLO_MAX_PROJECTS;
  else max = TIER_LIMITS.SOLO_PROPOSALS_PER_MONTH;

  const rows = await (ctx.db as any)
    .query(tableName)
    .withIndex(indexName, (q: any) => q.eq(fieldName, userId))
    .take(max + 1);

  await assertUnderLimit(ctx, limit, rows.length);
}
