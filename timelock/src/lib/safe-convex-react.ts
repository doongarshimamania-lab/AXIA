/**
 * Safe wrapper around convex/react that prevents query errors from crashing the app.
 *
 * Wraps useQuery and useMutation with error boundaries so that missing API functions
 * (e.g. api.messaging.* or api.workspaces.* not deployed yet) return `undefined` / no-op
 * instead of throwing uncaught runtime errors.
 *
 * Key principle: useQuery returns `undefined` while loading or on error.
 * Pages MUST handle `undefined` results with null coalescing (??) or conditional rendering.
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

// Re-export non-hook utilities directly from the real convex/react (safe, no error-throwing)
export { ConvexReactClient, ConvexProvider, useConvexAuth, useQuery_experimental };

/**
 * Safe useQuery — returns `undefined` when the query throws (e.g. function not found on backend)
 * instead of crashing the React tree. Pages should treat `undefined` as "loading / unavailable".
 */
export function useQuery(query: any, args: any): any {
  const loggedRef = useRef(false);

  try {
    // @ts-ignore - dynamic query reference
    const result = _useQuery(query, args);

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
 * Safe useMutation — returns a wrapped mutation function that catches errors
 * instead of letting them propagate as uncaught promise rejections.
 */
export function useMutation(mutation: any): any {
  try {
    // @ts-ignore - dynamic mutation reference
    const originalMutation = _useMutation(mutation);

    const safeMutation = useCallback(
      async (args: any) => {
        try {
          return await originalMutation(args);
        } catch (err: any) {
          console.warn("[safe-convex-react] useMutation error:", err?.message || err);
          return undefined;
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
          return undefined;
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
