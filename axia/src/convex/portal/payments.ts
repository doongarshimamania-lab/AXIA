// ──────────────────────────────────────────────────────────────────────────────
// portal/payments.ts — Initiate payment for an invoice.
//
// Provider-agnostic. The actual provider (mock / Stripe / Razorpay) is selected
// by the PORTAL_PAYMENT_PROVIDER env var. Mock returns "completed" instantly,
// which lets us ship P0 without a Stripe account.
//
// SECURITY:
//   - invoices:pay scope required
//   - Invoice must belong to the JWT's freelancer
//   - Idempotency: if a completed payment exists for this invoice, return it
//     instead of creating a new one (prevents double-charge on refresh)
//   - Rate-limited per token (10/min — bounds payment-spam attacks)
//   - Audit logged
// ──────────────────────────────────────────────────────────────────────────────

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { verifyPortalScope, PortalScope } from "../lib/portalAuth";
import { logPortalAction } from "../lib/portalAuditLog";
import { rateLimitByToken, RATE_LIMITS_PORTAL } from "./rateLimit";
import { getPaymentProvider } from "../lib/paymentProvider";

const PAY_SCOPES: PortalScope[] = ["invoices:pay"];
const READ_SCOPES: PortalScope[] = ["invoices:read"];

/**
 * Get the status of any payment(s) for an invoice.
 */
export const getPaymentStatus = query({
  args: { token: v.string(), invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, READ_SCOPES);

    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) return null;
    if (inv.userId !== (claims.fid as any)) return null;

    const payments = await ctx.db
      .query("portalPayments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    return payments.map((p) => ({
      id: p._id,
      provider: p.provider,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      providerCheckoutUrl: p.providerCheckoutUrl ?? null,
      completedAt: p.completedAt ?? null,
      createdAt: p.createdAt,
    }));
  },
});

/**
 * Initiate a payment for an invoice.
 *
 * Flow:
 *   1. Client clicks "Pay invoice" on portal
 *   2. This mutation creates a portalPayments row (status=pending), calls the
 *      provider's `createCheckoutSession`, returns the checkout URL
 *   3. Client visits the URL (for mock provider, this is a no-op — payment
 *      completes instantly)
 *   4. For real providers (Stripe), the provider's webhook calls
 *      markPaymentCompleted (separate mutation, called from http.ts webhook)
 *
 * Idempotency:
 *   - If a `completed` payment exists for this invoice, return it
 *   - If a `pending` payment exists from the last 10 minutes, return its URL
 *     (don't create a duplicate)
 */
export const initiatePayment = mutation({
  args: {
    token: v.string(),
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, PAY_SCOPES);
    await rateLimitByToken(ctx, "portal_initiatePayment", claims.cid, RATE_LIMITS_PORTAL.INITIATE_PAYMENT);

    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) throw new Error("Invoice not found");
    if (inv.userId !== (claims.fid as any)) {
      throw new Error("Invoice not found");
    }

    const amountCents = Math.round((inv.amount ?? inv.total ?? 0) * 100);
    const currency = inv.currency ?? "USD";

    // Idempotency check 1: already completed?
    const existing = await ctx.db
      .query("portalPayments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();
    const completed = existing.find((p) => p.status === "completed");
    if (completed) {
      return {
        paymentId: completed._id,
        status: "completed",
        checkoutUrl: null,
        alreadyPaid: true,
      };
    }
    const recentPending = existing.find(
      (p) => p.status === "pending" && Date.now() - p.createdAt < 10 * 60 * 1000,
    );
    if (recentPending) {
      return {
        paymentId: recentPending._id,
        status: "pending",
        checkoutUrl: recentPending.providerCheckoutUrl ?? null,
        alreadyPaid: false,
      };
    }

    // Create payment record
    const provider = getPaymentProvider();
    const paymentId = await ctx.db.insert("portalPayments", {
      workspaceId: claims.wid as any,
      clientId: claims.cid as any,
      invoiceId: args.invoiceId,
      amount: amountCents,
      currency,
      provider: provider.name,
      providerPaymentId: undefined,
      providerCheckoutUrl: undefined,
      status: "pending",
      initiatedBy: claims.fid as any,
      createdAt: Date.now(),
    });

    // Call provider
    const result = await provider.createCheckoutSession({
      invoiceId: args.invoiceId,
      paymentId,
      amountCents,
      currency,
      clientName: (await ctx.db.get(claims.cid as any))?.clientName ?? "Client",
      description: `Invoice ${inv.number ?? inv.invoiceNumber ?? args.invoiceId}`,
    });

    // Update payment with provider details
    if (result.providerPaymentId || result.checkoutUrl) {
      await ctx.db.patch(paymentId, {
        providerPaymentId: result.providerPaymentId,
        providerCheckoutUrl: result.checkoutUrl,
      });
    }

    // Mock provider completes instantly
    if (result.completed) {
      await ctx.db.patch(paymentId, {
        status: "completed",
        completedAt: Date.now(),
      });
      // Also mark the invoice as paid
      await ctx.db.patch(args.invoiceId, {
        status: "paid",
        paidAt: Date.now(),
      } as any);
    }

    await logPortalAction(ctx, {
      token: args.token,
      clientId: claims.cid as any,
      workspaceId: claims.wid as any,
      action: "initiate_payment",
      targetInvoiceId: args.invoiceId,
      result: {
        provider: provider.name,
        amountCents,
        currency,
        completed: result.completed,
      },
    });

    return {
      paymentId,
      status: result.completed ? "completed" : "pending",
      checkoutUrl: result.checkoutUrl ?? null,
      alreadyPaid: false,
    };
  },
});

/**
 * Webhook entry point — called by payment providers (Stripe, Razorpay) when a
 * payment completes. For the mock provider, this is called directly from
 * initiatePayment (above).
 *
 * SECURITY: This mutation is called from convex/http.ts (webhook handler),
 * NOT from the frontend. The webhook handler validates the provider's
 * signature before calling this.
 */
export const markPaymentCompleted = mutation({
  args: {
    paymentId: v.id("portalPayments"),
    providerPaymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    // Idempotency
    if (payment.status === "completed") {
      return { alreadyCompleted: true };
    }

    // Verify providerPaymentId matches
    if (payment.providerPaymentId && payment.providerPaymentId !== args.providerPaymentId) {
      throw new Error("Provider payment ID mismatch");
    }

    await ctx.db.patch(payment._id, {
      status: "completed",
      completedAt: Date.now(),
      providerPaymentId: args.providerPaymentId,
    });

    // Mark invoice paid
    await ctx.db.patch(payment.invoiceId, {
      status: "paid",
      paidAt: Date.now(),
    } as any);

    return { completed: true };
  },
});
