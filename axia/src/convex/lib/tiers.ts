// src/convex/lib/tiers.ts — Backend tier helpers (mirrors src/lib/tiers.ts).
//
// WHY: Convex functions cannot import from `src/lib/` (which is a frontend
// module). So we keep a separate, identical definition here. The two files
// MUST stay in sync — when adding a tier or gate, update both.
//
// ponytail: instead of duplicating every field, we keep only what the backend
// needs: the tier ID set, the gate→min-tier map, and the Creem product ID
// resolver. The frontend's `src/lib/tiers.ts` has the full marketing copy.

export type Tier = "solo" | "agency" | "scale";

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
  | "custom_integrations_sla";

const TIER_LEVEL: Record<Tier, number> = { solo: 1, agency: 2, scale: 3 };

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
};

export function isValidTier(value: string | undefined | null): value is Tier {
  return !!value && (value === "solo" || value === "agency" || value === "scale");
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
export const TIER_LIMITS = {
  SOLO_MAX_CLIENTS: 1,
  SOLO_PROPOSALS_PER_MONTH: 5,
  SOLO_EVIDENCE_RETENTION_DAYS: 90,
} as const;
