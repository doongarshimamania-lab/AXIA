import { useAuth } from "@/hooks/use-auth";
import { Navigate, useLocation } from "react-router";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute wraps dashboard routes that require authentication.
 * If the user is not authenticated, they are redirected to /auth
 * with a redirect parameter back to the original route.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth state is being determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth page if not authenticated, preserving the intended route
  if (!isAuthenticated) {
    const redirectPath = location.pathname + location.search;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  return <>{children}</>;
}
