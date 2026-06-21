# Task 1: TimeTracking Page Bug Fixes

## Summary of Changes

Fixed 4 bugs in `/home/z/my-project/timelock/src/pages/TimeTracking.tsx`:

### 1. Hardcoded project list → Dynamic query
- **Before**: Hardcoded `SelectItem` values ("Website Redesign", "Mobile App MVP", etc.)
- **After**: Added `useQuery(api.projects.projectProtection.getMyProjects, {})` and dynamically map over `projects` to create `SelectItem` elements using `project._id` as value and `project.projectName` as label
- Falls back to a disabled "No projects found" option when no projects exist

### 2. Hardcoded clientName and hourlyRate → Resolved from project/client data
- **Before**: `handleStartTimer` passed `clientName: "Current Client"` and `hourlyRate: 75`
- **After**: 
  - Added `useQuery(api.clients.crud.getClients, ...)` to fetch clients
  - Built `projectMap` and `clientMap` lookups via `useMemo`
  - When a project is selected, resolves `selectedProjectData` from `projectMap`, then resolves `selectedClientData` from `clientMap` using the project's `clientId`
  - Passes `selectedClientData?.clientName` and `selectedProjectData?.hourlyRate ?? selectedClientData?.hourlyRate ?? 75`
  - Also resolves the `projectName` from the project data (since `selectedProject` now stores the project `_id`)

### 3. Shows 0hr 0min → Fixed duration aggregation
- **Before**: `realSessions` was a simple `.filter()` that passed sessions with `endTime` but didn't ensure `totalMinutes` was populated. The `formatDuration()` function returned "0h 0m" for any falsy `minutes` value (0, undefined, null).
- **After**: Added a `.map()` step that computes `totalMinutes` from `endTime - startTime` when `totalMinutes` is missing/undefined:
  ```
  totalMinutes: s.totalMinutes ?? (s.endTime && s.startTime ? Math.floor((s.endTime - s.startTime) / (1000 * 60)) : 0)
  ```
  This ensures sessions that have `endTime` but no `totalMinutes` (due to older code paths or data migration) still display correct durations.

### 4. Missing workspaceId → Added workspace scoping
- **Before**: All queries and mutations called without `workspaceId`
- **After**:
  - Added `useWorkspaceContext()` hook, extracted `activeWorkspaceId` and `isConvexConnected`
  - Computed `workspaceId` with proper type casting: `isConvexConnected ? (activeWorkspaceId as Id<"workspaces">) : undefined`
  - Passed `workspaceId` to: `getCurrentSession`, `getSessions`, `getClients` queries
  - Passed `workspaceId` to: `startSession`, `createManualEntry` mutations

### Additional imports added
- `useMemo` from React
- `useWorkspaceContext` from `@/hooks/use-workspace`
- `Id` type from `@/convex/_generated/dataModel`
