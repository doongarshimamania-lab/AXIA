/**
 * Overview Tab — single-screen summary of all data sources.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ExternalLink, Activity } from "lucide-react";
import { useOverview } from "../hooks";
import { RefreshButton, ErrorState, MetricCard } from "../shared";

export function OverviewTab() {
  const { data, isRefreshing, error, refresh, fetchedAt } = useOverview();

  if (error && !data) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  const overview = data;
  const revenue = overview?.revenue?.revenue;
  const product = overview?.product;
  const errors = overview?.errors;
  const infra = overview?.infra?.vercel;
  const convex = overview?.convexStats;

  const formatCurrency = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const formatNumber = (v: number) => v.toLocaleString();

  // "Needs attention" items
  const attentionItems: { severity: "critical" | "high" | "medium"; title: string; detail: string; link?: string }[] = [];
  if (infra?.latest?.state === "ERROR") {
    attentionItems.push({
      severity: "critical",
      title: "Production deploy failed",
      detail: infra.latest.commitMessage ?? "Latest deploy is in ERROR state",
      link: `https://vercel.com/axia/${infra.latest.id}`,
    });
  }
  if (errors?.stats?.total > 10) {
    attentionItems.push({
      severity: "high",
      title: `${errors.stats.total} unresolved Sentry issues`,
      detail: `${errors.stats.fatal} fatal, ${errors.stats.error} errors in last 24h`,
      link: "https://sentry.io/axia",
    });
  }
  if (revenue && revenue.churnedThisMonth > 0) {
    attentionItems.push({
      severity: "medium",
      title: `${revenue.churnedThisMonth} subscription${revenue.churnedThisMonth > 1 ? "s" : ""} churned this month`,
      detail: "Review cancellation reasons",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">Cross-source summary of your business health.</p>
        </div>
        <RefreshButton onClick={refresh} isRefreshing={isRefreshing} />
      </div>

      {/* 2x2 trend grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="MRR" value={revenue?.mrrCents} isLoading={isRefreshing && !revenue} format={formatCurrency} />
        <MetricCard label="Total Users" value={convex?.totalUsers} isLoading={isRefreshing && !convex} format={formatNumber} />
        <MetricCard label="Open Errors" value={errors?.stats?.total} isLoading={isRefreshing && !errors} format={formatNumber} />
        <MetricCard label="Deploys (7d)" value={infra?.last7dCount} isLoading={isRefreshing && !infra} format={formatNumber} />
      </div>

      {/* Needs attention + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Needs attention */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attentionItems.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Activity className="h-4 w-4 text-green-500" />
                All systems healthy. Nothing needs immediate attention.
              </div>
            ) : (
              <div className="space-y-3">
                {attentionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Badge
                      variant={item.severity === "critical" ? "destructive" : item.severity === "high" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {item.severity}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    {item.link && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity (audit log) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !overview?.recentAudit ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : overview?.recentAudit && overview.recentAudit.length > 0 ? (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {overview.recentAudit.map((entry: any) => (
                  <div key={entry._id} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{entry.action}</span>
                      {entry.actorEmail && (
                        <span className="text-muted-foreground ml-1">by {entry.actorEmail}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground flex-shrink-0">
                      {new Date(entry.ts).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No recent activity.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard label="Workspaces" value={convex?.totalWorkspaces} isLoading={isRefreshing && !convex} format={formatNumber} />
        <MetricCard label="Owners" value={convex?.owners} isLoading={isRefreshing && !convex} format={formatNumber} />
        <MetricCard label="Signups (24h)" value={convex?.recentSignups24h} isLoading={isRefreshing && !convex} format={formatNumber} />
        <MetricCard label="Signups (7d)" value={convex?.recentSignups7d} isLoading={isRefreshing && !convex} format={formatNumber} />
        <MetricCard label="Active Subs" value={revenue?.activeSubscriptions} isLoading={isRefreshing && !revenue} format={formatNumber} />
        <MetricCard label="ARPU" value={revenue?.arpuCents} isLoading={isRefreshing && !revenue} format={formatCurrency} />
      </div>
    </div>
  );
}
