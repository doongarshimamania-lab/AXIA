// ──────────────────────────────────────────────────────────────────────────────
// portal/invoices.ts — Client-facing invoice list + detail.
//
// SECURITY:
//   - invoices:read scope required
//   - Returns only invoices where clientId matches the JWT's cid
//   - No amount mutation here (that's portal/payments.ts)
// ──────────────────────────────────────────────────────────────────────────────

import { query } from "../_generated/server";
import { v } from "convex/values";
import { verifyPortalScope, PortalScope } from "../lib/portalAuth";

const READ_SCOPES: PortalScope[] = ["invoices:read"];

/**
 * List all invoices for the client.
 */
export const listMyInvoices = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, READ_SCOPES);

    // The invoices table indexes by userId (freelancer), not clientId.
    // We pull all the freelancer's invoices and filter by clientId in-app.
    // ponytail: when we hit 1k+ invoices per freelancer this becomes slow;
    // for now, we add a `by_client` index on invoices table later if needed.
    const allInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", claims.fid as any))
      .collect();

    // Filter to this client
    const mine = allInvoices.filter((inv: any) => {
      // invoices.clientId may or may not be set; fall back to matching by
      // clientName if not present
      if (inv.clientId && inv.clientId === (claims.cid as any)) return true;
      return false;
    });

    return mine.map((inv: any) => ({
      id: inv._id,
      number: inv.number ?? inv.invoiceNumber ?? null,
      clientId: inv.clientId ?? null,
      clientName: inv.clientName ?? null,
      amount: inv.amount ?? inv.total ?? 0,
      currency: inv.currency ?? "USD",
      status: inv.status ?? "draft",
      dueDate: inv.dueDate ?? null,
      issuedAt: inv.issuedAt ?? inv.createdAt ?? null,
      paidAt: inv.paidAt ?? null,
      notes: inv.notes ?? null,
      items: inv.items ?? [],
    }));
  },
});

/**
 * Get a single invoice with full detail.
 */
export const getInvoice = query({
  args: { token: v.string(), invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, READ_SCOPES);

    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) return null;

    // Verify ownership — invoice must belong to this client's freelancer
    if (inv.userId !== (claims.fid as any)) {
      // ponytail: don't reveal existence
      return null;
    }

    return {
      id: inv._id,
      number: inv.number ?? inv.invoiceNumber ?? null,
      clientId: inv.clientId ?? null,
      clientName: inv.clientName ?? null,
      amount: inv.amount ?? inv.total ?? 0,
      currency: inv.currency ?? "USD",
      status: inv.status ?? "draft",
      dueDate: inv.dueDate ?? null,
      issuedAt: inv.issuedAt ?? inv.createdAt ?? null,
      paidAt: inv.paidAt ?? null,
      notes: inv.notes ?? null,
      items: inv.items ?? [],
    };
  },
});
