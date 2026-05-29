/**
 * Safe wrapper around convex/react that prevents query errors from crashing the app.
 *
 * When the Convex backend is unavailable or returns server errors, the standard
 * useQuery hook throws an error that crashes the React tree. This module re-exports
 * everything from the real convex/react but replaces useQuery with a safe version
 * that returns undefined instead of throwing.
 */

// Re-export everything from the original convex/react module
// Using "original-convex-react" alias to avoid circular dependency
export * from "original-convex-react";

// Import useQuery_experimental from the original module to build our safe useQuery
import { useQuery_experimental } from "original-convex-react";

// Override useQuery: re-exporting with the same name from `export *` would conflict,
// so we need to NOT export useQuery from the wildcard and instead export our own.
// However, `export *` already includes useQuery. We need to override it.
// In TypeScript/ESM, a named export takes precedence over a re-export from `export *`.

/**
 * Safe version of useQuery that returns undefined on error instead of throwing.
 * This prevents the entire React tree from crashing when the Convex backend
 * is unavailable or returns server errors.
 */
export function useQuery(
  query: any,
  ...args: any[]
) {
  const skip = args[0] === "skip";
  const queryArgs = skip ? {} : (args[0] ?? {});

  const result = useQuery_experimental({
    query,
    args: queryArgs,
    throwOnError: false,
  });

  if (result.status === "success") {
    return result.value;
  }
  if (result.status === "error") {
    // Silently return undefined - don't log repeatedly as it causes performance issues
    // and flickering. The error is expected when the backend is unavailable.
    return undefined;
  }
  // status === "pending"
  return undefined;
}
