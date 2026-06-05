/**
 * Safe wrapper around convex/react that prevents query errors from crashing the app.
 *
 * Re-exports everything from convex/react and overrides useQuery with a safe version
 * that catches errors and returns undefined instead of throwing.
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
import { useState, useEffect, useCallback, useRef } from "react";
import type {
  FunctionReference,
  FunctionArgs,
  FunctionReturnType,
  PaginationOptions,
  PaginationResult,
} from "convex/react";

/**
 * Safe useQuery that never throws. Returns the query result or undefined on error/loading.
 * If the query fails, it returns undefined and logs a warning instead of crashing the app.
 * It also supports a `skip` sentinel: pass "skip" as the second argument to skip the query.
 */
export function useQuery<
  Query extends FunctionReference<"query">,
>(
  query: Query,
  args: FunctionArgs<Query> | "skip",
): FunctionReturnType<Query> | undefined {
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Use the real useQuery but catch any errors
  let result: FunctionReturnType<Query> | undefined;
  try {
    // Handle "skip" sentinel — pass dummy args but the query won't fire
    if (args === "skip") {
      // @ts-expect-error - Convex handles skip internally
      result = _useQuery(query, "skip");
    } else {
      // @ts-expect-error - Type compatibility
      result = _useQuery(query, args);
    }
  } catch (e: any) {
    // If useQuery throws during render, catch it and return undefined
    console.warn("[safe-convex-react] useQuery threw during render:", e?.message);
    return undefined;
  }

  // Reset error state when query succeeds
  useEffect(() => {
    if (result !== undefined && error) {
      setError(null);
    }
  }, [result, error]);

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
