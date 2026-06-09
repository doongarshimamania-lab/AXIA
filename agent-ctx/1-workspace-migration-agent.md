# Task 1 - Workspace Migration Agent

## Task
Workspace migration, teams, and permission system for Axia app

## Summary
Completed all 4 phases of the workspace migration, teams, and permission system. All files deployed successfully to Convex with no TypeScript errors.

## Files Created
- `src/convex/tables/teams.ts` -- teams + teamMemberships table definitions
- `src/convex/sharedValidators.ts` -- sharingEntry validator, ACCESS_HIERARCHY constant, AccessLevel type
- `src/convex/permissions.ts` -- getWorkspaceMembership, getUserTeamIds, isCrossTeamMember, getRecordAccess, requireWorkspaceAccess
- `src/convex/teams/crud.ts` -- getTeams, createTeam, updateTeam, deleteTeam, addTeamMember, removeTeamMember, getTeamMembers
- `src/convex/permissions/shareRecord.ts` -- shareRecord, unshareRecord mutations
- `src/convex/pipeline/bulkImport.ts` -- bulkImportDeals mutation

## Files Modified
- `src/convex/tables/pipeline.ts` -- added workspaceId, createdBy, teamId, sharing, customFields, by_workspace/by_team indexes
- `src/convex/tables/projects.ts` -- added workspaceId, createdBy, teamId, sharing, customFields to clients/projects, by_workspace/by_team indexes
- `src/convex/tables/clients.ts` -- added workspaceId, createdBy, teamId, sharing, customFields, by_workspace/by_team indexes
- `src/convex/tables/proposals.ts` -- added workspaceId, createdBy, teamId, sharing, by_workspace/by_team indexes
- `src/convex/tables/billing.ts` -- added workspaceId, createdBy, teamId, sharing (invoices), by_workspace/by_team indexes
- `src/convex/tables/scope.ts` -- added workspaceId, createdBy, teamId, sharing, by_workspace/by_team indexes
- `src/convex/tables/evidence.ts` -- added workspaceId, createdBy, teamId, sharing (evidenceSessions), by_workspace/by_team indexes
- `src/convex/tables/tracking.ts` -- added workspaceId, createdBy, teamId, sharing (workSessions), by_workspace/by_team indexes
- `src/convex/tables/features.ts` -- added workspaceId, createdBy, teamId, sharing (disputeReports), by_workspace/by_team indexes
- `src/convex/tables/compliance.ts` -- added workspaceId, createdBy, by_workspace indexes
- `src/convex/tables/platform.ts` -- added workspaceId, createdBy, by_workspace indexes
- `src/convex/tables/security.ts` -- added workspaceId, createdBy, by_workspace indexes
- `src/convex/tables/work.ts` -- added workspaceId, createdBy, teamId, sharing (workSessions, disputeReports), by_workspace/by_team indexes
- `src/convex/tables/business.ts` -- added workspaceId, createdBy, teamId, sharing, customFields, by_workspace/by_team indexes
- `src/convex/schema.ts` -- added workspaceTables + teamTables imports
- `src/convex/pipeline/crud.ts` -- added workspaceId to createDeal, createDefaultStages, getStages, getDeals, getPipelineStats, addStage; backward compat via userId fallback

## Issues Encountered
1. Import path bug in shareRecord.ts: used `../../_generated/server` instead of `../_generated/server` -- fixed
2. TypeScript type error in shareRecord.ts: `ctx.db.get()` returns union type, fixed by adding `ShareableRecord` type alias
3. Convex deploy needed local deployment setup (no CONVEX_DEPLOYMENT env var existed) -- ran `npx convex dev --once` which auto-configured local deployment

## Deployment Status
- Convex functions compiled and ready (passes TypeScript typecheck + function preparation)
