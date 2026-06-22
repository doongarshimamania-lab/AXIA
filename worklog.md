---
Task ID: ALL (1, 2, 3, 4, 5, 6, 7, 8, 9)
Agent: main
Task: Deep per-page code-quality audit of all 34 pages in axia/src/pages/ (26,387 LOC).

Work Log:
- Read prior audit (resources/docs/axia-code-audit-2026-06-21.md) — that was folder-completeness + duplicate detection, not per-page code-quality.
- Inspected axia/src/main.tsx routing — found 3 mis-routed URLs (/platform-integrations, /subscription, /help-center all point to <AccountSettings />) and several potentially unrouted pages.
- Created download/ + scripts/ directories.
- Launched 6 parallel Explore agents, each assigned a thematic group of pages:
  - Group A (8 pages, ~1.9K LOC): Landing, Auth, ClientLogin, ClientSignup, OnboardingSource, OnboardingUserInformation, WaitlistSuccess, NotFound
  - Group B (6 pages, ~5.1K LOC): Dashboard, OwnerDashboard, AccountSettings, ApiSettings, Subscription, HelpCenter
  - Group C (5 pages, ~5.2K LOC): Clients, ClientDashboard, ClientWorkspace, Projects, Pipeline
  - Group D (5 pages, ~6.1K LOC): Invoices, InvoiceBuilder, Proposals, ProposalBuilder, PaymentPatterns
  - Group E (4 pages, ~3.6K LOC): EvidenceLibrary, EvidenceExport, Reports, TimeTracking
  - Group F (6 pages, ~5.3K LOC): Messages, TeamManagement, Tags, Goals, Scope, PlatformIntegrations
- Group F initially failed with 429 rate-limit; retried successfully.
- Each agent read every line of every assigned page, verified route wiring against main.tsx, and returned a structured per-page audit with Critical/Medium/Minor issues + a score out of 10.
- Compiled all 6 agent reports into a single comprehensive Markdown audit at /home/z/my-project/download/AXIA-Deep-Page-Audit-2026-06-22.md.

Stage Summary:
- Final deliverable: /home/z/my-project/download/AXIA-Deep-Page-Audit-2026-06-22.md (~1,240 lines)
- 34/34 pages audited (100% coverage), 26,387/26,387 LOC
- Average page score: 4.5/10
- 9 pages scored ≤3/10 (broken), 19 scored 4–6 (functional but rough), 6 scored ≥7 (production-ready)
- Top critical findings:
  1. Hardcoded plaintext owner password in OwnerDashboard.tsx L51
  2. IDOR on markProposalViewedByClient / markInvoiceViewedByClient in ClientWorkspace.tsx
  3. XSS via javascript: URLs in lib/markdown.tsx link rendering
  4. 5 unrouted pages (~3,375 LOC of dead code)
  5. 3 mis-routed URLs all pointing to <AccountSettings />
  6. 3 conflicting SaaS pricing structures across the codebase
  7. Rules-of-Hooks violations in Subscription.tsx and PlatformIntegrations.tsx (latent crashes)
  8. Timezone date bugs in both InvoiceBuilder.tsx and ProposalBuilder.tsx
  9. Money typed as `number` in all 5 financial pages (float arithmetic on currency)
  10. Fake data presented as real analytics in PaymentPatterns.tsx, Reports.tsx, Dashboard.tsx, OwnerDashboard.tsx
  11. TimeTracking.tsx pause-doesn't-pause bug
  12. ~70+ `as any` casts on Convex-generated IDs across the codebase
  13. ~15+ half-wired / no-op buttons (toast-only actions with no real mutation)
- Includes prioritized 8-phase action plan (38 items) for remediation.
- Did NOT audit Convex backend or shared components — recommended as follow-up.

---
Task ID: AUTH-FIX-1
Agent: main
Task: Fix the convex error when logging in with a different account, AND make the complete auth flow from landing page → dashboard real and dynamic (no hardcoded data).

Work Log:
- Read the existing auth flow end-to-end:
  - `src/pages/Landing.tsx` — landing page only had a waitlist form, NO login/signup buttons.
  - `src/components/landing/HeroSection.tsx` + `FinalCTA.tsx` — both showed a waitlist form, not auth CTAs.
  - `src/pages/Auth.tsx` — supported password sign-in/up + email OTP, plus non-functional Google/GitHub buttons (providers not configured).
  - `src/hooks/use-auth.ts` — auto-fired `seed.seedDevProfile` on every new login. ROOT CAUSE of the convex error.
  - `convex/seed.ts` (`seedDevProfile`) — created the SAME hardcoded sample data ("Acme Corp", "TechStart Inc", "DesignFlow Agency" clients, sample deals, sample projects) for EVERY new user.
  - `convex/users.ts` (`getProtectionMetrics`) — returned fake "95% protection score / 171 protected hours" estimates when no real data existed.
  - `src/hooks/use-workspace.tsx` — had MOCK_MEMBERS (8 fake team members) and MOCK_STATS (94% protection score, $47,850 revenue) shown as fallbacks.
  - `src/hooks/use-subscription-tier.ts` — only read tier from localStorage, so tier leaked across account switches.
- Diagnosed the "convex error when logging in with a different account": the auto-fired `seedDevProfile` mutation tried to insert duplicate pipeline stages / clients / workspace for a fresh user, conflicting with prior seeding attempts and the parallel `workspaces.crud.seedPersonalWorkspace` mutation called from `useWorkspace`.

Changes made (all TS-clean — verified with `bunx tsc --noEmit`):

1. `src/hooks/use-auth.ts` — REWROTE. Removed the auto-fire of `seed.seedDevProfile` (root cause of convex error). Now the hook is read-only: it only fetches the current user. The personal workspace is created lazily via `workspaces.crud.seedPersonalWorkspace` (idempotent — only creates an empty workspace + default pipeline stages, NO fake clients/projects/deals).

2. `convex/seed.ts` + `src/convex/seed.ts` — Stripped ALL hardcoded sample data creation from `seedDevProfile`. Now it ONLY enriches user profile fields (name from email, role, subscriptionTier, joinedAt). Removed the auto-creation of Acme Corp/TechStart Inc/DesignFlow Agency clients, sample projects, sample deals. Kept `enrichDevUser` intact for the dev@axia.app test user.

3. `convex/users.ts` + `src/convex/users.ts` (`getProtectionMetrics`) — Now returns REAL zeros when no data exists (0 protected hours, 0 protected value, 0% protection score). Previously returned fake "95% protection score / 171 protected hours" for every new user.

4. `src/hooks/use-workspace.tsx` — Removed MOCK_MEMBERS (8 fake members: "Alex Rivera", "Priya Sharma", etc.) and MOCK_STATS (94% protection score, $47,850 revenue) hardcoded fallbacks. `useWorkspaceMembers` now returns `[]` when no data; `useWorkspaceStats` returns all-zero stats. UI will show honest empty states.

5. `src/pages/Landing.tsx` — REWROTE nav. Added "Sign in" + "Get Started" buttons (unauthenticated state) and "Dashboard" + sign-out buttons (authenticated state). Primary CTA deep-links to `/auth?mode=signup&redirect=/dashboard`.

6. `src/components/landing/HeroSection.tsx` — Replaced waitlist form with a real "Get Started Free" / "Go to Dashboard" CTA button (auth-aware). Removed `WaitlistForm` import.

7. `src/components/landing/FinalCTA.tsx` — Replaced waitlist form with a real "Create Free Account" / "Open Dashboard" CTA button (auth-aware).

8. `src/pages/Auth.tsx` — Three fixes:
   a. Honor `?mode=signup` URL param so the "Get Started" button deep-links directly to the signup form.
   b. Removed the non-functional Google/GitHub OAuth buttons (providers are commented out in `convex/auth.config.ts` because `AUTH_GOOGLE_ID` / `AUTH_GITHUB_ID` env vars are not set).
   c. Cleaned up unused `Github` import.

9. `src/hooks/use-subscription-tier.ts` — REWROTE. Now syncs tier from the Convex `users.subscriptionTier` field (source of truth) whenever the user record changes. When user signs out, tier resets to "free" and clears localStorage. When user signs in with a different account, tier follows the backend record (no more stale tier leaking across accounts).

Stage Summary:
- Convex error root cause fixed: removed the auto-seed of hardcoded sample data that conflicted on multi-account login.
- Auth flow is now REAL: landing page → "Get Started" → /auth?mode=signup → signup form → /dashboard → empty dashboard with "Seed Demo Data" button (explicit, user-triggered).
- No more hardcoded data: every new user starts with an empty dashboard. Real Convex data is shown when present; honest empty states are shown when absent.
- Subscription tier now follows the user record across account switches.
- All changes are TypeScript-clean (no new errors introduced; pre-existing errors in other files are unchanged).
- Files modified: 9 files (5 frontend, 3 convex backend, 1 hook).
- To re-enable Google/GitHub OAuth: set AUTH_GOOGLE_ID / AUTH_GITHUB_ID env vars, uncomment providers in `convex/auth.config.ts`, re-add OAuth buttons in `Auth.tsx`.
