import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Standardized status badge component.
 * Unifies status badges across all pages with consistent color mapping.
 * Uses the existing shadcn Badge component as the base.
 *
 * Color mapping:
 *   active/compliant/protected/won → emerald
 *   at-risk/flagged               → amber
 *   rejected/declined/lost        → red
 *   draft                         → muted
 *   sent/lead                     → teal
 *   signed/qualified              → blue
 */

export type StatusBadgeStatus =
  | "active"
  | "at-risk"
  | "rejected"
  | "draft"
  | "sent"
  | "signed"
  | "declined"
  | "compliant"
  | "flagged"
  | "protected"
  | "won"
  | "lost"
  | "lead"
  | "qualified";

export interface StatusBadgeProps {
  /** The status value — maps to a specific color */
  status: StatusBadgeStatus;
  /** Override the display text (defaults to capitalized status) */
  label?: string;
  /** Badge size variant */
  size?: "sm" | "md";
  /** Additional className */
  className?: string;
}

/** Map each status to a Tailwind color class group */
const statusColorMap: Record<
  StatusBadgeStatus,
  { bg: string; text: string; border: string }
> = {
  // Emerald group
  active: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/25",
  },
  compliant: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/25",
  },
  protected: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/25",
  },
  won: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/25",
  },

  // Amber group
  "at-risk": {
    bg: "bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/25",
  },
  flagged: {
    bg: "bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/25",
  },

  // Red group
  rejected: {
    bg: "bg-red-500/15",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-500/25",
  },
  declined: {
    bg: "bg-red-500/15",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-500/25",
  },
  lost: {
    bg: "bg-red-500/15",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-500/25",
  },

  // Muted group
  draft: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  },

  // Teal group
  sent: {
    bg: "bg-primary/15",
    text: "text-primary",
    border: "border-primary/25",
  },
  lead: {
    bg: "bg-primary/15",
    text: "text-primary",
    border: "border-primary/25",
  },

  // Blue group
  signed: {
    bg: "bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/25",
  },
  qualified: {
    bg: "bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/25",
  },
};

/** Format status string to a readable label */
function formatStatusLabel(status: StatusBadgeStatus): string {
  return status
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

export function StatusBadge({
  status,
  label,
  size = "sm",
  className,
}: StatusBadgeProps) {
  const colors = statusColorMap[status];
  const displayLabel = label ?? formatStatusLabel(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize font-medium border",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" && "text-[11px] px-1.5 py-0",
        size === "md" && "text-xs px-2 py-0.5",
        className
      )}
    >
      {displayLabel}
    </Badge>
  );
}
