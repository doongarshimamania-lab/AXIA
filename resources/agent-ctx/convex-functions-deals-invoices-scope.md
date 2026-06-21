# Task: Create Convex Functions for Deals, Invoices, and Scope

## Summary

Created three production-quality Convex function files (2,283 lines total, 46 exported functions) for the Axia freelancer SaaS platform. All functions follow the existing codebase patterns: `getAuthUserId` auth checks, `ConvexError` for errors, row-level security on queries, and schema-aligned validators.

## Files Created

### 1. `/src/convex/deals.ts` (533 lines, 11 functions)

**Pipeline Stages:**
- `createDefaultStages` — Idempotent creation of Lead/Qualified/Proposal Sent/Negotiation/Won/Lost stages with colors
- `listStages` — Ordered by `order` field via `by_user_and_order` index
- `updateStage` — Partial update of name/color/order with validation
- `removeStage` — Deletes stage, migrates deals to first remaining stage

**Deals:**
- `create` — Validates pipelineStageId/client ownership, validates probability 0-100
- `update` — Partial update with ownership verification
- `moveToStage` — Business logic: Won → probability=100, Lost → requires lostReason + probability=0
- `get` — Ownership check query
- `list` — Optional pipelineStageId filter with ownership validation
- `getPipelineStats` — Aggregated stats: deals by stage, total/weighted pipeline value, win rate, avg cycle time
- `remove` — Hard delete with ownership check

### 2. `/src/convex/invoices.ts` (1,042 lines, 21 functions)

**Invoices (13 functions):**
- `create` — Auto-generates INV-XXX number, crypto.randomUUID publicToken, validates line items/client/due date
- `update` — Draft-only editing with partial update
- `send` — draft→sent, sets sentAt, schedules Day 3/7/14 reminders
- `markViewed` — No-auth, publicToken-based, sets viewedAt (keeps first view time)
- `markPaid` — Sets paidAt/paidAmount, determines paid vs partial, cancels reminders, updates client payment behavior (avgPaymentDays, onTimeRate, totalPaid, totalInvoiced)
- `markOverdue` — Batch operation: checks sent/viewed invoices past dueDate
- `cancel` — Draft or sent only, cancels pending reminders
- `get` / `list` — Standard ownership-checked CRUD
- `getByPublicToken` — No-auth client view with filtered fields
- `getStats` — Revenue stats: total invoiced/paid/outstanding/overdue count/avg payment days
- `getNextInvoiceNumber` — Sequential INV-XXX generation
- `remove` — Draft only, cascading delete of work links and reminders

**Invoice Work Links (4 functions):**
- `addWorkLink` — Validates invoice ownership, line item index bounds, work session ownership
- `removeWorkLink` — Ownership-checked deletion
- `getWorkLinks` — All links for an invoice
- `getWorkLinksByLineItem` — Filtered by line item index

**Payment Reminders (4 functions):**
- `scheduleReminders` — Day 3 (friendly), Day 7 (professional), Day 14 (firm) with pre-written email content
- `processDueReminders` — Batch: marks scheduled→sent when scheduledFor < now
- `cancelReminders` — Cancels all pending reminders for an invoice
- `getReminderHistory` — Ordered by sequenceDay

**Internal Helpers:**
- `getNextInvoiceNumberInternal` — Sequential number generation logic
- `scheduleRemindersInternal` — Creates reminder records with pre-written content
- `cancelRemindersInternal` — Cancels scheduled reminders without auth checks

### 3. `/src/convex/scope.ts` (708 lines, 14 functions)

**Scope Definitions:**
- `create` — Validates deliverables, generates crypto.randomUUID approvalToken
- `update` — Draft-only editing with partial update
- `activate` — draft→active, records clientApprovedAt if present
- `clientApprove` — No-auth via approvalToken, sets clientApprovedAt, prevents double-approval
- `recordRevision` — Increments revisionsUsed; if ≥ revisionLimit → sets "revisions_exceeded" and auto-generates a change order
- `checkRevisionStatus` — Returns per-deliverable revision utilization, remaining, status

**Change Orders:**
- `createChangeOrder` — Validates scope is active, deliverableId exists, generates approvalToken
- `clientApproveChangeOrder` — No-auth via token; if additionalRevisions specified, updates deliverable revisionLimit and resets "revisions_exceeded" → "in_progress"
- `clientRejectChangeOrder` — No-auth via token, records rejectionReason
- `linkChangeOrderToInvoice` — Only approved change orders can be linked, validates invoice ownership

**Queries:**
- `get` / `list` — Standard ownership-checked queries, list supports optional status filter
- `getChangeOrders` — All change orders for a scope, sorted newest first
- `getChangeOrder` — Single change order with ownership check

## Verification

- All 46 functions exported correctly
- No TypeScript errors in any of the three files (verified via `npx convex dev --once`)
- All table fields and indexes match the schema in `src/convex/tables/business.ts`
- Auth pattern consistent: `getAuthUserId` → `ConvexError("Not authenticated")`
- Row-level security enforced on every authenticated query/mutation
- Public token functions (`markViewed`, `getByPublicToken`, `clientApprove`, `clientApproveChangeOrder`, `clientRejectChangeOrder`) correctly skip auth
