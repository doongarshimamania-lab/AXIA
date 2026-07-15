/**
 * Safe wrapper around convex/react that prevents query errors from crashing the app.
 *
 * Wraps useQuery and useMutation with error boundaries so that missing API functions
 * (e.g. api.messaging.* or api.workspaces.* not deployed yet) return safe defaults
 * instead of throwing uncaught runtime errors.
 *
 * KEY DESIGN DECISION:
 * useQuery now returns a QueryResult object that distinguishes between loading,
 * error, and success states. This solves the critical bug where errors were
 * indistinguishable from loading (both returned undefined).
 *
 * For backward compatibility, useQuery STILL returns the raw data when successful,
 * and undefined when loading. Pages can opt into the full QueryResult by using
 * useQueryResult() instead.
 *
 * IMPORTANT: React hooks rules require that _useQuery and _useMutation are always called
 * in the same order between renders. We use Convex's built-in "skip" mechanism (passing
 * "skip" as the args) to disable queries without violating hooks ordering.
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
import { reportQueryError } from "@/lib/monitoring";

// Re-export non-hook utilities directly from the real convex/react (safe, no error-throwing)
export { ConvexReactClient, ConvexProvider, useConvexAuth, useQuery_experimental };

// A stable dummy query reference used when we want to skip a query.
const DUMMY_QUERY = (anyApi as any)._skip_placeholder;

// A stable dummy mutation reference — always call _useMutation with this
// when the real mutation is null, to maintain consistent hook ordering.
// The result is never actually invoked (gated by isNull check).
const DUMMY_MUTATION = (anyApi as any)._system?.__dummyMutation;

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
 * Returns true once the timeout is exceeded, helping pages show error states
 * instead of infinite spinners.
 */
export function useQueryTimeout(isLoading: boolean, timeoutMs = 5000): boolean {
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

// ── Safe useQuery (backward compatible) ─────────────────────────────────────────

/**
 * Safe useQuery — returns `undefined` while loading, the data on success,
 * or `undefined` on error (but also calls reportQueryError for monitoring).
 *
 * For pages that need to distinguish between loading and error states,
 * use useQueryResult() instead.
 *
 * Supports Convex's "skip" mechanism: pass `"skip"` as either the query or args to skip
 * the subscription entirely.
 */
export function useQuery(query: any, args: any): any {
  const loggedRef = useRef(false);
  const errorLoggedRef = useRef(false);

  const shouldSkip = query === "skip" || query === null || query === undefined || args === "skip";
  const effectiveQuery = shouldSkip ? DUMMY_QUERY : query;
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
 * Usage:
 *   const result = useQueryResult(api.clients.getClients, {});
 *   if (result.isLoading) return <Skeleton />;
 *   if (result.isError) return <ErrorState error={result.error} />;
 *   const clients = result.data;
 */
export function useQueryResult(query: any, args: any): QueryResult {
  const errorRef = useRef<string | undefined>(undefined);

  const shouldSkip = query === "skip" || query === null || query === undefined || args === "skip";
  const effectiveQuery = shouldSkip ? DUMMY_QUERY : query;
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
 *
 * IMPORTANT: We always call _useMutation to maintain consistent hook ordering.
 * When mutation is null, we use a no-op wrapper. This avoids conditional hook calls
 * which violate the Rules of Hooks.
 */
export function useMutation(mutation: any): any {
  const isNull = mutation === null || mutation === undefined;

  // Always call _useMutation with a valid reference to maintain consistent hook ordering.
  // When mutation is null, we use DUMMY_MUTATION (a stable proxy object from anyApi)
  // so the hook is always called. Execution is gated by the isNull flag.
  const effectiveMutation = isNull ? DUMMY_MUTATION : mutation;

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
    // Fallback: return a no-op. This should rarely happen since we always
    // provide a valid-looking reference to _useMutation.
    return useCallback(async (_args: any) => {
      console.warn("[safe-convex-react] mutation not available (no-op)");
      return undefined;
    }, []);
  }
}

// ── Safe useAction ──────────────────────────────────────────────────────────────

/**
 * Safe useAction — same pattern as useMutation for Convex actions.
 * Execution errors are re-thrown so callers can handle them.
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
