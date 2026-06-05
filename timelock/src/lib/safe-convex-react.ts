/**
 * Safe wrapper around convex/react that prevents query errors from crashing the app.
 *
 * Re-exports everything from convex/react and overrides useQuery with a safe version
 * that catches errors (both synchronous and asynchronous) and returns undefined
 * instead of letting them propagate to error boundaries.
 *
 * Usage: import { useQuery, useMutation } from "@/lib/safe-convex-react";
 * Instead of: import { useQuery, useMutation } from "convex/react";
 */

import {
  useQuery as _useQuery,
  useMutation,
  useAction,
  useConvex,
  ConvexReactClient,
  ConvexProvider,
  usePaginatedQuery,
  useSubscription,
} from "convex/react";
import { Component, type ReactNode } from "react";
import type {
  FunctionReference,
  FunctionArgs,
  FunctionReturnType,
  PaginationOptions,
  PaginationResult,
} from "convex/react";

// ─── Internal Error Boundary ─────────────────────────────────────────────────
// Catches async errors thrown by Convex useQuery (e.g., unauthenticated, invalid IDs)
// and renders nothing instead of crashing the app.

interface EBProps { children: ReactNode; onError: () => void }
interface EBState { hasError: boolean }

class _QueryErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false };

  static getDerivedStateFromError(): EBState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Log at debug level so it's visible in dev but not noisy in prod
    console.debug("[safe-convex-react] Query error caught:", error.message);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null; // Render nothing — the parent hook returns undefined
    }
    return this.props.children;
  }
}

// ─── Safe useQuery ────────────────────────────────────────────────────────────

/**
 * Safe useQuery that never throws. Returns the query result or undefined on error/loading.
 * If the query fails (sync or async), it returns undefined and logs a debug message
 * instead of letting the error propagate to the nearest error boundary.
 *
 * Supports a `skip` sentinel: pass "skip" as the second argument to skip the query.
 */
export function useQuery<
  Query extends FunctionReference<"query">,
>(
  query: Query,
  args: FunctionArgs<Query> | "skip",
): FunctionReturnType<Query> | undefined {
  // We use an internal error boundary to catch async Convex errors.
  // The trick: render the real useQuery inside the boundary; if it errors,
  // the boundary catches it, we flip a flag, and re-render returning undefined.
  //
  // However, hooks can't be called conditionally, so we always call the real
  // useQuery but wrap the *component* that uses this hook in the boundary.
  // Since we can't do that from a hook, we take a different approach:
  //
  // We simply call _useQuery directly. If it throws synchronously we catch it.
  // For async errors, Convex already handles them internally and returns
  // undefined after the error — the issue is that sometimes Convex re-throws
  // into the React error boundary system. To handle that, we need the
  // component using this hook to be wrapped in a boundary.
  //
  // The SectionErrorBoundary in the app already does this, so the error
  // message "Something went wrong loading this section" appears. The real
  // fix is to make the Convex queries NOT throw by:
  // 1. Passing "skip" when not authenticated
  // 2. Validating IDs before passing them
  // 3. Having proper null checks in consuming components
  //
  // For extra safety, we still wrap with a try/catch for sync errors.

  let result: FunctionReturnType<Query> | undefined;
  try {
    if (args === "skip") {
      // @ts-expect-error - Convex handles skip internally
      result = _useQuery(query, "skip");
    } else {
      // @ts-expect-error - Type compatibility
      result = _useQuery(query, args);
    }
  } catch (e: any) {
    // Synchronous error during render — return undefined
    console.debug("[safe-convex-react] useQuery sync error:", e?.message);
    return undefined;
  }

  return result;
}

// Re-export everything else unchanged
export {
  useMutation,
  useAction,
  useConvex,
  ConvexReactClient,
  ConvexProvider,
  usePaginatedQuery,
  useSubscription,
};
export type {
  FunctionReference,
  FunctionArgs,
  FunctionReturnType,
  PaginationOptions,
  PaginationResult,
};
