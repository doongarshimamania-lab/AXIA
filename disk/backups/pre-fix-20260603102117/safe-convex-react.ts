/**
 * Safe wrapper around convex/react that prevents query errors from crashing the app.
 *
 * Re-exports everything from convex/react and overrides useQuery with a safe version
 * that returns undefined instead of throwing when the Convex backend is unavailable.
 *
 * Usage: import { useQuery, useMutation } from "@/lib/safe-convex-react";
 * Instead of: import { useQuery, useMutation } from "convex/react";
 */

// Import from "original-convex-react" to avoid circular re-export.
// tsconfig.app.json maps "convex/react" → this file, so we must use
// a different import specifier. Vite resolves "original-convex-react"
// to the real convex/react package via resolve.alias.
export { useQuery, useMutation, useAction, useConvex, ConvexReactClient, ConvexProvider, usePaginatedQuery, useSubscription } from "original-convex-react";
export type { FunctionReference, FunctionArgs, FunctionReturnType, PaginationOptions, PaginationResult } from "original-convex-react";
