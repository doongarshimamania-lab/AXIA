# Axia Worklog

This file tracks tasks performed by AI sub-agents on the Axia codebase.
Each entry is separated by `---` and follows the protocol:
`Task ID | Agent | Task | Work Log | Stage Summary`.

---

## Task ID: P1-RECON
## Agent: Explore-tier-map
## Task: Map ALL tier-related code in `/home/z/my-project/axia/` to prepare for removing ALL tier UI and flattening the schema to a single tier ("expert").

### Work Log

A recon-only pass (no files modified). Searched case-insensitively for: `tier`, `subscription`, `PricingModal`, `ReportLimitModal`, `use-subscription-tier`, `useSubscriptionTier`, `upgrade`, `free`/`starter`/`pro`/`expert`/`client` (as tier names), `isFreeTier`/`isProTier`/`isExpertTier`/`tierLimit`, `maxProjects`/`maxClients`/`maxReports`/`maxInvoices`, `plan` (billing context), `subscriptionTier`, `subscriptionPlan`, `billingPlan`, `getTierLevel`, `hasTierAccess`, `normalizeTier`, `api.tiers.*`, plus glob passes for `*tier*`, `*subscription*`, `*pricing*`, `*upgrade*`, `*plan*`.

Key findings up front:

- The app supports 5 tier string literals: `"free"`, `"starter"`, `"pro"`, `"expert"`, `"client"`. They appear as both a user `subscriptionTier` field (on `users`, `clientCompanies`) and as input args (`userTier`, `tierOverride`, `targetTier`, `tierShown`, `fromTier`, `toTier`).
- The Convex `tiers/` directory (`tierDetection.ts`, `upgradeTracking.ts`) exports 5 functions that are NEVER imported by any frontend code (no `api.tiers.*` references found anywhere in `src/`). They appear to be admin/CLI-only or fully dead code.
- The `use-subscription-tier.ts` hook is consumed by 11 pages/components.
- The frontend has 4 "tier-switching" parent components that pick a tier-specific child variant: `ProjectRiskTimeline.tsx`, `MilestoneProtection.tsx`, `ProjectProtectionScore.tsx`, `ProjectHealthDashboardNew.tsx` (re-exported as `ProjectHealthDashboard`).
- The `/subscription` route in `main.tsx` is a legacy redirect to `/account-settings`; the `Subscription.tsx` page itself is no longer routed but still ships in the bundle.
- `ProtectedRoute.tsx` calls `setUser({ tier: user.subscriptionTier })` for analytics — minor.
- `security/rateLimit.ts` `requireAdmin()` treats `subscriptionTier === "expert"` as equivalent to `role === "admin"` — this gate must be reworked when tiers collapse.
- `users.ts` schema has `subscriptionTier` (string) and `tierUpgradedAt` (number) fields.
- `clientCompanies` table (defined in BOTH `tables/projects.ts` and `tables/clients.ts` — duplicates) has a `subscriptionTier` field — but this represents the CLIENT COMPANY's tier (separate concept from user subscription tier). Decision required: keep or flatten.
- `tables/features.ts` defines two entire tier-tracking tables — `upgradeTriggers` (with `tierShown` field) and `upgradeConversions` (with `fromTier`, `toTier` fields and `by_tier` index) — plus a `waitlistEntries` table whose `source` field uses literal `"pricing"`.
- No `maxProjects` / `maxClients` / `maxReports` / `maxInvoices` field names exist. No `isFreeTier` / `isProTier` / `isExpertTier` / `tierLimit` symbols exist. Limits are enforced inline (e.g., `disputeReports.ts` line 75: `limit: user.subscriptionTier === "pro" ? -1 : 1`).
- No `plan` schema field exists; the only `plan`-as-billing references are in `PricingCard.tsx` (landing), `FeatureComparison.tsx`, `Subscription.tsx`, `AccountSettings.tsx`, and `PremiumValueSection.tsx` (a "Manage Subscription" button label).
- `protection/protectionValueSimple.ts:68` returns `platformBreakdown.client` (literal `"client"` here is a platform name, NOT a tier — false positive).
- `data/mockProjectData.ts` is heavily tier-laced: every mock project has `tier: "free"` and `upgrade: { targetTier: "starter", ... }`.

---

## 1. Files to DELETE entirely (with reason)

These files exist solely to support tier differentiation / pricing / upgrade UX. After flattening to a single "expert" tier, they have no remaining purpose.

### Tier-system core (hook + Convex functions)

| # | Absolute path | Reason |
|---|---|---|
| 1 | `/home/z/my-project/axia/src/hooks/use-subscription-tier.ts` | The hook itself (`useSubscriptionTier`). Returns the user's tier, syncs to localStorage. Whole file's purpose is tier state. DELETE. |
| 2 | `/home/z/my-project/axia/src/convex/tiers/tierDetection.ts` | Exports `detectUserTier`, `getTierFeatures`, `calculateUpgradeValue`. Never imported by frontend (`api.tiers.*` has zero callers). DELETE. |
| 3 | `/home/z/my-project/axia/src/convex/tiers/upgradeTracking.ts` | Exports `trackUpgradeTrigger`, `trackUpgradeConversion`. Never imported by frontend. DELETE. |
| 4 | `/home/z/my-project/axia/src/convex/tiers/` (directory) | After deleting the two files above, the entire `tiers/` directory is empty and can be removed. |

### Pricing / Upgrade modals

| # | Absolute path | Reason |
|---|---|---|
| 5 | `/home/z/my-project/axia/src/components/PricingModal.tsx` | 5-tier pricing modal (Free/Starter/Pro/Expert/Client). Pure pricing UI. DELETE. |
| 6 | `/home/z/my-project/axia/src/components/ReportLimitModal.tsx` | "Report limit reached — upgrade to premium" modal. DELETE. |
| 7 | `/home/z/my-project/axia/src/components/project-protection/adaptive-evidence/UpgradePrompt.tsx` | Upgrade CTA card shown in adaptive-evidence timeline. DELETE. |
| 8 | `/home/z/my-project/axia/src/components/project-protection/health/UpgradePrompt.tsx` | Upgrade CTA card shown in project-health dashboard. DELETE. |
| 9 | `/home/z/my-project/axia/src/components/project-protection/adaptive-evidence/TierHeader.tsx` | Renders a `{tier} Tier` badge. DELETE. |

### Subscription page (legacy, redirected)

| # | Absolute path | Reason |
|---|---|---|
| 10 | `/home/z/my-project/axia/src/pages/Subscription.tsx` | 1273-line page defining `TIERS`, `FEATURES`, `FAQ_DATA`, pricing cards, plan-change dialog. The `/subscription` route in `main.tsx:296` is a legacy redirect to `/account-settings` — the page component is never rendered. DELETE the page; also remove the `import Subscription from "./pages/Subscription.tsx";` and the `<Route path="/subscription" element={<AccountSettings />} />` legacy redirect in `main.tsx`. |

### Landing-page pricing components

| # | Absolute path | Reason |
|---|---|---|
| 11 | `/home/z/my-project/axia/src/components/landing/PricingCard.tsx` | Presentational pricing-tier card used on the landing page. DELETE. |
| 12 | `/home/z/my-project/axia/src/components/landing/FeatureComparison.tsx` | Full feature-comparison matrix across Free/Starter/Pro/Expert. DELETE. |

### Tier-specific component variants (only the non-Expert variants)

These are rendered via `switch(tier)` in parent components. After flattening, only the `Expert` variant is needed; the others become unreachable.

| # | Absolute path | Reason |
|---|---|---|
| 13 | `/home/z/my-project/axia/src/components/project-protection/health/DashboardFree.tsx` | Tier-specific dashboard for `free`. DELETE. |
| 14 | `/home/z/my-project/axia/src/components/project-protection/health/DashboardStarter.tsx` | Tier-specific dashboard for `starter`. DELETE. |
| 15 | `/home/z/my-project/axia/src/components/project-protection/health/DashboardPro.tsx` | Tier-specific dashboard for `pro`. DELETE. |
| 16 | `/home/z/my-project/axia/src/components/project-protection/health/DashboardFreeNew.tsx` | Alternate "New" variant for `free`. DELETE. |
| 17 | `/home/z/my-project/axia/src/components/project-protection/health/DashboardStarterNew.tsx` | Alternate "New" variant for `starter`. DELETE. |
| 18 | `/home/z/my-project/axia/src/components/project-protection/health/DashboardProNew.tsx` | Alternate "New" variant for `pro`. DELETE. |
| 19 | `/home/z/my-project/axia/src/components/project-protection/ProjectRiskTimelineFree.tsx` | Tier-specific risk timeline for `free`. DELETE. |
| 20 | `/home/z/my-project/axia/src/components/project-protection/ProjectRiskTimelineStarter.tsx` | Tier-specific risk timeline for `starter`. DELETE. |
| 21 | `/home/z/my-project/axia/src/components/project-protection/ProjectRiskTimelinePro.tsx` | Tier-specific risk timeline for `pro` (imports Starter and Free as fallbacks). DELETE. |
| 22 | `/home/z/my-project/axia/src/components/project-protection/MilestoneProtectionFree.tsx` | Tier-specific milestone view for `free`. DELETE. |
| 23 | `/home/z/my-project/axia/src/components/project-protection/MilestoneProtectionStarter.tsx` | Tier-specific milestone view for `starter`. DELETE. |
| 24 | `/home/z/my-project/axia/src/components/project-protection/MilestoneProtectionPro.tsx` | Tier-specific milestone view for `pro`. DELETE. |
| 25 | `/home/z/my-project/axia/src/components/project-protection/MilestoneProtectionTest.tsx` | Test scaffold for milestone protection (tier-aware). DELETE. |
| 26 | `/home/z/my-project/axia/src/components/project-protection/score/ProtectionScoreCardFree.tsx` | Tier-specific protection-score card for `free`. DELETE. |
| 27 | `/home/z/my-project/axia/src/components/project-protection/score/ProtectionScoreCardStarter.tsx` | Tier-specific protection-score card for `starter`. DELETE. |
| 28 | `/home/z/my-project/axia/src/components/project-protection/score/ProtectionScoreCardPro.tsx` | Tier-specific protection-score card for `pro`. DELETE. |
| 29 | `/home/z/my-project/axia/src/components/project-protection/score/ProtectionScoreCard.tsx` | Generic `ProtectionScoreCard` (not tier-suffixed). Grep shows it is exported but never imported anywhere — already dead code. DELETE. |
| 30 | `/home/z/my-project/axia/src/components/project-protection/ProjectRiskTimelineStarter.tsx` | (duplicate of #20 — listed once) |

**Note on the surviving "Expert" variants**: `DashboardExpert.tsx`, `DashboardExpertNew.tsx`, `ProjectRiskTimelineExpert.tsx`, `MilestoneProtectionExpert.tsx`, `ProtectionScoreCardExpert.tsx` should be KEPT. After deletion of the others, their parent switch-components (see Section 2) must be simplified to render the Expert variant unconditionally.

### Mock data

| # | Absolute path | Reason |
|---|---|---|
| 31 | `/home/z/my-project/axia/src/data/mockProjectData.ts` | Every mock project sets `tier: "free"` and `upgrade: { targetTier: "starter", ... }`. DELETE (or rewrite without tier fields). |

---

## 2. Files to EDIT (with what to remove)

These files have legitimate purpose beyond tiers but contain tier checks / tier UI / subscription gating that must be stripped.

### A. Schema files (see also Section 4 — Schema fields to remove)

| # | Absolute path | What to remove |
|---|---|---|
| 1 | `/home/z/my-project/axia/src/convex/tables/users.ts` | Remove `subscriptionTier` field (line 16) and `tierUpgradedAt` field (line 17). |
| 2 | `/home/z/my-project/axia/src/convex/tables/features.ts` | Remove the entire `upgradeTriggers` table (lines ~247–260), the entire `upgradeConversions` table (lines ~262–273) including its `by_tier` index, and the literal `"pricing"` value from the `waitlistEntries.source` comment (line ~279) if desired. Note: `waitlistEntries` table itself is not tier-specific, only the source comment references pricing. |
| 3 | `/home/z/my-project/axia/src/convex/tables/projects.ts` | Remove `subscriptionTier` field from `clientCompanies` table (line 167). DECISION REQUIRED: this is the CLIENT COMPANY's tier, not the user's tier — confirm with the user before removing. |
| 4 | `/home/z/my-project/axia/src/convex/tables/clients.ts` | Remove `subscriptionTier` field from `clientCompanies` table (line 79). Same caveat as #3 — this is the client company's tier. |
| 5 | `/home/z/my-project/axia/src/convex/tables/clients.ts.disabled` | Disabled-file duplicate of #4 — remove `subscriptionTier` (line ~74) for consistency. |

### B. Convex function files (see also Section 3 — Convex functions affected)

| # | Absolute path | What to remove |
|---|---|---|
| 6 | `/home/z/my-project/axia/src/convex/users.ts` | Remove `setUserTier` mutation (lines ~107–128) and `grantTierByEmail` mutation (lines ~134–158). Also remove the `tier: v.union(...)` args validator on both. Keep `setUserRole` (separate concept). Update the doc comment on `updateProfile` (lines 47–58) to remove the explanation about why `subscriptionTier` was omitted — it's now simply gone. |
| 7 | `/home/z/my-project/axia/src/convex/disputeReports.ts` | Remove tier-gating in `getMonthlyUsage` (line 75: `limit: user.subscriptionTier === "pro" ? -1 : 1` → unlimited), and the `if (user.subscriptionTier === "free")` blocks in `createDisputeReport` (line 102) and `generateDisputeReport` (line 180) — drop the limit check entirely. |
| 8 | `/home/z/my-project/axia/src/convex/evidence.ts` | Remove `if (user.subscriptionTier === "free")` gates at lines 280 and 442. |
| 9 | `/home/z/my-project/axia/src/convex/network/premiumNetwork.ts` | Remove `subscriptionTier !== "pro"` guards at lines 14, 90, 94, 155, 171. The Premium Network feature either becomes available to all (now-expert) users, or is gated differently. |
| 10 | `/home/z/my-project/axia/src/convex/premium/protectionPlans.ts` | Remove `subscriptionTier !== "pro"` guards at lines 14, 43. |
| 11 | `/home/z/my-project/axia/src/convex/premium/protectionAdvisor.ts` | Remove `subscriptionTier !== "pro"` guard at line 14. |
| 12 | `/home/z/my-project/axia/src/convex/premium/crossPlatformVerification.ts` | Remove `subscriptionTier !== "pro"` guards at lines 15, 91. |
| 13 | `/home/z/my-project/axia/src/convex/premium/teamValidation.ts` | Remove all `if (user.subscriptionTier === "free"|"starter"|"pro"|"expert")` branches in `getTeamValidation`, `submitValidation`, etc. (lines 21, 26, 134, 144, 154, 167, 200, 208, 217, 226, 237, 264, 267, 278, 288, 303, 338, 341, 350, 360, 372). Keep only the "expert"-equivalent code path. |
| 14 | `/home/z/my-project/axia/src/convex/protection/protectionValue.ts` | Remove `tier = user.subscriptionTier \|\| "free"` (line 15) and the tier-conditional logic throughout. The `subscriptionTier` field returned in the metrics object (line 135) should be hardcoded to `"expert"` or removed. |
| 15 | `/home/z/my-project/axia/src/convex/protection/protectionValueSimple.ts` | Remove `subscriptionCost = user.subscriptionTier === "pro" ? 8 : 0` (line 41) — replace with the expert-tier cost (likely $0 since billing is going away). Remove `subscriptionTier` from the returned object (line 71) or hardcode to `"expert"`. |
| 16 | `/home/z/my-project/axia/src/convex/projects/projectProtection.ts` | Remove `subscriptionTier: "free"` defaults at lines 37, 253, 266, 290, 314. Remove `const tier = (user as any).subscriptionTier \|\| "free"` (line 270) and `subscriptionTier: tier` at line 384. |
| 17 | `/home/z/my-project/axia/src/convex/projects/projectProtectionScore.ts` | Remove `userTier: v.string()` arg (line 15) and all `if (tier === "free"\|"starter"\|"pro"\|"expert")` branches (lines 363, 441, 567, 739). Keep only the expert path. |
| 18 | `/home/z/my-project/axia/src/convex/projects/projectHealthDashboard.ts` | Remove `userTier: v.string()` arg (line 12) and tier branching at line 27 onward. |
| 19 | `/home/z/my-project/axia/src/convex/projects/milestoneProtection.ts` | Remove `userTier: v.string()` arg (line 9), the tier-conditional `weeksToShow` ternary (line 92), and `if (tier === "expert" ...)` special cases (line 228). |
| 20 | `/home/z/my-project/axia/src/convex/projects/riskTimeline.ts` | Remove `tierOverride` arg (line 34), `normalizeTier` helper (line 10), and the giant tier-conditional pillar/persuasion/upgrade-prompt builder (lines 41, 107, 122, 507–547). Always return the expert-equivalent payload. |
| 21 | `/home/z/my-project/axia/src/convex/projects/adaptiveEvidenceSystem.ts` | Remove `userTier: v.string()` arg (line 8), `calculateTierSystem(projectData, args.userTier)` (line 18), `tier: args.userTier` in response (line 22). |
| 22 | `/home/z/my-project/axia/src/convex/projects/milestoneReports.ts` | Search shows it's in projects/ but not directly tier-laced; verify before editing. |
| 23 | `/home/z/my-project/axia/src/convex/clients/clientDisputeSimulation.ts` | Remove `userTier = user.subscriptionTier \|\| "free"` (line 22), all `if (tier === "free"\|"starter"\|"pro"\|"expert")` branches (lines 100, 116, 141, 179, 225, 229, 232, 235), `tier: userTier` and `upgradeMessage` from response (lines 90–91). |
| 24 | `/home/z/my-project/axia/src/convex/clients/clientTrustScore.ts` | Same pattern as #23 (lines 21, 36, 49, 69, 96, 130, 134, 137, 140). |
| 25 | `/home/z/my-project/axia/src/convex/clients/clientPolicyProfile.ts` | Same pattern (lines 22, 100, 116, 141, 179, 225, 229, 232, 235). |
| 26 | `/home/z/my-project/axia/src/convex/clients/clientGapPrediction.ts` | Same pattern (lines 22, 132, 147, 169, 202, 242, 246, 249, 252). |
| 27 | `/home/z/my-project/axia/src/convex/clients/clientProtectionScore.ts` | Same pattern (lines 21, 28, 29). |
| 28 | `/home/z/my-project/axia/src/convex/clients/clientAuth.ts` | Remove `subscriptionTier: "free"` default in client-signup handler (line 40). |
| 29 | `/home/z/my-project/axia/src/convex/clientAuth.ts` | Remove `subscriptionTier: "free"` default (line 40). |
| 30 | `/home/z/my-project/axia/src/convex/security/rateLimit.ts` | Update `requireAdmin()` (lines 154–156) to no longer accept `subscriptionTier === "expert"` as an admin substitute — gate on `role === "admin"` only. CRITICAL: this currently lets any "expert"-tier user bypass admin gates. After flattening, EVERY user would be "expert" → everyone becomes admin. Must change to role-only. |
| 31 | `/home/z/my-project/axia/src/convex/adminListAll.ts` | Remove `tier: u.subscriptionTier` from the `listAllUsers` response (line 37). Also remove the comment about "admin/expert-tier auth" (lines 3–4). |
| 32 | `/home/z/my-project/axia/src/convex/adminSeed.ts` | Remove `subscriptionTier: "pro"` default seeding (line 34). |
| 33 | `/home/z/my-project/axia/src/convex/autoSeed.ts` | Remove `subscriptionTier = "pro"` default seeding (line 35). |
| 34 | `/home/z/my-project/axia/src/convex/seed.ts` | Remove `subscriptionTier: "pro"` (line 164) and the conditional `subscriptionTier = "pro"` / `"free"` assignments (lines 444, 448). |
| 35 | `/home/z/my-project/axia/src/convex/seedProjects.ts` | Remove `subscriptionTier: "free"` default (line 27). |
| 36 | `/home/z/my-project/axia/src/convex/seedTeamUsers.ts` | Remove `tier` field from all `TEST_USERS` definitions (lines 42, 55, 68, 81), the `if (!user.subscriptionTier) patches.subscriptionTier = u.tier` assignment (line 208), and `tier: user.subscriptionTier` in any response object (line 1633). This file is 1642 lines — full audit required. |
| 37 | `/home/z/my-project/axia/src/convex/seedNew.ts` | No tier references found in `seedNew.ts` itself (the only match was the unrelated word "subscription billing" in a project description at line 264). No edits needed here. |
| 38 | `/home/z/my-project/axia/src/convex/_generated/api.d.ts` | After deletion of `tiers/tierDetection.ts` and `tiers/upgradeTracking.ts`, regenerate via `npx convex codegen` — the generated `api.tiers.*` typings will disappear. No manual edit needed; just regenerate. |

### C. Frontend pages

| # | Absolute path | What to remove |
|---|---|---|
| 39 | `/home/z/my-project/axia/src/pages/AccountSettings.tsx` | Remove `TierKey` type (line 91), `TIERS` array (line 106), `useSubscriptionTier` import and usage (line 173), `handleTierChange` callback (line 250), and the entire tier-comparison / tier-switching UI (lines 564–780). The page is large (~800 lines) and the tier UI is a major section — full audit required. |
| 40 | `/home/z/my-project/axia/src/pages/Dashboard.tsx` | Remove `PricingModal` import (line 48), `useSubscriptionTier` import (line 6), `showPricingModal` state (line 219), `setSubscriptionTier` calls (line 214), the `<PricingModal>` JSX (lines 778–790), and any tier-conditional rendering. |
| 41 | `/home/z/my-project/axia/src/pages/Reports.tsx` | Remove `useSubscriptionTier` import (line 45) and usage (line 158), `isProOrAbove = subscriptionTier === "pro" \|\| "expert"` (line 196), and any tier-conditional report-limit UI. |
| 42 | `/home/z/my-project/axia/src/pages/Clients.tsx` | Remove `useSubscriptionTier` import (line 12) and usage (line 28), and the `subscriptionTier={subscriptionTier}` prop pass to `<ClientList>` (line 258) and `tier={subscriptionTier}` to other components (line 342). |
| 43 | `/home/z/my-project/axia/src/pages/Projects.tsx` | Remove `useSubscriptionTier` import (line 14) and usage (line 46), `subscriptionTier={tier}` prop pass (line 215). |
| 44 | `/home/z/my-project/axia/src/pages/TimeTracking.tsx` | Remove `useSubscriptionTier` import (line 16) and usage (line 51), and any tier-conditional rendering. |
| 45 | `/home/z/my-project/axia/src/pages/EvidenceLibrary.tsx` | Remove `useSubscriptionTier` import (line 7) and usage (line 219), `getTierLevel` helper (line 117), `hasTierAccess` helper (line 122), and all `hasTierAccess(subscriptionTier, "pro")` calls (lines 389, 430, 461, 520, 527, 531, 803, 849, 882) — replace with `true` (since everyone is expert). |
| 46 | `/home/z/my-project/axia/src/pages/EvidenceExport.tsx` | Same pattern as #45 — remove `useSubscriptionTier` (line 51, 243), `getTierLevel` (line 96), `hasTierAccess` (line 101), and all tier-conditional checks (lines 358, 407, 704, 754, 795). |
| 47 | `/home/z/my-project/axia/src/pages/PaymentPatterns.tsx` | Remove `useSubscriptionTier` import (line 40) and usage (line 162), and any tier-conditional rendering. |
| 48 | `/home/z/my-project/axia/src/pages/ClientDashboard.tsx` | Remove `subscriptionTier: userProfile?.subscriptionTier \|\| "free"` (line 59) and any tier-conditional rendering. |
| 49 | `/home/z/my-project/axia/src/main.tsx` | Remove `import Subscription from "./pages/Subscription.tsx";` (line 35) and the `<Route path="/subscription" element={<AccountSettings />} />` legacy redirect (line 296). Also consider removing the `/platform-integrations` and `/help-center` legacy redirects if desired (they're not tier-related but are listed alongside the subscription redirect). |

### D. Frontend components (not already in Section 1)

| # | Absolute path | What to remove |
|---|---|---|
| 50 | `/home/z/my-project/axia/src/components/CollapsibleSidebar.tsx` | Remove `subscriptionTier` from the inline profile object (line 92) and the `subscriptionTier = profile?.subscriptionTier \|\| "free"` line (line 187). Likely also remove any "Upgrade" / "Subscription" nav entry. Full file is large (~600+ lines) — audit needed. |
| 51 | `/home/z/my-project/axia/src/components/ProfileSection.tsx` | Remove `useSubscriptionTier` import (line 3) and usage (line 14), and the `{subscriptionTier}` display text (line 36). |
| 52 | `/home/z/my-project/axia/src/components/ProtectedRoute.tsx` | Remove `tier: (user as any).subscriptionTier` from the `setUser()` analytics call (line 29). |
| 53 | `/home/z/my-project/axia/src/components/AIDisputePrediction.tsx` | Remove `subscriptionTier` prop (line 15), default (line 26), and `hasAccess = subscriptionTier === "pro" \|\| "expert"` gate (line 36). Always grant access. |
| 54 | `/home/z/my-project/axia/src/components/Teams.tsx` | Remove `subscriptionTier` prop (line 13), default (line 16), `getTierLevel` helper (line 18), `hasTierAccess` helper (line 22), and the `{!hasTierAccess("pro") && (...)}` conditional UI (line 72). |
| 55 | `/home/z/my-project/axia/src/components/ComplianceStatusWidget.tsx` | Remove `subscriptionTier` prop (line 14) and default (line 24), and any tier-conditional rendering. |
| 56 | `/home/z/my-project/axia/src/components/CrossPlatformVerification.tsx` | Remove `subscriptionTier` prop (line 8), default (line 14), and `hasAccess = subscriptionTier === "pro" \|\| "expert"` gate (line 19). |
| 57 | `/home/z/my-project/axia/src/components/CustomPolicyAnalyzer.tsx` | Remove `subscriptionTier` prop (line 6), default (line 13), and `hasAccess = subscriptionTier === "pro" \|\| "expert"` gate (line 19). |
| 58 | `/home/z/my-project/axia/src/components/LostIncomeCalculator.tsx` | Remove `subscriptionTier` prop (line 12), and the tier-conditional upgrade-CTA rendering (lines 42, 43, 116, 117, 118, 173, 182, 183, 184, 189). The `tierPricing` / `tierSuccessRates` lookups become irrelevant. |
| 59 | `/home/z/my-project/axia/src/components/PersonalizedProtectionPlan.tsx` | Remove `subscriptionTier` prop (line 8), default (line 14), and the `hasFullAccess` / `hasBasicAccess` / `isLocked` gates (lines 19–21). Always treat as `hasFullAccess`. |
| 60 | `/home/z/my-project/axia/src/components/RealTimeProtectionAdvisor.tsx` | Remove `subscriptionTier` prop (line 18), default (line 24), and `hasAccess` gate (line 29). |
| 61 | `/home/z/my-project/axia/src/components/PremiumValueSection.tsx` | Remove "Manage Subscription" button (line 60) — leads nowhere after deletion. Remove "Axia Expert Verification" copy if rebranding. Minor: file is not strictly tier-logic, but the subscription/expert wording should be cleaned up. |
| 62 | `/home/z/my-project/axia/src/components/ProtectionValueDashboard.tsx` | Remove `tierDisplayNames[metrics.subscriptionTier] \|\| "Free Plan"` (line 112), and the tier-conditional CTA cards at lines 220, 227, 234 (`subscriptionTier === "free"`, `"starter"`, `"pro"`). |
| 63 | `/home/z/my-project/axia/src/components/project-protection/ProjectList.tsx` | Remove `subscriptionTier` prop (line 25), default (line 34), `hasAdvancedMetrics` gate (line 47), `hasProjectInsights` gate (line 48). |
| 64 | `/home/z/my-project/axia/src/components/client-protection/ClientList.tsx` | Remove `subscriptionTier` prop (line 55), default (line 64), `getTierLevel` helper (line 128), `hasPaymentPatternAccess` gate (line 132). |
| 65 | `/home/z/my-project/axia/src/components/project-protection/ProjectRiskTimeline.tsx` | Remove `tier` prop (line 15). Replace the `switch(tier.toLowerCase())` block (lines 97–106) with a direct `<ProjectRiskTimelineExpert {...props} />`. Drop `tierOverride: tier.toLowerCase()` from the query args (line 41) — backend will no longer accept that arg. |
| 66 | `/home/z/my-project/axia/src/components/project-protection/MilestoneProtection.tsx` | Remove `tier` prop (line 17). Replace the `switch(tier)` block (lines 73–131) with a direct `<MilestoneProtectionExpert .../>`. Drop `userTier` from the query args. |
| 67 | `/home/z/my-project/axia/src/components/project-protection/ProjectProtectionScore.tsx` | Remove `tier` prop (line 13), `normalizedTier` (line 22), and the `if (normalizedTier === "expert"\|"pro"\|"starter"\|"free")` switch (lines 83–104). Always render `<ProtectionScoreCardExpert>`. Drop `userTier: normalizedTier` from the query args (line 28). |
| 68 | `/home/z/my-project/axia/src/components/project-protection/ProjectHealthDashboardNew.tsx` | Remove the `switch(tier)` block (lines 69–77) — always render `<DashboardExpert>`. Drop `userTier` from the query args. |
| 69 | `/home/z/my-project/axia/src/components/project-protection/AdaptiveEvidenceSystem.tsx` | Remove `tier` prop and any `<TierHeader>` / `<UpgradePrompt>` rendering. Audit needed. |
| 70 | `/home/z/my-project/axia/src/components/project-protection/adaptive-evidence/AdaptiveEvidenceTimeline.tsx` | Audit for tier-conditional rendering; remove `TierHeader` and `UpgradePrompt` imports if present. |
| 71 | `/home/z/my-project/axia/src/components/project-protection/ProjectHealthDashboard.tsx` | One-line re-export shim (`export { ProjectHealthDashboardNew as ProjectHealthDashboard }`). No tier logic — leave as-is. |

### E. Type definitions

| # | Absolute path | What to remove |
|---|---|---|
| 72 | `/home/z/my-project/axia/src/types/projectProtection.ts` | Remove `tier: 'free' \| 'starter' \| 'pro' \| 'expert'` from `EvidenceTimelineData` (line 75), `TimelineRiskData` (line 114), the tier-keyed `pillars: { free: ...; starter?: ...; pro?: ...; expert?: ... }` shape (lines 121–126) — collapse to a single `pillars: TimelinePillar[]`. Remove `tier: string` from `ProjectProtectionScoreData` (line 180). Remove `upgrade?: { targetTier: ... }` (lines 101–107) and `upgradePrompt?: { targetTier: ... }` (lines 136–140). |
| 73 | `/home/z/my-project/axia/src/lib/monitoring.ts` | Remove `tier?: string` from the `setUser()` parameter type (line 56). Optionally remove the `SUBSCRIPTION_CHANGED` analytics event constant (line 119) if no longer dispatched. |

### F. Landing page (marketing site)

| # | Absolute path | What to remove |
|---|---|---|
| 74 | `/home/z/my-project/axia/src/components/landing/HeroSection.tsx` | Audit for tier mentions (grep matched "tier"). Likely minor copy edits. |
| 75 | `/home/z/my-project/axia/src/components/landing/Hero.tsx` | Same — audit. |
| 76 | `/home/z/my-project/axia/src/components/landing/FinalCTA.tsx` | Remove "Free forever tier · Cancel anytime" copy (line 63). |
| 77 | `/home/z/my-project/axia/src/components/landing/WaitlistForm.tsx` | Audit — likely references "pricing" source string. |
| 78 | `/home/z/my-project/axia/src/components/landing/Footer.tsx` | Remove "Pricing" from the Product links array (line 4). |
| 79 | `/home/z/my-project/axia/src/components/landing/ValueProposition.tsx` | Audit — no direct grep hit but in landing/ folder. |
| 80 | `/home/z/my-project/axia/src/components/landing/HowItWorks.tsx` | Audit — no direct grep hit. |
| 81 | `/home/z/my-project/axia/src/components/landing/Testimonials.tsx` | Audit — no direct grep hit. |
| 82 | `/home/z/my-project/axia/src/pages/Landing.tsx` | Audit — composes the landing sections; remove `<PricingCard>` / `<FeatureComparison>` usages if any. |

### G. Other

| # | Absolute path | What to remove |
|---|---|---|
| 83 | `/home/z/my-project/axia/src/components/ProfileModal.tsx` | Currently just a redirect to `/account-settings`. Not tier-specific, but mentioned in the Subscription page deletion chain. Leave as-is unless the redirect target changes. |
| 84 | `/home/z/my-project/axia/src/lib/safe-convex-react.ts` | Grep matched "subscription" — audit for any tier-related React hooks. Likely a false positive (probably matched the word "subscription" in a comment about Convex subscriptions). |
| 85 | `/home/z/my-project/axia/src/hooks/use-app-data.tsx` | Grep matched "subscription" — audit. |
| 86 | `/home/z/my-project/axia/src/components/PremiumNetwork.tsx` | Renders the Premium Network section (gated by `subscriptionTier === "pro"` on backend). After flatten, it's available to all. Likely no prop changes needed — the backend gate at `network/premiumNetwork.ts` is what changes. Audit anyway. |

---

## 3. Convex functions affected

### Functions that take a `tier`-related argument

| Function | File | Arg(s) | Action |
|---|---|---|---|
| `tiers.getTierFeatures` | `convex/tiers/tierDetection.ts` | `tier: v.string()` | DELETE (whole file) |
| `tiers.calculateUpgradeValue` | `convex/tiers/tierDetection.ts` | `targetTier: v.string()` | DELETE (whole file) |
| `tiers.trackUpgradeTrigger` | `convex/tiers/upgradeTracking.ts` | `tierShown: v.string()` | DELETE (whole file) |
| `tiers.trackUpgradeConversion` | `convex/tiers/upgradeTracking.ts` | `fromTier: v.string()`, `toTier: v.string()` | DELETE (whole file) |
| `users.setUserTier` | `convex/users.ts` | `tier: v.union(v.literal("free"), "starter", "pro", "expert", "client")` | DELETE the mutation |
| `users.grantTierByEmail` | `convex/users.ts` | `tier: v.union(...)` | DELETE the mutation |
| `projects.projectProtectionScore.getProjectProtectionScore` | `convex/projects/projectProtectionScore.ts` | `userTier: v.string()` | REMOVE arg, hardcode expert path |
| `projects.projectHealthDashboard.getProjectHealthDashboard` | `convex/projects/projectHealthDashboard.ts` | `userTier: v.string()` | REMOVE arg, hardcode expert path |
| `projects.milestoneProtection.getMilestoneProtection` | `convex/projects/milestoneProtection.ts` | `userTier: v.string()` | REMOVE arg, hardcode expert path |
| `projects.riskTimeline.getProjectRiskTimeline` | `convex/projects/riskTimeline.ts` | `tierOverride: v.optional(v.string())` | REMOVE arg, hardcode expert path |
| `projects.adaptiveEvidenceSystem.*` | `convex/projects/adaptiveEvidenceSystem.ts` | `userTier: v.string()` | REMOVE arg, hardcode expert path |
| `projects.projectProtection.getProjectProtectionDetails` | `convex/projects/projectProtection.ts` | (no tier arg, but returns `subscriptionTier` in mocked data) | REMOVE `subscriptionTier` from returned mock objects |

### Functions that return a `tier`-related field

| Function | File | Returned field | Action |
|---|---|---|---|
| `tiers.detectUserTier` | `convex/tiers/tierDetection.ts` | `currentTier`, `recommendedTier`, `shouldUpgrade` | DELETE (whole file) |
| `protection.protectionValue.getMetrics` | `convex/protection/protectionValue.ts` | `subscriptionTier` | Hardcode `"expert"` or remove |
| `protection.protectionValueSimple.getMetrics` | `convex/protection/protectionValueSimple.ts` | `subscriptionTier` | Hardcode `"expert"` or remove |
| `projects.projectProtection.*` | `convex/projects/projectProtection.ts` | `subscriptionTier` (in 5+ mocked responses) | Remove from all response shapes |
| `clients.clientDisputeSimulation.*` | `convex/clients/clientDisputeSimulation.ts` | `tier`, `upgradeMessage` | Remove from response |
| `clients.clientTrustScore.*` | `convex/clients/clientTrustScore.ts` | `tier`, `upgradeMessage` | Remove from response |
| `clients.clientPolicyProfile.*` | `convex/clients/clientPolicyProfile.ts` | `tier`, `upgradeMessage` | Remove from response |
| `clients.clientGapPrediction.*` | `convex/clients/clientGapPrediction.ts` | `tier`, `upgradeMessage` | Remove from response |
| `clients.clientProtectionScore.*` | `convex/clients/clientProtectionScore.ts` | `tier`, `upgradeMessage` | Remove from response |
| `disputeReports.getMonthlyUsage` | `convex/disputeReports.ts` | `limit` (computed from tier) | Hardcode `-1` (unlimited) |
| `adminListAll.listAllUsers` | `convex/adminListAll.ts` | `tier` | Remove from response |
| `seedTeamUsers.enrichAllTeamUsers` | `convex/seedTeamUsers.ts` | `tier` (in response) | Remove from response |

### Functions that READ `user.subscriptionTier` for gating (no arg, no return)

These all need their tier check removed (or replaced with always-allow):

| Function | File | Line(s) |
|---|---|---|
| `disputeReports.createDisputeReport` | `convex/disputeReports.ts` | 102 |
| `disputeReports.generateDisputeReport` | `convex/disputeReports.ts` | 180 |
| `disputeReports.getMonthlyUsage` | `convex/disputeReports.ts` | 75 |
| `evidence.*` (multiple) | `convex/evidence.ts` | 280, 442 |
| `network.premiumNetwork.getProtectionNetwork` | `convex/network/premiumNetwork.ts` | 14, 21 |
| `network.premiumNetwork.sendConnectionRequest` | `convex/network/premiumNetwork.ts` | 90, 94 |
| `network.premiumNetwork.*` (more) | `convex/network/premiumNetwork.ts` | 155, 171 |
| `premium.protectionPlans.*` | `convex/premium/protectionPlans.ts` | 14, 43 |
| `premium.protectionAdvisor.*` | `convex/premium/protectionAdvisor.ts` | 14 |
| `premium.crossPlatformVerification.*` | `convex/premium/crossPlatformVerification.ts` | 15, 91 |
| `premium.teamValidation.*` | `convex/premium/teamValidation.ts` | 21, 26, 134, 144, 154, 167, 200, 208, 217, 226, 237, 264, 267, 278, 288, 303, 338, 341, 350, 360, 372 |
| `security.rateLimit.requireAdmin` | `convex/security/rateLimit.ts` | 154–156 (CRITICAL — see note in Section 2.B #30) |

---

## 4. Schema fields to remove

### Fields on existing tables

| Table | Field | File:Line | Notes |
|---|---|---|---|
| `users` | `subscriptionTier: v.optional(v.string())` | `convex/tables/users.ts:16` | Comment documents enum: `"free" \| "starter" \| "pro" \| "expert" \| "client"`. |
| `users` | `tierUpgradedAt: v.optional(v.number())` | `convex/tables/users.ts:17` | Always paired with subscriptionTier; remove together. |
| `clientCompanies` | `subscriptionTier: v.string().maxLength(50)` | `convex/tables/projects.ts:167` | **DECISION REQUIRED**: this is the CLIENT COMPANY's tier (e.g. for the client portal), not the freelancer's subscription tier. Confirm with user whether to remove. |
| `clientCompanies` | `subscriptionTier: v.string()` | `convex/tables/clients.ts:79` | Duplicate definition of the same `clientCompanies` table (this is a known duplication between `tables/projects.ts` and `tables/clients.ts`). Same decision applies. |
| `clientCompanies` | `subscriptionTier: v.string()` | `convex/tables/clients.ts.disabled:74` | Disabled-file duplicate — clean up for consistency. |

### Entire tables to remove

| Table | File:Line range | Notes |
|---|---|---|
| `upgradeTriggers` | `convex/tables/features.ts:247–260` | Tracks every time a user saw an upgrade prompt. Includes `tierShown` field. Whole table is upgrade-funnel analytics — no longer relevant. |
| `upgradeConversions` | `convex/tables/features.ts:262–273` | Tracks successful tier upgrades. Includes `fromTier`, `toTier` fields and a `by_tier` index. Whole table is upgrade-funnel analytics — no longer relevant. |

### Indexes to remove

| Index | Table | File:Line |
|---|---|---|
| `by_tier` (`["toTier"]`) | `upgradeConversions` | `convex/tables/features.ts:272` |

### Schema fields NOT affected (confirmed clean)

- `tables/teams.ts` — no tier fields. Clean.
- `tables/workspaces.ts` — no tier fields. Clean.
- `tables/billing.ts` — no tier fields (invoices, paymentReminders, etc. are unrelated to subscription tier). Clean.
- `tables/projects.ts` `projects` table — no tier fields (the `subscriptionTier` at line 167 is on `clientCompanies`, not `projects`). Clean.
- `tables/clients.ts` `clients` table — no tier fields (the `subscriptionTier` at line 79 is on `clientCompanies`). Clean.

---

## 5. Tier string literals inventory

Every literal `"free"`, `"starter"`, `"pro"`, `"expert"`, `"client"` used as a TIER NAME (excluding unrelated uses such as `"client"` as a platform name in `WorkDiarySimulator.tsx`, `EvidenceCollector.tsx`, `ShareRecordsPanel.tsx`, `scope.ts`, `evidence/library.ts`, `ai/disputePrediction.ts`, `autoSeed.ts` tag categories, and `use-app-data.tsx` tag categories — all confirmed unrelated).

### `"free"` (tier)

| File | Line(s) | Context |
|---|---|---|
| `convex/tiers/tierDetection.ts` | 12, 18, 67, 158, 176, 188 | Default tier, getTierLevel map, successRates map, pricing map |
| `convex/upgradeTracking.ts` | (none directly — uses args) | — |
| `convex/network/premiumNetwork.ts` | (none — uses "pro") | — |
| `convex/disputeReports.ts` | 102, 180 | `if (user.subscriptionTier === "free")` |
| `convex/evidence.ts` | 280, 442 | `if (user.subscriptionTier === "free")` |
| `convex/premium/teamValidation.ts` | 134, 200, 208, 264, 267, 338, 341 | `tier === "free"` branches |
| `convex/clients/clientDisputeSimulation.ts` | 22, 100, 225, 229 | Default tier + branches |
| `convex/clients/clientTrustScore.ts` | 21, 36, 130, 134 | Default tier + branches |
| `convex/clients/clientPolicyProfile.ts` | 22, 100, 225, 229 | Default tier + branches |
| `convex/clients/clientGapPrediction.ts` | 22, 132, 242, 246 | Default tier + branches |
| `convex/clients/clientAuth.ts` | 40 | `subscriptionTier: "free"` default |
| `convex/clientAuth.ts` | 40 | `subscriptionTier: "free"` default |
| `convex/seedProjects.ts` | 27 | `subscriptionTier: "free"` default |
| `convex/seedTeamUsers.ts` | 81 | `tier: "free" as const` for Carlos Rivera |
| `convex/projects/projectProtection.ts` | 37, 253, 266, 270, 290, 314 | Mocked defaults |
| `convex/projects/projectProtectionScore.ts` | 363 | `if (tier === "free" \|\| !["starter","pro","expert"].includes(tier))` |
| `convex/projects/milestoneProtection.ts` | 92 | `tier === "free" ? 1 : ...` |
| `convex/projects/riskTimeline.ts` | 107, 122, 515, 526 | Branch logic |
| `convex/adminSeed.ts` | (uses "pro") | — |
| `convex/autoSeed.ts` | (uses "pro") | — |
| `convex/seed.ts` | 448 | `subscriptionTier = "free"` fallback |
| `hooks/use-subscription-tier.ts` | 20, 29, 41, 61 | Default state + signed-out reset |
| `components/PricingModal.tsx` | 25, 33, 44, 105, 107, 145, 146, 194 | TIER_PRICING, TIER_SUCCESS_RATES, default currentTier |
| `components/CollapsibleSidebar.tsx` | 92, 187 | Default tier fallback |
| `components/ProfileSection.tsx` | (via hook) | — |
| `components/CrossPlatformVerification.tsx` | 14 | Default prop |
| `components/AIDisputePrediction.tsx` | 26 | Default prop |
| `components/Teams.tsx` | 16 | Default prop |
| `components/ComplianceStatusWidget.tsx` | 24 | Default prop |
| `components/CustomPolicyAnalyzer.tsx` | 13 | Default prop |
| `components/PersonalizedProtectionPlan.tsx` | 14, 21 | Default prop + isLocked check |
| `components/RealTimeProtectionAdvisor.tsx` | 24 | Default prop |
| `components/LostIncomeCalculator.tsx` | (via prop type) | — |
| `components/ProjectList.tsx` (client-protection) | — | (uses "pro"/"expert") |
| `components/ProtectionValueDashboard.tsx` | 112, 220 | "Free Plan" display + tier check |
| `components/client-protection/ClientList.tsx` | (via getTierLevel) | — |
| `pages/AccountSettings.tsx` | 657, 750 | "Free Tier" label + tier comparison |
| `pages/Subscription.tsx` | 75, 132, 156, 352, 621, 640, 1029, 1267 | TIERS array, FEATURES, default dialog target |
| `pages/ClientDashboard.tsx` | 59 | `subscriptionTier: userProfile?.subscriptionTier \|\| "free"` |
| `pages/EvidenceLibrary.tsx` | 117 (getTierLevel), 122 (hasTierAccess) | Tier comparison helpers |
| `pages/EvidenceExport.tsx` | 96, 101 | Same helpers |
| `pages/Reports.tsx` | 196 | `isProOrAbove` (uses "pro" + "expert") |
| `data/mockProjectData.ts` | 14, 46, 78, 110, 142, 302, 327, 353, 379, 401, 496, 514, 517, 538, 559, 578 | Every mock project's tier + upgrade.targetTier |

### `"starter"`

| File | Line(s) | Context |
|---|---|---|
| `convex/tiers/tierDetection.ts` | 24, 68, 93, 177, 189 | Recommended tier threshold, getTierLevel, features map, successRates, pricing |
| `convex/premium/teamValidation.ts` | 26, 144, 217, 278, 350 | Branch logic |
| `convex/clients/clientDisputeSimulation.ts` | 116, 232 | Branch |
| `convex/clients/clientTrustScore.ts` | 49, 137 | Branch |
| `convex/clients/clientPolicyProfile.ts` | 116, 232 | Branch |
| `convex/clients/clientGapPrediction.ts` | 147, 249 | Branch |
| `convex/seedTeamUsers.ts` | 55 | Marcus Johnson = "starter" |
| `convex/projects/projectProtectionScore.ts` | 441 | Branch |
| `convex/projects/milestoneProtection.ts` | 92 | weeksToShow ternary |
| `convex/projects/riskTimeline.ts` | 507, 515, 532 | Pillar inclusion + persuasion flag + upgrade prompt |
| `hooks/use-subscription-tier.ts` | 20, 38, 61 | Tier type union |
| `components/PricingModal.tsx` | 26, 34, 111, 118, 143, 146, 148, 184 | Starter tier card |
| `components/CrossPlatformVerification.tsx` | 8 | Tier type union |
| `components/AIDisputePrediction.tsx` | 15 | Tier type union |
| `components/Teams.tsx` | 13 | Tier type union |
| `components/ComplianceStatusWidget.tsx` | (no — just `string`) | — |
| `components/CustomPolicyAnalyzer.tsx` | 6 | Tier type union |
| `components/PersonalizedProtectionPlan.tsx` | 8, 21 | Tier type union + isLocked check |
| `components/RealTimeProtectionAdvisor.tsx` | 18 | Tier type union |
| `components/LostIncomeCalculator.tsx` | 12, 117, 183 | Tier type union + upgrade copy |
| `components/ProjectList.tsx` | 25 | Tier type union |
| `components/client-protection/ClientList.tsx` | 55 | Tier type union |
| `components/project-protection/adaptive-evidence/TierHeader.tsx` | 11 | tierColors map |
| `components/project-protection/health/UpgradePrompt.tsx` | 15 | tierPricing map |
| `pages/AccountSettings.tsx` | 91, 657, 750 | TierKey type + label + comparison |
| `pages/Subscription.tsx` | 58, 85, 123, 133, 352, 1029, 1062 | TierKey + TIERS + FEATURES + tierLimits |
| `pages/EvidenceLibrary.tsx` | 117 | getTierLevel map |
| `pages/EvidenceExport.tsx` | 96 | getTierLevel map |
| `data/mockProjectData.ts` | 197, 220, 243, 266, 289, 514, 535, 556, 575, 596 | upgrade.targetTier |
| `types/projectProtection.ts` | 75, 114, 122–125 | Tier unions in types |

### `"pro"`

| File | Line(s) | Context |
|---|---|---|
| `convex/tiers/tierDetection.ts` | 22, 69, 106, 178, 190 | Recommended tier, getTierLevel, features, successRates, pricing |
| `convex/network/premiumNetwork.ts` | 14, 21, 90, 94, 155, 171 | Premium network gating |
| `convex/premium/protectionPlans.ts` | 14, 43 | Pro gating |
| `convex/premium/protectionAdvisor.ts` | 14 | Pro gating |
| `convex/premium/crossPlatformVerification.ts` | 15, 91 | Pro gating |
| `convex/premium/teamValidation.ts` | 144, 154, 226, 288, 360 | Branch logic |
| `convex/disputeReports.ts` | 75 | `limit: user.subscriptionTier === "pro" ? -1 : 1` |
| `convex/clients/clientDisputeSimulation.ts` | 141, 235 | Branch |
| `convex/clients/clientTrustScore.ts` | 69, 140 | Branch |
| `convex/clients/clientPolicyProfile.ts` | 141, 235 | Branch |
| `convex/clients/clientGapPrediction.ts` | 169, 252 | Branch |
| `convex/protection/protectionValueSimple.ts` | 41 | `subscriptionCost = user.subscriptionTier === "pro" ? 8 : 0` |
| `convex/seedTeamUsers.ts` | 42, 68 | Priya + Aisha = "pro" |
| `convex/adminSeed.ts` | 34 | `subscriptionTier = "pro"` default |
| `convex/autoSeed.ts` | 35 | `subscriptionTier = "pro"` default |
| `convex/seed.ts` | 164, 444 | `subscriptionTier: "pro"` / `subscriptionTier = "pro"` |
| `convex/projects/projectProtectionScore.ts` | 567 | Branch |
| `convex/projects/milestoneProtection.ts` | 92 | weeksToShow ternary |
| `convex/projects/riskTimeline.ts` | 508, 516, 538 | Pillar inclusion + persuasion + upgrade |
| `hooks/use-subscription-tier.ts` | 10 (comment), 20, 38, 61 | Tier type union |
| `components/PricingModal.tsx` | 27, 35, 152, 163, 192, 194, 196 | Pro tier card |
| `components/CollapsibleSidebar.tsx` | 92 | Tier type union |
| `components/CrossPlatformVerification.tsx` | 8, 19 | Tier type + hasAccess |
| `components/AIDisputePrediction.tsx` | 15, 36 | Tier type + hasAccess |
| `components/Teams.tsx` | 13, 72 | Tier type + hasTierAccess("pro") |
| `components/CustomPolicyAnalyzer.tsx` | 6, 19 | Tier type + hasAccess |
| `components/PersonalizedProtectionPlan.tsx` | 8, 20 | Tier type + hasBasicAccess |
| `components/RealTimeProtectionAdvisor.tsx` | 18, 29 | Tier type + hasAccess |
| `components/LostIncomeCalculator.tsx` | 12, 118, 184 | Tier type + upgrade copy |
| `components/ProtectionValueDashboard.tsx` | 234 | Tier check |
| `components/ProjectList.tsx` | 25, 47 | Tier type + hasAdvancedMetrics |
| `components/client-protection/ClientList.tsx` | 55, 132 | Tier type + hasPaymentPatternAccess |
| `components/project-protection/adaptive-evidence/TierHeader.tsx` | 12 | tierColors map |
| `components/project-protection/health/UpgradePrompt.tsx` | 16 | tierPricing map |
| `pages/AccountSettings.tsx` | 91, 657, 750 | TierKey + label + comparison |
| `pages/Subscription.tsx` | 58, 95, 124, 134, 352, 1029, 1062 | TierKey + TIERS + FEATURES + tierLimits |
| `pages/Reports.tsx` | 196 | `isProOrAbove = subscriptionTier === "pro" \|\| "expert"` |
| `pages/EvidenceLibrary.tsx` | 117 | getTierLevel map |
| `pages/EvidenceExport.tsx` | 96 | getTierLevel map |
| `types/projectProtection.ts` | 75, 114, 124, 125 | Tier unions |

### `"expert"`

| File | Line(s) | Context |
|---|---|---|
| `convex/tiers/tierDetection.ts` | 20, 70, 119, 180, 192 | Recommended tier, getTierLevel, features, successRates, pricing |
| `convex/premium/teamValidation.ts` | 144, 154, 167, 237, 303, 372 | Branch logic |
| `convex/security/rateLimit.ts` | 154, 155, 156 | **CRITICAL** — admin gate `subscriptionTier === "expert"` |
| `convex/clients/clientDisputeSimulation.ts` | 179 | Branch |
| `convex/clients/clientTrustScore.ts` | 96 | Branch |
| `convex/clients/clientPolicyProfile.ts` | 179 | Branch |
| `convex/clients/clientGapPrediction.ts` | 202 | Branch |
| `convex/projects/projectProtectionScore.ts` | 739 | Branch |
| `convex/projects/milestoneProtection.ts` | 228 | Branch |
| `convex/projects/riskTimeline.ts` | 509, 517, 547 | Pillar inclusion + persuasion + businessMapNodes |
| `hooks/use-subscription-tier.ts` | 20, 38, 61 | Tier type union |
| `components/PricingModal.tsx` | 28, 36, 200, 207, 236, 239, 241 | Expert tier card |
| `components/CollapsibleSidebar.tsx` | 92 | Tier type union |
| `components/CrossPlatformVerification.tsx` | 8, 19 | Tier type + hasAccess |
| `components/AIDisputePrediction.tsx` | 15, 36 | Tier type + hasAccess |
| `components/Teams.tsx` | 13 | Tier type union |
| `components/CustomPolicyAnalyzer.tsx` | 6, 19 | Tier type + hasAccess |
| `components/PersonalizedProtectionPlan.tsx` | 8, 19 | Tier type + hasFullAccess |
| `components/RealTimeProtectionAdvisor.tsx` | 18, 29 | Tier type + hasAccess |
| `components/LostIncomeCalculator.tsx` | 12, 118, 189 | Tier type + upgrade copy |
| `components/ProjectList.tsx` | 25, 48 | Tier type + hasProjectInsights |
| `components/client-protection/ClientList.tsx` | 55 | Tier type union |
| `components/PremiumValueSection.tsx` | 48 | "Axia Expert Verification" branding (not a tier check) |
| `components/project-protection/adaptive-evidence/TierHeader.tsx` | 13 | tierColors map |
| `pages/AccountSettings.tsx` | 91, 657, 750 | TierKey + label + comparison |
| `pages/Subscription.tsx` | 58, 107, 125, 135, 352, 1029, 1062 | TierKey + TIERS + FEATURES + tierLimits |
| `pages/Reports.tsx` | 196 | `isProOrAbove` |
| `pages/EvidenceLibrary.tsx` | 117, 531 | getTierLevel + `hasTierAccessFn("expert")` |
| `pages/EvidenceExport.tsx` | 96 | getTierLevel map |
| `data/mockProjectData.ts` | (none — mock data only uses "free"/"starter") | — |
| `types/projectProtection.ts` | 75, 114, 126 | Tier unions |

### `"client"` (as a tier — distinct from "client" as a platform/source name)

| File | Line(s) | Context |
|---|---|---|
| `convex/tiers/tierDetection.ts` | 71, 132, 181, 193 | getTierLevel, features map, successRates, pricing |
| `hooks/use-subscription-tier.ts` | 20, 38, 61 | Tier type union (includes `"client"`) |
| `components/CollapsibleSidebar.tsx` | 92 | Tier type union |
| `components/CrossPlatformVerification.tsx` | 8 | Tier type union |
| `components/AIDisputePrediction.tsx` | 15 | Tier type union |
| `components/Teams.tsx` | 13 | Tier type union |
| `components/CustomPolicyAnalyzer.tsx` | 6 | Tier type union |
| `components/PersonalizedProtectionPlan.tsx` | 8 | Tier type union |
| `components/RealTimeProtectionAdvisor.tsx` | 18 | Tier type union |
| `components/LostIncomeCalculator.tsx` | 12 | Tier type union |
| `components/ProjectList.tsx` | 25 | Tier type union |
| `components/client-protection/ClientList.tsx` | 55 | Tier type union |
| `components/PricingModal.tsx` | 29, 37, 246, 252, 281, 284, 286 | Client tier card |
| `pages/AccountSettings.tsx` | 250, 397, 568 | `handleTierChange: (t: TierKey \| "client")` |
| `pages/Subscription.tsx` | (none directly — TIERS is TierKey only, excludes "client") | — |
| `pages/EvidenceLibrary.tsx` | (none — getTierLevel map has only 4 tiers) | — |

**Note**: The `"client"` tier represents client-portal users (per `convex/clientAuth.ts:40` which defaults `subscriptionTier: "free"` for client signups — though the comment in `tables/users.ts:16` lists "client" as a valid value). The decision to drop this tier is part of the flatten-to-expert scope but should be confirmed — client-portal auth may need a different role field instead.

---

## Stage Summary

**Recon complete. No files modified.**

### Scope size

- **~31 files to DELETE entirely** (4 tier-system core, 5 pricing/upgrade modals, 1 subscription page, 2 landing pricing components, 18 tier-specific dashboard/timeline/milestone/scorecard variants, 1 mock-data file)
- **~86 files to EDIT** (5 schema files, 33 convex function files, 11 frontend pages, 22 frontend components, 2 type/lib files, 9 landing files, plus main.tsx and a few audit-required files)
- **2 entire Convex tables to remove** (`upgradeTriggers`, `upgradeConversions`) plus 1 index (`by_tier`)
- **5 schema fields to remove** across 3 tables (`users.subscriptionTier`, `users.tierUpgradedAt`, `clientCompanies.subscriptionTier` × 2 file locations, plus the disabled-file duplicate). The `clientCompanies.subscriptionTier` field requires a product decision.
- **12 Convex functions take tier args** (5 to delete, 7 to refactor)
- **~25 Convex functions return tier fields** or read `user.subscriptionTier` for gating

### Critical risks flagged

1. **`security/rateLimit.ts:154–156`** — `requireAdmin()` treats `subscriptionTier === "expert"` as equivalent to `role === "admin"`. After flattening, EVERY user becomes "expert" → EVERY user becomes admin. **Must change to role-only gating before deploying the flatten.**
2. **`clientCompanies.subscriptionTier`** field — represents the client company's tier, NOT the freelancer's subscription. Removing it may break the client portal. **Confirm with user.**
3. **`"client"` tier** — used for client-portal users (see `convex/clientAuth.ts:40` and `tables/users.ts:16` comment). After flatten, client-portal auth needs a different role/identity mechanism.
4. **Dead-code `tiers/` directory** — `tierDetection.ts` and `upgradeTracking.ts` are never called from any frontend code. Safe to delete without runtime impact, but verify no Convex dashboard / cron / CLI script invokes them.
5. **`Subscription.tsx`** — already legacy (route redirects to `/account-settings`). Deletion is safe.
6. **Mock data** — `data/mockProjectData.ts` laces tier into every project. Deletion or full rewrite required.

### Recommended execution order for the follow-up implement task

1. **First**: Fix `security/rateLimit.ts` to gate on `role === "admin"` only (closes the security hole independent of the flatten).
2. **Second**: Strip tier args/returns from all Convex functions (Sections 3 and 4 schema fields). Run `npx convex codegen` to regenerate `api.d.ts`.
3. **Third**: Delete tier-system core files (Section 1 #1–4) and pricing/upgrade modals (Section 1 #5–12).
4. **Fourth**: Delete tier-specific component variants (Section 1 #13–30), keeping only Expert variants.
5. **Fifth**: Simplify the 4 tier-switching parent components (Section 2.D #65–68) to render the Expert variant unconditionally.
6. **Sixth**: Edit frontend pages and components to remove `useSubscriptionTier` usage and tier-conditional rendering (Sections 2.C, 2.D).
7. **Seventh**: Update type definitions (Section 2.E) and landing page copy (Section 2.F).
8. **Finally**: Run `tsc --noEmit` and `eslint` to catch dangling references; run the app and verify no runtime errors.

This recon is the foundation for task P1-IMPLEMENT (the actual removal).
