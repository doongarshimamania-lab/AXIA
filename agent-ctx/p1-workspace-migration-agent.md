# Agent Context: p1-workspace-migration-agent

## Task
Phase 1 — Complete workspace migration on ALL data tables

## Summary of Changes

### Schema Files Modified
1. **src/convex/tables/features.ts** — Added `by_workspace` index to 11 tables that had `workspaceId` but no index. Added `createdBy` to `extensionTokens`.
2. **src/convex/tables/projects.ts** — Added `createdBy` to `freelancerPublicProfiles`.
3. **src/convex/tables/business.ts** — Added `sharingEntry` import, `teamId`, `sharing`, `customFields` to clients, deals, proposals, invoices, scopeDefinitions, scopeChangeOrders. Added `by_team` indexes.

### CRUD Files Modified
4. **src/convex/billing/crud.ts** — Full workspace-aware update: `getInvoices`, `getInvoice`, `getInvoiceStats`, `createInvoice`, `updateInvoice`, `sendInvoice`, `markInvoicePaid`, `deleteInvoice`, `addWorkLink`, `removeWorkLink`, `getInvoiceTemplates`, `saveUploadedInvoiceTemplate`. All now use `requireWorkspaceAccess`/`getWorkspaceMembership`/`getRecordAccess` from permissions.
5. **src/convex/tracking/crud.ts** — Full workspace-aware update: `getCurrentSession`, `getSessions`, `startSession`, `stopSession`, `pauseSession`, `resumeSession`, `createManualEntry`, `deleteSession`. All use workspace-aware access control.
6. **src/convex/tags/crud.ts** — Added `createdBy: userId` to `createTag`.
7. **src/convex/goals/crud.ts** — Added `createdBy: userId` to `createGoal`.
8. **src/convex/evidence/library.ts** — Added `workspaceId` arg to `getEvidenceLibraryData` and `getEvidenceTimeline`.

### Already Complete (from previous agents)
- clients/crud.ts, pipeline/crud.ts, proposals/crud.ts, scope/crud.ts — Already had full workspace-aware CRUD
- All schema files already had `workspaceId`, `createdBy` on most tables
- messaging/ channels, messages — Already workspace-scoped (workspaceId is required)

### Verification
- TypeScript: PASS
- Convex deploy: 401 (key expired)
