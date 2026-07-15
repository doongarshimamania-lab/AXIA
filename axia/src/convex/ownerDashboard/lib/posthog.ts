// convex/ownerDashboard/lib/posthog.ts — PostHog API client.
//
// Uses the PostHog Query API (HogQL) for ad-hoc aggregations and the
// Insights API for pre-built charts. All calls use a personal API key
// and project ID, both stored as Convex env vars.

const POSTHOG_API_BASE = "https://app.posthog.com/api";

export class PostHogRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super(`PostHog rate limited — retry after ${retryAfterMs}ms`);
  }
}

function authHeaders(): Record<string, string> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) throw new Error("POSTHOG_PERSONAL_API_KEY not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function getProjectId(): string {
  const id = process.env.POSTHOG_PROJECT_ID;
  if (!id) throw new Error("POSTHOG_PROJECT_ID not configured");
  return id;
}

async function posthogFetch(path: string, opts: RequestInit = {}): Promise<any> {
  const url = `${POSTHOG_API_BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers as any) },
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
    throw new PostHogRateLimitError(retryAfter * 1000);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`PostHog API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

// ── Query API (HogQL) ──────────────────────────────────────────────────────
// The workhorse for ad-hoc aggregations. Send a HogQL SELECT, get columnar results.
export async function runHogQL<T = any>(
  query: string
): Promise<{ results: T[]; columns: string[]; latencyMs: number }> {
  const start = Date.now();
  const projectId = getProjectId();

  const data = await posthogFetch(`/projects/${projectId}/query`, {
    method: "POST",
    body: JSON.stringify({
      query: { kind: "HogQLQuery", query },
    }),
  });

  return {
    results: data?.results ?? [],
    columns: data?.columns ?? [],
    latencyMs: Date.now() - start,
  };
}

// ── DAU / WAU / MAU ────────────────────────────────────────────────────────
export async function getDauMau(): Promise<{
  dau: number;
  wau: number;
  mau: number;
  stickiness: number; // DAU/MAU
  trend: { date: string; dau: number }[];
  latencyMs: number;
}> {
  const start = Date.now();

  // Last 30 days DAU trend
  const dauResult = await runHogQL(`
    SELECT
      toDate(timestamp) as date,
      count(DISTINCT person_id) as dau
    FROM events
    WHERE timestamp >= now() - INTERVAL 30 DAY
    GROUP BY date
    ORDER BY date
  `);

  const trend = dauResult.results.map((r: any) => ({
    date: r[0],
    dau: Number(r[1]),
  }));

  // Today's DAU, last 7d WAU, last 30d MAU
  const summaryResult = await runHogQL(`
    SELECT
      countDistinctIf(person_id, toDate(timestamp) = today()) as dau,
      countDistinctIf(person_id, timestamp >= now() - INTERVAL 7 DAY) as wau,
      countDistinctIf(person_id, timestamp >= now() - INTERVAL 30 DAY) as mau
    FROM events
    WHERE timestamp >= now() - INTERVAL 30 DAY
  `);

  const row = summaryResult.results[0] ?? [0, 0, 0];
  const [dau, wau, mau] = row.map(Number);
  const stickiness = mau > 0 ? dau / mau : 0;

  return { dau, wau, mau, stickiness, trend, latencyMs: Date.now() - start };
}

// ── Retention cohort (8-week N-day) ────────────────────────────────────────
export async function getRetention(): Promise<{
  cohort: { week: string; size: number; retention: number[] }[];
  latencyMs: number;
}> {
  const start = Date.now();
  const projectId = getProjectId();

  // Use the retention insight endpoint
  const data = await posthogFetch(`/projects/${projectId}/insights/retention`, {
    method: "POST",
    body: JSON.stringify({
      period: "Week",
      retentionType: "first_cohort",
      totalIntervals: 8,
      returningEntity: { id: "$pageview", name: "$pageview", type: "events" },
      targetEntity: { id: "$pageview", name: "$pageview", type: "events" },
    }),
  });

  const cohort = (data?.result ?? []).map((c: any) => ({
    week: c.label ?? c.date,
    size: c.values?.[0]?.count ?? 0,
    retention: (c.values ?? []).map((v: any) => v.percentage ?? 0),
  }));

  return { cohort, latencyMs: Date.now() - start };
}

// ── Funnel (signup → workspace → first event → paid) ───────────────────────
export async function getFunnel(): Promise<{
  steps: { name: string; count: number; conversionRate: number }[];
  latencyMs: number;
}> {
  const start = Date.now();
  const projectId = getProjectId();

  const data = await posthogFetch(`/projects/${projectId}/insights/funnel`, {
    method: "POST",
    body: JSON.stringify({
      funnelVizType: "steps",
      funnelWindowInterval: 14,
      funnelWindowIntervalUnit: "day",
      events: [
        { id: "user_signed_up", type: "events", order: 0 },
        { id: "workspace_created", type: "events", order: 1 },
        { id: "$pageview", type: "events", order: 2 },
        { id: "subscription_started", type: "events", order: 3 },
      ],
    }),
  });

  const steps = (data?.result ?? []).map((s: any, i: number, arr: any[]) => ({
    name: s.label ?? `Step ${i + 1}`,
    count: s.count ?? 0,
    conversionRate: i === 0 ? 1 : (s.count ?? 0) / (arr[0]?.count ?? 1),
  }));

  return { steps, latencyMs: Date.now() - start };
}

// ── Top pages ──────────────────────────────────────────────────────────────
export async function getTopPages(): Promise<{
  pages: { path: string; uniqueVisits: number }[];
  latencyMs: number;
}> {
  const result = await runHogQL(`
    SELECT
      properties.$current_url as path,
      count(DISTINCT person_id) as unique_visits
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - INTERVAL 7 DAY
    GROUP BY path
    ORDER BY unique_visits DESC
    LIMIT 10
  `);

  return {
    pages: result.results.map((r: any) => ({
      path: r[0] ?? "unknown",
      uniqueVisits: Number(r[1]),
    })),
    latencyMs: result.latencyMs,
  };
}

// ── Feature adoption (top events) ──────────────────────────────────────────
export async function getFeatureAdoption(): Promise<{
  events: { name: string; uniqueUsers: number; totalCalls: number }[];
  latencyMs: number;
}> {
  const result = await runHogQL(`
    SELECT
      event as name,
      count(DISTINCT person_id) as unique_users,
      count() as total_calls
    FROM events
    WHERE timestamp >= now() - INTERVAL 30 DAY
      AND event NOT LIKE '$%'
    GROUP BY name
    ORDER BY unique_users DESC
    LIMIT 8
  `);

  return {
    events: result.results.map((r: any) => ({
      name: r[0],
      uniqueUsers: Number(r[1]),
      totalCalls: Number(r[2]),
    })),
    latencyMs: result.latencyMs,
  };
}

// ── Live users (active in last 60s) ────────────────────────────────────────
export async function getLiveUsers(): Promise<{
  count: number;
  topPages: { path: string; count: number }[];
  latencyMs: number;
}> {
  const result = await runHogQL(`
    SELECT
      count(DISTINCT person_id) as live_users
    FROM events
    WHERE timestamp >= now() - INTERVAL 60 SECOND
  `);

  const pagesResult = await runHogQL(`
    SELECT
      properties.$current_url as path,
      count() as count
    FROM events
    WHERE timestamp >= now() - INTERVAL 60 SECOND
      AND event = '$pageview'
    GROUP BY path
    ORDER BY count DESC
    LIMIT 5
  `);

  return {
    count: Number(result.results[0]?.[0] ?? 0),
    topPages: pagesResult.results.map((r: any) => ({
      path: r[0] ?? "unknown",
      count: Number(r[1]),
    })),
    latencyMs: result.latencyMs + pagesResult.latencyMs,
  };
}
