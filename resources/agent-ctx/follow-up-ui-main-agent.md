# Follow-up Management UI - Task Completion Record

## Task
Add follow-up management UI to the Proposals page with Start/Stop/Skip/Configure capabilities.

## File Modified
`/home/z/my-project/src/pages/Proposals.tsx`

## Changes Made

### 1. New Imports
- Added `Bell`, `BellRing`, `CalendarClock`, `PlusCircle`, `X`, `SkipForward`, `Play`, `Square`, `Settings2` from lucide-react
- Added `ScrollArea` from `@/components/ui/scroll-area`
- Added `Separator` from `@/components/ui/separator`

### 2. Main `Proposals` Component Changes
- Added `followUpDialogProposalId` state (string | null) for dialog control
- Added Convex mutations: `startFollowUps`, `stopFollowUps`, `skipFollowUp` via `useMutation(api.proposals.crud.*)`
- Added handler functions:
  - `handleStartFollowUps(proposalId, intervals?)` - calls startFollowUps mutation with toast feedback
  - `handleStopFollowUps(proposalId)` - calls stopFollowUps mutation with toast feedback
  - `handleSkipFollowUp(followUpId)` - calls skipFollowUp mutation with toast feedback
- Added `onManageFollowUps={setFollowUpDialogProposalId}` prop to ProposalCard
- Added `FollowUpManager` dialog component in render, conditionally rendered when `followUpDialogProposalId` is set

### 3. `ProposalCard` Component Changes
- Added `onManageFollowUps` optional callback prop
- For `sent`/`viewed` proposals: replaced simple follow-up badge with enhanced section showing:
  - Purple `BellRing` badge with count when follow-ups are scheduled
  - Gray `Bell` badge with "No follow-ups" when none are scheduled
  - Purple "Manage" button (with Settings2 icon) that opens the follow-up dialog
- For other statuses: preserved original `Clock` badge behavior for existing follow-ups

### 4. New `FollowUpManager` Dialog Component
A full-featured dialog component with:

**a) Header Section:**
- Purple `BellRing` icon with proposal title
- Active/Inactive status badge (purple when active, muted when inactive)

**b) Control Buttons:**
- "Start Follow-ups" (purple, Play icon) - enabled when no scheduled follow-ups exist
- "Stop Follow-ups" (red outline, Square icon) - enabled when scheduled follow-ups exist
- Both show Loader2 spinner during async operations

**c) Interval Configuration:**
- Editable list of day intervals (default: [3, 7, 14])
- Each interval shows: "Day" label, numeric input, and tone label:
  - ≤3 days = "Friendly nudge" (emerald)
  - 4-7 days = "Check-in" (blue)
  - 8-14 days = "Follow-up" (amber)
  - >14 days = "Final reminder" (red)
- "Add Follow-up" button to add custom intervals (max 8)
- X button to remove intervals (min 1)
- Inputs disabled when follow-ups are active

**d) Follow-up Timeline:**
- Lists all follow-ups sorted by day number
- Each item shows: Day indicator (D3, D7, etc.), subject, scheduled date, status badge
- Color-coded status badges: scheduled=purple, sent=green, skipped=gray, cancelled=muted
- "Skip" button for scheduled items (calls skipFollowUp)
- Empty state with CalendarClock icon

**e) Summary Stats:**
- 4 stat boxes: Scheduled (purple), Sent (green), Skipped (gray), Cancelled (muted)

**f) Mock Data Support:**
- Mock follow-ups for demo mode when `isMock` is true
- Convex queries skipped when using mock data
- Start/Stop/Skip buttons disabled in mock mode

### 5. Helper Functions
- `getIntervalLabel(days)` - returns tone label based on day count
- `getIntervalLabelColor(days)` - returns Tailwind color classes for label

## Lint Status
- Only pre-existing lint error in Proposals.tsx (line 70: `metadata?: any` in ProposalSection interface)
- No new lint errors introduced
