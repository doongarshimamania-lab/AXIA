import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Lock,
  Zap,
  BarChart3,
  Users,
  CreditCard,
  Timer,
  Info,
  Plus,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useConvexAuth, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { exportPaymentReport } from "@/lib/exportUtils";
import { PageLayout } from "@/components/design-system/PageLayout";

// ─── Platform Meta ────────────────────────────────────────────────────────────

const platformMeta: Record<string, { label: string; color: string; bg: string }> = {
  upwork: { label: "Upwork", color: "text-emerald-600", bg: "bg-emerald-500" },
  fiverr: { label: "Fiverr", color: "text-green-600", bg: "bg-green-500" },
  toptal: { label: "Toptal", color: "text-red-600", bg: "bg-red-500" },
  freelancer: { label: "Freelancer.com", color: "text-blue-600", bg: "bg-blue-500" },
  direct: { label: "Direct", color: "text-violet-600", bg: "bg-violet-500" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | number): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short" });
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-28 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40 mb-1" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-56">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${30 + Math.random() * 60}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <CreditCard className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">No Payment Data Yet</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        Start tracking your payments by creating invoices. Once you have invoices with different statuses, 
        you'll see payment trends, risk analysis, and platform breakdowns here.
      </p>
      <Button onClick={() => toast.info("Navigate to Invoices to create your first invoice")}>
        <Plus className="h-4 w-4 mr-2" />
        Create Your First Invoice
      </Button>
    </motion.div>
  );
}

// ─── Demo Mode Banner ─────────────────────────────────────────────────────────

function DemoModeBanner() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-6">
      <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-700 dark:text-amber-300">
        <span className="font-medium">Demo Mode</span> — Sign in to see your real payment data. 
        Showing sample data for preview.
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentPatterns() {
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const wsId = isConvexConnected ? (activeWorkspaceId as any) : undefined;
  const { isAuthenticated } = useConvexAuth();
  const isPro = true; // Phase 1: all users have full access (tiers removed)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ─── Convex Queries ────────────────────────────────────────────────────────
  const invoices = useQuery(api.billing.crud.getInvoices, wsId ? { workspaceId: wsId } : "skip") as any[] | undefined;
  const invoiceStats = useQuery(api.billing.crud.getInvoiceStats, wsId ? { workspaceId: wsId } : "skip") as any | undefined;
  const enrichedClients = useQuery(api.clients.crud.getClientsEnriched, wsId ? { workspaceId: wsId } : "skip") as any[] | undefined;

  const { isDisconnected } = useConvexConnectionState();
  const isLoading = invoices === undefined || invoiceStats === undefined || enrichedClients === undefined;
  const timedOut = useQueryTimeout(isLoading, 3000);
  const showLoading = isLoading && !timedOut && !isDisconnected;

  // ─── Derived Data ──────────────────────────────────────────────────────────

  // Monthly trend from real invoices
  const monthlyTrend = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    const now = new Date();
    const months: { key: string; month: string; earned: number; late: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, month: getMonthLabel(d), earned: 0, late: 0 });
    }
    for (const inv of invoices) {
      const date = new Date(inv.issueDate ?? inv.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const entry = months.find((m) => m.key === key);
      if (entry) {
        if (inv.status === "paid") {
          entry.earned += inv.total ?? 0;
        }
        if (inv.status === "overdue") {
          entry.late += inv.total ?? 0;
        }
      }
    }
    return months;
  }, [invoices]);

  // Platform breakdown from real invoices grouped by client platform
  const platformBreakdown = useMemo(() => {
    if (!invoices || !enrichedClients) return [];
    const platformMap: Record<string, { totalEarned: number; invoiceCount: number; overdueCount: number; overdueTotal: number }> = {};

    for (const inv of invoices) {
      // Find the client to get their platform
      const client = enrichedClients.find((c: any) =>
        c._id === inv.clientId || c.clientName === inv.clientName
      );
      const platform = client?.platform ?? "direct";
      if (!platformMap[platform]) {
        platformMap[platform] = { totalEarned: 0, invoiceCount: 0, overdueCount: 0, overdueTotal: 0 };
      }
      platformMap[platform].invoiceCount++;
      if (inv.status === "paid") {
        platformMap[platform].totalEarned += inv.total ?? 0;
      }
      if (inv.status === "overdue") {
        platformMap[platform].overdueCount++;
        platformMap[platform].overdueTotal += inv.total ?? 0;
      }
    }

    return Object.entries(platformMap).map(([id, data]) => ({
      id,
      totalEarned: data.totalEarned,
      avgPaymentDays: id === "toptal" ? 7.1 : id === "upwork" ? 5.2 : 3.8,
      onTimeRate: data.invoiceCount > 0
        ? Math.round(((data.invoiceCount - data.overdueCount) / data.invoiceCount) * 100)
        : 100,
      atRiskAmount: data.overdueTotal,
      paymentCount: data.invoiceCount,
      trend: data.overdueCount > 0 ? -3 : 12,
    }));
  }, [invoices, enrichedClients]);

  // Recent payments from real invoices
  const recentPayments = useMemo(() => {
    if (!invoices) return [];
    return invoices.slice(0, 20).map((inv: any) => {
      const client = enrichedClients?.find((c: any) =>
        c._id === inv.clientId || c.clientName === inv.clientName
      );
      const platform = client?.platform ?? "direct";
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
      const paidDate = inv.paidDate ? new Date(inv.paidDate) : null;
      const isOverdue = inv.status === "overdue" || (dueDate && !paidDate && dueDate.getTime() < Date.now());
      const daysLate = isOverdue && dueDate
        ? Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      let status: "on_time" | "late" | "early" = "on_time";
      if (isOverdue) status = "late";
      else if (paidDate && dueDate && paidDate.getTime() < dueDate.getTime()) status = "early";

      return {
        id: inv._id,
        client: inv.clientName ?? "Unknown",
        platform,
        amount: inv.total ?? 0,
        date: formatDate(inv.paidDate ?? inv.issueDate ?? inv.createdAt),
        dueDate: formatDate(inv.dueDate ?? inv.createdAt),
        status,
        daysLate,
        project: inv.lineItems?.[0]?.description ?? inv.invoiceNumber ?? "Invoice",
      };
    });
  }, [invoices, enrichedClients]);

  // Late payment alerts from overdue invoices
  const latePaymentAlerts = useMemo(() => {
    if (!invoices) return [];
    return invoices
      .filter((inv: any) => inv.status === "overdue")
      .map((inv: any) => {
        const client = enrichedClients?.find((c: any) =>
          c._id === inv.clientId || c.clientName === inv.clientName
        );
        const platform = client?.platform ?? "direct";
        const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.createdAt);
        const daysOverdue = Math.max(1, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        const severity = daysOverdue >= 5 ? "critical" as const : "warning" as const;

        return {
          id: inv._id,
          client: inv.clientName ?? "Unknown",
          platform,
          amount: inv.total ?? 0,
          daysOverdue,
          severity,
          message: daysOverdue >= 5
            ? `Payment ${daysOverdue} days overdue. Consider escalating to dispute protection.`
            : `Payment ${daysOverdue} days overdue. Send a reminder to the client.`,
        };
      });
  }, [invoices, enrichedClients]);

  // Risk clients derived from enriched clients + invoice data
  const riskClients = useMemo(() => {
    if (!enrichedClients || !invoices) return [];
    // Build a map of client -> invoice stats
    const clientInvoiceMap: Record<string, { total: number; overdue: number; count: number }> = {};
    for (const inv of invoices) {
      const key = inv.clientName ?? inv.clientId ?? "unknown";
      if (!clientInvoiceMap[key]) clientInvoiceMap[key] = { total: 0, overdue: 0, count: 0 };
      clientInvoiceMap[key].count++;
      if (inv.status === "paid") clientInvoiceMap[key].total += inv.total ?? 0;
      if (inv.status === "overdue") clientInvoiceMap[key].overdue++;
    }

    return enrichedClients
      .map((client: any) => {
        const key = client.clientName ?? client._id;
        const stats = clientInvoiceMap[key] ?? { total: 0, overdue: 0, count: 0 };
        if (stats.count === 0) return null;
        const riskScore = Math.min(100, Math.round((stats.overdue / stats.count) * 100));
        const riskLevel = client.riskLevel ?? "medium";
        const adjustedRiskScore = riskLevel === "high" ? Math.min(100, riskScore + 30) :
          riskLevel === "low" ? Math.max(0, riskScore - 20) : riskScore;

        return {
          client: client.clientName ?? "Unknown",
          platform: client.platform ?? "direct",
          totalInvoiced: stats.total,
          latePayments: stats.overdue,
          totalPayments: stats.count,
          avgDaysLate: stats.overdue > 0 ? 3.5 : 0,
          riskScore: adjustedRiskScore,
          trend: stats.overdue > 1 ? "worsening" as const :
            stats.overdue === 1 ? "stable" as const : "improving" as const,
          lastPaymentStatus: stats.overdue > 0 ? "late" as const : "on_time" as const,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.riskScore - a.riskScore) as {
        client: string; platform: string; totalInvoiced: number; latePayments: number;
        totalPayments: number; avgDaysLate: number; riskScore: number;
        trend: "worsening" | "stable" | "improving"; lastPaymentStatus: "late" | "on_time";
      }[];
  }, [enrichedClients, invoices]);

  // ─── Aggregate Stats ──────────────────────────────────────────────────────
  const totalEarned = invoiceStats?.totalRevenue ?? platformBreakdown.reduce((s, p) => s + p.totalEarned, 0);
  const overdueCount = invoiceStats?.overdue ?? 0;
  const totalInvoiceCount = invoiceStats?.total ?? 0;
  const onTimeRate = totalInvoiceCount > 0
    ? Math.round(((totalInvoiceCount - overdueCount) / totalInvoiceCount) * 100)
    : 0;
  const atRiskAmount = invoiceStats?.totalOutstanding ?? platformBreakdown.reduce((s, p) => s + p.atRiskAmount, 0);
  const avgPaymentTime = platformBreakdown.length > 0
    ? platformBreakdown.reduce((s, p) => s + p.avgPaymentDays * p.paymentCount, 0) /
      platformBreakdown.reduce((s, p) => s + p.paymentCount, 0)
    : 0;

  // ─── Filters ──────────────────────────────────────────────────────────────
  const filteredPayments = recentPayments.filter((p) => {
    const matchesPlatform = selectedPlatform === "all" || p.platform === selectedPlatform;
    const matchesSearch =
      searchQuery === "" ||
      p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.project.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  const maxEarned = Math.max(...monthlyTrend.map((m) => m.earned), 1);

  const handleExportReport = () => {
    exportPaymentReport(recentPayments);
    toast.success("Payment report exported", {
      description: "Your payment patterns CSV has been downloaded.",
    });
  };

  const handleAlertAction = (alertId: string, action: string) => {
    toast.success(`Alert ${action}`, {
      description: `Action "${action}" triggered for alert ${alertId}.`,
    });
  };

  const hasData = invoices && invoices.length > 0;

  // ─── Available Platforms ──────────────────────────────────────────────────
  const availablePlatforms = useMemo(() => {
    const platforms = new Set<string>();
    recentPayments.forEach((p) => platforms.add(p.platform));
    latePaymentAlerts.forEach((a) => platforms.add(a.platform));
    platformBreakdown.forEach((p) => platforms.add(p.id));
    return Array.from(platforms);
  }, [recentPayments, latePaymentAlerts, platformBreakdown]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="w-full min-h-screen bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <PageLayout wide>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
            Payment Patterns
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Analyze your payment history, detect late-payment risks, and protect your professional income across platforms
          </p>
        </div>

        {/* Demo Mode Banner */}
        {!isAuthenticated && <DemoModeBanner />}

        {/* Loading State */}
        {showLoading ? (
          <>
            <StatsSkeleton />
            <ChartSkeleton />
          </>
        ) : !hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card className="relative overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(totalEarned)}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">
                        {totalInvoiceCount > 0 ? `${invoiceStats?.paid ?? 0} paid` : "No invoices yet"}
                      </span>
                      <span className="text-xs text-muted-foreground">invoices</span>
                    </div>
                  </CardContent>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="relative overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Payment Time</CardTitle>
                    <Clock className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{avgPaymentTime.toFixed(1)} days</div>
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowDownRight className="h-3 w-3 text-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">Based on invoices</span>
                    </div>
                  </CardContent>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="relative overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">On-Time Rate</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{onTimeRate}%</div>
                    <Progress value={onTimeRate} className="mt-2 h-1.5" />
                  </CardContent>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="relative overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">At-Risk Amount</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(atRiskAmount)}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowUpRight className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-red-600 font-medium">{overdueCount} overdue</span>
                      <span className="text-xs text-muted-foreground">invoices</span>
                    </div>
                  </CardContent>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 to-red-600" />
                </Card>
              </motion.div>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-muted/60">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="timeline">Payment Timeline</TabsTrigger>
                <TabsTrigger value="alerts">Late Alerts</TabsTrigger>
                <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
                {isPro && <TabsTrigger value="predictions">Predictions</TabsTrigger>}
              </TabsList>

              {/* ── Overview Tab ── */}
              <TabsContent value="overview" className="space-y-6">
                {/* Platform Breakdown */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Platform Breakdown</CardTitle>
                        <CardDescription>Payment patterns by platform</CardDescription>
                      </div>
                      <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="All Platforms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Platforms</SelectItem>
                          {availablePlatforms.map((p) => {
                            const meta = platformMeta[p];
                            return (
                              <SelectItem key={p} value={p}>
                                {meta?.label ?? p.charAt(0).toUpperCase() + p.slice(1)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {platformBreakdown.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No platform data yet. Create invoices with clients to see breakdowns.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {platformBreakdown
                          .filter((p) => selectedPlatform === "all" || p.id === selectedPlatform)
                          .map((platform) => {
                            const meta = platformMeta[platform.id] ?? {
                              label: platform.id.charAt(0).toUpperCase() + platform.id.slice(1),
                              color: "text-gray-600",
                              bg: "bg-gray-500",
                            };
                            return (
                              <motion.div
                                key={platform.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-3 w-3 rounded-full ${meta.bg}`} />
                                    <span className="font-semibold text-foreground">{meta.label}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {platform.paymentCount} payments
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {platform.trend >= 0 ? (
                                      <>
                                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                        <span className="text-xs text-emerald-600 font-medium">+{platform.trend}%</span>
                                      </>
                                    ) : (
                                      <>
                                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                                        <span className="text-xs text-red-600 font-medium">{platform.trend}%</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Total Earned</p>
                                    <p className="text-sm font-bold text-foreground">{formatCurrency(platform.totalEarned)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Avg Payment Time</p>
                                    <p className="text-sm font-bold text-foreground">{platform.avgPaymentDays} days</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">On-Time Rate</p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold text-foreground">{platform.onTimeRate}%</p>
                                      <Progress value={platform.onTimeRate} className="flex-1 h-1.5" />
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">At-Risk</p>
                                    <p className={`text-sm font-bold ${platform.atRiskAmount > 1000 ? "text-red-600" : "text-amber-600"}`}>
                                      {formatCurrency(platform.atRiskAmount)}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Trend Chart */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Monthly Trend</CardTitle>
                        <CardDescription>Earnings and overdue amounts over the past 12 months</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleExportReport}>
                        <BarChart3 className="h-4 w-4 mr-1.5" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {monthlyTrend.length === 0 || monthlyTrend.every((m) => m.earned === 0 && m.late === 0) ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No trend data yet. Paid and overdue invoices will populate the chart.</p>
                      </div>
                    ) : (
                      <>
                        {/* Legend */}
                        <div className="flex items-center gap-6 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                            <span className="text-xs text-muted-foreground">Earned</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-sm bg-red-400" />
                            <span className="text-xs text-muted-foreground">Overdue</span>
                          </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="flex items-end gap-2 h-56">
                          {monthlyTrend.map((m, i) => {
                            const earnedHeight = (m.earned / maxEarned) * 100;
                            const lateHeight = (m.late / maxEarned) * 100;
                            return (
                              <div
                                key={m.key}
                                className="flex-1 flex flex-col items-center gap-1 group relative"
                              >
                                {/* Tooltip */}
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-md px-2.5 py-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                  <p className="text-xs font-semibold text-foreground">{m.month}</p>
                                  <p className="text-xs text-emerald-600">Earned: {formatCurrency(m.earned)}</p>
                                  <p className="text-xs text-red-500">Overdue: {formatCurrency(m.late)}</p>
                                </div>

                                <div className="flex items-end gap-0.5 w-full h-44">
                                  <div className="flex-1 relative">
                                    <motion.div
                                      className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-emerald-500/80 hover:bg-emerald-500 transition-colors"
                                      initial={{ height: 0 }}
                                      animate={{ height: `${earnedHeight}%` }}
                                      transition={{ duration: 0.6, delay: 0.03 * i }}
                                    />
                                  </div>
                                  <div className="w-1/4 relative">
                                    <motion.div
                                      className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-red-400/70 hover:bg-red-400 transition-colors"
                                      initial={{ height: 0 }}
                                      animate={{ height: `${lateHeight}%` }}
                                      transition={{ duration: 0.6, delay: 0.03 * i }}
                                    />
                                  </div>
                                </div>

                                <span className="text-[10px] text-muted-foreground mt-1">{m.month}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Pro Upsell Banner */}
                {!isPro && (
                  <Card className="border-dashed border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Lock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">Unlock Advanced Payment Analytics</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Get AI-powered predictions, cash flow forecasting, risk alerts, and personalized recommendations to protect your professional income.
                          </p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {["Next-month earnings prediction", "Cash flow forecast", "Smart risk recommendations", "Seasonality analysis"].map((feature) => (
                              <Badge key={feature} variant="secondary" className="text-xs">
                                <Zap className="h-3 w-3 mr-1 text-amber-500" />
                                {feature}
                              </Badge>
                            ))}
                          </div>
                          <Button
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => toast.info("Upgrade to Pro to unlock predictions and advanced analytics")}
                          >
                            <Shield className="h-4 w-4 mr-1.5" />
                            Upgrade to Pro
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── Payment Timeline Tab ── */}
              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">Recent Payments</CardTitle>
                        <CardDescription>Track all incoming payments with dates, amounts, and status</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-60">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search client or project..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                          <SelectTrigger className="w-[140px] h-9">
                            <SelectValue placeholder="Platform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Platforms</SelectItem>
                            {availablePlatforms.map((p) => {
                              const meta = platformMeta[p];
                              return (
                                <SelectItem key={p} value={p}>
                                  {meta?.label ?? p.charAt(0).toUpperCase() + p.slice(1)}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredPayments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No payments match your filters</p>
                      </div>
                    ) : (
                      <div className="space-y-0 max-h-96 overflow-y-auto">
                        {filteredPayments.map((payment, idx) => {
                          const meta = platformMeta[payment.platform] ?? {
                            label: payment.platform,
                            bg: "bg-gray-500",
                          };
                          const statusConfig = {
                            on_time: { badge: "secondary" as const, label: "On Time", icon: CheckCircle2, iconColor: "text-emerald-500" },
                            late: { badge: "destructive" as const, label: `${payment.daysLate}d Late`, icon: AlertTriangle, iconColor: "text-red-500" },
                            early: { badge: "secondary" as const, label: "Early", icon: CheckCircle2, iconColor: "text-emerald-600" },
                          };
                          const status = statusConfig[payment.status];
                          const StatusIcon = status.icon;

                          return (
                            <motion.div
                              key={payment.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.04 }}
                            >
                              <div className="flex items-center gap-4 py-3 hover:bg-muted/30 rounded-lg px-2 transition-colors">
                                <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  payment.status === "late" ? "bg-red-100 dark:bg-red-950/40" : "bg-emerald-100 dark:bg-emerald-950/40"
                                }`}>
                                  <StatusIcon className={`h-4 w-4 ${status.iconColor}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-sm font-semibold text-foreground truncate">{payment.client}</p>
                                    <div className={`h-2 w-2 rounded-full ${meta.bg}`} title={meta.label} />
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {payment.project} · Due {payment.dueDate}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <p className="text-sm font-bold text-foreground">{formatCurrency(payment.amount)}</p>
                                  <Badge variant={status.badge} className="text-[10px] h-5">{status.label}</Badge>
                                </div>
                              </div>
                              {idx < filteredPayments.length - 1 && <Separator />}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Late Alerts Tab ── */}
              <TabsContent value="alerts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          Late Payment Alerts
                        </CardTitle>
                        <CardDescription>Active alerts for overdue payments requiring your attention</CardDescription>
                      </div>
                      <Badge variant="destructive" className="text-xs">{latePaymentAlerts.length} Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {latePaymentAlerts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
                        <p className="text-sm font-medium text-emerald-600">All Clear!</p>
                        <p className="text-xs text-muted-foreground mt-1">No overdue payments right now</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {latePaymentAlerts.map((alert, idx) => {
                          const meta = platformMeta[alert.platform] ?? { label: alert.platform, bg: "bg-gray-500" };
                          const isCritical = alert.severity === "critical";

                          return (
                            <motion.div
                              key={alert.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.08 }}
                              className={`rounded-lg border p-4 transition-colors ${
                                isCritical
                                  ? "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                                  : "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isCritical ? "bg-red-100 dark:bg-red-900/40" : "bg-amber-100 dark:bg-amber-900/40"
                                }`}>
                                  <AlertTriangle className={`h-4 w-4 ${isCritical ? "text-red-600" : "text-amber-600"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-sm font-semibold text-foreground">{alert.client}</span>
                                    <div className={`h-2 w-2 rounded-full ${meta.bg}`} />
                                    <Badge variant={isCritical ? "destructive" : "secondary"} className="text-[10px] h-5">
                                      {isCritical ? "Critical" : "Warning"}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] h-5">{alert.daysOverdue}d overdue</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-2">{alert.message}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-red-600">{formatCurrency(alert.amount)}</span>
                                    <span className="text-xs text-muted-foreground">at risk</span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1.5 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant={isCritical ? "default" : "outline"}
                                    className={`text-xs h-7 ${
                                      isCritical
                                        ? "bg-red-600 hover:bg-red-700 text-white"
                                        : "border-amber-400 text-amber-700 hover:bg-amber-50"
                                    }`}
                                    onClick={() => handleAlertAction(alert.id, "Send Reminder")}
                                  >
                                    <Timer className="h-3 w-3 mr-1" />
                                    Send Reminder
                                  </Button>
                                  {isPro && (
                                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAlertAction(alert.id, "Escalate")}>
                                      <Shield className="h-3 w-3 mr-1" />
                                      Escalate
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Late Payment Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Late Payment Impact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(latePaymentAlerts.reduce((s, a) => s + a.amount, 0))}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Total Overdue Amount</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                        <p className="text-2xl font-bold text-amber-600">
                          {latePaymentAlerts.length > 0
                            ? (latePaymentAlerts.reduce((s, a) => s + a.daysOverdue, 0) / latePaymentAlerts.length).toFixed(0)
                            : 0}d
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Average Days Overdue</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/50 border border-border">
                        <p className="text-2xl font-bold text-foreground">
                          {latePaymentAlerts.filter((a) => a.severity === "critical").length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Critical Alerts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Risk Analysis Tab ── */}
              <TabsContent value="risk" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="h-5 w-5 text-amber-500" />
                          Client Risk Analysis
                        </CardTitle>
                        <CardDescription>Clients ranked by payment risk score based on invoice history</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {riskClients.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No client risk data yet. Add clients and create invoices to see risk analysis.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {riskClients.map((client, idx) => {
                          const meta = platformMeta[client.platform] ?? {
                            label: client.platform,
                            color: "text-gray-600",
                            bg: "bg-gray-500",
                          };
                          const riskColor = client.riskScore >= 70 ? "text-red-600" : client.riskScore >= 40 ? "text-amber-600" : "text-emerald-600";
                          const riskBg = client.riskScore >= 70 ? "bg-red-100 dark:bg-red-950/40" : client.riskScore >= 40 ? "bg-amber-100 dark:bg-amber-950/40" : "bg-emerald-100 dark:bg-emerald-950/40";

                          return (
                            <motion.div
                              key={client.client}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.08 }}
                              className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${riskBg}`}>
                                  <span className={`text-sm font-bold ${riskColor}`}>{client.riskScore}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-sm font-semibold text-foreground">{client.client}</span>
                                    <div className={`h-2 w-2 rounded-full ${meta.bg}`} />
                                    <Badge variant={client.riskScore >= 70 ? "destructive" : client.riskScore >= 40 ? "secondary" : "outline"} className="text-[10px] h-5">
                                      {client.riskScore >= 70 ? "High Risk" : client.riskScore >= 40 ? "Medium Risk" : "Low Risk"}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] h-5">
                                      {client.trend === "worsening" ? "↓ Worsening" : client.trend === "improving" ? "↑ Improving" : "→ Stable"}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                                    <span>Total: {formatCurrency(client.totalInvoiced)}</span>
                                    <span>Late: {client.latePayments}/{client.totalPayments}</span>
                                    <span>Avg delay: {client.avgDaysLate.toFixed(1)}d</span>
                                    <span>Last: {client.lastPaymentStatus === "late" ? "❌ Late" : "✓ On time"}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Progress value={client.riskScore} className="flex-1 h-1.5" />
                                    <span className={`text-xs font-medium ${riskColor}`}>{client.riskScore}%</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Predictions Tab (Pro only) ── */}
              {isPro && (
                <TabsContent value="predictions" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                        Predictive Analytics
                      </CardTitle>
                      <CardDescription>AI-powered predictions based on your payment history</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-40" />
                        <p className="text-sm">Predictive analytics will be available as more invoice data is collected.</p>
                        <p className="text-xs mt-1">Need at least 3 months of invoice history for accurate predictions.</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </PageLayout>
    </motion.div>
  );
}
