# Task: Connect PlatformIntegrations and Subscription to Convex

## Agent: Senior Fullstack Agent
## Task ID: convex-pages-wiring

### Summary

Wired two pages (PlatformIntegrations.tsx and Subscription.tsx) to real Convex data, replacing mock/local state with live queries and mutations.

### Changes Made

#### 1. PlatformIntegrations.tsx
- **Before**: 100% mock data — local `connections` array, connect/disconnect just changed local state
- **After**: Connected to Convex via:
  - `api.platforms.platformConnections.getPlatformConnectionStatus` — query for real connection status
  - `api.platforms.platformAuth.initiatePlatformConnection` — mutation to create pending connection
  - `api.platforms.platformAuth.completePlatformConnection` — mutation to complete connection (demo auto-complete)
  - `api.platforms.platformAuth.disconnectPlatform` — mutation to disconnect and delete imported data
- Added demo mode when not authenticated (shows disabled preview cards)
- Added loading skeleton state with `<Skeleton>` components
- Added error handling for connect/disconnect mutations (toast.error)
- Added support for `pending` and `error` connection statuses with appropriate badges
- Shows real `lastSyncedAt` from Convex data
- Shows real `deletedRecords` count on disconnect

#### 2. Subscription.tsx
- **Before**: MOCK_BILLING_HISTORY array, no Convex queries
- **After**: Connected to Convex via:
  - `api.billing.crud.getInvoices` — query for real invoice list
  - `api.billing.crud.getInvoiceStats` — query for real stats (totalRevenue, paid, pending, overdue)
- Kept `useSubscriptionTier` hook unchanged (localStorage-based)
- Added `InvoiceStatusBadge` component handling all Convex invoice statuses (draft, sent, viewed, paid, partial, overdue, cancelled)
- Added `ConvexInvoice` interface and `invoiceToBillingRecord` mapper function
- Added real invoice stats section (Revenue, Paid, Pending, Overdue cards)
- Added loading skeleton for billing history table
- Added demo mode when not authenticated (Lock icon + sign-in prompt)
- Updated `downloadReceipt` to include client name and currency from real invoice data
- Updated `getUsageForTier` to accept optional invoice stats for real report count
- Empty states for no invoices

### Key Patterns Used
- All Convex hooks imported from `@/lib/safe-convex-react` (NOT direct from convex/react)
- API references from `@/convex/_generated/api`
- Queries use `"skip"` when not authenticated to avoid unnecessary subscriptions
- Mutations use `null` reference when not authenticated (safe-convex-react returns no-op)
- `useConvexAuth()` for authentication state check
- Safe-convex-react returns `undefined` while loading, handled with conditional rendering
