# Bug Fix Summary: Proposals Page + Evidence Library Page

## Task ID: proposals-evidence-fixes
## Agent: codefixer

---

## Fixes Applied

### 1. Proposals Page — "Convert to Project" Flow (CRITICAL FIX)

**Problem:** Clicking "Convert to Project" on a signed proposal only navigated to `/projects?createFromProposal=XXX` — it didn't actually create any records.

**Solution:** Replaced the navigation-only handler with a proper multi-step mutation flow:

1. **Find or create a client** — Checks `existingClients` for a match by name; if none found, calls `api.clients.crud.createClient` with the proposal's `clientName`/`clientEmail` and `workspaceId`.

2. **Create a project** — Calls `api.projects.projectProtectionSimple.addProject` with `projectName` from the proposal title, `clientId` from step 1, `hourlyRate` derived from the proposal value, and `workspaceId`.

3. **Move pipeline deal to "Won"** — If the proposal has a `dealId`, fetches pipeline stages, finds the "Won" stage, and calls `api.pipeline.crud.moveDeal` to move the associated deal.

4. **Update proposal notes** — Appends `[Converted to project — date]` to the proposal notes via `api.proposals.crud.updateProposal`.

**Files changed:**
- `/home/z/my-project/timelock/src/pages/Proposals.tsx` — Added mutations, queries, and `handleConvertToProject` handler; passed `onConvertToProject` prop to `ProposalCard`.
- `/home/z/my-project/timelock/src/convex/projects/projectProtectionSimple.ts` — Added `workspaceId` optional arg to `addProject` mutation and updated client ownership check to support workspace-scoped clients.

---

### 2. Proposals Page — "Define Scope" Button

**Problem:** Navigated to `/scope?proposal=XXX` but the Scope page didn't read URL params, so nothing happened.

**Solution:**
- Changed the navigation URL to `/scope?proposalId=XXX` (consistent param name).
- Modified `Scope.tsx` to:
  - Import `useSearchParams` from `react-router`.
  - Read `proposalId` from URL search params.
  - Auto-open the "Create Scope" dialog when `proposalId` is present.
  - Pre-populate title and description from the proposal data (fetched via `api.proposals.crud.getProposal`).
  - Pass `proposalId` to the `createScopeDefinition` mutation so the scope is linked to the proposal.

**Files changed:**
- `/home/z/my-project/timelock/src/pages/Proposals.tsx` — Changed URL from `/scope?proposal=` to `/scope?proposalId=`.
- `/home/z/my-project/timelock/src/pages/Scope.tsx` — Added `useSearchParams`, proposal data query, auto-open dialog, and form pre-population.

---

### 3. Proposals Page — Unequal Card Heights

**Problem:** Proposal cards had different heights depending on content, creating visual inconsistency.

**Solution:** Added flexbox equal-height classes:
- Card: `h-full flex flex-col` — forces all cards to fill the grid row height.
- CardContent: `flex flex-col flex-1` — stretches content area to fill remaining space.

**File changed:**
- `/home/z/my-project/timelock/src/pages/Proposals.tsx` — Updated Card and CardContent classes.

---

### 4. Evidence Library Page — Doesn't Load

**Problem:** The page failed to render because:
1. `workspaceId` was not passed to `getEvidenceLibraryData` or `getEvidenceTimeline` queries, causing them to return incomplete/wrong data.
2. The `isLoading` check used `||` (OR), meaning if *either* query was `undefined`, the entire page showed a loading spinner forever.
3. If `workspaceId` was `undefined`, it was passed as an explicit property in query args, which could cause Convex validation issues.

**Solution:**
- Added `workspaceId` to all evidence queries (`getEvidenceLibraryData` × 2 and `getEvidenceTimeline`).
- Used `useMemo` with conditional spread to only include `workspaceId` in args when it has a valid value, avoiding Convex ID validation errors.
- Changed `isLoading` logic from `||` (OR) to `&&` (AND) — the page renders as soon as *at least one* of the primary queries resolves, using fallback data for the other.
- Same fix for `exportLoading`.

**File changed:**
- `/home/z/my-project/timelock/src/pages/EvidenceLibrary.tsx` — Query args, conditional workspaceId, and loading logic fixes.
