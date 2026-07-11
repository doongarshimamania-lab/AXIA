// ──────────────────────────────────────────────────────────────────────────────
// lib/paymentProviders/stripe.ts — Stripe payment provider (stub for future).
//
// ACTIVATION: When the user creates a Stripe account, set these env vars:
//   PORTAL_PAYMENT_PROVIDER=stripe
//   STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
//   STRIPE_WEBHOOK_SECRET=whsec_...
//
// Until then, this file throws a clear error if accessed, so the mock provider
// is used by default.
//
// RUNTIME: Web Crypto API (crypto.subtle) — works in Convex V8 runtime.
// No "use node" directive — this file must be callable from query/mutation
// handlers that run in the Convex V8 runtime.
// ──────────────────────────────────────────────────────────────────────────────

import { PaymentProvider, CheckoutSessionArgs, CheckoutSessionResult } from "../paymentProvider";

async function ensureConfigured(): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY not set. To use Stripe, set PORTAL_PAYMENT_PROVIDER=stripe " +
        "and STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET env vars. " +
        "Currently falling back to mock provider — check your env config."
    );
  }
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createCheckoutSession(args: CheckoutSessionArgs): Promise<CheckoutSessionResult> {
    await ensureConfigured();

    // ponytail: dynamic import via variable so the bundler doesn't try to
    // statically resolve "stripe" (the package is only installed when the
    // user actually switches to Stripe). If PORTAL_PAYMENT_PROVIDER=stripe
    // is set without installing "stripe", this throws a clear runtime error.
    const moduleName = "stripe";
    const Stripe = (await import(/* @vite-ignore */ moduleName)).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20" as any,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: args.currency.toLowerCase(),
            product_data: { name: args.description },
            unit_amount: args.amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.SITE_URL ?? ""}/workspace/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL ?? ""}/workspace/cancel`,
      client_reference_id: args.paymentId,
      metadata: {
        invoiceId: args.invoiceId,
        paymentId: args.paymentId,
      },
    });

    return {
      providerPaymentId: session.id,
      checkoutUrl: session.url,
      completed: false, // client must visit URL to pay
    };
  },

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    if (!process.env.STRIPE_WEBHOOK_SECRET) return false;

    // Stripe signs with HMAC-SHA256, header format: t=...,v1=...
    const elements = signature.split(",");
    const tElement = elements.find((e) => e.startsWith("t="));
    const v1Element = elements.find((e) => e.startsWith("v1="));
    if (!tElement || !v1Element) return false;

    const t = tElement.substring(2);
    const v1 = v1Element.substring(3);
    const expectedSig = await hmacHex(process.env.STRIPE_WEBHOOK_SECRET!, `${t}.${payload}`);

    // ponytail: constant-time comparison via custom hex compare (Web Crypto
    // doesn't expose timingSafeEqual; we use a length-checked XOR compare).
    if (v1.length !== expectedSig.length) return false;
    let diff = 0;
    for (let i = 0; i < v1.length; i++) {
      diff |= v1.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    return diff === 0;
  },
};

// ponytail: stub for Razorpay kept in a separate file when needed
export const razorpayProvider: PaymentProvider = {
  name: "razorpay",
  async createCheckoutSession(_args: CheckoutSessionArgs): Promise<CheckoutSessionResult> {
    throw new Error("Razorpay provider not yet implemented. Use mock or stripe.");
  },
  async verifyWebhookSignature(): Promise<boolean> {
    throw new Error("Razorpay provider not yet implemented.");
  },
};
