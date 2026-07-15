// convex/ownerDashboard/lib/sentry.ts — Sentry REST API client.
//
// All calls use the Sentry REST API (https://docs.sentry.io/api/) with a
// Bearer auth token. Calls are made from Convex actions (server-side Node).
//
// Rate-limit handling: Sentry returns 429 with a Retry-After header. We
// respect it and throw a RateLimitError that the caller can catch + cache.

const SENTRY_API_BASE = "https://sentry.io/api/0";

export class SentryRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super(`Sentry rate limited — retry after ${retryAfterMs}ms`);
  }
}

function authHeaders(): Record<string, string> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!token) throw new Error("SENTRY_AUTH_TOKEN not configured");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function getOrgSlug(): string {
  const org = process.env.SENTRY_ORG_SLUG;
  if (!org) throw new Error("SENTRY_ORG_SLUG not configured");
  return org;
}

async function sentryFetch(path: string, opts: RequestInit = {}): Promise<any> {
  const url = path.startsWith("http") ? path : `${SENTRY_API_BASE}${path}`;
  const start = Date.now();

  const res = await fetch(url, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers as any) },
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
    throw new SentryRateLimitError(retryAfter * 1000);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`Sentry API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

// ── Issues ─────────────────────────────────────────────────────────────────
export interface SentryIssue {
  id: string;
  title: string;
  level: "fatal" | "error" | "warning" | "info" | "debug";
  status: "unresolved" | "resolved" | "ignored";
  timesSeen: number;
  firstSeen: string;
  lastSeen: string;
  project: { slug: string };
  shortId: string;
  permalink: string;
}

export async function getIssues(opts: {
  projectSlug?: string;
  query?: string;
  sort?: "freq" | "date" | "priority";
  limit?: number;
} = {}): Promise<{ issues: SentryIssue[]; latencyMs: number }> {
  const org = getOrgSlug();
  const params = new URLSearchParams({
    query: opts.query ?? "is:unresolved",
    sort: opts.sort ?? "freq",
  });
  if (opts.projectSlug) {
    params.set("project", opts.projectSlug);
  }
  const statsParam = "statsPeriod=24h";
  const url = `/organizations/${org}/issues/?${params}&${statsParam}&per_page=${opts.limit ?? 20}`;

  const data = await sentryFetch(url);
  return {
    issues: (data ?? []).map((i: any) => ({
      id: i.id,
      title: i.title,
      level: i.level,
      status: i.status,
      timesSeen: i.count,
      firstSeen: i.firstSeen,
      lastSeen: i.lastSeen,
      project: { slug: i.project?.slug ?? "unknown" },
      shortId: i.shortId,
      permalink: i.permalink,
    })),
    latencyMs: 0, // set by caller
  };
}

// ── Issue counts by severity ───────────────────────────────────────────────
export async function getIssueStats(): Promise<{
  total: number;
  fatal: number;
  error: number;
  warning: number;
  info: number;
  latencyMs: number;
}> {
  const start = Date.now();
  const org = getOrgSlug();

  // Fetch counts per level in parallel
  const [fatal, error, warning, info] = await Promise.allSettled([
    sentryFetch(`/organizations/${org}/issues/?query=is:unresolved level:fatal&statsPeriod=24h&per_page=1`),
    sentryFetch(`/organizations/${org}/issues/?query=is:unresolved level:error&statsPeriod=24h&per_page=1`),
    sentryFetch(`/organizations/${org}/issues/?query=is:unresolved level:warning&statsPeriod=24h&per_page=1`),
    sentryFetch(`/organizations/${org}/issues/?query=is:unresolved level:info&statsPeriod=24h&per_page=1`),
  ]);

  const extract = (r: PromiseSettledResult<any>) =>
    r.status === "fulfilled" ? (Array.isArray(r.value) ? r.value.length : 0) : 0;

  return {
    total: extract(fatal) + extract(error) + extract(warning) + extract(info),
    fatal: extract(fatal),
    error: extract(error),
    warning: extract(warning),
    info: extract(info),
    latencyMs: Date.now() - start,
  };
}

// ── Events per minute (last 24h) ───────────────────────────────────────────
export async function getEventTrend(): Promise<{
  points: { ts: number; count: number }[];
  latencyMs: number;
}> {
  const start = Date.now();
  const org = getOrgSlug();

  // Use the stats endpoint for timeseries
  const data = await sentryFetch(
    `/organizations/${org}/stats/?stat=received&resolution=1h&hours=24`
  );

  // Sentry returns { "2024-01-01T00:00:00Z": 42, ... }
  const points = Object.entries(data ?? {}).map(([ts, count]) => ({
    ts: new Date(ts).getTime(),
    count: count as number,
  }));

  return { points, latencyMs: Date.now() - start };
}

// ── Releases ───────────────────────────────────────────────────────────────
export interface SentryRelease {
  version: string;
  dateCreated: string;
  dateReleased: string;
  newGroups: number;
  adoption: number; // 0-1
  crashFreeUsers: number | null; // 0-1
  crashFreeSessions: number | null; // 0-1
}

export async function getLatestRelease(): Promise<{
  release: SentryRelease | null;
  latencyMs: number;
}> {
  const start = Date.now();
  const org = getOrgSlug();

  const data = await sentryFetch(
    `/organizations/${org}/releases/?per_page=1`
  );

  if (!data || data.length === 0) {
    return { release: null, latencyMs: Date.now() - start };
  }

  const r = data[0];
  return {
    release: {
      version: r.version,
      dateCreated: r.dateCreated,
      dateReleased: r.dateReleased,
      newGroups: r.newGroups ?? 0,
      adoption: r.adoption ?? 0,
      crashFreeUsers: r.projects?.[0]?.crashFreeUsers ?? null,
      crashFreeSessions: r.projects?.[0]?.crashFreeSessions ?? null,
    },
    latencyMs: Date.now() - start,
  };
}

// ── Projects list ──────────────────────────────────────────────────────────
export async function getProjects(): Promise<{
  projects: { id: string; slug: string; name: string }[];
  latencyMs: number;
}> {
  const start = Date.now();
  const org = getOrgSlug();

  const data = await sentryFetch(`/organizations/${org}/projects/?per_page=50`);

  return {
    projects: (data ?? []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
    })),
    latencyMs: Date.now() - start,
  };
}
