import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, TrendingUp, DollarSign, AlertTriangle, Award, BarChart3, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";

export function ProtectionValueDashboard() {
  // Theme is managed globally by ThemeProvider

  // Real backend data integration
  const metrics = useQuery(api.protection.protectionValue.getProtectionValueMetrics, {});
  const history = useQuery(api.protection.protectionValue.getValueHistory, {});

  // ── Timeout & retry logic for auth failures / Convex unreachable ──
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setTimedOut(false);
    if (metrics === undefined) {
      const timer = setTimeout(() => setTimedOut(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [metrics, retryKey]);

  const handleRetry = useCallback(() => {
    setTimedOut(false);
    setRetryKey((k) => k + 1);
  }, []);

  // Show error state after timeout
  if (metrics === undefined && timedOut) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-orange-500 mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">Unable to load protection data</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-[320px]">
          This may be caused by a network issue or authentication problem. Please try again.
        </p>
        <Button variant="outline" onClick={handleRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // Show spinner while loading (before timeout)
  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check for zero-value metrics (no protection data yet)
  const hasMeaningfulData =
    (metrics.lifetime?.protectedValue ?? 0) > 0 ||
    (metrics.lifetime?.protectedHours ?? 0) > 0 ||
    (metrics.monthly?.protectedValue ?? 0) > 0 ||
    (metrics.monthly?.atRiskValue ?? 0) > 0;

  if (!hasMeaningfulData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Shield className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No protection data yet</h3>
        <p className="text-sm text-muted-foreground max-w-[320px]">
          Start tracking work sessions to see your protection value, ROI, and dispute prevention metrics here.
        </p>
      </div>
    );
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-emerald-500";
    if (trend < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return "↑";
    if (trend < 0) return "↓";
    return "→";
  };

  // 4-Pillar tier display names
  const tierDisplayNames: Record<string, string> = {
    free: "Free - Evidence Collection (22%)",
    starter: "Starter - Compliance Monitoring (67%)",
    pro: "Pro - Dispute Prevention (85%)",
    expert: "Expert - Success Optimization (95%)"
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Protection Value Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track your protected earnings and ROI in real-time
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {tierDisplayNames[metrics.subscriptionTier] || "Free Plan"}
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Lifetime Protected Value */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Lifetime Protected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              ${metrics.lifetime.protectedValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.lifetime.protectedHours}h protected
            </p>
          </CardContent>
        </Card>

        {/* Monthly Protected Value */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${metrics.monthly.protectedValue.toLocaleString()}
            </div>
            <p className={`text-xs mt-1 ${getTrendColor(metrics.valueTrend)}`}>
              {getTrendIcon(metrics.valueTrend)} {Math.abs(metrics.valueTrend).toFixed(1)}% vs last month
            </p>
          </CardContent>
        </Card>

        {/* At-Risk Value */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              ${metrics.monthly.atRiskValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.monthly.atRiskHours}h flagged
            </p>
          </CardContent>
        </Card>

        {/* Saved Value */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              Disputes Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              ${metrics.savedValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.resolvedReports} resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ROI Calculator - 4-Pillar Tier Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Return on Investment (ROI) - {metrics.tierProtectionRate}% Protection Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Monthly Subscription</div>
              <div className="text-xl font-bold text-foreground">
                ${metrics.subscriptionCost.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Value Saved</div>
              <div className="text-xl font-bold text-emerald-500">
                ${metrics.savedValue.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">ROI</div>
              <div className={`text-xl font-bold ${metrics.roi > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                {metrics.roi > 0 ? `+${metrics.roi.toFixed(0)}%` : "N/A"}
              </div>
            </div>
          </div>
          {metrics.subscriptionTier === "free" && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                💡 <strong>Upgrade to Starter (67% protection)</strong> for only $4/mo to unlock compliance monitoring and increase your protection rate by 45%
              </p>
            </div>
          )}
          {metrics.subscriptionTier === "starter" && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                💡 <strong>Upgrade to Pro (85% protection)</strong> for only $8/mo to unlock dispute prevention and increase your protection rate by 18%
              </p>
            </div>
          )}
          {metrics.subscriptionTier === "pro" && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                💡 <strong>Upgrade to Expert (95% protection)</strong> for only $16/mo to unlock success optimization and maximize your protection rate
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Value Breakdown (This Month)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(metrics.platformBreakdown).map(([platform, value]) => {
              const total = Object.values(metrics.platformBreakdown).reduce((a: number, b: any) => a + (b as number), 0) as number;
              const percentage = total > 0 ? ((value as number) / total) * 100 : 0;
              
              return (
                <div key={platform}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground capitalize">{platform}</span>
                    <span className="text-sm font-bold text-foreground">${(value as number).toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{percentage.toFixed(1)}% of total</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Value History Chart */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">12-Month Value Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-between gap-2">
              {history.map((month: any, idx: number) => {
                const maxValue = Math.max(...history.map((m: any) => m.value as number), 1);
                const height = (month.value / maxValue) * 100;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-primary/20 rounded-t relative" style={{ height: `${height}%`, minHeight: '4px' }}>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-foreground whitespace-nowrap">
                        ${month.value}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                      {month.month}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}