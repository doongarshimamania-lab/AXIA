// convex/ownerDashboard/lib/vercel.ts — Vercel API client.
//
// Fetches deployment status, build times, and web analytics from the
// Vercel REST API. Token + project ID stored as Convex env vars.

const VERCEL_API_BASE = "https://api.vercel.com";

export class VercelRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super(`Vercel rate limited — retry after ${retryAfterMs}ms`);
  }
}

function authHeaders(): Record<string, string> {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  if (!token) throw new Error("VERCEL_ACCESS_TOKEN not configured");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function getProjectId(): string {
  const id = process.env.VERCEL_PROJECT_ID;
  if (!id) throw new Error("VERCEL_PROJECT_ID not configured");
  return id;
}

async function vercelFetch(path: string): Promise<any> {
  const url = `${VERCEL_API_BASE}${path}`;
  const res = await fetch(url, { headers: authHeaders() });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
    throw new VercelRateLimitError(retryAfter * 1000);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`Vercel API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

// ── Deployments ────────────────────────────────────────────────────────────
export interface VercelDeployment {
  id: string;
  url: string;
  state: "READY" | "BUILDING" | "ERROR" | "QUEUED" | "CANCELED";
  createdAt: number;
  buildingAt: number;
  ready: number | null;
  buildTimeMs: number | null;
  commitSha: string | null;
  commitMessage: string | null;
  branch: string;
  target: "production" | "preview" | "development" | null;
}

export async function getDeployments(opts: { limit?: number } = {}): Promise<{
  deployments: VercelDeployment[];
  latencyMs: number;
}> {
  const start = Date.now();
  const projectId = getProjectId();
  const limit = opts.limit ?? 20;

  const data = await vercelFetch(
    `/v6/deployments?projectId=${projectId}&limit=${limit}&target=production`
  );

  const deployments: VercelDeployment[] = (data?.deployments ?? []).map((d: any) => ({
    id: d.uid,
    url: d.url,
    state: d.readyState,
    createdAt: d.createdAt * 1000,
    buildingAt: d.buildingAt * 1000,
    ready: d.ready ? d.ready * 1000 : null,
    buildTimeMs: d.ready && d.buildingAt ? (d.ready - d.buildingAt) * 1000 : null,
    commitSha: d.meta?.githubCommitSha ?? null,
    commitMessage: d.meta?.githubCommitMessage ?? null,
    branch: d.meta?.githubCommitRef ?? "main",
    target: d.target,
  }));

  return { deployments, latencyMs: Date.now() - start };
}

// ── Deploy summary (for hero KPI + infra tab) ──────────────────────────────
export async function getDeploySummary(): Promise<{
  todayCount: number;
  last7dCount: number;
  latest: VercelDeployment | null;
  buildTimeP95Ms: number | null;
  errorCount7d: number;
  latencyMs: number;
}> {
  const { deployments, latencyMs } = await getDeployments({ limit: 30 });

  const now = Date.now();
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const today = deployments.filter((d) => d.createdAt >= todayStart);
  const last7d = deployments.filter((d) => d.createdAt >= sevenDaysAgo);

  // Build time p95 (from ready deployments with build time)
  const buildTimes = deployments
    .filter((d) => d.buildTimeMs !== null)
    .map((d) => d.buildTimeMs!)
    .sort((a, b) => a - b);
  const p95Index = Math.floor(buildTimes.length * 0.95);
  const buildTimeP95Ms = buildTimes[p95Index] ?? null;

  return {
    todayCount: today.length,
    last7dCount: last7d.length,
    latest: deployments[0] ?? null,
    buildTimeP95Ms,
    errorCount7d: last7d.filter((d) => d.state === "ERROR").length,
    latencyMs,
  };
}

// ── Web Analytics (visitors, top pages) ────────────────────────────────────
export async function getWebAnalytics(): Promise<{
  visitors7d: number;
  pageViews7d: number;
  topPages: { path: string; visitors: number }[];
  latencyMs: number;
}> {
  const start = Date.now();
  const projectId = getProjectId();

  const data = await vercelFetch(
    `/v2/analytics/dashboard?projectId=${projectId}&range=7d`
  );

  return {
    visitors7d: data?.totals?.visitors ?? 0,
    pageViews7d: data?.totals?.pageViews ?? 0,
    topPages: (data?.topPages ?? []).map((p: any) => ({
      path: p.title ?? p.path,
      visitors: p.visitors ?? 0,
    })),
    latencyMs: Date.now() - start,
  };
}
