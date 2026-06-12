/**
 * PageLayout — Centralized layout wrapper for all sidebar pages
 *
 * Replaces hardcoded `px-6 py-6 max-w-XXX` patterns across pages.
 * Automatically fills the available space between sidebar and right edge,
 * eliminating gaps when the sidebar collapses or expands.
 *
 * Usage:
 *   <PageLayout>           → full-width with standard padding
 *   <PageLayout spaced>    → adds space-y-6 between children
 *   <PageLayout narrow>    → max-w-5xl centered (for forms/settings)
 *   <PageLayout wide>      → max-w-7xl centered (for data-heavy pages)
 */

import { cn } from "@/lib/utils";

export interface PageLayoutProps {
  children: React.ReactNode;
  /** Add space-y-6 between direct children */
  spaced?: boolean;
  /** Constrain to max-w-5xl (narrow pages like settings, builders) */
  narrow?: boolean;
  /** Constrain to max-w-7xl (data-heavy pages like proposals, payment patterns) */
  wide?: boolean;
  /** Custom max-width class, e.g. "max-w-[1400px]" */
  maxWidth?: string;
  /** Additional class names */
  className?: string;
}

export function PageLayout({
  children,
  spaced = false,
  narrow = false,
  wide = false,
  maxWidth,
  className,
}: PageLayoutProps) {
  // Determine max-width class
  const maxWClass = maxWidth
    ?? (narrow ? "max-w-5xl" : wide ? "max-w-7xl" : undefined);

  return (
    <div
      className={cn(
        "px-6 py-6",
        spaced && "space-y-6",
        maxWClass,
        className,
      )}
    >
      {children}
    </div>
  );
}
