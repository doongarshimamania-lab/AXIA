import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery_experimental } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState, useCallback } from "react";

/**
 * useAuth — central auth hook.
 *
 * CRITICAL FIX (2026-06-22 AUTH-FIX-4): hook is read-only re: workspace seeding.
 * FIX (2026-06-25 SIGNOUT-LEAK): `signOut` now wipes axia_* localStorage keys
 * and forces a full reload, so the next user starts from a clean slate
 * (no stale workspace ID, no orphan onboarding blob, no SPA state held over).
 */
const AXIA_LS_KEYS = [
  "axia_active_workspace",
  "axia_account_mode",
  "axia_subscription_tier",
  "axia_sidebar_state",
  "axia_client_email",
  "onboardingData",
];

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
  const { signIn, signOut: rawSignOut } = useAuthActions();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthLoading]);

  // ponytail: wrap signOut so all axia_* localStorage keys are cleared and
  // the page is reloaded — guarantees the next user starts with no stale
  // SPA state (WorkspaceProvider's seedAttempted ref, in-memory caches, etc.)
  const signOut = useCallback(async () => {
    try {
      await rawSignOut();
    } finally {
      for (const k of AXIA_LS_KEYS) {
        try { localStorage.removeItem(k); } catch {}
      }
      // Hard reload to reset every in-memory ref / provider state.
      if (typeof window !== "undefined") window.location.href = "/";
    }
  }, [rawSignOut]);

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
