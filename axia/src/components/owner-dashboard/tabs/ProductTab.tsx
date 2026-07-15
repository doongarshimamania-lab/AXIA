/**
 * Product Tab — PostHog-driven DAU/MAU, retention, funnel, top pages, feature adoption.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, MousePointerClick, Link2, TrendingUp } from "lucide-react";
import { useProduct } from "../hooks";
import { RefreshButton, ErrorState, ConnectServiceState, MetricCard } from "../shared";

export function ProductTab() {
  const { data, isRefreshing, error, refresh } = useProduct();

  if (error && !data) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  const product = data;
  const dauMau = product?.dauMau;
  const retention = product?.retention ?? [];
  const funnel = product?.funnel ?? [];
  const topPages = product?.topPages ?? [];
  const featureAdoption = product?.featureAdoption ?? [];

  const posthogNotConfigured = !product && !error;

  const formatNumber = (v: number) => v.toLocaleString();
  const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Product</h2>
          <p className="text-sm text-muted-foreground">Engagement metrics from PostHog.</p>
        </div>
        <RefreshButton onClick={refresh} isRefreshing={isRefreshing} />
      </div>

      {posthogNotConfigured && (
        <ConnectServiceState
          serviceName="PostHog"
          description="Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID on Convex to see DAU/MAU, retention, funnels, and feature adoption."
          docsUrl="https://posthog.com/docs/api"
        />
      )}

      {/* DAU/MAU cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="DAU" value={dauMau?.dau} isLoading={isRefreshing && !dauMau} format={formatNumber} icon={Users} />
        <MetricCard label="WAU" value={dauMau?.wau} isLoading={isRefreshing && !dauMau} format={formatNumber} />
        <MetricCard label="MAU" value={dauMau?.mau} isLoading={isRefreshing && !dauMau} format={formatNumber} />
        <MetricCard label="Stickiness (DAU/MAU)" value={dauMau ? dauMau.stickiness * 100 : null} isLoading={isRefreshing && !dauMau} format={formatPercent} icon={TrendingUp} />
      </div>

      {/* DAU trend + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DAU trend (last 30 days) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">DAU Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !dauMau?.trend ? (
              <Skeleton className="h-48 w-full" />
            ) : dauMau?.trend && dauMau.trend.length > 0 ? (
              <DAUSparkline data={dauMau.trend} />
            ) : (
              <p className="text-sm text-muted-foreground py-4">No trend data.</p>
            )}
          </CardContent>
        </Card>

        {/* Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Signup → Paid Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !funnel.length ? (
              <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : funnel.length > 0 ? (
              <FunnelChart steps={funnel} />
            ) : (
              <p className="text-sm text-muted-foreground py-4">No funnel data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Retention + Top pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Retention heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Retention (8-week cohort)</CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !retention.length ? (
              <Skeleton className="h-48 w-full" />
            ) : retention.length > 0 ? (
              <RetentionHeatmap cohorts={retention} />
            ) : (
              <p className="text-sm text-muted-foreground py-4">No retention data.</p>
            )}
          </CardContent>
        </Card>

        {/* Top pages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Top Pages (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !topPages.length ? (
              <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : topPages.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Page</TableHead>
                    <TableHead className="text-xs text-right">Unique Visits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPages.map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium truncate max-w-[200px]">{p.path}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{formatNumber(p.uniqueVisits)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No page data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature adoption */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MousePointerClick className="h-4 w-4" />
            Feature Adoption (30d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isRefreshing && !featureAdoption.length ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : featureAdoption.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Event</TableHead>
                  <TableHead className="text-xs text-right">Unique Users</TableHead>
                  <TableHead className="text-xs text-right">Total Calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureAdoption.map((e: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium font-mono">{e.name}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatNumber(e.uniqueUsers)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatNumber(e.totalCalls)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No feature adoption data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Inline chart components ────────────────────────────────────────────────
function DAUSparkline({ data }: { data: { date: string; dau: number }[] }) {
  const max = Math.max(...data.map((d) => d.dau), 1);
  const width = 100;
  const height = 40;
  const points = data
    .map((d, i) => `${(i / (data.length - 1)) * width},${height - (d.dau / max) * height}`)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{data[0]?.date ?? ""}</span>
        <span>{data[data.length - 1]?.date ?? ""}</span>
      </div>
    </div>
  );
}

function FunnelChart({ steps }: { steps: { name: string; count: number; conversionRate: number }[] }) {
  const max = Math.max(...steps.map((s) => s.count), 1);
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium">{step.name}</span>
            <span className="text-muted-foreground">{step.count.toLocaleString()} ({(step.conversionRate * 100).toFixed(1)}%)</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(step.count / max) * 100}%` }}
            />
          </div>
          {i < steps.length - 1 && (
            <div className="text-xs text-muted-foreground text-right">
              ↓ {((steps[i + 1].count / step.count) * 100).toFixed(1)}% to next
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RetentionHeatmap({ cohorts }: { cohorts: { week: string; size: number; retention: number[] }[] }) {
  const colorForRate = (rate: number) => {
    if (rate === 0) return "bg-muted";
    const opacity = Math.min(rate, 1);
    return `bg-primary`;
  };
  const styleForRate = (rate: number) => ({
    backgroundColor: `hsl(var(--primary) / ${Math.max(rate, 0.05)})`,
  });

  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left">Cohort</th>
            <th className="px-2 py-1 text-right">Size</th>
            {Array.from({ length: 8 }).map((_, i) => (
              <th key={i} className="px-1 py-1 text-center">W{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c, i) => (
            <tr key={i}>
              <td className="px-2 py-1 text-muted-foreground">{c.week}</td>
              <td className="px-2 py-1 text-right font-mono">{c.size}</td>
              {Array.from({ length: 8 }).map((_, j) => {
                const rate = c.retention[j] ?? 0;
    return (
                  <td key={j} className="px-1 py-1">
                    <div
                      className="w-8 h-6 rounded flex items-center justify-center text-[10px] font-mono"
                      style={styleForRate(rate)}
                      title={`Week ${j}: ${(rate * 100).toFixed(0)}%`}
                    >
                      {(rate * 100).toFixed(0)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
