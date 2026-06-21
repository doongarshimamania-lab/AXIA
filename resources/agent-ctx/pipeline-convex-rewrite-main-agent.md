# Task: Pipeline.tsx Convex Rewrite

## Task ID
pipeline-convex-rewrite

## Summary
Refactored `src/pages/Pipeline.tsx` in the Axia/Timelock project to replace local mock state with real Convex queries and mutations, while keeping mock data as a fallback for non-authenticated users.

## Changes Made

### File Modified
- `/home/z/my-project/timelock/src/pages/Pipeline.tsx`

### Backup Created
- `/home/z/my-project/backups/timelock-v10-pipeline-convex-rewrite-20260531-153044/Pipeline.tsx`

### Detailed Changes

1. **Added Convex imports** (lines 4-5):
   - `useQuery`, `useMutation` from `convex/react`
   - `api` from `@/convex/_generated/api`

2. **Added `Loader2` icon import** from lucide-react for the loading spinner

3. **Replaced local `stages` state with Convex query** (lines 190-196):
   - `const convexStagesRaw = useQuery(api.pipeline.crud.getStages)` — fetches stages from Convex
   - Cast to `Stage[]` for type compatibility
   - Falls back to `MOCK_STAGES` when no Convex data available

4. **Replaced local `deals` state with Convex query** (lines 191-197):
   - `const convexDealsRaw = useQuery(api.pipeline.crud.getDeals)` — fetches deals from Convex
   - Cast to `Deal[]` for type compatibility
   - Falls back to `MOCK_DEALS` when no Convex data available

5. **Added Convex mutations** (lines 200-205):
   - `createDealMutation` → `api.pipeline.crud.createDeal`
   - `updateDealMutation` → `api.pipeline.crud.updateDeal`
   - `moveDealMutation` → `api.pipeline.crud.moveDeal`
   - `deleteDealMutation` → `api.pipeline.crud.deleteDeal`
   - `createDefaultStagesMutation` → `api.pipeline.crud.createDefaultStages`
   - `autoSeedMutation` → `api.autoSeed.autoSeed`

6. **Added `isUsingConvexData` flag** (line 208):
   - Determines if authenticated and using real Convex data vs mock fallback

7. **Added loading state** (line 211):
   - `isLoading = convexStagesRaw === undefined || convexDealsRaw === undefined`

8. **Added loading spinner UI** — shown while Convex queries are in pending state

9. **Replaced `handleCreateDeal`** — now calls `createDealMutation` with proper args
10. **Replaced `handleUpdateDeal`** — now calls `updateDealMutation` with changed fields only
11. **Replaced `handleDeleteDeal`** — now calls `deleteDealMutation`
12. **Replaced `handleDrop`** (drag-and-drop) — now calls `moveDealMutation`
13. **Replaced `handleCreateDefaultStages`** — now calls `createDefaultStagesMutation`
14. **Replaced `handleSeedData`** — now calls `autoSeedMutation`
15. **Replaced `handleMoveDealToStage`** — now calls `moveDealMutation`

16. **Added new state variables** for mutation loading states:
    - `isUpdating`, `isMoving`, `isDeleting`

17. **Removed `setStages` and `setDeals`** — no longer needed (data comes from Convex)

### Key Design Decisions
- API path is `api.pipeline.crud.*` (not `api.pipelineCrud.*`) — discovered through TypeScript checking that the generated API nests `pipeline/crud` as `api.pipeline.crud`
- Convex query results are cast to local `Stage[]`/`Deal[]` types for type compatibility with existing UI code
- Mock data constants (`MOCK_STAGES`, `MOCK_DEALS`) are retained as fallback
- All handlers are now `async` and use `try/catch` for mutation error handling
- The `isUsingConvexData` flag controls whether mutations are actually called (prevents errors when using mock data)

### TypeScript Verification
- Zero TypeScript errors after the refactor (`npx tsc -p tsconfig.app.json --noEmit` passes cleanly)

### Issues Encountered
- Initial API path `api.pipelineCrud` was incorrect; TypeScript error revealed the correct path is `api.pipeline.crud`
- Had to cast Convex query results to local types (`Stage[]`, `Deal[]`) to avoid implicit `any` errors in the union types
