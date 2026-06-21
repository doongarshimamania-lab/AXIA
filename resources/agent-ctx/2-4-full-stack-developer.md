# Task 2-4: Build real-time Clients CRUD with Convex

## Agent: full-stack-developer

## Summary
Converted the Clients page from hardcoded mock data to fully real-time Convex CRUD. Added client picker to ProposalBuilder and InvoiceBuilder.

## Files Created
- `src/convex/clients/crud.ts` - Full CRUD: getClients, getClient, getClientStats, getClientPolicies, createClient, updateClient, deleteClient, seedMockClients

## Files Modified
- `src/convex/seedNew.ts` - Added seedMockClients mutation
- `src/pages/Clients.tsx` - Complete rewrite with Convex integration
- `src/pages/ProposalBuilder.tsx` - Added client picker dropdown
- `src/pages/InvoiceBuilder.tsx` - Added client picker dropdown

## Convex Functions Created
### Queries
- `clients.crud.getClients` - Get all clients for authenticated user, ordered by lastActivityAt desc
- `clients.crud.getClient` - Get single client by ID (with auth check)
- `clients.crud.getClientStats` - Aggregate stats (totalClients, totalValue, byPlatform, byRiskLevel)
- `clients.crud.getClientPolicies` - Get all policies for a specific client

### Mutations
- `clients.crud.createClient` - Create new client
- `clients.crud.updateClient` - Update client fields
- `clients.crud.deleteClient` - Delete client (and associated policies)
- `clients.crud.seedMockClients` - Seed 5 demo clients
- `seedNew.seedMockClients` - Duplicate seed function in seedNew.ts

## Verification
- TypeScript: ✅ `tsc --noEmit` passes with 0 errors
- Dev server: ✅ Vite dev server starts and serves correctly
- Build: ⚠️ Pre-existing circular re-export errors from convex/react (not caused by our changes)
