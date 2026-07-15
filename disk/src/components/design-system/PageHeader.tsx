import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standardized page header component.
 * Unifies the various heading levels (H1, H2, H3) found across pages.
 * Title uses text-h1 class (30px/bold), description uses text-body-sm with muted-foreground.
 * Layout: flex row with title left, actions right.
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
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
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

        {/* Right: action buttons */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
