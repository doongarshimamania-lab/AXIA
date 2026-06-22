import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery_experimental } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";

/**
 * useAuth — central auth hook (READ-ONLY).
 *
 * CRITICAL FIX (2026-06-22 AUTH-FIX-4):
 * Previously this hook auto-fired `seedPersonalWorkspace` on every new
 * login. That duplicated the seeding done by `useWorkspace`, and under
 * OCC isolation the two parallel mutations could BOTH create a personal
 * workspace + 6 default pipeline stages, producing the
 * "multiple pipeline kanban boards" symptom on the Pipeline page.
 *
 * Now this hook is purely READ-ONLY. Workspace seeding is handled
 * exclusively by `useWorkspace` (which waits for `getMyWorkspaces` to
 * confirm before seeding).
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

  useEffect(() => {
    if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthLoading]);

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
