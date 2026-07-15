/**
 * Revenue Tab — Paddle-driven MRR, churn, top customers, recent invoices.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, TrendingDown, Users } from "lucide-react";
import { useRevenue } from "../hooks";
import { RefreshButton, ErrorState, ConnectServiceState, MetricCard } from "../shared";

export function RevenueTab() {
  const { data, isRefreshing, error, refresh } = useRevenue();

  if (error && !data) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  const revenue = data?.revenue;
  const transactions = data?.transactions ?? [];

  // Check if Paddle is configured
  const paddleNotConfigured = revenue && revenue.mrrCents === 0 && revenue.activeSubscriptions === 0 && !error;

  const formatCurrency = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const formatNumber = (v: number) => v.toLocaleString();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Revenue</h2>
          <p className="text-sm text-muted-foreground">Subscription metrics from Paddle (AXIA's billing).</p>
        </div>
        <RefreshButton onClick={refresh} isRefreshing={isRefreshing} />
      </div>

      {paddleNotConfigured && (
        <ConnectServiceState
          serviceName="Paddle"
          description="Set PADDLE_API_KEY and PADDLE_ENVIRONMENT on Convex to see subscription revenue, MRR, churn, and top customers."
          docsUrl="https://developer.paddle.com/api-reference"
        />
      )}

      {/* MRR cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="MRR" value={revenue?.mrrCents} isLoading={isRefreshing && !revenue} format={formatCurrency} icon={DollarSign} />
        <MetricCard label="ARR" value={revenue?.arrCents} isLoading={isRefreshing && !revenue} format={formatCurrency} />
        <MetricCard
          label="Net New MRR"
          value={revenue?.netNewMrrCents}
          isLoading={isRefreshing && !revenue}
          format={formatCurrency}
          icon={revenue?.netNewMrrCents && revenue.netNewMrrCents > 0 ? TrendingUp : TrendingDown}
        />
        <MetricCard label="ARPU" value={revenue?.arpuCents} isLoading={isRefreshing && !revenue} format={formatCurrency} />
      </div>

      {/* Subscription counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Active Subscriptions" value={revenue?.activeSubscriptions} isLoading={isRefreshing && !revenue} format={formatNumber} icon={Users} />
        <MetricCard label="New This Month" value={revenue?.newThisMonth} isLoading={isRefreshing && !revenue} format={formatNumber} icon={TrendingUp} />
        <MetricCard label="Churned This Month" value={revenue?.churnedThisMonth} isLoading={isRefreshing && !revenue} format={formatNumber} icon={TrendingDown} />
        <MetricCard
          label="Churn Rate"
          value={revenue && revenue.activeSubscriptions > 0 ? (revenue.churnedThisMonth / revenue.activeSubscriptions) * 100 : 0}
          isLoading={isRefreshing && !revenue}
          format={(v) => `${v.toFixed(1)}%`}
        />
      </div>

      {/* Top customers + Recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Customers by MRR</CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !revenue?.topCustomers ? (
              <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : revenue?.topCustomers && revenue.topCustomers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Plan</TableHead>
                    <TableHead className="text-xs text-right">MRR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenue.topCustomers.map((c: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{c.email}</TableCell>
                      <TableCell className="text-xs"><Badge variant="outline">{c.plan}</Badge></TableCell>
                      <TableCell className="text-xs text-right font-mono">{formatCurrency(c.mrrCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No customer data yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !transactions.length ? (
              <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 10).map((t: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium truncate max-w-[120px]">{t.email}</TableCell>
                      <TableCell className="text-xs truncate max-w-[100px]">{t.productName}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={t.status === "completed" || t.status === "paid" ? "default" : "secondary"}>{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">{formatCurrency(t.amountCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No transactions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
