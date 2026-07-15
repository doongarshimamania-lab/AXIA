# Task 3: TeamManagement.tsx — Wire to Convex Data

## Summary
Wired TeamManagement.tsx from mock-fallback hooks to real Convex workspace functions.

## Convex Functions Used
- `api.workspaces.crud.getMyWorkspaces` — get user's workspaces
- `api.workspaces.crud.getWorkspaceStats` — workspace stats
- `api.workspaces.members.getMembers` — workspace members
- `api.workspaces.invitations.getInvitations` — pending invitations
- `api.workspaces.members.updateMemberRole` — update member role
- `api.workspaces.members.removeMember` — remove member
- `api.workspaces.invitations.createInvitation` — invite member
- `api.workspaces.invitations.cancelInvitation` — cancel invitation

## Changes Made
1. Replaced use-workspace hooks with direct Convex queries in TeamManagement
2. Added loading skeletons for members, stats, invitations
3. Added demo mode banner when data comes from mock fallback
4. Added empty states for no members, no invitations
5. Kept existing UI layout
