import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery_experimental } from "convex/react";
import { useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState, useRef } from "react";

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

  // Auto-seed user profile on first authentication
  const hasSeeded = useRef(false);
  const seedProfile = useMutation(api.seed.seedDevProfile);

  useEffect(() => {
    if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthLoading]);

  // When user authenticates for the first time, auto-seed their profile
  useEffect(() => {
    if (isAuthenticated && user && !user.onboardingComplete && !hasSeeded.current) {
      hasSeeded.current = true;
      seedProfile({}).catch((err) => {
        console.warn("Auto-seed failed:", err);
      });
    }
  }, [isAuthenticated, user, seedProfile]);

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
