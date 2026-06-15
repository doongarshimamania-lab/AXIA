# Task: Connect TimeTracking and Reports pages to Convex

## Summary
Connected two pages (TimeTracking and Reports) from 100% mock data to real Convex backend with demo mode fallback.

## Files Created
1. **`src/convex/tracking/crud.ts`** — New CRUD module with 8 functions:
   - `getCurrentSession` (query) — Get active session for user
   - `getSessions` (query) — Get all sessions sorted desc
   - `getSessionsByDateRange` (query) — Get sessions between date range
   - `getTimeBlocks` (query) — Get time blocks for a session
   - `startSession` (mutation) — Start timer, create new session
   - `stopSession` (mutation) — Stop timer, set endTime/totalMinutes
   - `pauseSession` (mutation) — Set session status to "paused"
   - `resumeSession` (mutation) — Set session status back to "active"
   - `createManualEntry` (mutation) — Create completed session with manual time
   - `deleteSession` (mutation) — Delete session and its time blocks

## Files Modified
1. **`src/convex/tables/tracking.ts`** — Added optional fields: `platform`, `notes`, `isManualEntry`, `status`, `createdAt`, `updatedAt` to workSessions table
2. **`src/convex/tables/features.ts`** — Updated disputeReports table:
   - Added "viewed"|"appealed" to status union
   - Made `sessionId` optional
   - Made `reportContent` optional
   - Added: `title`, `description`, `type`, `evidenceCount`, `evidenceSummary`, `sentAt`, `viewedAt`, `resolvedAt`, `appealDeadline`, `publicToken`, `clientId`, `clientName`, `projectName`, `hourlyRate`, `updatedAt`
3. **`src/convex/disputeReports.ts`** — Added `createDisputeReport` mutation and `deleteDisputeReport` mutation, updated `updateReportStatus` to support "viewed"|"appealed" statuses
4. **`src/pages/TimeTracking.tsx`** — Full rewrite with Convex integration:
   - Uses `useQuery` for sessions and current session
   - Uses `useMutation` for start/stop/pause/resume/manual entry/delete
   - Demo mode banner when unauthenticated with mock data
   - Loading skeletons, empty states, error handling
   - Timer tracks elapsed time from Convex session startTime
5. **`src/pages/Reports.tsx`** — Full rewrite with Convex integration:
   - Uses `useQuery` for dispute reports
   - Uses `useMutation` for create and status updates
   - Demo mode banner when unauthenticated
   - Loading skeletons, empty states, error handling
   - Status changes via mutations (generated → sent → resolved/appealed)

## Key Patterns Used
- `useAuth()` hook for authentication state
- `useQuery`/`useMutation` from `@/lib/safe-convex-react` (safe wrappers)
- `api` from `@/convex/_generated/api`
- Demo mode fallback with mock data when `!isAuthenticated`
- Loading timeout pattern (3s timeout before showing empty state)
- Skeleton loading states during data fetch
- Toast notifications for all mutation results
- Loader2 spinners for async button states
