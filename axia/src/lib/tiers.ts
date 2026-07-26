// src/lib/tiers.ts — Single source of truth for tier definitions, feature
// gating, and Creem product ID mapping.
//
// WHY: Previously the app had tier logic spread across:
//   - src/convex/tiers/tierDetection.ts (free / starter / pro / expert)
//   - src/components/site/pricing.tsx (Solo / Agency / Scale — marketing only)
//   - src/hooks/use-subscription-tier.ts ('free' | 'starter' | 'pro' | 'expert')
//   - src/convex/users.ts (subscriptionTier: string)
// These never agreed. Now they all read from this file (frontend) and the
// matching tierDetection.ts in Convex (backend, which mirrors these values).
//
// ponytail: the canonical tier set is { solo, agency, scale }. Free tier is
// represented as `null` / `undefined` on `users.subscriptionTier` — there is
// no "free" string value, which prevents the bug where someone could pass
// "free" to bypass gating. Use `tierAtLeast(userTier, "agency")` to gate.

export type Tier = "solo" | "agency" | "scale" | "enterprise";

export interface TierDef {
  id: Tier;
  name: string;
  tagline: string;
  monthly: number; // USD per seat per month, billed monthly
  annual: number; // USD per seat per year, billed annually (= monthly × 10)
  minSeats: number;
  maxSeats: number | null; // null = unlimited
  creemProductEnvKey: string; // env var name that holds the Creem product ID
  features: string[]; // human-readable list shown on pricing page
  gatedFeatures: GateKey[]; // machine-readable feature keys for gating
  highlighted?: boolean;
  cta: string;
}

// All gates that can be checked in the UI via `hasTierGate(userTier, key)`.
// Add new keys here when adding a new gated feature.
export type GateKey =
  | "scope_creep_protection" // AI scope-creep detector (Agency+)
  | "full_truth_layer" // event sourcing + truth-layer widget (Agency+)
  | "unlimited_proposals" // Smart Proposals (Agency+); Solo = 5/mo
  | "evidence_library_unlimited" // Solo = 90 days; Agency+ = unlimited
  | "github_integration"
  | "figma_integration"
  | "slack_integration"
  | "stripe_integration"
  | "priority_support" // 24h SLA (Agency+); Solo = community
  | "multi_brand_workspaces" // Scale only
  | "sso_scim" // SAML SSO + SCIM (Scale only)
  | "advanced_reports" // profitability reports (Scale only)
  | "dedicated_success_manager" // Scale only
  | "custom_integrations_sla" // Scale only
  // ponytail (2026-07-26): route-based gates — map directly to app pages.
  // These are used by featureForRoute() to gate sidebar nav + ProtectedRoute.
  // Added so the gating system covers the REAL app routes (audited against
  // src/main.tsx), not just abstract marketing features.
  | "route_scope" // /scope page
  | "route_payment_patterns" // /payment-patterns page
  | "route_team_management" // /teams page
  | "route_messages" // /messages page
  | "route_reports" // /reports page
  | "route_multi_workspace" // WorkspaceSwitcher (multi-workspace)
  | "route_custom_fields" // custom fields on clients/projects
  | "route_compliance_alerts" // compliance alerts feed
  | "route_profitability_reports"; // advanced profitability reports

export const TIERS: TierDef[] = [
  {
    id: "solo",
    name: "Solo",
    tagline: "For freelancers & consultants",
    monthly: 29,
    annual: 290,
    minSeats: 1,
    maxSeats: 1,
    creemProductEnvKey: "CREEM_PRODUCT_ID_SOLO",
    features: [
      "1 active client portal",
      "Verified Workstreams",
      "Validated Billing",
      "Smart Proposals (5/mo)",
      "Automated payment reminders",
      "Evidence Library, 90 days",
      "Community support",
    ],
    gatedFeatures: [],
    cta: "Start Solo",
  },
  {
    id: "agency",
    name: "Agency",
    tagline: "For B2B agencies, 3 to 50 seats",
    monthly: 99,
    annual: 990,
    minSeats: 3,
    maxSeats: 50,
    creemProductEnvKey: "CREEM_PRODUCT_ID_AGENCY",
    features: [
      "Everything in Solo",
      "Scope Creep Protection (AI)",
      "Full Truth Layer + event sourcing",
      "Unlimited Smart Proposals",
      "Integrations: GitHub, Figma, Slack, Stripe",
      "Evidence Library, unlimited",
      "Priority support (24h SLA)",
    ],
    gatedFeatures: [
      "scope_creep_protection",
      "full_truth_layer",
      "unlimited_proposals",
      "evidence_library_unlimited",
      "github_integration",
      "figma_integration",
      "slack_integration",
      "stripe_integration",
      "priority_support",
    ],
    highlighted: true,
    cta: "Start Agency",
  },
  {
    id: "scale",
    name: "Scale",
    tagline: "For 50+ seats & multi-brand",
    monthly: 299,
    annual: 2990,
    minSeats: 10,
    maxSeats: null,
    creemProductEnvKey: "CREEM_PRODUCT_ID_SCALE",
    features: [
      "Everything in Agency",
      "Multi-brand workspaces",
      "SSO + SCIM provisioning",
      "Advanced profitability reports",
      "Dedicated success manager",
      "Custom integrations & SLA",
    ],
    gatedFeatures: [
      "multi_brand_workspaces",
      "sso_scim",
      "advanced_reports",
      "dedicated_success_manager",
      "custom_integrations_sla",
    ],
    cta: "Talk to us",
  },
];

const TIER_LEVEL: Record<Tier, number> = { solo: 1, agency: 2, scale: 3, enterprise: 4 };

// ponytail: gate-to-minimum-tier map. Adding a new gate? Also add it to a
// TierDef.gatedFeatures above so the pricing page renders the check mark.
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
  // ponytail (2026-07-26): route-based gates — mirror the nav structure.
  // /scope, /payment-patterns, /teams, /messages, /reports all unlock at
  // Agency. Multi-workspace, custom fields, compliance alerts, profitability
  // reports unlock at Scale.
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

export function getTierDef(id: Tier | undefined | null): TierDef | null {
  if (!id) return null;
  return TIERS.find((t) => t.id === id) ?? null;
}

export function tierAtLeast(have: Tier | undefined | null, want: Tier): boolean {
  if (!have) return false;
  return (TIER_LEVEL[have] ?? 0) >= (TIER_LEVEL[want] ?? 0);
}

export function hasTierGate(have: Tier | undefined | null, gate: GateKey): boolean {
  const min = GATE_MIN_TIER[gate];
  return tierAtLeast(have, min);
}

// Used by the Creem checkout helper to map a tier → Creem product ID.
// Throws if the env var is not set, so we never silently charge the wrong product.
export function getCreemProductId(tier: Tier): string {
  const def = getTierDef(tier);
  if (!def) throw new Error(`Unknown tier: ${tier}`);
  const id = process.env[def.creemProductEnvKey];
  if (!id) {
    throw new Error(
      `Creem product ID env var ${def.creemProductEnvKey} is not set. ` +
        `Set it on the Convex dashboard before enabling checkout.`,
    );
  }
  return id;
}

export function isValidTier(value: string | undefined | null): value is Tier {
  return !!value && (value === "solo" || value === "agency" || value === "scale" || value === "enterprise");
}

// ponytail (2026-07-26): map a React Router path → the GateKey required to
// access it. Used by CollapsibleSidebar + ProtectedRoute to gate nav items.
// Returns null for public routes (/dashboard, /account-settings, /auth,
// /onboarding-*). The route→gate mapping is grounded in the REAL app routes
// audited against src/main.tsx.
export function featureForRoute(path: string): GateKey | null {
  const p = path.split("?")[0].replace(/\/$/, "");
  if (p === "/scope" || p.startsWith("/scope/")) return "route_scope";
  if (p === "/payment-patterns") return "route_payment_patterns";
  if (p === "/teams") return "route_team_management";
  if (p === "/messages") return "route_messages";
  if (p === "/reports") return "route_reports";
  // /dashboard, /account-settings, /onboarding-*, /auth, /clients, /projects,
  // /proposals, /pipeline, /invoices, /time-tracking, /tags, /goals,
  // /evidence-library → public (available to all paid tiers)
  return null;
}

// ponytail (2026-07-26): pricing metadata — mirrors src/components/site/
// pricing.tsx. Used by UpgradePrompt to show the price of the minimum tier
// needed to unlock a gated feature. Solo = per-seat; Agency + Scale =
// per-agency; Enterprise = contact sales (null).
export const TIER_PRICING: Record<
  Tier,
  { monthly: number | null; pricingUnit: "seat" | "agency" | null }
> = {
  solo: { monthly: 29, pricingUnit: "seat" },
  agency: { monthly: 99, pricingUnit: "agency" },
  scale: { monthly: 299, pricingUnit: "agency" },
  enterprise: { monthly: null, pricingUnit: null },
};

// Human-readable label for a GateKey — used in UpgradePrompt + lock tooltips.
export const GATE_LABELS: Record<GateKey, string> = {
  scope_creep_protection: "Scope Creep Protection",
  full_truth_layer: "Full Truth Layer",
  unlimited_proposals: "Unlimited Proposals",
  evidence_library_unlimited: "Unlimited Evidence Library",
  github_integration: "GitHub Integration",
  figma_integration: "Figma Integration",
  slack_integration: "Slack Integration",
  stripe_integration: "Stripe Integration",
  priority_support: "Priority Support",
  multi_brand_workspaces: "Multi-Brand Workspaces",
  sso_scim: "SSO + SCIM",
  advanced_reports: "Advanced Reports",
  dedicated_success_manager: "Dedicated Success Manager",
  custom_integrations_sla: "Custom Integrations & SLA",
  route_scope: "Scope Management",
  route_payment_patterns: "Payment Patterns",
  route_team_management: "Team Management",
  route_messages: "Messages",
  route_reports: "Reports",
  route_multi_workspace: "Multi-Workspace",
  route_custom_fields: "Custom Fields",
  route_compliance_alerts: "Compliance Alerts",
  route_profitability_reports: "Profitability Reports",
};
