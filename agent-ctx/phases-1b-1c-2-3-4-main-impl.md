# Task: Build All Phases with Proper Internal Wiring

## Agent: Main Implementation Agent
## Task ID: phases-1b-1c-2-3-4
## Date: 2026-06-05

## Summary

Completed all four phases of the Axia SaaS app internal wiring:

### Phase 1c: Convex Schema with workspaceId
- Added `workspaceTables` to schema.ts
- Added `workspaceId` (optional) to 6 table files: pipeline, proposals, billing, scope, clients, projects, tracking
- Added `by_workspace` indexes to all modified tables
- Deployed to Convex cloud

### Phase 1b: Wire Onboarding Flow
- Added routes for `/onboarding-user-information`, `/onboarding-source`, `/client-login`, `/client-signup` in main.tsx
- Wired OnboardingSource.tsx to call `completeOnboarding` + `seedPersonalWorkspace` mutations
- Handles auth errors gracefully

### Phase 1c cont: WorkspaceProvider
- Added `useQuery(api.workspaces.crud.getMyWorkspaces)` for real workspace data
- Wired all workspace hooks to real Convex mutations with localStorage fallback
- Uses `isValidConvexId` pattern for safe query skipping

### Phase 2: Time Tracking
- Created `src/convex/tracking/crud.ts` with full CRUD (7 queries, 5 mutations)
- Wired TimeTracking.tsx to use Convex queries/mutations
- Active session auto-resumes from Convex
- Falls back to mock data

### Phase 3: Multi-Client Billing
- Added `getBillingDashboard`, `getClientBillingSummary`, `getWorkLinksForInvoice` queries
- Added `batchSendInvoices`, `batchMarkPaid` mutations
- Supports workspaceId filtering

### Phase 4: Client Portal
- Added client portal routes
- Improved ClientLogin.tsx with profile lookup
- Wired ClientDashboard.tsx to real Convex data (invoices, proposals)
- Added session validation

## Build Status: ✅ Success
## Deploy Status: ✅ Deployed to veracious-zebra-519
## Preview: ✅ Running on port 3000
