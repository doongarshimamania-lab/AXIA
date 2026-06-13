/**
 * PageLayout — Centralized layout wrapper for all sidebar pages
 *
 * Replaces hardcoded `px-6 py-6 max-w-XXX` patterns across pages.
 * Content fills the full available space between sidebar and right edge,
 * eliminating gaps when the sidebar collapses or expands.
 *
 * Usage:
 *   <PageLayout>           → full-width with standard padding
 *   <PageLayout spaced>    → adds space-y-6 between children
 *   <PageLayout narrow>    → slightly narrower (for forms/settings)
 *   <PageLayout wide>      → full-width (same as default, kept for compat)
 */

import { cn } from "@/lib/utils";

export interface PageLayoutProps {
  children: React.ReactNode;
  /** Add space-y-6 between direct children */
  spaced?: boolean;
  /** Slightly narrower for forms/settings pages */
  narrow?: boolean;
  /** Full-width (kept for backward compatibility, same as default) */
  wide?: boolean;
  /** Custom max-width class — DEPRECATED, no longer applies max-width */
  maxWidth?: string;
  /** Additional class names */
  className?: string;
  /** Hide the notification bell (for pages that have their own) */
  hideNotification?: boolean;
}

export function PageLayout({
  children,
  spaced = false,
  narrow = false,
  wide = false,
  maxWidth,
  className,
  hideNotification = false,
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        "px-6 py-6 w-full",
        spaced && "space-y-6",
        // No max-width constraints — content fills full available space
        // This prevents right-side gaps when sidebar collapses
        className,
      )}
    >
      {children}
    </div>
  );
}
