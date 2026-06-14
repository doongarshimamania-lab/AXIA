---
Task ID: 2
Agent: full-stack-developer
Task: Phase 1-3 Backend workspace migration

Work Log:
- Created src/convex/workspaceFilter.ts with getUserVisibility, isRecordVisible, filterByVisibility helpers
- Added requireRecordAccess to src/convex/permissions.ts for record-level access control  
- Migrated src/convex/clients.ts: workspaceId/teamId on create, by_workspace index, visibility filtering, requireRecordAccess
- Migrated src/convex/deals.ts: workspaceId/teamId on create/list/stats, visibility filtering, requireRecordAccess
- Migrated src/convex/proposals/crud.ts: workspaceId/teamId on create, visibility filtering, requireRecordAccess
- Migrated src/convex/proposals.ts: workspaceId/teamId/customFields on create, visibility filtering, requireRecordAccess
- Migrated src/convex/invoices.ts: workspaceId/teamId/customFields on create, visibility filtering, requireRecordAccess
- Migrated src/convex/scope.ts: workspaceId/teamId/customFields on create, visibility filtering, requireRecordAccess
- Migrated src/convex/scope/crud.ts: workspaceId/teamId on create, visibility filtering, requireRecordAccess
- Migrated src/convex/evidence.ts: workspaceId/teamId on session start, visibility filtering for stats

Stage Summary:
- 10 files created/modified including workspaceFilter.ts and permissions.ts
- All CRUD files now support workspaceId-based filtering with team-aware visibility
- All mutations use requireRecordAccess with appropriate access levels
- Backward compatibility maintained: all workspaceId args are optional, falls back to userId
