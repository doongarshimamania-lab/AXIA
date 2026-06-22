# Task 1: PaymentPatterns.tsx — Wire to Convex Data

## Summary
Wired PaymentPatterns.tsx from 100% mock data to real Convex data sources.

## Convex Functions Used
- `api.billing.crud.getInvoices` — invoice list with clientName, status, total, dueDate, paidDate
- `api.billing.crud.getInvoiceStats` — stats: total, paid, pending, overdue, totalRevenue, totalOutstanding
- `api.clients.crud.getClientsEnriched` — clients with platform, projectCount, riskLevel

## Changes Made
1. Replaced hardcoded `monthlyTrend`, `platformBreakdown`, `recentPayments`, `latePaymentAlerts`, `riskClients` with data computed from real Convex queries
2. Added `useQuery` calls for invoices, stats, and enriched clients
3. Computed monthly trends from real invoices by grouping by month
4. Built platform breakdown by grouping invoices by client platform
5. Built late payment alerts from overdue invoices
6. Built risk clients from client data with overdue invoices
7. Added loading skeleton states for stats cards, charts, lists
8. Added empty state with CTA to create first invoice when no data
9. Added demo mode banner when not authenticated
10. Kept the existing visual layout intact
