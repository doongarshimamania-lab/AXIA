/**
 * Shared UI components for the Owner Dashboard.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Metric Card ────────────────────────────────────────────────────────────
export function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  isLoading,
  format,
}: {
  label: string;
  value: number | null | undefined;
  delta?: number; // percentage change, positive or negative
  deltaLabel?: string;
  icon?: any;
  isLoading?: boolean;
  format?: (v: number) => string;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  const formattedValue = value === null || value === undefined ? "—" : format ? format(value) : String(value);
  const deltaColor = delta === undefined ? "" : delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground";
  const DeltaIcon = delta === undefined ? null : delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className="text-2xl font-bold tracking-tight">{formattedValue}</p>
        {delta !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs mt-1", deltaColor)}>
            {DeltaIcon && <DeltaIcon className="h-3 w-3" />}
            <span>{Math.abs(delta).toFixed(1)}%</span>
            {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Hero KPI Bar (top strip, 6 KPIs) ───────────────────────────────────────
export function HeroKpiBar({ kpis, isLoading }: { kpis: any; isLoading: boolean }) {
  const formatCurrency = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const formatPercent = (v: number) => `${v.toFixed(1)}%`;
  const formatNumber = (v: number) => v.toLocaleString();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <MetricCard label="MRR" value={kpis?.mrrCents} icon={null} isLoading={isLoading} format={formatCurrency} />
      <MetricCard label="Active Users" value={kpis?.activeUsers ?? kpis?.totalUsers} icon={null} isLoading={isLoading} format={formatNumber} />
      <MetricCard label="Errors (24h)" value={kpis?.errorCount} icon={null} isLoading={isLoading} format={formatNumber} />
      <MetricCard
        label="Crash-free"
        value={kpis?.crashFreeSessions !== null && kpis?.crashFreeSessions !== undefined ? kpis.crashFreeSessions * 100 : null}
        icon={null}
        isLoading={isLoading}
        format={formatPercent}
      />
      <MetricCard label="Deploys Today" value={kpis?.deploysToday} icon={null} isLoading={isLoading} format={formatNumber} />
      <MetricCard
        label="Uptime 24h"
        value={kpis?.uptime24h}
        icon={null}
        isLoading={isLoading}
        format={formatPercent}
      />
    </div>
  );
}

// ── Refresh button ─────────────────────────────────────────────────────────
export function RefreshButton({ onClick, isRefreshing }: { onClick: () => void; isRefreshing: boolean }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={isRefreshing}>
      <RefreshCw className={cn("h-4 w-4 mr-1", isRefreshing && "animate-spin")} />
      {isRefreshing ? "Refreshing..." : "Refresh"}
    </Button>
  );
}

// ── Error state ────────────────────────────────────────────────────────────
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
      <CardContent className="p-4 flex items-start gap-3">
        <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900 dark:text-red-200">Failed to load data</p>
          <p className="text-xs text-red-700 dark:text-red-300 mt-1">{message}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty state (for "connect X to see data") ──────────────────────────────
export function ConnectServiceState({
  serviceName,
  description,
  docsUrl,
}: {
  serviceName: string;
  description: string;
  docsUrl?: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 flex flex-col items-center text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Info className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Connect {serviceName} to see data</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
        {docsUrl && (
          <Button variant="outline" size="sm" asChild className="mt-3">
            <a href={docsUrl} target="_blank" rel="noopener noreferrer">
              Learn more
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Rate-limited banner ────────────────────────────────────────────────────
export function RateLimitedBanner({ retryInSeconds }: { retryInSeconds: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-md">
      <AlertTriangle className="h-3.5 w-3.5" />
      <span>Rate limited — showing cached data. Retries in {retryInSeconds}s.</span>
    </div>
  );
}

// ── Stale data indicator ───────────────────────────────────────────────────
export function StaleDataIndicator({ fetchedAt }: { fetchedAt: number | null }) {
  if (!fetchedAt) return null;
  const ageSeconds = Math.floor((Date.now() - fetchedAt) / 1000);
  const ageLabel = ageSeconds < 60 ? `${ageSeconds}s ago` : `${Math.floor(ageSeconds / 60)}m ago`;
  return <span className="text-xs text-muted-foreground">Updated {ageLabel}</span>;
}
