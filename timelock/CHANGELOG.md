# Axia Change Log

Every change to this codebase is tracked here with timestamped backups.

---

## [20260603T064200] Hide 6 features from Projects page

**Backup:** `backups/Projects.tsx.bak.20260603064200/`, `backups/ProjectList.tsx.bak.20260603065421/`
**Files changed:**
- `src/pages/Projects.tsx` — Commented out 6 feature sections: Protection Score, Project Health Dashboard, Risk Timeline Analysis, Milestone Protection, Adaptive Evidence System, Protection Risk Heatmap
- `src/components/project-protection/ProjectList.tsx` — Removed Protection Score metric from cards, changed grid from 4-col to 3-col

**Details:**
- Removed unused imports (Shield, Activity, Clock, Target, etc.)
- Removed unused Convex queries (evidenceData, reports, viewMode)
- Removed unused summary metrics
- Build compiles successfully

---

## [20260603T065500] Fix circular re-export in safe-convex-react.ts

**Backup:** None (was part of Task 1)
**Files changed:**
- `src/lib/safe-convex-react.ts` — Changed import from "convex/react" to "original-convex-react"
- `vite.config.ts` — Added resolve alias "original-convex-react" → node_modules/convex/dist/esm/react/index.js

**Details:**
- Circular re-export caused build failure
- Fix: Use Vite alias to break the cycle

---

## [20260603T070200] Restore ECC repo and Convex connection

**Backup:** None (restoration task)
**Files changed:**
- `.env` — Restored `VITE_CONVEX_URL=https://artful-civet-344.convex.cloud`
- ECC repo restored to `/home/z/my-project/.ecc/` (929 files, v2.0.0-rc.1)

**Details:**
- ECC repo was found at `/tmp/my-project/.ecc`, restored to proper location
- `.env` was missing (lost between sessions), re-created

---

## [20260603T075700] Fix Auth and Landing pages for guest mode

**Backup:** `backups/Auth.tsx.bak.20260603075734/`, `backups/Landing.tsx.bak.20260603075810/`
**Files changed:**
- `src/pages/Auth.tsx` — Added platform connection modals, improved guest flow
- `src/pages/Landing.tsx` — Updated landing page components

---

## [20260603T102100] Backup all 29 page files before major fixes

**Backup:** `backups/pre-fix-20260603102117/` (29 files)
**Files backed up:**
- All files in `src/pages/` (28 page files)
- `src/lib/safe-convex-react.ts`

---

## [20260603T102600] Fix guest navigation, safe Convex queries, clean Evidence Library

**Backup:** `backups/pre-fix-20260603102117/`
**Git commit:** 8849c2d
**Files changed:**
- `src/lib/safe-convex-react.ts` — Rewrote to actually wrap useQuery with useQuery_experimental(throwOnError:false). Now returns undefined on error instead of crashing.
- `src/pages/Auth.tsx` — Guest mode navigates IMMEDIATELY to /dashboard instead of waiting for Convex auth. Auth attempted in background (non-blocking).
- `src/hooks/use-auth.ts` — Reactive isGuestMode state with localStorage polling. Handles signOut errors gracefully.
- `src/pages/EvidenceLibrary.tsx` — Removed DisputeSuccessSimulation, WorkContentAnalysis, EvidenceGapPrediction. Replaced broken Convex queries with mock data.

**Details:**
- Root cause of guest navigation failure: safe-convex-react.ts was NOT actually safe — just re-exported original useQuery
- EvidenceLibrary crashed because it called Convex functions that don't exist on the backend
- Auth page hung because it awaited Convex anonymous auth with 5s timeout before navigating

---

## [20260603T105200] Restore user's changes to Clients and Evidence Library

**Backup:** `backups/Clients.tsx.bak.before-restore/`, `backups/EvidenceLibrary.tsx.bak.before-restore/`
**Git commit:** 42181ef
**Files changed:**
- `src/pages/Clients.tsx` — Restored user's cleaned-up version (230 lines vs old 857 lines)
  - REMOVED: ClientDisputeSimulation, ClientPaymentPattern, ClientGapPrediction
  - REMOVED: All tier-based Trust Score and Protection Score sections (free/starter/pro/expert cards)
  - KEPT: ClientList, ClientPolicyProfile, Add Client Dialog
  - Fixed syntax error: `const ourlyRate` → `const hourlyRate`
- `src/pages/EvidenceLibrary.tsx` — Merged user's removals with safe mock data
  - REMOVED: DisputeSuccessSimulation, WorkContentAnalysis, EvidenceGapPrediction
  - KEPT: EvidenceHealthScore, EvidenceTimeline, EvidenceQualityScorecard, TeamValidation, EvidenceItemsList
  - Uses mock data instead of broken Convex queries

**Source:** Found user's original changes in `/tmp/my-project/src_backup_20260602_161626/`

**LESSON LEARNED:** User's changes from previous session were NEVER committed to git and had NO backups. The session ran out of context before saving. This must NEVER happen again. Every change must be: (1) backed up first, (2) committed to git, (3) logged in CHANGELOG.md.

## 20260603 — Scope Protection Page Created

### Added
- **New Page: `/scope`** — Full Scope Protection page with 3 tabs
  - **Scope Definitions Tab**: Expandable scope cards with deliverables, revision tracking, client approval status, scope health bar, impact summary, and approval link sharing
  - **Change Orders Tab**: Filter by scope, view change order details with impact assessment (time/cost/deadline), approve/reject/formalize actions, auto-generated scope creep detection
  - **Formalizations Tab**: Scope change formalizations with before/after scope diff, impact assessment, client acknowledgment, and approval evidence
- **Summary Cards**: Active scopes count, pending changes, value at risk, unformalized changes
- **Scope Creep Alert Banner**: Warns when pending changes or unformalized changes exist, shows total $ at risk
- **3 Dialogs**: Create Scope Definition, Record Scope Change, Formalize Scope Change
- **Mock Data**: 3 scope definitions, 4 change orders (incl. auto-detected scope creep), 3 formalizations

### Navigation
- Added `/scope` route in `main.tsx` DashboardLayout
- Added "Scope Protection" nav item in sidebar WORK section (expanded + collapsed modes)
- Uses `GitBranch` icon from lucide-react

### Files Changed
- `src/pages/Scope.tsx` — NEW (780+ lines)
- `src/main.tsx` — Added Scope import + route
- `src/components/CollapsibleSidebar.tsx` — Added Scope nav item + GitBranch icon

---

## [20260606T120000] Messaging System Fixes

**Files changed:**
- `src/components/messaging/ChannelList.tsx` — Fixed channel creation (was console.log only, now actually creates channels via onCreateChannel callback)
- `src/components/messaging/MessageList.tsx` — Added auto-scroll to bottom, "New messages" scroll-to-bottom button, read receipts (✓ sent / ✓✓ seen), readBy tracking on messages, date dividers
- `src/components/messaging/MessageInput.tsx` — Fixed sticky input bar at bottom (flex-shrink-0), auto-resize textarea, formatting toolbar
- `src/components/messaging/ChannelHeader.tsx` — Unread badge clearing on channel select
- `src/pages/Messages.tsx` — Integration fixes for all messaging components

**Details:**
- Channel creation was broken: only console.log, now actually adds channels
- Message input bar moved with content: fixed with flex-shrink-0 and proper flex layout
- Messages didn't auto-scroll: added native scroll container with bottom ref
- No read receipts: added readBy field with ✓/✓✓ indicators (gray = sent, blue = seen)
- Unread badges didn't clear: added logic to mark messages read on channel select

---

## [20260606T123000] Truth Layer Verification, Payment Reminders, Feature Connectivity

**Git commit:** 230533e
**Files changed:**
- `src/components/truth-layer/TruthLayerBadge.tsx` — Verification badge with score, animated progress, tooltip details
- `src/components/truth-layer/TruthLayerWidget.tsx` — Full Truth Layer verification widget with circular score, category breakdown, recommendations, compact mode
- `src/components/truth-layer/truthLayerHelpers.ts` — Score calculation engine (time, invoicing, scope, messaging verification)
- `src/components/billing/PaymentReminders.tsx` — Full payment reminders UI with overdue invoices, reminder templates (Day 3/7/14/21), auto-reminders toggle, send/schedule/skip actions
- `src/convex/billing/reminders.ts` — Convex backend for payment reminders (getOverdueInvoices, sendReminder, scheduleAutoReminders, updateReminderSettings)
- `src/convex/scope.ts` — Full scope protection backend (14 functions: CRUD, activate, clientApprove, recordRevision, checkRevisionStatus, createChangeOrder, clientApproveChangeOrder, clientRejectChangeOrder, linkChangeOrderToInvoice)
- `src/components/connectors/FeatureConnector.tsx` — Cross-feature connection component
- `src/components/connectors/WorkflowActions.tsx` — Workflow action buttons (scope actions, invoice actions)
- `src/components/connectors/ActivityTimeline.tsx` — Activity timeline for cross-feature events
- `src/components/connectors/navigationHelpers.ts` — Navigation helpers for cross-feature routing

**Details:**
- Truth Layer: Calculates verification score across 4 categories (Time Evidence, Invoicing, Scope, Messaging). Shows recommendations for weak areas with action routes.
- Payment Reminders: Day 3 (friendly nudge), Day 7 (firm follow-up), Day 14 (urgent final notice), Day 21 (escalation). Auto-scheduling, manual send, toggle controls.
- Scope Protection Backend: Full CRUD with client approval tokens, revision tracking, auto-generated change orders when revision limit exceeded, client approve/reject flows via approval links.
- Feature Connectivity: FeatureConnector component creates visual links between features (proposals→invoices→time tracking→evidence→payments).

---

## [20260606T130000] Chrome Extension - Full Build

**Files changed:**
- `chrome-extension/manifest.json` — Manifest V3 with storage, activeTab, scripting, alarms permissions; host_permissions for Upwork, Fiverr, Toptal, Freelancer, Convex
- `chrome-extension/background.js` — Service worker with: pairing code validation, token-based auth via Convex HTTP actions, evidence session management, event buffering with 5s flush, platform detection, alarm-based periodic flush
- `chrome-extension/content.js` — Content script for Upwork/Fiverr/Toptal/Freelancer: mouse tracking (throttled 250ms), keyboard tracking (debounced 100ms), URL change observer, visibility state tracking, platform status reporting
- `chrome-extension/popup.html` — Extension popup UI with setup/connected views
- `chrome-extension/popup.js` — Popup controller with pairing code input, auto-paste from clipboard, connect/disconnect, status display
- `chrome-extension/icons/` — Extension icons (16, 24, 32, 48, 128px)

**Details:**
- Extension uses pairing code format: "convexUrl::64-char-hex-token"
- Background validates token via Convex HTTP action at /api/extension/validate
- Evidence collection starts automatically after pairing
- Events buffered and flushed every 5s via fetch to /api/extension/record
- Sessions finalized via /api/extension/finalize
- CRITICAL: Uses .convex.site (not .convex.cloud) for HTTP Actions

---

## [20260606T133000] Push to GitHub, Rebuild Dist, Sync Public Assets

**Git commits pushed:** 9 unpushed commits pushed to origin/main
**Actions:**
- Pushed all commits to `doongarshimamania-lab/AXIA.git`
- Rebuilt dist with `npx vite build` (6 chunks, 5.67s)
- Copied dist to public/ for preview server
- Updated CHANGELOG.md with all missing entries
