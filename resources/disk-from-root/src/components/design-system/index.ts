/**
 * Axia Design System — Barrel Export
 *
 * Shared design system components for Phase 2 of the UI audit.
 * These components standardize the multiple implementations found
 * across Dashboard, Evidence Library, Reports, and other pages.
 */

// Stat Card — standardized metric display
export { StatCard } from "./StatCard";
export type { StatCardProps } from "./StatCard";

// Empty State — standardized empty/zero-state display
export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

// Page Header — standardized page title + description + actions
export { PageHeader } from "./PageHeader";
export type { PageHeaderProps } from "./PageHeader";

// Status Badge — standardized status indicators
export { StatusBadge } from "./StatusBadge";
export type { StatusBadgeProps, StatusBadgeStatus } from "./StatusBadge";

// Error Boundary — graceful error catching
export { ErrorBoundary } from "./ErrorBoundary";
export type { ErrorBoundaryProps } from "./ErrorBoundary";

// Tab Navigation — standardized tab bar (underline & pill variants)
export { TabNav } from "./TabNav";
export type { TabNavProps, TabNavTab } from "./TabNav";
