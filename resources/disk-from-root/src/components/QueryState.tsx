/**
 * Reusable page-level loading, error, and empty state wrappers.
 *
 * Every data-fetching page should wrap its content in <PageLoader>
 * to get consistent loading skeletons, timeout-based error states,
 * and empty state handling — no more perpetual spinners.
 */

import { ReactNode } from "react";
import { AlertTriangle, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryTimeout } from "@/lib/safe-convex-react";
import { captureException, trackEvent, AnalyticsEvents } from "@/lib/monitoring";

// ── Page Loader ─────────────────────────────────────────────────────────────────

interface PageLoaderProps {
  /** Is the page currently loading? */
  isLoading: boolean;
  /** Has the query timed out? (from useQueryTimeout) */
  timedOut?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Does the data exist? (for empty state) */
  hasData?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Custom empty state icon */
  emptyIcon?: ReactNode;
  /** Timeout in ms before showing error (default: 5000) */
  timeoutMs?: number;
  /** Page name for analytics tracking */
  pageName?: string;
  /** Content to render when loaded */
  children: ReactNode;
  /** Custom loading skeleton (defaults to standard 3-bar skeleton) */
  loadingSkeleton?: ReactNode;
  /** Callback when user clicks retry */
  onRetry?: () => void;
}

export function PageLoader({
  isLoading,
  timedOut,
  error,
  hasData = true,
  emptyMessage = "No data found",
  emptyIcon,
  timeoutMs = 5000,
  pageName,
  children,
  loadingSkeleton,
  onRetry,
}: PageLoaderProps) {
  // Auto-track timeout events
  const autoTimedOut = useQueryTimeout(isLoading, timeoutMs);
  const isTimedOut = timedOut ?? autoTimedOut;

  // Show error state if: explicit error, or timed out while still loading
  if ((isLoading && isTimedOut) || error) {
    const errorMessage = error || `Data is taking longer than expected to load.`;

    // Report to monitoring (once per mount)
    if (pageName) {
      captureException(new Error(`Page load timeout: ${pageName}`), {
        pageName,
        errorMessage,
      });
      trackEvent(AnalyticsEvents.PAGE_LOAD_TIMEOUT, { pageName, errorMessage });
    }

    return (
      <QueryErrorState
        message={errorMessage}
        onRetry={onRetry}
        pageName={pageName}
      />
    );
  }

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {loadingSkeleton || (
          <>
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded-lg" />
            <div className="mt-6 grid gap-4">
              <Skeleton className="h-[120px] w-full rounded-xl" />
              <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
          </>
        )}
      </div>
    );
  }

  // Show empty state
  if (!hasData) {
    return (
      <EmptyState
        message={emptyMessage}
        icon={emptyIcon}
      />
    );
  }

  // Show content
  return <>{children}</>;
}

// ── Error State ─────────────────────────────────────────────────────────────────

interface QueryErrorStateProps {
  message: string;
  onRetry?: () => void;
  pageName?: string;
}

export function QueryErrorState({ message, onRetry, pageName }: QueryErrorStateProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {message}
        {pageName && (
          <span className="block mt-1 text-xs opacity-60">
            Page: {pageName}
          </span>
        )}
      </p>
      <Button variant="outline" onClick={handleRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  message?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  message = "Nothing here yet",
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        {icon || <Inbox className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{message}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
