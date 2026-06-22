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
