import { useAuth } from "@/hooks/use-auth";
import { Navigate, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { trackPageView, setUser, clearUser, AnalyticsEvents, trackEvent } from "@/lib/monitoring";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute wraps dashboard routes that require authentication.
 * If the user is not authenticated, they are redirected to /auth
 * with a redirect parameter back to the original route.
 * Also handles analytics tracking for page views and user identity.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const lastPathRef = useRef("");

  // Track page views and user identity
  useEffect(() => {
    if (isAuthenticated && user) {
      setUser({
        id: user._id || "unknown",
        email: user.email,
        name: user.name,
        tier: (user as any).subscriptionTier,
      });
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearUser();
    }
  }, [isAuthenticated]);

  // Track page views on route changes
  useEffect(() => {
    if (isAuthenticated && location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname;
      trackPageView(location.pathname);
      trackEvent(AnalyticsEvents.PAGE_VIEW, {
        path: location.pathname,
        search: location.search,
      });
    }
  }, [location.pathname, location.search, isAuthenticated]);

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

  // Onboarding gate: if the user is authenticated but hasn't completed
  // onboarding yet, redirect them to the first onboarding step.
  // Skip this redirect for:
  //   - The onboarding routes themselves (so the user can actually complete them)
  //   - The auth route (handled separately)
  //   - When user data is still loading (user === undefined)
  const isOnboardingRoute =
    location.pathname === "/onboarding-user-information" ||
    location.pathname === "/onboarding-source";
  if (user && !user.onboardingComplete && !isOnboardingRoute) {
    return <Navigate to="/onboarding-user-information" replace />;
  }

  return <>{children}</>;
}
