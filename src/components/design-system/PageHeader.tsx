import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/NotificationCenter";

/**
 * Standardized page header component.
 * Unifies the various heading levels (H1, H2, H3) found across pages.
 * Title uses text-h1 class (30px/bold), description uses text-body-sm with muted-foreground.
 * Layout: flex row with title left, actions right.
 *
 * SECURITY/UX: The NotificationCenter (bell icon) is integrated directly into
 * each page header on the same line as the title — NOT in a separate top bar.
 */
export interface PageHeaderProps {
  /** Page title text */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Optional icon displayed next to the title */
  icon?: ReactNode;
  /** Optional button row on the right side */
  actions?: ReactNode;
  /** Additional className */
  className?: string;
  /** Whether to show the notification bell (default: true for dashboard pages) */
  showNotifications?: boolean;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
  showNotifications = true,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: icon + title + description */}
        <div className="flex items-start gap-3">
          {icon && (
            <div className="mt-1 text-primary [&_svg]:h-6 [&_svg]:w-6 flex-shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-h1 text-foreground tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-body-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: notification bell + action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showNotifications && <NotificationCenter />}
          {actions}
        </div>
      </div>
    </div>
  );
}
