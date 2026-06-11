import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Standardized stat card component.
 * Replaces the 3+ variants found across Dashboard, Evidence Library, Reports, etc.
 * Uses the `.stat-card` CSS class from index.css as the base.
 */
export interface StatCardProps {
  /** Lucide icon to display in the teal icon background */
  icon?: ReactNode;
  /** Label text, e.g. "Active Clients" */
  label: string;
  /** Main value, e.g. 12 or "$1,240" */
  value: string | number;
  /** Optional subtitle below the value, e.g. "+3 this week" */
  subtitle?: string;
  /** Trend direction for the indicator */
  trend?: "up" | "down" | "neutral";
  /** Trend value text, e.g. "+12%" */
  trendValue?: string;
  /** Additional className */
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  trendValue,
  className,
}: StatCardProps) {
  return (
    <div className={cn("stat-card", className)}>
      {/* Top row: label + icon */}
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {icon && <div className="stat-icon">{icon}</div>}
      </div>

      {/* Value */}
      <div className="stat-value">{value}</div>

      {/* Bottom row: subtitle + trend indicator */}
      {(subtitle || trend || trendValue) && (
        <div className="flex items-center gap-2">
          {subtitle && (
            <span className="stat-label">{subtitle}</span>
          )}
          {trend && trendValue && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                trend === "up" && "stat-trend-up",
                trend === "down" && "stat-trend-down",
                trend === "neutral" && "text-muted-foreground"
              )}
            >
              {trend === "up" && <TrendingUp className="h-3 w-3" />}
              {trend === "down" && <TrendingDown className="h-3 w-3" />}
              {trend === "neutral" && <Minus className="h-3 w-3" />}
              {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
