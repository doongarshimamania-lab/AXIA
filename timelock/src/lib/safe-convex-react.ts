/**
 * Safe wrapper around convex/react that prevents query errors from crashing the app.
 *
 * Wraps useQuery and useMutation with error boundaries so that missing API functions
 * (e.g. api.messaging.* or api.workspaces.* not deployed yet) return `undefined` / no-op
 * instead of throwing uncaught runtime errors.
 *
 * Key principle: useQuery returns `undefined` while loading or on error.
 * Pages MUST handle `undefined` results with null coalescing (??) or conditional rendering.
 *
 * IMPORTANT: React hooks rules require that _useQuery and _useMutation are always called
 * in the same order between renders. We use Convex's built-in "skip" mechanism (passing
 * "skip" as the args) to disable queries without violating hooks ordering.
 */

import { useRef, useCallback } from "react";
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

// Re-export non-hook utilities directly from the real convex/react (safe, no error-throwing)
export { ConvexReactClient, ConvexProvider, useConvexAuth, useQuery_experimental };

// A stable dummy query reference used when we want to skip a query.
// anyApi is a Proxy from convex/server that provides valid-looking references
// for any path. Convex's useQuery won't crash with these refs + "skip" args.
const DUMMY_QUERY = (anyApi as any)._skip_placeholder;

/**
 * Safe useQuery — returns `undefined` when the query throws (e.g. function not found on backend)
 * instead of crashing the React tree. Pages should treat `undefined` as "loading / unavailable".
 *
 * Supports Convex's "skip" mechanism: pass `"skip"` as either the query or args to skip
 * the subscription entirely. This is safer than passing undefined/null query references.
 */
export function useQuery(query: any, args: any): any {
  const loggedRef = useRef(false);

  // Normalize: if query or args is "skip", null, or undefined, use a dummy query reference
  // and pass "skip" as args so Convex doesn't actually subscribe.
  // This ensures _useQuery is ALWAYS called (maintaining React hooks order)
  // but no server request is made when we want to skip.
  const shouldSkip = query === "skip" || query === null || query === undefined || args === "skip";
  const effectiveQuery = shouldSkip ? DUMMY_QUERY : query;
  const effectiveArgs = shouldSkip ? "skip" : args;

  try {
    // @ts-ignore - dynamic query reference
    const result = _useQuery(effectiveQuery, effectiveArgs);

    // Convex useQuery can return an error object
    if (result instanceof Error) {
      if (!loggedRef.current) {
        console.warn("[safe-convex-react] useQuery returned error:", result.message);
        loggedRef.current = true;
      }
      return undefined;
    }

    if (loggedRef.current) {
      loggedRef.current = false;
    }

    return result;
  } catch (err: any) {
    if (!loggedRef.current) {
      console.warn("[safe-convex-react] useQuery threw:", err?.message || err);
      loggedRef.current = true;
    }
    return undefined;
  }
}

/**
 * Safe useMutation — returns a wrapped mutation function.
 *
 * - If the mutation reference is null/undefined, returns a no-op that logs a warning.
 * - If the mutation reference is valid, wraps it so that:
 *   - Initialization errors (bad reference) are caught and a no-op is returned
 *   - Execution errors are RE-THROWN so callers' try/catch blocks work properly.
 *     The wrapper logs the error first, then re-throws — this gives us console
 *     visibility while still letting pages show proper toast.error() feedback.
 */
export function useMutation(mutation: any): any {
  // If the mutation reference is null/undefined, return a no-op function.
  // We do NOT call _useMutation with null — that would crash Convex internals.
  // Since mutation refs are typically static (not changing between renders),
  // this does not violate React hooks ordering rules in practice.
  if (mutation === null || mutation === undefined) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useCallback(async (_args: any) => {
      console.warn("[safe-convex-react] mutation not available (null/undefined ref, no-op)");
      return undefined;
    }, []);
  }

  try {
    // @ts-ignore - dynamic mutation reference
    const originalMutation = _useMutation(mutation);

    const safeMutation = useCallback(
      async (args: any) => {
        try {
          return await originalMutation(args);
        } catch (err: any) {
          // Log for debugging, then RE-THROW so callers can handle it
          console.warn("[safe-convex-react] useMutation error:", err?.message || err);
          throw err;
        }
      },
      [originalMutation]
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
