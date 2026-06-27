/**
 * Centralized application configuration and shared utilities.
 *
 * All hard-coded values that appear in multiple pages/components
 * should live here so there is a single source of truth.
 */

// ─── Platform definitions ────────────────────────────────────────────────────

export type Platform = "upwork" | "fiverr" | "toptal" | "freelancer" | "direct";

export const PLATFORM_LABELS: Record<Platform, string> = {
  upwork: "Upwork",
  fiverr: "Fiverr",
  toptal: "Toptal",
  freelancer: "Freelancer.com",
  direct: "Direct Client",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  upwork: "#14A800",
  fiverr: "#1DBF73",
  toptal: "#204ECF",
  freelancer: "#29B2FE",
  direct: "#F59E0B",
};

// ─── Pipeline source options ─────────────────────────────────────────────────

export const SOURCE_OPTIONS = [
  { value: "upwork", label: "Upwork", color: "#14a800" },
  { value: "fiverr", label: "Fiverr", color: "#00b22d" },
  { value: "linkedin", label: "LinkedIn", color: "#0a66c2" },
  { value: "referral", label: "Referral", color: "#475569" },
  { value: "direct", label: "Direct", color: "#f59e0b" },
  { value: "other", label: "Other", color: "#6b7280" },
] as const;

// ─── Default pipeline stage probabilities ────────────────────────────────────

export const DEFAULT_PROBABILITIES: Record<string, number> = {
  Lead: 10,
  Qualified: 25,
  Proposal: 50,
  Negotiation: 70,
  Won: 100,
  Lost: 0,
};

// ─── Currency formatting ─────────────────────────────────────────────────────

/**
 * Format a number as USD currency (no decimals).
 * Example: 12500 → "$12,500"
 */
export function formatCurrency(n: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Format a number as compact currency (K / M suffixes).
 * Example: 1250000 → "$1.3M", 45000 → "$45.0K"
 */
export function formatCompactCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return formatCurrency(n);
}

/**
 * Format a relative timestamp as a human-readable string.
 * Example: "3m ago", "2h ago", "5d ago"
 */
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

/**
 * Format a timestamp as a short date string.
 * Example: "Jan 15, 2025"
 */
export function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

// ─── Risk level colors ──────────────────────────────────────────────────────

export const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};

// ─── Contract type labels ───────────────────────────────────────────────────

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  hourly: "Hourly",
  fixed: "Fixed Price",
  milestone: "Milestone-Based",
};

// ─── Status badge colors ────────────────────────────────────────────────────

export function statusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (["won", "signed", "paid", "completed", "active"].includes(status))
    return "default";
  if (
    ["lost", "declined", "overdue", "expired", "rejected", "cancelled"].includes(
      status
    )
  )
    return "destructive";
  return "secondary";
}
