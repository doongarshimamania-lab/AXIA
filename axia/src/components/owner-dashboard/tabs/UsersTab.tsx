/**
 * Users Tab — Convex internal: workspaces, users, signups, audit log.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Building2, UserPlus, ScrollText, Search, Download } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { RefreshButton, MetricCard } from "../shared";

export function UsersTab() {
  const [auditLogFilter, setAuditLogFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Convex internal user stats (direct query, no cache needed)
  const usersData = useQuery(api.ownerDashboard.mutations?.getUsersTab as any, {}) ??
    useQuery(api.ownerDashboard.queries.getOverview, {});

  // Audit log
  const auditLog = useQuery(api.ownerDashboard.queries.getAuditLog, {
    limit: 50,
    actionPrefix: auditLogFilter || undefined,
  });

  const formatNumber = (v: number) => v?.toLocaleString() ?? "0";
  const formatTime = (ts: number) => new Date(ts).toLocaleString();

  // Extract user stats from overview data
  const convexStats = (usersData as any)?.data?.convexStats ?? (usersData as any)?.convexStats;
  const recentSignups = (usersData as any)?.data?.convexStats ? [] : []; // TODO: wire from getUsersTab mutation

  const handleExportAuditLog = () => {
    if (!auditLog || !Array.isArray(auditLog)) return;
    const headers = ["Timestamp", "Actor", "Action", "Tab", "Status", "IP"];
    const rows = auditLog.map((e: any) => [
      new Date(e.ts).toISOString(),
      e.actorEmail ?? "—",
      e.action,
      e.tab ?? "—",
      e.status ?? "—",
      e.ip ?? "—",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `axia-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Users & Audit Log</h2>
          <p className="text-sm text-muted-foreground">Account stats and owner dashboard activity log.</p>
        </div>
        <RefreshButton onClick={() => setRefreshKey((k) => k + 1)} isRefreshing={false} />
      </div>

      {/* Account stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Users" value={convexStats?.totalUsers} isLoading={!convexStats} format={formatNumber} icon={Users} />
        <MetricCard label="Workspaces" value={convexStats?.totalWorkspaces} isLoading={!convexStats} format={formatNumber} icon={Building2} />
        <MetricCard label="Owners" value={convexStats?.owners} isLoading={!convexStats} format={formatNumber} />
        <MetricCard label="Signups (24h)" value={convexStats?.recentSignups24h} isLoading={!convexStats} format={formatNumber} icon={UserPlus} />
      </div>

      {/* Audit log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Owner Dashboard Audit Log
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter by action..."
                  value={auditLogFilter}
                  onChange={(e) => setAuditLogFilter(e.target.value)}
                  className="h-8 w-48 pl-7 text-xs"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleExportAuditLog}>
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!auditLog || !Array.isArray(auditLog) ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : auditLog.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Actor</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Tab</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.map((entry: any) => (
                  <TableRow key={entry._id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(entry.ts)}</TableCell>
                    <TableCell className="text-xs">{entry.actorEmail ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{entry.action}</TableCell>
                    <TableCell className="text-xs">{entry.tab ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={entry.status === "error" ? "destructive" : entry.status === "rate_limited" ? "secondary" : "default"}
                        className="text-xs"
                      >
                        {entry.status ?? "success"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {entry.latencyMs ? `${entry.latencyMs}ms` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No audit log entries yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
