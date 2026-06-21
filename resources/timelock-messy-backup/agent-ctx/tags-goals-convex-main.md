# Task: Add tags and goals tables + CRUD + wire pages to Convex

## Agent: Main Agent
## Date: 2026-03-05

## Summary
Successfully implemented all 6 subtasks:

1. **Schema - Tags table** (`src/convex/tables/tags.ts`): Added `tags` table with fields: userId, workspaceId, name, color, category, usageCount, createdAt. Indexed by_user and by_workspace.

2. **Schema - Goals table** (`src/convex/tables/goals.ts`): Added `goals` table with fields: userId, workspaceId, title, description, type, target, current, unit, deadline, status, milestones (array of objects), streak, lastCheckIn, createdAt, updatedAt. Indexed by_user and by_workspace.

3. **Schema integration** (`src/convex/schema.ts`): Imported and spread `tagTables` and `goalTables` into the schema.

4. **Tags CRUD** (`src/convex/tags/crud.ts`): getTags, getTag, createTag (with duplicate name check), updateTag (with duplicate name check), deleteTag. All use `getAuthUserId` for auth.

5. **Goals CRUD** (`src/convex/goals/crud.ts`): getGoals, getGoal, createGoal, updateGoal, deleteGoal, markGoalComplete (marks all milestones completed), updateMilestone. All use `getAuthUserId` for auth.

6. **Tags page** (`src/pages/Tags.tsx`): Replaced mock data with Convex queries/mutations. Added loading skeletons, empty state with CTA, demo mode banner, mutation loading states (Loader2 spinners), category selection in create/edit forms.

7. **Goals page** (`src/pages/Goals.tsx`): Replaced mock data with Convex queries/mutations. Added loading skeletons, empty state with CTA, demo mode banner, mutation loading states, milestone toggle support, proper goal type/unit selectors, status filter matching new schema statuses (not_started/in_progress/completed/abandoned).

## Key Patterns Used
- `useAuth()` from `@/hooks/use-auth` for demo mode detection
- `useQuery`/`useMutation` from `@/lib/safe-convex-react` for safe Convex access
- `api` from `@/convex/_generated/api` for function references
- `getAuthUserId` from `@convex-dev/auth/server` for backend auth
- Loading timeout pattern (2s) consistent with other pages like Clients.tsx
- Mock data for demo mode matching original page design

## Verification
- TypeScript compilation: PASSED (no errors)
- Vite production build: PASSED (built in 7.51s)
- Convex deploy requires auth token (not available in non-interactive environment)
