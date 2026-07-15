// convex/lib/paymentProviders/paddle.ts — Paddle provider for AGENCY invoice
// collection (clients pay invoices via Paddle checkout).
//
// This is DIFFERENT from convex/ownerDashboard/lib/paddle.ts which handles
// AXIA's own SaaS subscriptions. This file lets agencies use Paddle to
// collect invoice payments from their clients — one of several provider
// options (Stripe, Razorpay, mock, Paddle).
//
// Agencies select their provider via the PORTAL_PAYMENT_PROVIDER env var.

import type { PaymentProvider, CheckoutSessionArgs, CheckoutSessionResult } from "../paymentProvider";

const PADDLE_CHECKOUT_BASE =
  process.env.PADDLE_ENVIRONMENT === "production"
    ? "https://buy.paddle.com"
    : "https://sandbox-buy.paddle.com";

/**
 * Paddle provider for agency invoice collection.
 *
 * Uses Paddle.js Checkout Overlay (simplest integration). The agency's
 * Paddle vendor ID is configured via VITE_PADDLE_VENDOR_ID (client-side).
 *
 * For subscription billing (AXIA's own SaaS), see:
 *   convex/ownerDashboard/lib/paddle.ts
 */
export const paddleProvider: PaymentProvider = {
  name: "paddle",

  async createCheckoutSession(args: CheckoutSessionArgs): Promise<CheckoutSessionResult> {
    const vendorId = process.env.VITE_PADDLE_VENDOR_ID;
    if (!vendorId) {
      throw new Error("VITE_PADDLE_VENDOR_ID not configured — required for Paddle checkout");
    }

    // Paddle Checkout Overlay: we generate a checkout URL with the product
    // details as query params. The client opens this in a Paddle.js overlay.
    const params = new URLSearchParams({
      vendor: vendorId,
      title: args.description.slice(0, 100),
      amount: (args.amountCents / 100).toFixed(2),
      currency: args.currency,
      passthrough: JSON.stringify({ invoiceId: args.invoiceId, paymentId: args.paymentId }),
      quantity: "1",
    });

    return {
      checkoutUrl: `${PADDLE_CHECKOUT_BASE}?${params}`,
      completed: false,
    };
  },

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) return false;

    // Paddle webhook verification uses HMAC-SHA256.
    // The signature is sent in the "p_signature" field of the POST body.
    // See: https://developer.paddle.com/webhook-management/verify
    //
    // For now, accept all webhooks in development. In production, implement
    // proper verification using the Web Crypto API.
    if (process.env.NODE_ENV === "development") return true;

    // TODO: implement proper Paddle webhook signature verification
    // This requires parsing the PHP-serialized payload that Paddle sends
    return true;
  },
};
