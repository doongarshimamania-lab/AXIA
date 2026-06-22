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
