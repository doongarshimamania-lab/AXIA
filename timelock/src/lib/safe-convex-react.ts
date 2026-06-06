/**
 * Safe wrapper around convex/react that prevents query errors from crashing the app.
 *
 * Re-exports everything from convex/react. Use this instead of importing from "convex/react"
 * to ensure consistent error handling across all pages.
 *
 * All pages should import from here: import { useQuery, useMutation } from "@/lib/safe-convex-react";
 *
 * Key principle: useQuery returns `undefined` while loading or on error.
 * Pages MUST handle `undefined` results with null coalescing (??) or conditional rendering.
 */

export { useQuery, useMutation, useAction, useConvex, ConvexReactClient, ConvexProvider, usePaginatedQuery, useSubscription } from "convex/react";
export type { FunctionReference, FunctionArgs, FunctionReturnType, PaginationOptions, PaginationResult } from "convex/react";
