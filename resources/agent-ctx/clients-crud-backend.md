# Task: Create `/home/z/my-project/timelock/src/convex/clients.ts` — Full CRUD for clients table

## Agent: Senior Backend Developer

## Summary

Created the complete `clients.ts` Convex functions file with all 10 requested CRUD operations for the `clients` table from `tables/business.ts`.

## File Created

- `/home/z/my-project/timelock/src/convex/clients.ts`

## Functions Implemented

| # | Function | Type | Description |
|---|----------|------|-------------|
| 1 | `create` | mutation | Creates a new client with all optional fields. Auto-sets `createdAt`/`updatedAt`. Validates email format if provided. Validates `onTimeRate` range (0-1). Defaults status to `"lead"`. |
| 2 | `update` | mutation | Partial update — only patches fields that are explicitly provided. Verifies ownership before modifying. Updates `updatedAt`. Validates email and `onTimeRate`. |
| 3 | `archive` | mutation | Sets status to `"archived"`. Verifies ownership. Throws if already archived. Updates `updatedAt`. |
| 4 | `remove` | mutation | Hard delete with safety checks. Queries `deals` (by_client index), `proposals` (by_client index), and `invoices` (by_client index) for active records. Blocks deletion if any active deals/proposals/invoices exist. |
| 5 | `get` | query | Returns a single client by ID. Verifies ownership. Throws on not found / unauthorized. |
| 6 | `list` | query | Lists all clients for the current user. Supports optional `status` filter using `by_user_and_status` index. Ordered by `createdAt` desc. |
| 7 | `getById` | query | Returns client by ID with ownership check. Returns `null` if not found (vs `get` which throws). |
| 8 | `search` | query | Case-insensitive partial match on `name` or `company`. Fetches all user clients then filters in-memory. |
| 9 | `getStats` | query | Returns counts by status: `{ active, archived, lead, total }`. |
| 10 | `updatePaymentBehavior` | mutation | Updates payment behavior fields: `avgPaymentDays`, `onTimeRate`, `totalPaid`, `totalInvoiced`, `lastPaymentAt`. Validates ranges. Verifies ownership. |

## Security Rules Applied

- **Every function** checks auth via `getAuthUserId(ctx)` and throws `ConvexError("Not authenticated")` if unauthenticated
- **Every query** filters by `userId` using appropriate indexes (`by_user`, `by_user_and_status`)
- **Every mutation** verifies `client.userId === userId` before modifying
- **Input validation** via Convex `v` validators on all arguments
- **Business validation**: email format regex, `onTimeRate` 0-1 range, non-negative numbers for payment fields
- **ConvexError** used consistently for all error messages

## Patterns Followed

- Follows the existing auth pattern from `users.ts` (using `getAuthUserId` from `@convex-dev/auth/server`)
- Uses the `by_client` indexes on `deals`, `proposals`, and `invoices` tables for the `remove` safety checks
- Shared `addressValidator` constant for reuse between `create` and `update` args
- Partial update pattern: only includes fields where `args.field !== undefined`
