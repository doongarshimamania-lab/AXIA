# Task ID: T1 — Wire TagPicker into 7 entity pages + fix Tags.tsx itself

## Agent
full-stack-developer (tags feature wiring)

## Objective
Wire `<TagPicker>` into create/edit forms of 7 entity pages (TimeTracking, Projects,
Clients, Proposals, Invoices, Pipeline, Goals), display `<TagBadges>` on entity
cards/rows, add a tag-filter chip bar where it makes sense, and then fix Tags.tsx
itself (real usage counts, Used-in panel, per-entity breakdown, empty-state CTA).

## Execution Plan
8 atomic commits in this order (per task brief):
1. tags(phase-2): wire workSessions tagging (TimeTracking.tsx)         ✅ COMMITTED 07546cb
2. tags(phase-2): wire projects tagging (Projects.tsx)                  ⏳
3. tags(phase-2): wire clients tagging (Clients.tsx)                    ⏳
4. tags(phase-3): wire proposals tagging (Proposals.tsx)                ⏳
5. tags(phase-3): wire invoices tagging (Invoices.tsx)                  ⏳
6. tags(phase-3): wire deals tagging (Pipeline.tsx)                     ⏳
7. tags(phase-3): wire goals tagging (Goals.tsx)                        ⏳
8. tags(phase-4): Tags page — real usage counts, Used-in panel, ...     ⏳

## Conventions Followed
- Workspace scoping via `useWorkspaceContext()` + `workspaceId as any`
- Demo mode: `const isDemoMode = !authLoading && !isAuthenticated;`
- Toast via `sonner` (`toast.success`/`toast.error`)
- `// ponytail:` comment on every change
- ONE atomic commit per page, scoped to that page's files only
- Tag attach is detached for create flows (hold IDs in state, call setEntityTags
  after the create mutation returns the new ID)
- Tag attach is immediate for edit/manage flows (pass entityId to TagPicker)
- Use `@/components/tags` barrel import for `TagPicker` and `TagBadges`

## Backend (DO NOT MODIFY per task brief)
Already done in phases 1a/1b/1c:
- `tagIds` field added to clients, projects, proposals, invoices, workSessions,
  deals, goals (phase 1a, commit fb4eb7d)
- `setEntityTags`, `getTagsWithUsage`, `getEntitiesByTag` mutations/queries
  added to src/convex/tags/crud.ts (phase 1b, commit 813c7dd)
  - `deleteTag` cascade-unsets tag from all entities that reference it.
- `TagPicker` and `TagBadges` components built in src/components/tags/
  (phase 1c, commit 1da9a87)

## Phase-2 TimeTracking.tsx — DONE (commit 07546cb)
- Imports: TagPicker, TagBadges from "@/components/tags"; Tag as TagIcon, X from lucide-react.
- Added `setEntityTagsMutation` (api.tags.crud.setEntityTags) and workspace-scoped
  `getTags` query for badges + filter chips.
- New state: `manualTagIds`, `timerTagIds` (detached), `activeTagFilter`.
- handleStartTimer: capture returned sessionId, call setEntityTags with timerTagIds.
- handleManualEntry: capture returned sessionId, call setEntityTags with manualTagIds.
- resetManualForm: also clears manualTagIds.
- Timer-start form: added TagPicker (entityType="workSessions", categoryHint="general").
- Manual-entry dialog: added TagPicker below Memo.
- Time entries list header: tag-filter chip bar (toggle), filtered count in subtitle.
- Time entries list body: <TagBadges tagIds={entry.tagIds} tags={allTags} max={3} size="xs" />
  under each row's project name.
- Empty-state copy adapts to whether a tag filter is active.
- Tag attach is best-effort (warns on failure, never blocks session creation).
