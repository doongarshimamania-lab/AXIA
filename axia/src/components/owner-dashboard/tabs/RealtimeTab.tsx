/**
 * Realtime Tab — live users, active sessions, live error feed.
 * Updates every 5 seconds.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Users, Radio, AlertCircle, ExternalLink } from "lucide-react";
import { useRealtime } from "../hooks";
import { RefreshButton, ErrorState, MetricCard } from "../shared";

export function RealtimeTab() {
  const { data, isRefreshing, error, refresh } = useRealtime();

  if (error && !data) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  const realtime = data;
  const liveUsers = realtime?.liveUsers;
  const recentErrors = realtime?.recentErrors ?? [];

  const formatNumber = (v: number) => v.toLocaleString();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Radio className="h-5 w-5 text-green-500 animate-pulse" />
            Real-time
          </h2>
          <p className="text-sm text-muted-foreground">Live data, refreshing every 5 seconds.</p>
        </div>
        <RefreshButton onClick={refresh} isRefreshing={isRefreshing} />
      </div>

      {/* Live user count (big) */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="p-6">
          {isRefreshing && !liveUsers ? (
            <Skeleton className="h-16 w-32" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Live Users (last 60s)</p>
                <p className="text-4xl font-bold text-green-700 dark:text-green-400">
                  {liveUsers?.count ? formatNumber(liveUsers.count) : "0"}
                </p>
                <p className="text-xs text-muted-foreground">actively using the app right now</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active pages + Live errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active page flows */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Pages Right Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !liveUsers?.topPages ? (
              <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : liveUsers?.topPages && liveUsers.topPages.length > 0 ? (
              <div className="space-y-2">
                {liveUsers.topPages.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                    <span className="truncate max-w-[200px] font-medium">{p.path}</span>
                    <Badge variant="secondary" className="font-mono">{p.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No active pages.</p>
            )}
          </CardContent>
        </Card>

        {/* Live error feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Recent Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !recentErrors.length ? (
              <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : recentErrors.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentErrors.map((err: any) => (
                  <div key={err.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-border/50 last:border-0">
                    <Badge
                      variant={err.level === "fatal" ? "destructive" : err.level === "error" ? "default" : "secondary"}
                      className="text-xs flex-shrink-0"
                    >
                      {err.level}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{err.title}</p>
                      <p className="text-muted-foreground">{new Date(err.lastSeen).toLocaleTimeString()}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                      <a href={err.permalink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No recent errors.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
