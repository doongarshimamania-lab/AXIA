// src/convex/lib/paymentProviders/creem.ts — Creem payment provider.
//
// Creem (https://creem.io) is a Merchant of Record like Paddle / Lemon Squeezy.
// They handle global tax compliance, so we don't have to register for VAT/GST
// in every country we sell to. Creem exposes:
//   - REST API at https://api.creem.io/v1 (Checkout Sessions, Subscriptions)
//   - Webhooks signed with HMAC-SHA256 via the `creem-signature` header
//
// ACTIVATION: Set these env vars on the Convex dashboard:
//   PAYMENT_PROVIDER=creem
//   CREEM_API_KEY=creem_xxx           (server-to-server, secret)
//   CREEM_WEBHOOK_SECRET=whsec_xxx    (signs webhook payloads)
//   CREEM_PRODUCT_ID_SOLO=prod_xxx
//   CREEM_PRODUCT_ID_AGENCY=prod_xxx
//   CREEM_PRODUCT_ID_SCALE=prod_xxx
//
// Until CREEM_API_KEY is set, `createCheckoutSession` throws a clear error —
// the mock provider is used as fallback (see lib/paymentProvider.ts).
//
// RUNTIME: Web Crypto API (crypto.subtle) — works in Convex V8 runtime.
// No "use node" directive — this file must be callable from V8 query/mutation
// handlers.

import {
  PaymentProvider,
  CheckoutSessionArgs,
  CheckoutSessionResult,
} from "../paymentProvider";

const CREEM_API_BASE = "https://api.creem.io/v1";

async function ensureConfigured(): Promise<void> {
  if (!process.env.CREEM_API_KEY) {
    throw new Error(
      "CREEM_API_KEY not set. To use Creem, set PAYMENT_PROVIDER=creem and " +
        "CREEM_API_KEY + CREEM_WEBHOOK_SECRET + CREEM_PRODUCT_ID_* env vars. " +
        "Currently falling back to mock provider — check your Convex env config.",
    );
  }
}

// Web Crypto HMAC-SHA256 — returns hex string.
async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ponytail: constant-time hex compare to prevent timing-attack signature
// forgery. Web Crypto doesn't expose timingSafeEqual; we use length-checked XOR.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const creemProvider: PaymentProvider = {
  name: "creem",

  async createCheckoutSession(
    args: CheckoutSessionArgs,
  ): Promise<CheckoutSessionResult> {
    await ensureConfigured();

    // Creem checkout creation: POST /v1/checkouts
    // Docs: https://docs.creem.io/api-reference#tag/Checkouts
    //
    // We send the metadata so the webhook can correlate the Creem checkout
    // back to our internal `paymentId` (which is what markPaymentCompleted
    // expects on the Convex side).
    const body = {
      // ponytail: in production with Creem as the recurring-billing provider,
      // we'd pass `product_id` (one of the three CREEM_PRODUCT_ID_* values)
      // and let Creem handle the price. For the one-off portal invoice flow
      // (the existing CheckoutSessionArgs signature), we use `amount` + `currency`.
      amount: args.amountCents,
      currency: args.currency.toLowerCase(),
      product_name: args.description,
      customer_name: args.clientName,
      metadata: {
        invoiceId: args.invoiceId,
        paymentId: args.paymentId,
      },
      success_url: `${process.env.SITE_URL ?? ""}/workspace/success?payment_id=${args.paymentId}`,
      cancel_url: `${process.env.SITE_URL ?? ""}/workspace/cancel`,
    };

    const res = await fetch(`${CREEM_API_BASE}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CREEM_API_KEY!,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Creem checkout creation failed (${res.status}): ${text.slice(0, 500)}`,
      );
    }

    const json = (await res.json()) as {
      id?: string;
      checkout_url?: string;
    };

    return {
      providerPaymentId: json.id,
      checkoutUrl: json.checkout_url,
      completed: false, // client must visit checkout_url to pay
    };
  },

  async verifyWebhookSignature(
    payload: string,
    signature: string,
  ): Promise<boolean> {
    if (!process.env.CREEM_WEBHOOK_SECRET) return false;
    // Creem signs with HMAC-SHA256 and sends the hex signature in the
    // `creem-signature` header. (The header may also contain a `t=` timestamp
    // segment for replay protection — we accept either form.)
    const sig = signature.includes(",")
      ? signature.split(",").find((s) => s.startsWith("v1="))?.substring(3) ?? signature
      : signature;
    const expected = await hmacHex(process.env.CREEM_WEBHOOK_SECRET!, payload);
    return constantTimeEqual(sig, expected);
  },
};
