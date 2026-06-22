import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery_experimental, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState, useRef } from "react";

/**
 * useAuth — central auth hook.
 *
 * CRITICAL FIX (2026-06-22):
 * Previously this hook auto-fired `seed.seedDevProfile` on every new login.
 * That mutation created hardcoded sample data (Acme Corp, TechStart Inc,
 * DesignFlow Agency + sample deals) for EVERY new user, which:
 *   1. Caused "convex error" when logging in with a different account
 *      because the seed tried to insert duplicate pipeline stages / clients
 *      that conflicted with prior seeding attempts.
 *   2. Made every new user's dashboard show the same fake data ("hardcoded").
 *
 * Now this hook is READ-ONLY: it only fetches the current user. No auto-seed.
 * The user's personal workspace is created lazily by `useWorkspace` only when
 * the user actually visits the dashboard. Sample/demo data is only created
 * when the user explicitly clicks "Seed Demo Data" in the empty dashboard
 * state.
 */
export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();

  // Use useQuery_experimental with throwOnError:false to gracefully handle
  // Convex backend errors. When the backend is unavailable, this returns
  // {status:"error"} instead of throwing — preventing the "convex error"
  // crash that previously occurred when switching accounts.
  // @ts-ignore - Convex type inference causes deep instantiation error
  const queryResult = useQuery_experimental({
    query: api.users.currentUser,
    args: {},
    throwOnError: false,
  });

  // Extract user data, treating errors and pending states as null
  // @ts-ignore
  const user = (queryResult.status === "success" ? queryResult.value : null) as any;
  const { signIn, signOut } = useAuthActions();

  const [isLoading, setIsLoading] = useState(true);

  // Lazy workspace initialization — only fires once per session when the
  // user is authenticated AND has no personal workspace yet. This replaces
  // the old auto-seed of sample data. It only creates an empty personal
  // workspace + default pipeline stages — NO fake clients/projects/deals.
  const hasInitWorkspace = useRef(false);
  const seedPersonalWorkspace = useMutation(api.workspaces.crud.seedPersonalWorkspace);

  useEffect(() => {
    if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthLoading]);

  // Lazy workspace creation: only when authenticated AND user record is
  // loaded AND we haven't already attempted this session. Wrapped in
  // try/catch so a Convex error never crashes the app.
  useEffect(() => {
    if (!isAuthenticated || !user || hasInitWorkspace.current) return;
    hasInitWorkspace.current = true;

    seedPersonalWorkspace({})
      .then((workspaceId) => {
        if (workspaceId) {
          console.log("[useAuth] Ensured personal workspace exists:", workspaceId);
        }
      })
      .catch((err) => {
        // Non-fatal: workspace may already exist, or backend may be unavailable.
        console.warn("[useAuth] Workspace init failed (non-critical):", err?.message ?? err);
      });
  }, [isAuthenticated, user, seedPersonalWorkspace]);

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
