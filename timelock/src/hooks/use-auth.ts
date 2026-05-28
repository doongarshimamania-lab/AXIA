import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery_experimental } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  // Use useQuery_experimental with throwOnError:false to gracefully handle Convex backend errors
  // When the backend is unavailable, this returns {status:"error"} instead of throwing
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