/**
 * Infrastructure Tab — Vercel + Convex deploy status, build times, db sizes.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, GitBranch, Server, Database, Zap } from "lucide-react";
import { useInfrastructure } from "../hooks";
import { RefreshButton, ErrorState, ConnectServiceState, MetricCard } from "../shared";

export function InfrastructureTab() {
  const { data, isRefreshing, error, refresh } = useInfrastructure();

  if (error && !data) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  const infra = data;
  const vercel = infra?.vercel;
  const vercelAnalytics = infra?.vercelAnalytics;
  const convex = infra?.convex;

  const vercelNotConfigured = !vercel && !error;

  const formatNumber = (v: number) => v.toLocaleString();
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Infrastructure</h2>
          <p className="text-sm text-muted-foreground">Deployments, build times, and database health.</p>
        </div>
        <RefreshButton onClick={refresh} isRefreshing={isRefreshing} />
      </div>

      {vercelNotConfigured && (
        <ConnectServiceState
          serviceName="Vercel"
          description="Set VERCEL_ACCESS_TOKEN and VERCEL_PROJECT_ID on Convex to see deploy status, build times, and web analytics."
          docsUrl="https://vercel.com/docs/rest-api"
        />
      )}

      {/* Deploy summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Deploys Today" value={vercel?.todayCount} isLoading={isRefreshing && !vercel} format={formatNumber} icon={Zap} />
        <MetricCard label="Deploys (7d)" value={vercel?.last7dCount} isLoading={isRefreshing && !vercel} format={formatNumber} />
        <MetricCard
          label="Build Time (p95)"
          value={vercel?.buildTimeP95Ms}
          isLoading={isRefreshing && !vercel}
          format={formatDuration}
          icon={Clock}
        />
        <MetricCard label="Failed (7d)" value={vercel?.errorCount7d} isLoading={isRefreshing && !vercel} format={formatNumber} icon={XCircle} />
      </div>

      {/* Latest deploy + Web analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latest production deploy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Latest Production Deploy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !vercel?.latest ? (
              <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : vercel?.latest ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {vercel.latest.state === "READY" ? (
                    <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>
                  ) : vercel.latest.state === "BUILDING" ? (
                    <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Building</Badge>
                  ) : vercel.latest.state === "ERROR" ? (
                    <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>
                  ) : (
                    <Badge variant="secondary">{vercel.latest.state}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{vercel.latest.branch}</span>
                </div>
                {vercel.latest.commitMessage && (
                  <p className="text-sm font-medium truncate">{vercel.latest.commitMessage}</p>
                )}
                {vercel.latest.commitSha && (
                  <p className="text-xs text-muted-foreground font-mono">{vercel.latest.commitSha.slice(0, 7)}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Build time: </span>
                    <span className="font-mono">{vercel.latest.buildTimeMs ? formatDuration(vercel.latest.buildTimeMs) : "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deployed: </span>
                    <span>{new Date(vercel.latest.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                {vercel.latest.url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://${vercel.latest.url}`} target="_blank" rel="noopener noreferrer">
                      Visit deployment
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No deploys yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Web analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Web Analytics (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !vercelAnalytics ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : vercelAnalytics ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Visitors</p>
                    <p className="text-2xl font-bold">{formatNumber(vercelAnalytics.visitors7d)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Page Views</p>
                    <p className="text-2xl font-bold">{formatNumber(vercelAnalytics.pageViews7d)}</p>
                  </div>
                </div>
                {vercelAnalytics.topPages.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Top Pages</p>
                    <div className="space-y-1">
                      {vercelAnalytics.topPages.slice(0, 5).map((p: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="truncate max-w-[150px]">{p.path}</span>
                          <span className="font-mono">{formatNumber(p.visitors)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No analytics data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Convex internal stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="h-4 w-4" />
            Convex Backend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isRefreshing && !convex ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : convex ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-xl font-bold">{formatNumber(convex.totalUsers)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Workspaces</p>
                <p className="text-xl font-bold">{formatNumber(convex.totalWorkspaces)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Signups (24h)</p>
                <p className="text-xl font-bold">{formatNumber(convex.recentSignups24h)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Signups (7d)</p>
                <p className="text-xl font-bold">{formatNumber(convex.recentSignups7d)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No Convex stats available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
