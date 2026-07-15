// ──────────────────────────────────────────────────────────────────────────────
// lib/paymentProviders/razorpay.ts — Razorpay payment provider (stub).
//
// Not yet implemented. Exists so that `require("./paymentProviders/razorpay")`
// in paymentProvider.ts resolves — without this file, the bundler fails with
// "Could not resolve ./paymentProviders/razorpay" even when Razorpay isn't
// selected (because Convex bundles the entire module graph at deploy time).
//
// When Razorpay support is added, implement createCheckoutSession using the
// Razorpay SDK (in a `use node` action — see stripe.ts TODO) and
// verifyWebhookSignature using pureCrypto.hmacSha256.
// ──────────────────────────────────────────────────────────────────────────────

import { PaymentProvider, CheckoutSessionArgs, CheckoutSessionResult } from "../paymentProvider";

export const razorpayProvider: PaymentProvider = {
  name: "razorpay",

  async createCheckoutSession(_args: CheckoutSessionArgs): Promise<CheckoutSessionResult> {
    throw new Error(
      "Razorpay provider not yet implemented. Set PORTAL_PAYMENT_PROVIDER=mock " +
        "(default) or =stripe to use a different provider."
    );
  },

  async verifyWebhookSignature(): Promise<boolean> {
    throw new Error("Razorpay provider not yet implemented.");
  },
};
