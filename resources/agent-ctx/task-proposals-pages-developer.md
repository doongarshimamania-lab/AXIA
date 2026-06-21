# Task: Smart Proposals Page for Axia

## Summary
Created the Smart Proposals page with two main components: a proposals list page and a proposal builder page. Also updated the router and sidebar to add the /proposals route.

## Files Created
1. `/home/z/my-project/timelock/src/pages/Proposals.tsx` - Complete proposals list page
2. `/home/z/my-project/timelock/src/pages/ProposalBuilder.tsx` - Complete proposal builder page

## Files Modified
1. `/home/z/my-project/timelock/src/main.tsx` - Added Proposals and ProposalBuilder imports and routes
2. `/home/z/my-project/timelock/src/components/CollapsibleSidebar.tsx` - Added Proposals nav item in BILLING section and collapsed sidebar

## Features Implemented

### Proposals.tsx
- Status tabs with counts: Draft, Sent, Viewed, Signed, Expired, Declined, All
- Stats bar: Total proposals, Signed value, Close rate, Avg days to close
- Proposal cards with title, client name, status badge, dates, value, viewed indicator
- Search/filter by title or client name
- Quick actions: Send, Duplicate, Delete (dropdown menu)
- Follow-up indicators (Day 3+, Day 7+, Day 14+) for sent proposals
- Empty state with template seeding button
- Loading skeletons
- Delete confirmation dialog
- Uses real Convex queries (proposals.list, proposals.getStats, clients.list)
- Uses real Convex mutations (proposals.send, proposals.duplicate, proposals.remove, proposals.seedDefaultTemplates)

### ProposalBuilder.tsx
- Left panel: Content editor with section management
  - Add sections: Heading, Text, Pricing Table, Image, Delimiter, Terms
  - Reorder sections (move up/down)
  - Delete sections
  - Inline editing for all section types
  - Pricing table with auto-calculated amounts
- Right panel: Settings
  - Client selector with quick-add dialog
  - Template selector (applies template content)
  - Title input
  - Auto-calculated total value
  - Currency selector
  - Valid until date picker
  - Save Draft / Send Proposal buttons
- Preview mode toggle
- Auto-save (debounced) for existing drafts
- Send confirmation dialog
- Supports both creating new proposals and editing existing drafts
- Uses real Convex queries and mutations

## Routes Added
- `/proposals` - Proposals list page
- `/proposals/new` - New proposal builder
- `/proposals/:proposalId` - Edit existing proposal builder

## Lint Status
All new files pass ESLint with no errors. Pre-existing lint issues in CollapsibleSidebar.tsx are unrelated to this task.
