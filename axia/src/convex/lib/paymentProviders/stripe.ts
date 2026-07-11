"use node";
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
// ──────────────────────────────────────────────────────────────────────────────

import { PaymentProvider, CheckoutSessionArgs, CheckoutSessionResult } from "../paymentProvider";
import crypto from "crypto";

async function ensureConfigured(): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY not set. To use Stripe, set PORTAL_PAYMENT_PROVIDER=stripe " +
        "and STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET env vars. " +
        "Currently falling back to mock provider — check your env config."
    );
  }
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createCheckoutSession(args: CheckoutSessionArgs): Promise<CheckoutSessionResult> {
    await ensureConfigured();

    // ponytail: dynamic import so the Stripe SDK isn't loaded in mock mode
    // (saves ~2MB bundle in dev)
    const Stripe = (await import("stripe")).default;
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
    const expectedSig = crypto
      .createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET)
      .update(`${t}.${payload}`)
      .digest("hex");

    // ponytail: timingSafeEqual prevents timing-based signature oracle
    const a = Buffer.from(v1, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
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
