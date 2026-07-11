// ──────────────────────────────────────────────────────────────────────────────
// lib/paymentProvider.ts — Provider-agnostic payment interface.
//
// WHY: User doesn't have a Stripe account. Mock provider returns "completed"
// instantly so the portal flow (client → pay → invoice marked paid) works
// end-to-end without a real payment processor.
//
// WHEN STRIPE IS READY: Set env PORTAL_PAYMENT_PROVIDER=stripe, add
// STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET, and the existing code path
// activates — no portal changes needed.
// ──────────────────────────────────────────────────────────────────────────────

export interface CheckoutSessionArgs {
  invoiceId: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  clientName: string;
  description: string;
}

export interface CheckoutSessionResult {
  providerPaymentId?: string;
  checkoutUrl?: string;
  completed: boolean; // mock provider: true (instant). Stripe: false (client visits URL)
}

export interface PaymentProvider {
  name: "mock" | "stripe" | "razorpay" | "paypal";
  createCheckoutSession(args: CheckoutSessionArgs): Promise<CheckoutSessionResult>;
  /**
   * Verify a webhook signature. Returns true if valid.
   * Mock provider: always true (no signature).
   * Stripe: HMAC-SHA256 verification against STRIPE_WEBHOOK_SECRET.
   */
  verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
}

let cachedProvider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cachedProvider) return cachedProvider;

  const name = process.env.PORTAL_PAYMENT_PROVIDER ?? "mock";

  if (name === "stripe") {
    // Lazy require to avoid loading Stripe SDK in mock mode
    // ponytail: dynamic require keeps the mock path zero-dep
    // NOTE: stripe provider requires the "stripe" npm package + STRIPE_SECRET_KEY env.
    // If the package is not installed, this will throw at first call — by design.
    const { stripeProvider } = require("./paymentProviders/stripe");
    cachedProvider = stripeProvider;
  } else if (name === "razorpay") {
    // ponytail: razorpay provider not yet implemented (file doesn't exist).
    // Falls through to mock provider until razorpay.ts is created.
    console.warn("[paymentProvider] razorpay provider not yet implemented — falling back to mock");
    const { mockProvider } = require("./paymentProviders/mock");
    cachedProvider = mockProvider;
  } else {
    // Default: mock provider — instant success, no external deps
    const { mockProvider } = require("./paymentProviders/mock");
    cachedProvider = mockProvider;
  }

  return cachedProvider;
}
