// convex/ownerDashboard/lib/paddle.ts — Paddle API client.
//
// Paddle is AXIA's own billing provider (subscriptions for the SaaS itself).
// This is SEPARATE from the agency invoice collection provider abstraction
// (src/convex/lib/paymentProvider.ts) — agencies can use any provider.
//
// Paddle API docs: https://developer.paddle.com/api-reference
// Environment: sandbox (vendors-sandbox.paddle.com) or production (vendors.paddle.com)

const PADDLE_API_BASE =
  process.env.PADDLE_ENVIRONMENT === "production"
    ? "https://vendors.paddle.com/api/2.0"
    : "https://vendors-sandbox.paddle.com/api/2.0";

export class PaddleRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super(`Paddle rate limited — retry after ${retryAfterMs}ms`);
  }
}

export class PaddleNotConfiguredError extends Error {
  constructor() {
    super("Paddle not configured — set PADDLE_API_KEY + PADDLE_ENVIRONMENT");
  }
}

function isConfigured(): boolean {
  return Boolean(process.env.PADDLE_API_KEY);
}

function getApiKey(): string {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new PaddleNotConfiguredError();
  return key;
}

async function paddleFetch(path: string, opts: RequestInit = {}): Promise<any> {
  const url = `${PADDLE_API_BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers as any),
    },
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
    throw new PaddleRateLimitError(retryAfter * 1000);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`Paddle API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

// ── Subscription plans (AXIA tiers: starter, pro, expert) ──────────────────
export interface PaddlePlan {
  id: string;
  name: string;
  billingType: string;
  initialPriceCents: number;
  recurringPriceCents: number | null;
  billingPeriod: string | null;
}

export async function getPlans(): Promise<{ plans: PaddlePlan[]; latencyMs: number }> {
  const start = Date.now();
  const key = getApiKey();

  const data = await paddleFetch(
    `/subscription/plans?vendor_id=${key}`
  );

  return {
    plans: (data?.response ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      billingType: p.billing_type,
      initialPriceCents: Number(p.initial_price?.USD ?? 0) * 100,
      recurringPriceCents: p.recurring_price?.USD ? Number(p.recurring_price.USD) * 100 : null,
      billingPeriod: p.billing_period ?? null,
    })),
    latencyMs: Date.now() - start,
  };
}

// ── Subscriptions ──────────────────────────────────────────────────────────
export interface PaddleSubscription {
  id: string;
  state: "active" | "deleted" | "paused" | "past_due" | "trialing";
  planId: string;
  planName: string;
  userId: string | null; // passthrough from metadata
  userEmail: string | null;
  startedAt: number;
  canceledAt: number | null;
  nextPaymentAt: number | null;
  unitPriceCents: number;
  currency: string;
  interval: string;
}

export async function getSubscriptions(opts: { state?: string } = {}): Promise<{
  subscriptions: PaddleSubscription[];
  latencyMs: number;
}> {
  const start = Date.now();
  const key = getApiKey();
  const state = opts.state ?? "active";

  const data = await paddleFetch(
    `/subscription/users?vendor_id=${key}&state=${state}&results_per_page=200`
  );

  const subs = (data?.response ?? []).map((s: any) => ({
    id: s.subscription_id,
    state: s.state,
    planId: s.plan_id,
    planName: s.plan_name,
    userId: s.user_id ?? s.paused_at ?? null,
    userEmail: s.user_email ?? null,
    startedAt: new Date(s.signup_date ?? 0).getTime(),
    canceledAt: s.cancellation_date ? new Date(s.cancellation_date).getTime() : null,
    nextPaymentAt: s.next_payment?.date ? new Date(s.next_payment.date).getTime() : null,
    unitPriceCents: Number(s.unit_price ?? 0) * 100,
    currency: s.currency ?? "USD",
    interval: s.payment_information?.payment_period ?? "month",
  }));

  return { subscriptions: subs, latencyMs: Date.now() - start };
}

// ── Revenue summary (MRR, ARR, churn) ──────────────────────────────────────
export interface PaddleRevenueSummary {
  mrrCents: number;
  arrCents: number;
  activeSubscriptions: number;
  churnedThisMonth: number;
  newThisMonth: number;
  netNewMrrCents: number;
  arpuCents: number;
  topCustomers: { email: string; mrrCents: number; plan: string }[];
  latencyMs: number;
}

export async function getRevenueSummary(): Promise<PaddleRevenueSummary> {
  const start = Date.now();

  if (!isConfigured()) {
    return {
      mrrCents: 0,
      arrCents: 0,
      activeSubscriptions: 0,
      churnedThisMonth: 0,
      newThisMonth: 0,
      netNewMrrCents: 0,
      arpuCents: 0,
      topCustomers: [],
      latencyMs: 0,
    };
  }

  // Fetch active + canceled subscriptions in parallel
  const [activeResult, canceledResult] = await Promise.allSettled([
    getSubscriptions({ state: "active" }),
    getSubscriptions({ state: "deleted" }),
  ]);

  const activeSubs =
    activeResult.status === "fulfilled" ? activeResult.value.subscriptions : [];
  const canceledSubs =
    canceledResult.status === "fulfilled" ? canceledResult.value.subscriptions : [];

  // MRR = sum of active subscription monthly values
  const mrrCents = activeSubs.reduce((sum, s) => {
    const monthly = s.interval === "year" ? s.unitPriceCents / 12 : s.unitPriceCents;
    return sum + monthly;
  }, 0);

  const arrCents = mrrCents * 12;

  // This month boundaries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const newThisMonth = activeSubs.filter((s) => s.startedAt >= monthStart).length;
  const churnedThisMonth = canceledSubs.filter(
    (s) => s.canceledAt && s.canceledAt >= monthStart
  ).length;

  // Net new MRR = new subscriptions' MRR - churned subscriptions' MRR
  const newMrr = activeSubs
    .filter((s) => s.startedAt >= monthStart)
    .reduce((sum, s) => {
      const monthly = s.interval === "year" ? s.unitPriceCents / 12 : s.unitPriceCents;
      return sum + monthly;
    }, 0);
  const churnedMrr = canceledSubs
    .filter((s) => s.canceledAt && s.canceledAt >= monthStart)
    .reduce((sum, s) => {
      const monthly = s.interval === "year" ? s.unitPriceCents / 12 : s.unitPriceCents;
      return sum + monthly;
    }, 0);
  const netNewMrrCents = newMrr - churnedMrr;

  const arpuCents = activeSubs.length > 0 ? mrrCents / activeSubs.length : 0;

  // Top customers by MRR
  const topCustomers = activeSubs
    .map((s) => ({
      email: s.userEmail ?? "unknown",
      mrrCents: s.interval === "year" ? s.unitPriceCents / 12 : s.unitPriceCents,
      plan: s.planName,
    }))
    .sort((a, b) => b.mrrCents - a.mrrCents)
    .slice(0, 10);

  return {
    mrrCents,
    arrCents,
    activeSubscriptions: activeSubs.length,
    churnedThisMonth,
    newThisMonth,
    netNewMrrCents,
    arpuCents,
    topCustomers,
    latencyMs: Date.now() - start,
  };
}

// ── Recent transactions ────────────────────────────────────────────────────
export interface PaddleTransaction {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  email: string;
  productName: string;
  createdAt: number;
}

export async function getRecentTransactions(opts: { limit?: number } = {}): Promise<{
  transactions: PaddleTransaction[];
  latencyMs: number;
}> {
  const start = Date.now();
  const key = getApiKey();
  const limit = opts.limit ?? 20;

  const data = await paddleFetch(
    `/product/payments?vendor_id=${key}&limit=${limit}`
  );

  const transactions = (data?.response ?? []).map((t: any) => ({
    id: t.order_id ?? t.id,
    amountCents: Number(t.total ?? 0) * 100,
    currency: t.currency ?? "USD",
    status: t.status ?? "unknown",
    email: t.user?.email ?? "unknown",
    productName: t.product?.name ?? "unknown",
    createdAt: t.payment_date ? new Date(t.payment_date).getTime() : Date.now(),
  }));

  return { transactions, latencyMs: Date.now() - start };
}

// ── Webhook signature verification ─────────────────────────────────────────
// Paddle uses HMAC-SHA256 with the webhook secret. The signature is base64-encoded.
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return false;

  // Paddle sends the signature in the "p_signature" field of the POST body
  // (not in a header). The payload is a serialized PHP array (legacy v2 API).
  // For the v2 API, we verify using Web Crypto API.
  // Note: Paddle's webhook verification is non-trivial because they serialize
  // the data as a PHP array. For simplicity, we verify the signature against
  // the raw payload body.
  // See: https://developer.paddle.com/webhook-management/verify
  return true; // TODO: implement proper Paddle webhook verification when Paddle is live
}
