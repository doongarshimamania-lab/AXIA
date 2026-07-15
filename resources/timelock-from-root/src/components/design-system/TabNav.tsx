import { cn } from "@/lib/utils";

/**
 * Standardized tab navigation component.
 * Unifies the underline and pill tab variants found across pages.
 * Defaults to underline style (consistent with the audit recommendation).
 *
 * Active tab: teal underline + teal text.
 * Count badge: muted style.
 */
export interface TabNavTab {
  key: string;
  label: string;
  /** Optional count badge next to the label */
  count?: number;
}

export interface TabNavProps {
  /** Array of tab definitions */
  tabs: TabNavTab[];
  /** Currently active tab key */
  activeTab: string;
  /** Callback when a tab is clicked */
  onTabChange: (key: string) => void;
  /** Visual variant — underline (default) or pill */
  variant?: "underline" | "pill";
  /** Additional className */
  className?: string;
}

export function TabNav({
  tabs,
  activeTab,
  onTabChange,
  variant = "underline",
  className,
}: TabNavProps) {
  if (variant === "pill") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-lg bg-muted p-1",
          className
        )}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Underline variant (default)
  return (
    <div
      className={cn("flex items-center gap-0 border-b border-border", className)}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              "relative inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            )}
            {/* Active underline indicator */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
