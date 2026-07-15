/**
 * Errors Tab — Sentry-driven issue counts, trends, top issues, release health.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertOctagon, AlertTriangle, AlertCircle, ExternalLink, GitCommit } from "lucide-react";
import { useErrors } from "../hooks";
import { RefreshButton, ErrorState, ConnectServiceState, MetricCard } from "../shared";

export function ErrorsTab() {
  const { data, isRefreshing, error, refresh } = useErrors();

  if (error && !data) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  const errors = data;
  const stats = errors?.stats;
  const issues = errors?.issues ?? [];
  const trend = errors?.trend ?? [];
  const release = errors?.release;

  const sentryNotConfigured = !errors && !error;

  const formatNumber = (v: number) => v.toLocaleString();
  const formatPercent = (v: number | null) => (v !== null && v !== undefined ? `${(v * 100).toFixed(1)}%` : "—");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Errors</h2>
          <p className="text-sm text-muted-foreground">Error tracking from Sentry (last 24h).</p>
        </div>
        <RefreshButton onClick={refresh} isRefreshing={isRefreshing} />
      </div>

      {sentryNotConfigured && (
        <ConnectServiceState
          serviceName="Sentry"
          description="Set SENTRY_AUTH_TOKEN and SENTRY_ORG_SLUG on Convex to see open issues, error trends, crash-free rates, and release health."
          docsUrl="https://docs.sentry.io/api"
        />
      )}

      {/* Severity cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Open" value={stats?.total} isLoading={isRefreshing && !stats} format={formatNumber} icon={AlertCircle} />
        <MetricCard label="Fatal" value={stats?.fatal} isLoading={isRefreshing && !stats} format={formatNumber} icon={AlertOctagon} />
        <MetricCard label="Errors" value={stats?.error} isLoading={isRefreshing && !stats} format={formatNumber} icon={AlertTriangle} />
        <MetricCard label="Warnings" value={stats?.warning} isLoading={isRefreshing && !stats} format={formatNumber} />
      </div>

      {/* Error trend + Release health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Error events per hour (24h) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Error Events (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !trend.length ? (
              <Skeleton className="h-48 w-full" />
            ) : trend.length > 0 ? (
              <ErrorTrendChart data={trend} />
            ) : (
              <p className="text-sm text-muted-foreground py-4">No error events in the last 24h.</p>
            )}
          </CardContent>
        </Card>

        {/* Release health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitCommit className="h-4 w-4" />
              Latest Release Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !release ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : release ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="text-sm font-mono font-medium">{release.version}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Crash-free Sessions</p>
                    <p className="text-lg font-bold">{formatPercent(release.crashFreeSessions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Crash-free Users</p>
                    <p className="text-lg font-bold">{formatPercent(release.crashFreeUsers)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Adoption</p>
                    <p className="text-lg font-bold">{formatPercent(release.adoption)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">New Issues</p>
                    <p className="text-lg font-bold">{release.newGroups}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://sentry.io/organizations/${release.version}/releases/`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" /> View in Sentry
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No release data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top issues table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Issues (by frequency)</CardTitle>
        </CardHeader>
        <CardContent>
          {isRefreshing && !issues.length ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : issues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Level</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs text-right">Events</TableHead>
                  <TableHead className="text-xs">Last Seen</TableHead>
                  <TableHead className="text-xs"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue: any) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <Badge
                        variant={issue.level === "fatal" ? "destructive" : issue.level === "error" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {issue.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium max-w-[300px] truncate">{issue.title}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatNumber(issue.timesSeen)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(issue.lastSeen).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={issue.permalink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No open issues.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorTrendChart({ data }: { data: { ts: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 100;
  const height = 40;
  const points = data
    .map((d, i) => `${(i / (data.length - 1)) * width},${height - (d.count / max) * height}`)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="hsl(var(--destructive))" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>24h ago</span>
        <span>now</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Peak: {formatNumber(max)} events/hr · Total: {formatNumber(data.reduce((s, d) => s + d.count, 0))} events
      </p>
    </div>
  );
}

function formatNumber(v: number) {
  return v.toLocaleString();
}
