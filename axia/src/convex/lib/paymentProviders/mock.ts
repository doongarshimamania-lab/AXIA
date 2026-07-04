// ──────────────────────────────────────────────────────────────────────────────
// lib/paymentProviders/mock.ts — Mock payment provider.
//
// Returns "completed" instantly. Use for dev/staging or when no Stripe account
// exists yet. Set PORTAL_PAYMENT_PROVIDER=mock (or leave unset) to use this.
//
// SECURITY: Even though this is "mock", it goes through the full portal payment
// flow — audit log, idempotency, invoice update. So swapping to Stripe later
// is purely a config change, no code change.
// ──────────────────────────────────────────────────────────────────────────────

import { PaymentProvider, CheckoutSessionArgs, CheckoutSessionResult } from "../paymentProvider";

export const mockProvider: PaymentProvider = {
  name: "mock",

  async createCheckoutSession(args: CheckoutSessionArgs): Promise<CheckoutSessionResult> {
    // ponytail: generate a fake provider ID so the audit trail is realistic
    const providerPaymentId = `mock_${args.paymentId}_${Date.now()}`;
    return {
      providerPaymentId,
      checkoutUrl: null, // no URL — payment completes instantly
      completed: true,
    };
  },

  async verifyWebhookSignature(_payload: string, _signature: string): Promise<boolean> {
    // Mock provider has no webhook signature — always return true.
    // ponytail: this is ONLY called from the webhook HTTP handler, which is
    // gated by an internal-only path + IP allowlist in production.
    return true;
  },
};
