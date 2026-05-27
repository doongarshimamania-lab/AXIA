import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  // Use type assertion to avoid deep type instantiation
  // @ts-ignore - Convex type inference causes deep instantiation error
  const user = (useQuery(api.users.currentUser) ?? null) as any;
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