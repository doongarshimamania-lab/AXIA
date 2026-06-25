# Task ID: C8 — workspaceId Patching (Goals / Tags / Reports / Scope)

## Agent
full-stack-developer (workspaceId patching)

## Objective
Ensure the Goals, Tags, Reports, and Scope pages pass `workspaceId` to every Convex
mutation/query that accepts it, fixing cross-workspace data leakage.

## Method
For each target page:
1. Read the page file.
2. Read the corresponding Convex `crud.ts` to verify each function accepts
   `workspaceId`.
3. If accepted, patch the call site to pass `workspaceId: workspaceId as any`.
4. If NOT accepted, skip the call site (do NOT modify the Convex file).
5. Mark every change with a `// ponytail:` comment.

## Verification Results (Convex Function Audit)

### `convex/goals/crud.ts`
| Function             | Accepts `workspaceId`? | Action   |
|----------------------|------------------------|----------|
| `getGoals`           | YES (optional)         | PATCHED  |
| `createGoal`         | YES (optional)         | PATCHED  |
| `updateGoal`         | no                     | SKIPPED  |
| `deleteGoal`         | no                     | SKIPPED  |
| `markGoalComplete`   | no                     | SKIPPED  |
| `updateMilestone`    | no                     | SKIPPED  |

### `convex/tags/crud.ts`
| Function       | Accepts `workspaceId`? | Action   |
|----------------|------------------------|----------|
| `getTags`      | YES (optional)         | PATCHED  |
| `createTag`    | YES (optional)         | PATCHED  |
| `updateTag`    | no                     | SKIPPED  |
| `deleteTag`    | no                     | SKIPPED  |

### `convex/disputeReports.ts` (used by Reports.tsx)
| Function                  | Accepts `workspaceId`? | Action   |
|---------------------------|------------------------|----------|
| `getUserDisputeReports`   | NO (`args: {}`)        | SKIPPED  |
| `createDisputeReport`     | NO                     | SKIPPED  |
| `updateReportStatus`      | NO                     | SKIPPED  |

**Note:** The Task 3 audit (line 568) *claimed* these mutations accept
`workspaceId`, but reading the actual `disputeReports.ts` source shows none of
them do. The `disputeReports` table has the `workspaceId` column, but the
mutations never accept/store it. Per the task's "Don't" rules ("Do NOT modify
files in `src/convex/`"), Reports.tsx cannot be fixed without first patching
the Convex file. **Reports.tsx was left unmodified.**

### `convex/scope/crud.ts`
| Function                  | Accepts `workspaceId`? | Action   |
|---------------------------|------------------------|----------|
| `getScopeDefinitions`     | YES (optional)         | PATCHED  |
| `createScopeDefinition`   | YES (optional)         | PATCHED  |
| `getChangeOrders`         | NO (`{ scopeId }`)     | SKIPPED  |
| `recordRevision`          | NO                     | SKIPPED  |
| `approveChangeOrder`      | NO (`{ changeOrderId }`)| SKIPPED |
| `deleteScopeDefinition`   | NO (`{ scopeId }`)     | SKIPPED  |

### `convex/proposals/crud.ts` (used by Scope.tsx for proposal prefill)
| Function      | Accepts `workspaceId`? | Action   |
|---------------|------------------------|----------|
| `getProposal` | NO (`{ proposalId }`)  | SKIPPED  |

## Files Modified

### `src/pages/Goals.tsx`
- Line 44: added `import { useWorkspaceContext } from "@/hooks/use-workspace";`
- Lines 121-123: added `useWorkspaceContext()` extraction and `workspaceId` derivation
- Line 127: `useQuery(api.goals.crud.getGoals, { workspaceId: workspaceId as any })`
- Line 225: added `workspaceId: workspaceId as any` to `createGoalMutation({...})` call

### `src/pages/Tags.tsx`
- Line 33: added `import { useWorkspaceContext } from "@/hooks/use-workspace";`
- Lines 50-52: added `useWorkspaceContext()` extraction and `workspaceId` derivation
- Line 56: `useQuery(api.tags.crud.getTags, { workspaceId: workspaceId as any })`
- Line 150: added `workspaceId: workspaceId as any` to `createTagMutation({...})` call

### `src/pages/Scope.tsx`
- Line 18: added `import { useWorkspaceContext } from "@/hooks/use-workspace";`
- Lines 556-558: added `useWorkspaceContext()` extraction and `workspaceId` derivation
- Line 594: `useQuery(api.scope.crud.getScopeDefinitions, { workspaceId: workspaceId as any })`
- Line 679: added `workspaceId: workspaceId as any` to `createScopeMutation({...})` call

### `src/pages/Reports.tsx`
- NOT MODIFIED. None of the three Convex functions called by this page
  (`getUserDisputeReports`, `createDisputeReport`, `updateReportStatus`)
  accept `workspaceId`. The fix requires backend changes that the task
  forbids. See "Verification Results" above.

## Stage Summary
- **5 call sites patched** across **3 files** (Goals, Tags, Scope).
- **0 call sites patched in Reports.tsx** — all three target Convex functions
  lack the `workspaceId` arg. Backend change required (out of scope for C8).
- **13 call sites intentionally skipped** because their Convex function does
  not accept `workspaceId` (per the task's "Don't" rules).

## Type-check Verification
Ran `bunx tsc --noEmit -p tsconfig.app.json` and filtered output. No errors
attributable to the new `workspaceId` / `useWorkspaceContext` references
in any of the three modified files. All remaining TS errors in those files
are pre-existing implicit-`any` warnings on event-handler parameters that
exist on the unmodified baseline.
