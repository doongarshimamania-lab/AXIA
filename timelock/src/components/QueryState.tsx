/**
 * Reusable page-level loading, error, and empty state wrappers.
 *
 * ROOT ARCHITECTURE FIX: Pages never show "Loading Timed Out" error cards.
 * Instead, when data isn't available (either because Convex is disconnected
 * or because queries timed out), the page content renders immediately with
 * whatever data is available — empty states, demo data, or partial data.
 *
 * Key principles:
 * 1. Not authenticated = queries skip = data is undefined immediately = show content NOW
 * 2. Authenticated but slow = brief skeleton (3s max), then show content anyway
 * 3. Explicit errors = show inline error (not a blocking dialog)
 * 4. Pages are ALWAYS functional — no infinite spinners or blocking error cards
 */

import { ReactNode } from "react";
import { AlertTriangle, RefreshCw, Inbox, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConvexConnectionState, useQueryTimeout } from "@/lib/safe-convex-react";
import { trackEvent, AnalyticsEvents } from "@/lib/monitoring";

// ── Page Loader ─────────────────────────────────────────────────────────────────

interface PageLoaderProps {
  /** Is the page currently loading? */
  isLoading: boolean;
  /** Error message to display */
  error?: string | null;
  /** Does the data exist? (for empty state) */
  hasData?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Custom empty state icon */
  emptyIcon?: ReactNode;
  /** Timeout in ms before giving up on loading (default: 3000) */
  timeoutMs?: number;
  /** Page name for analytics tracking */
  pageName?: string;
  /** Content to render when loaded (or when we give up waiting) */
  children: ReactNode;
  /** Custom loading skeleton (defaults to standard 3-bar skeleton) */
  loadingSkeleton?: ReactNode;
  /** Callback when user clicks retry */
  onRetry?: () => void;
}

export function PageLoader({
  isLoading,
  error,
  hasData = true,
  emptyMessage = "No data found",
  emptyIcon,
  timeoutMs = 3000,
  pageName,
  children,
  loadingSkeleton,
  onRetry,
}: PageLoaderProps) {
  const { isDisconnected } = useConvexConnectionState();

  // Safety net timeout for authenticated users with slow/unavailable backend
  // After this timeout, we stop showing the skeleton and render content anyway
  const timedOut = useQueryTimeout(isLoading, timeoutMs);

  // ── Not authenticated → skip loading entirely, show content immediately ──
  // When disconnected, queries return undefined immediately (skipped).
  // The page content should handle undefined data with demo/empty states.
  if (isDisconnected) {
    return <>{children}</>;
  }

  // ── Authenticated but timed out → show content anyway ──
  // Instead of a blocking error card, render the page content.
  // The page itself handles undefined data with empty/demo states.
  if (isLoading && timedOut) {
    // Track the timeout for monitoring
    if (pageName) {
      trackEvent(AnalyticsEvents.PAGE_LOAD_TIMEOUT, {
        pageName,
        action: "fallback_to_content",
      });
    }

    // Show a subtle offline indicator + the page content
    return (
      <>
        <OfflineIndicator onRetry={onRetry} />
        {children}
      </>
    );
  }

  // ── Explicit error → show inline error, not blocking ──
  if (error) {
    return (
      <QueryErrorState
        message={error}
        onRetry={onRetry}
        pageName={pageName}
      />
    );
  }

  // ── Still loading (authenticated, within timeout) → show skeleton ──
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

  // ── Loaded but no data → show empty state ──
  if (!hasData) {
    return (
      <EmptyState
        message={emptyMessage}
        icon={emptyIcon}
      />
    );
  }

  // ── Data loaded successfully → show content ──
  return <>{children}</>;
}

// ── Offline Indicator (non-blocking) ──────────────────────────────────────────

/**
 * A subtle banner shown at the top of the page when queries time out,
 * indicating that data may be stale or unavailable. Non-blocking — the
 * page content is still visible below.
 */
function OfflineIndicator({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-300 text-sm">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>Connection slow or unavailable. Showing cached data.</span>
      <button
        onClick={onRetry || (() => window.location.reload())}
        className="ml-auto flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 font-medium underline underline-offset-2"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
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
