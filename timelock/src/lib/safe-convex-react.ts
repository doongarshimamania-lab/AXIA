/**
 * Safe wrapper around convex/react that prevents query errors from crashing the app.
 *
 * ROOT FIX: Queries are now aware of authentication state. When the user is not
 * authenticated, queries are SKIPPED (no network request) and return undefined immediately.
 * Pages can then show demo/mock data instead of infinite spinners.
 *
 * KEY INSIGHT: The difference between "loading" and "not connected" is:
 *   - Authenticated + undefined = loading (show skeleton briefly)
 *   - NOT authenticated + undefined = disconnected (show demo data IMMEDIATELY)
 *
 * This eliminates the need for timeout bandages. Pages never hang in loading states
 * because disconnected queries resolve instantly.
 *
 * For backward compatibility, useQuery STILL returns the raw data when successful,
 * and undefined when loading/disconnected. Pages should check isAuthenticated to
 * distinguish between the two states.
 */

import { useRef, useCallback, useState, useEffect } from "react";
import {
  useQuery as _useQuery,
  useMutation as _useMutation,
  useAction as _useAction,
  ConvexReactClient,
  ConvexProvider,
  useConvexAuth,
  useQuery_experimental,
} from "convex/react";
import { anyApi } from "convex/server";
import { api } from "@/convex/_generated/api";
import { reportQueryError } from "@/lib/monitoring";

// Re-export non-hook utilities directly from the real convex/react (safe, no error-throwing)
export { ConvexReactClient, ConvexProvider, useConvexAuth, useQuery_experimental };

// ── Skip Sentinel ───────────────────────────────────────────────────────────────
// Convex's useQuery natively supports passing `"skip"` as the query reference
// to skip the subscription entirely. We use this instead of fake API paths
// (which Convex validates and rejects).
//
// For useMutation, there's no "skip" mechanism — we always pass the real
// mutation reference and wrap the returned function to no-op when needed.

// Note: We do NOT use DUMMY_QUERY / DUMMY_MUTATION sentinels anymore.
// Previous approach of (anyApi)._skip_placeholder caused:
//   "API path is expected to be of the form 'api.moduleName.functionName'"
// The correct approach: pass "skip" directly to _useQuery.

// ── Query Result Types ─────────────────────────────────────────────────────────

export interface QueryResultLoading {
  status: "loading";
  data: undefined;
  error: undefined;
  isError: false;
  isLoading: true;
  isSuccess: false;
}

export interface QueryResultError {
  status: "error";
  data: undefined;
  error: string;
  isError: true;
  isLoading: false;
  isSuccess: false;
}

export interface QueryResultSuccess<T = any> {
  status: "success";
  data: T;
  error: undefined;
  isError: false;
  isLoading: false;
  isSuccess: true;
}

export type QueryResult<T = any> = QueryResultLoading | QueryResultError | QueryResultSuccess<T>;

// ── Timeout Hook ───────────────────────────────────────────────────────────────

/**
 * Hook that tracks whether a query has been loading for longer than the timeout.
 * Returns true once the timeout is exceeded. This is a LAST RESORT — the primary
 * fix is that queries skip when not authenticated, so they never hang.
 *
 * Only useful for authenticated users whose queries genuinely take too long.
 */
export function useQueryTimeout(isLoading: boolean, timeoutMs = 8000): boolean {
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      setTimedOut(false);
      timerRef.current = setTimeout(() => {
        setTimedOut(true);
      }, timeoutMs);
    } else {
      setTimedOut(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading, timeoutMs]);

  return timedOut;
}

// ── Connection State Hook ──────────────────────────────────────────────────────

/**
 * useConvexConnectionState — determines whether Convex is actually reachable.
 *
 * Returns:
 *   - isAuthenticated: whether the user is logged in
 *   - isDisconnected: true when NOT authenticated (queries should be skipped)
 *   - isLoading: auth is still being determined
 *
 * This is the KEY hook that eliminates infinite spinners. When isDisconnected is true,
 * queries return undefined immediately and pages should show demo/mock data.
 */
export function useConvexConnectionState() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return {
    /** True if the user has an active Convex auth session */
    isAuthenticated,
    /** True while auth state is being determined */
    isLoading,
    /** True when the user is NOT authenticated — queries will skip, show demo data */
    isDisconnected: !isLoading && !isAuthenticated,
  };
}

// ── Safe useQuery (connection-aware, backward compatible) ──────────────────────

/**
 * Safe useQuery — connection-aware query that SKIPS when not authenticated.
 *
 * ROOT FIX: When the user is not authenticated, queries are automatically skipped.
 * This means useQuery returns `undefined` immediately instead of waiting for a
 * backend response that will never come.
 *
 * Pages should use useConvexConnectionState() to determine whether to show:
 *   - isDisconnected + data === undefined → demo/mock data
 *   - isAuthenticated + data === undefined → loading skeleton
 *   - data !== undefined → real data
 *
 * Supports Convex's "skip" mechanism: pass `"skip"` as either the query or args to skip
 * the subscription entirely.
 */
export function useQuery(query: any, args: any): any {
  const loggedRef = useRef(false);
  const errorLoggedRef = useRef(false);

  // ROOT FIX: Check auth state to decide whether to skip the query
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  // Skip the query if: explicitly skipped, query is null, OR user is not authenticated
  const explicitSkip = query === "skip" || query === null || query === undefined || args === "skip";
  const shouldSkip = explicitSkip || (!authLoading && !isAuthenticated);

  // KEY INSIGHT: Convex's useQuery skips the subscription when args is "skip".
  // The query reference must always be a valid FunctionReference.
  // When we need to skip but have no valid query, use a known-good sentinel query.
  const sentinelQuery = api.waitlist.getWaitlistCount;
  const effectiveQuery = (query && query !== "skip") ? query : sentinelQuery;
  const effectiveArgs = shouldSkip ? "skip" : args;

  try {
    // @ts-ignore - dynamic query reference
    const result = _useQuery(effectiveQuery, effectiveArgs);

    // Convex useQuery can return an error object
    if (result instanceof Error) {
      if (!errorLoggedRef.current) {
        const queryName = typeof query === "string" ? query : query?.name ?? "unknown";
        console.warn("[safe-convex-react] useQuery returned error:", result.message);
        reportQueryError(queryName, result.message, typeof args === "object" ? args : undefined);
        errorLoggedRef.current = true;
      }
      return undefined;
    }

    // Reset error log flag on successful resolution
    if (errorLoggedRef.current) {
      errorLoggedRef.current = false;
    }

    if (loggedRef.current) {
      loggedRef.current = false;
    }

    return result;
  } catch (err: any) {
    if (!loggedRef.current) {
      const queryName = typeof query === "string" ? query : query?.name ?? "unknown";
      console.warn("[safe-convex-react] useQuery threw:", err?.message || err);
      reportQueryError(queryName, err?.message || String(err));
      loggedRef.current = true;
    }
    return undefined;
  }
}

// ── Safe useQueryResult (typed result with loading/error/success) ───────────────

/**
 * Enhanced useQuery that returns a typed QueryResult object, making it easy
 * to distinguish between loading, error, and success states.
 *
 * Also connection-aware — skips queries when not authenticated.
 */
export function useQueryResult(query: any, args: any): QueryResult {
  const errorRef = useRef<string | undefined>(undefined);

  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const explicitSkip = query === "skip" || query === null || query === undefined || args === "skip";
  const shouldSkip = explicitSkip || (!authLoading && !isAuthenticated);

  // Same pattern as useQuery: keep valid query ref, skip via args
  const sentinelQuery = api.waitlist.getWaitlistCount;
  const effectiveQuery = (query && query !== "skip") ? query : sentinelQuery;
  const effectiveArgs = shouldSkip ? "skip" : args;

  try {
    // @ts-ignore
    const result = _useQuery(effectiveQuery, effectiveArgs);

    // Still loading (Convex returns undefined while loading)
    if (result === undefined) {
      // If we previously had an error, keep showing error (not loading)
      if (errorRef.current) {
        return { status: "error", data: undefined, error: errorRef.current, isError: true, isLoading: false, isSuccess: false };
      }
      // If disconnected (not authenticated), this is NOT loading — it's "no data"
      // Return as loading for backward compatibility, but pages can check isDisconnected
      return { status: "loading", data: undefined, error: undefined, isError: false, isLoading: true, isSuccess: false };
    }

    // Convex returned an error object
    if (result instanceof Error) {
      errorRef.current = result.message;
      const queryName = typeof query === "string" ? query : query?.name ?? "unknown";
      reportQueryError(queryName, result.message);
      return { status: "error", data: undefined, error: result.message, isError: true, isLoading: false, isSuccess: false };
    }

    // Success
    errorRef.current = undefined;
    return { status: "success", data: result, error: undefined, isError: false, isLoading: false, isSuccess: true };
  } catch (err: any) {
    errorRef.current = err?.message || String(err);
    const queryName = typeof query === "string" ? query : query?.name ?? "unknown";
    reportQueryError(queryName, errorRef.current);
    return { status: "error", data: undefined, error: errorRef.current, isError: true, isLoading: false, isSuccess: false };
  }
}

// ── Safe useMutation ────────────────────────────────────────────────────────────

/**
 * Safe useMutation — returns a wrapped mutation function.
 *
 * - If the mutation reference is null/undefined, returns a no-op that logs a warning.
 * - Execution errors are RE-THROWN so callers' try/catch blocks work properly.
 * - Always calls _useMutation with a valid reference to maintain consistent hook ordering.
 *   For null mutations, we use api.waitlist.addToWaitlist as a stable sentinel (it exists
 *   in every deployment), then wrap the result to no-op. This avoids the DUMMY_MUTATION
 *   issue where fake API paths caused validation errors.
 */
export function useMutation(mutation: any): any {
  const isNull = mutation === null || mutation === undefined;

  // Always call _useMutation with a REAL reference to maintain hook ordering.
  // When the mutation is null, use a stable known-good reference, then wrap to no-op.
  const effectiveMutation = isNull ? api.waitlist.addToWaitlist : mutation;

  try {
    // @ts-ignore - dynamic mutation reference
    const originalMutation = _useMutation(effectiveMutation);

    const safeMutation = useCallback(
      async (args: any) => {
        if (isNull) {
          console.warn("[safe-convex-react] mutation not available (null/undefined ref, no-op)");
          return undefined;
        }
        try {
          return await originalMutation(args);
        } catch (err: any) {
          console.warn("[safe-convex-react] useMutation error:", err?.message || err);
          throw err;
        }
      },
      [originalMutation, isNull]
    );

    return safeMutation;
  } catch (err: any) {
    console.warn("[safe-convex-react] useMutation init error:", err?.message || err);
    return useCallback(async (_args: any) => {
      console.warn("[safe-convex-react] mutation not available (no-op)");
      return undefined;
    }, []);
  }
}

// ── Safe useAction ──────────────────────────────────────────────────────────────

/**
 * Safe useAction — same pattern as useMutation for Convex actions.
 */
export function useAction(action: any): any {
  try {
    // @ts-ignore - dynamic action reference
    const originalAction = _useAction(action);

    const safeAction = useCallback(
      async (args: any) => {
        try {
          return await originalAction(args);
        } catch (err: any) {
          console.warn("[safe-convex-react] useAction error:", err?.message || err);
          throw err;
        }
      },
      [originalAction]
    );

    return safeAction;
  } catch (err: any) {
    console.warn("[safe-convex-react] useAction init error:", err?.message || err);
    return useCallback(async (_args: any) => {
      console.warn("[safe-convex-react] action not available (no-op)");
      return undefined;
    }, []);
  }
}
