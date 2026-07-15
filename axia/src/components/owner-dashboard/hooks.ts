/**
 * Custom hooks for the Owner Dashboard.
 *
 * These hooks implement the "cache-first, refresh-on-miss" pattern:
 *   1. useQuery reads from the cache (instant if available)
 *   2. useAction fetches fresh data from upstream APIs (when cache is stale)
 *   3. The hook automatically triggers a refresh when:
 *      - Cache is empty (first load)
 *      - Tab becomes visible (refetch on focus)
 *      - 30s polling timer fires (for realtime tab: 5s)
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useAction } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";

// ── Generic hook: cached query + refresh action ────────────────────────────
function useOwnerDashboardData<T>(
  queryKey: string,
  queryFn: any,
  refreshFn: any,
  opts: { pollIntervalMs?: number; refetchOnFocus?: boolean } = {}
) {
  const { pollIntervalMs, refetchOnFocus = true } = opts;

  // Read from cache (may be null if stale or never fetched)
  const cached = useQuery(queryFn, {});
  const refresh = useAction(refreshFn);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRefreshRef = useRef(0);

  const doRefresh = useCallback(async () => {
    // Throttle: don't refresh more than once per 10s
    const now = Date.now();
    if (now - lastRefreshRef.current < 10_000) return;
    lastRefreshRef.current = now;

    setIsRefreshing(true);
    setError(null);
    try {
      const result = await refresh({});
      if (result?.error) setError(result.error);
    } catch (err: any) {
      setError(err.message?.slice(0, 200) ?? "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // Initial fetch if cache is empty
  useEffect(() => {
    if (cached === undefined || cached === null) {
      doRefresh();
    }
  }, [cached === undefined, cached === null]);

  // Polling
  useEffect(() => {
    if (!pollIntervalMs) return;
    const interval = setInterval(doRefresh, pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs, doRefresh]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnFocus) return;
    const onFocus = () => doRefresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetchOnFocus, doRefresh]);

  return {
    data: cached?.data ?? null,
    fetchedAt: cached?.fetchedAt ?? null,
    latencyMs: cached?.latencyMs ?? null,
    isRefreshing,
    error,
    refresh: doRefresh,
  };
}

// ── Tab-specific hooks ─────────────────────────────────────────────────────

export function useOverview() {
  return useOwnerDashboardData(
    "overview",
    api.ownerDashboard.queries.getOverview,
    api.ownerDashboard.refreshOverview || api.ownerDashboard.actions.refreshOverview,
    { pollIntervalMs: 60_000 }
  );
}

export function useRevenue() {
  return useOwnerDashboardData(
    "revenue",
    api.ownerDashboard.queries.getRevenue,
    api.ownerDashboard.fetchers?.fetchRevenue || api.ownerDashboard.actions.refreshRevenue,
    { pollIntervalMs: 120_000 }
  );
}

export function useProduct() {
  return useOwnerDashboardData(
    "product",
    api.ownerDashboard.queries.getProduct,
    api.ownerDashboard.fetchers.fetchPostHog,
    { pollIntervalMs: 60_000 }
  );
}

export function useErrors() {
  return useOwnerDashboardData(
    "errors",
    api.ownerDashboard.queries.getErrors,
    api.ownerDashboard.fetchers.fetchSentry,
    { pollIntervalMs: 30_000 }
  );
}

export function useInfrastructure() {
  return useOwnerDashboardData(
    "infrastructure",
    api.ownerDashboard.queries.getInfrastructure,
    api.ownerDashboard.fetchers.fetchInfrastructure,
    { pollIntervalMs: 60_000 }
  );
}

export function useRealtime() {
  return useOwnerDashboardData(
    "realtime",
    api.ownerDashboard.queries.getRealtime,
    api.ownerDashboard.fetchers.fetchRealtime,
    { pollIntervalMs: 5_000, refetchOnFocus: false }
  );
}

export function useHeroKpis() {
  return useOwnerDashboardData(
    "heroKpis",
    api.ownerDashboard.queries.getHeroKpis,
    api.ownerDashboard.actions.refreshHeroKpis,
    { pollIntervalMs: 30_000 }
  );
}

export function useAlerts() {
  return useOwnerDashboardData(
    "alerts",
    api.ownerDashboard.queries.getAlerts,
    api.ownerDashboard.actions.refreshAlerts,
    { pollIntervalMs: 60_000 }
  );
}

export function useAuditLog(limit = 50, actionPrefix?: string) {
  return useQuery(api.ownerDashboard.queries.getAuditLog, { limit, actionPrefix });
}

export function useIsOwner() {
  return useQuery(api.ownerDashboard.queries.checkOwner, {});
}
