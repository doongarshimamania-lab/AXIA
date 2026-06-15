import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Standardized empty state component.
 * Replaces the 5+ different implementations found across pages.
 * Centered layout with muted icon, title in text-h3, description in text-body-sm
 * with muted-foreground, primary action button in teal, secondary as outline/ghost.
 */
export interface EmptyStateProps {
  /** Icon element (typically a Lucide icon) */
  icon?: ReactNode;
  /** Title text, e.g. "No Projects Yet" */
  title: string;
  /** Benefit-oriented description message */
  description?: string;
  /** Primary CTA action */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary CTA action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional className */
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {/* Muted icon circle */}
      {icon && (
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-muted-foreground [&_svg]:h-6 [&_svg]:w-6">
            {icon}
          </span>
        </div>
      )}

      {/* Title */}
      <h3 className="text-h3 text-foreground mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-body-sm text-muted-foreground max-w-[360px] mb-6">
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
