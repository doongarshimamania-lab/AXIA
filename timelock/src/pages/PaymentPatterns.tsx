import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Eye,
  Lock,
  Zap,
  BarChart3,
  Users,
  CreditCard,
  Timer,
  ArrowRight,
  Info,
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
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { exportPaymentReport, generateCSV } from "@/lib/exportUtils";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const platformMeta: Record<string, { label: string; color: string; bg: string }> = {
  upwork: { label: "Upwork", color: "text-emerald-600", bg: "bg-emerald-500" },
  fiverr: { label: "Fiverr", color: "text-green-600", bg: "bg-green-500" },
  toptal: { label: "Toptal", color: "text-red-600", bg: "bg-red-500" },
};

const monthlyTrend = [
  { month: "Jul", earned: 4200, late: 380 },
  { month: "Aug", earned: 5100, late: 620 },
  { month: "Sep", earned: 3800, late: 150 },
  { month: "Oct", earned: 6300, late: 440 },
  { month: "Nov", earned: 5700, late: 290 },
  { month: "Dec", earned: 4900, late: 510 },
  { month: "Jan", earned: 7200, late: 180 },
  { month: "Feb", earned: 6800, late: 350 },
  { month: "Mar", earned: 5400, late: 720 },
  { month: "Apr", earned: 8100, late: 210 },
  { month: "May", earned: 7500, late: 430 },
  { month: "Jun", earned: 9200, late: 160 },
];

const platformBreakdown = [
  {
    id: "upwork",
    totalEarned: 48250,
    avgPaymentDays: 5.2,
    onTimeRate: 91,
    atRiskAmount: 1250,
    paymentCount: 87,
    trend: 12,
  },
  {
    id: "fiverr",
    totalEarned: 21400,
    avgPaymentDays: 3.8,
    onTimeRate: 96,
    atRiskAmount: 480,
    paymentCount: 134,
    trend: 8,
  },
  {
    id: "toptal",
    totalEarned: 36780,
    avgPaymentDays: 7.1,
    onTimeRate: 82,
    atRiskAmount: 2890,
    paymentCount: 42,
    trend: -3,
  },
];

const recentPayments = [
  {
    id: "pay_1",
    client: "TechCorp Solutions",
    platform: "upwork",
    amount: 3400,
    date: "2025-03-04",
    dueDate: "2025-03-01",
    status: "late" as const,
    daysLate: 3,
    project: "API Integration",
  },
  {
    id: "pay_2",
    client: "StartupHub Inc",
    platform: "fiverr",
    amount: 1200,
    date: "2025-03-03",
    dueDate: "2025-03-03",
    status: "on_time" as const,
    daysLate: 0,
    project: "Logo Redesign",
  },
  {
    id: "pay_3",
    client: "Global Enterprises",
    platform: "toptal",
    amount: 8400,
    date: "2025-03-01",
    dueDate: "2025-02-25",
    status: "late" as const,
    daysLate: 4,
    project: "Full-Stack Platform",
  },
  {
    id: "pay_4",
    client: "Digital Marketing Co",
    platform: "upwork",
    amount: 2200,
    date: "2025-02-28",
    dueDate: "2025-02-28",
    status: "on_time" as const,
    daysLate: 0,
    project: "Campaign Dashboard",
  },
  {
    id: "pay_5",
    client: "Creative Studios",
    platform: "fiverr",
    amount: 950,
    date: "2025-02-27",
    dueDate: "2025-02-28",
    status: "early" as const,
    daysLate: 0,
    project: "Brand Guidelines",
  },
  {
    id: "pay_6",
    client: "FinanceFlow Ltd",
    platform: "toptal",
    amount: 6200,
    date: "2025-02-25",
    dueDate: "2025-02-20",
    status: "late" as const,
    daysLate: 5,
    project: "Risk Assessment Tool",
  },
  {
    id: "pay_7",
    client: "HealthTech Inc",
    platform: "upwork",
    amount: 4500,
    date: "2025-02-22",
    dueDate: "2025-02-22",
    status: "on_time" as const,
    daysLate: 0,
    project: "Patient Portal",
  },
];

const latePaymentAlerts = [
  {
    id: "alert_1",
    client: "Global Enterprises",
    platform: "toptal",
    amount: 8400,
    daysOverdue: 4,
    severity: "critical" as const,
    message: "Payment 4 days overdue. This client has a pattern of late payments.",
  },
  {
    id: "alert_2",
    client: "FinanceFlow Ltd",
    platform: "toptal",
    amount: 6200,
    daysOverdue: 5,
    severity: "critical" as const,
    message: "Payment 5 days overdue. Consider escalating to dispute protection.",
  },
  {
    id: "alert_3",
    client: "TechCorp Solutions",
    platform: "upwork",
    amount: 3400,
    daysOverdue: 3,
    severity: "warning" as const,
    message: "Payment 3 days overdue. First late payment from this client.",
  },
];

const riskClients = [
  {
    client: "Global Enterprises",
    platform: "toptal",
    totalInvoiced: 36780,
    latePayments: 7,
    totalPayments: 12,
    avgDaysLate: 4.8,
    riskScore: 82,
    trend: "worsening" as const,
    lastPaymentStatus: "late" as const,
  },
  {
    client: "FinanceFlow Ltd",
    platform: "toptal",
    totalInvoiced: 18600,
    latePayments: 4,
    totalPayments: 8,
    avgDaysLate: 3.2,
    riskScore: 68,
    trend: "stable" as const,
    lastPaymentStatus: "late" as const,
  },
  {
    client: "TechCorp Solutions",
    platform: "upwork",
    totalInvoiced: 14200,
    latePayments: 2,
    totalPayments: 15,
    avgDaysLate: 2.1,
    riskScore: 35,
    trend: "improving" as const,
    lastPaymentStatus: "late" as const,
  },
  {
    client: "DataViz Analytics",
    platform: "upwork",
    totalInvoiced: 9800,
    latePayments: 3,
    totalPayments: 10,
    avgDaysLate: 2.5,
    riskScore: 55,
    trend: "stable" as const,
    lastPaymentStatus: "on_time" as const,
  },
];

// Pro-only: Predictive analytics data
const predictiveData = {
  nextMonthEstimate: 9800,
  confidenceInterval: [8200, 11400] as [number, number],
  predictedLatePayments: 2,
  predictedAtRiskAmount: 1800,
  seasonalityFactor: 1.12,
  topRiskNextMonth: ["Global Enterprises", "FinanceFlow Ltd"],
  recommendedActions: [
    "Request milestone payments for Toptal contracts over $5,000",
    "Set up automated reminders 48 hours before due dates",
    "Consider requiring deposits for clients with risk score > 60",
    "Diversify revenue across platforms to reduce Toptal concentration",
  ],
  cashFlowForecast: [
    { week: "Week 1", expected: 2400, confidence: 92 },
    { week: "Week 2", expected: 3100, confidence: 85 },
    { week: "Week 3", expected: 2800, confidence: 78 },
    { week: "Week 4", expected: 3500, confidence: 70 },
  ],
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Aging Report Component (Task 2) ─────────────────────────────────────────

function AgingReportSection() {
  const agingReport = useQuery(api.billing.crud.getAgingReport, {}) as any;

  const buckets = [
    { key: "current", label: "0-30 Days", color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    { key: "31_60", label: "31-60 Days", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    { key: "61_90", label: "61-90 Days", color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/30" },
    { key: "90_plus", label: "90+ Days", color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/30" },
  ];

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  }

  if (!agingReport) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          Loading aging report...
        </CardContent>
      </Card>
    );
  }

  const summary = agingReport.summary;
  const byClient = agingReport.byClient;

  return (
    <div className="space-y-6">
      {/* Summary Buckets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aging Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Unpaid invoices grouped by days past due · {agingReport.totalUnpaid} unpaid invoice(s)
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {buckets.map((bucket) => (
              <div key={bucket.key} className={`p-4 rounded-lg border ${bucket.border} ${bucket.bg}`}>
                <p className="text-xs font-medium text-muted-foreground mb-1">{bucket.label}</p>
                <p className={`text-2xl font-bold ${bucket.color}`}>
                  {formatCurrency(summary[bucket.key] || 0)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Outstanding</span>
              <span className="text-xl font-bold">{formatCurrency(summary.total || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Client Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Per-Client Aging Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(byClient).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No unpaid invoices found</p>
              <p className="text-sm mt-1">All invoices are paid or in draft status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-right py-2 px-3 font-medium text-emerald-600">0-30d</th>
                    <th className="text-right py-2 px-3 font-medium text-amber-600">31-60d</th>
                    <th className="text-right py-2 px-3 font-medium text-orange-600">61-90d</th>
                    <th className="text-right py-2 px-3 font-medium text-red-600">90+d</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">#</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byClient).map(([clientName, data]: [string, any]) => (
                    <tr key={clientName} className="border-b border-border hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{clientName}</td>
                      <td className="py-2 px-3 text-right">{data.current > 0 ? formatCurrency(data.current) : "—"}</td>
                      <td className="py-2 px-3 text-right">{data["31_60"] > 0 ? formatCurrency(data["31_60"]) : "—"}</td>
                      <td className="py-2 px-3 text-right">{data["61_90"] > 0 ? formatCurrency(data["61_90"]) : "—"}</td>
                      <td className="py-2 px-3 text-right">{data["90_plus"] > 0 ? formatCurrency(data["90_plus"]) : "—"}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(data.total)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{data.invoiceCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentPatterns() {
  const { tier } = useSubscriptionTier();
  const isPro = tier === "pro" || tier === "expert";
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Aggregate stats
  const totalEarned = platformBreakdown.reduce((s, p) => s + p.totalEarned, 0);
  const avgPaymentTime =
    platformBreakdown.reduce((s, p) => s + p.avgPaymentDays * p.paymentCount, 0) /
    platformBreakdown.reduce((s, p) => s + p.paymentCount, 0);
  const onTimeRate = Math.round(
    platformBreakdown.reduce((s, p) => s + p.onTimeRate * p.paymentCount, 0) /
      platformBreakdown.reduce((s, p) => s + p.paymentCount, 0)
  );
  const atRiskAmount = platformBreakdown.reduce((s, p) => s + p.atRiskAmount, 0);

  // Filter payments
  const filteredPayments = recentPayments.filter((p) => {
    const matchesPlatform = selectedPlatform === "all" || p.platform === selectedPlatform;
    const matchesSearch =
      searchQuery === "" ||
      p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.project.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  const maxEarned = Math.max(...monthlyTrend.map((m) => m.earned));

  const handleExportReport = () => {
    // Export the full payment data as CSV
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

  return (
    <motion.div
      className="w-full min-h-screen bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
            Payment Patterns
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Analyze your payment history, detect late-payment risks, and protect your freelance income across platforms
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Earned
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalEarned)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">+9.2%</span>
                  <span className="text-xs text-muted-foreground">vs last year</span>
                </div>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Payment Time
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {avgPaymentTime.toFixed(1)} days
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">-0.8 days</span>
                  <span className="text-xs text-muted-foreground">improving</span>
                </div>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  On-Time Rate
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{onTimeRate}%</div>
                <Progress value={onTimeRate} className="mt-2 h-1.5" />
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  At-Risk Amount
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(atRiskAmount)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-600 font-medium">+$640</span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
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
            <TabsTrigger value="aging">Aging Report</TabsTrigger>
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
                      <SelectItem value="upwork">Upwork</SelectItem>
                      <SelectItem value="fiverr">Fiverr</SelectItem>
                      <SelectItem value="toptal">Toptal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {platformBreakdown
                    .filter((p) => selectedPlatform === "all" || p.id === selectedPlatform)
                    .map((platform) => {
                      const meta = platformMeta[platform.id];
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
                              <p className="text-sm font-bold text-foreground">
                                {formatCurrency(platform.totalEarned)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Avg Payment Time</p>
                              <p className="text-sm font-bold text-foreground">
                                {platform.avgPaymentDays} days
                              </p>
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
              </CardContent>
            </Card>

            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Monthly Trend</CardTitle>
                    <CardDescription>Earnings and late payment amounts over the past 12 months</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportReport}>
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Legend */}
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">Earned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-red-400" />
                    <span className="text-xs text-muted-foreground">Late Amount</span>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="flex items-end gap-2 h-56">
                  {monthlyTrend.map((m) => {
                    const earnedHeight = (m.earned / maxEarned) * 100;
                    const lateHeight = (m.late / maxEarned) * 100;
                    return (
                      <div
                        key={m.month}
                        className="flex-1 flex flex-col items-center gap-1 group relative"
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-md px-2.5 py-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                          <p className="text-xs font-semibold text-foreground">{m.month}</p>
                          <p className="text-xs text-emerald-600">Earned: {formatCurrency(m.earned)}</p>
                          <p className="text-xs text-red-500">Late: {formatCurrency(m.late)}</p>
                        </div>

                        <div className="flex items-end gap-0.5 w-full h-44">
                          {/* Earned bar */}
                          <div className="flex-1 relative">
                            <motion.div
                              className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-emerald-500/80 hover:bg-emerald-500 transition-colors"
                              initial={{ height: 0 }}
                              animate={{ height: `${earnedHeight}%` }}
                              transition={{ duration: 0.6, delay: 0.03 * monthlyTrend.indexOf(m) }}
                            />
                          </div>
                          {/* Late bar */}
                          <div className="w-1/4 relative">
                            <motion.div
                              className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-red-400/70 hover:bg-red-400 transition-colors"
                              initial={{ height: 0 }}
                              animate={{ height: `${lateHeight}%` }}
                              transition={{ duration: 0.6, delay: 0.03 * monthlyTrend.indexOf(m) }}
                            />
                          </div>
                        </div>

                        <span className="text-[10px] text-muted-foreground mt-1">{m.month}</span>
                      </div>
                    );
                  })}
                </div>
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
                      <h3 className="font-semibold text-foreground mb-1">
                        Unlock Advanced Payment Analytics
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Get AI-powered predictions, cash flow forecasting, risk alerts, and personalized
                        recommendations to protect your freelance income.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {[
                          "Next-month earnings prediction",
                          "Cash flow forecast",
                          "Smart risk recommendations",
                          "Seasonality analysis",
                        ].map((feature) => (
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
                    <Input
                      placeholder="Search client or project..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Platforms</SelectItem>
                        <SelectItem value="upwork">Upwork</SelectItem>
                        <SelectItem value="fiverr">Fiverr</SelectItem>
                        <SelectItem value="toptal">Toptal</SelectItem>
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
                  <div className="space-y-0">
                    {filteredPayments.map((payment, idx) => {
                      const meta = platformMeta[payment.platform];
                      const statusConfig = {
                        on_time: {
                          badge: "secondary" as const,
                          label: "On Time",
                          icon: CheckCircle2,
                          iconColor: "text-emerald-500",
                        },
                        late: {
                          badge: "destructive" as const,
                          label: `${payment.daysLate}d Late`,
                          icon: AlertTriangle,
                          iconColor: "text-red-500",
                        },
                        early: {
                          badge: "secondary" as const,
                          label: "Early",
                          icon: CheckCircle2,
                          iconColor: "text-emerald-600",
                        },
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
                            {/* Status icon */}
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                              payment.status === "late"
                                ? "bg-red-100 dark:bg-red-950/40"
                                : "bg-emerald-100 dark:bg-emerald-950/40"
                            }`}>
                              <StatusIcon className={`h-4 w-4 ${status.iconColor}`} />
                            </div>

                            {/* Main info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {payment.client}
                                </p>
                                <div className={`h-2 w-2 rounded-full ${meta.bg}`} title={meta.label} />
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {payment.project} · Due {formatDate(payment.dueDate)}
                              </p>
                            </div>

                            {/* Amount & badge */}
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <p className="text-sm font-bold text-foreground">
                                {formatCurrency(payment.amount)}
                              </p>
                              <Badge variant={status.badge} className="text-[10px] h-5">
                                {status.label}
                              </Badge>
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
                    <CardDescription>
                      Active alerts for overdue payments requiring your attention
                    </CardDescription>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {latePaymentAlerts.length} Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {latePaymentAlerts.map((alert, idx) => {
                    const meta = platformMeta[alert.platform];
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
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isCritical
                                ? "bg-red-100 dark:bg-red-900/40"
                                : "bg-amber-100 dark:bg-amber-900/40"
                            }`}
                          >
                            <AlertTriangle
                              className={`h-4 w-4 ${
                                isCritical ? "text-red-600" : "text-amber-600"
                              }`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">
                                {alert.client}
                              </span>
                              <div className={`h-2 w-2 rounded-full ${meta.bg}`} />
                              <Badge
                                variant={isCritical ? "destructive" : "secondary"}
                                className="text-[10px] h-5"
                              >
                                {isCritical ? "Critical" : "Warning"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-5">
                                {alert.daysOverdue}d overdue
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{alert.message}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-red-600">
                                {formatCurrency(alert.amount)}
                              </span>
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
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => handleAlertAction(alert.id, "Escalate")}
                              >
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
                      {latePaymentAlerts.reduce((s, a) => s + a.daysOverdue, 0) / latePaymentAlerts.length}d
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
                    <CardDescription>
                      Clients with late payment patterns ranked by risk score
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {riskClients
                    .sort((a, b) => b.riskScore - a.riskScore)
                    .map((client, idx) => {
                      const meta = platformMeta[client.platform];
                      const lateRate = Math.round(
                        (client.latePayments / client.totalPayments) * 100
                      );
                      const riskLevel =
                        client.riskScore >= 70
                          ? "High"
                          : client.riskScore >= 40
                          ? "Medium"
                          : "Low";
                      const riskColor =
                        client.riskScore >= 70
                          ? "text-red-600"
                          : client.riskScore >= 40
                          ? "text-amber-600"
                          : "text-emerald-600";
                      const riskBg =
                        client.riskScore >= 70
                          ? "bg-red-100 dark:bg-red-950/30"
                          : client.riskScore >= 40
                          ? "bg-amber-100 dark:bg-amber-950/30"
                          : "bg-emerald-100 dark:bg-emerald-950/30";

                      return (
                        <motion.div
                          key={client.client}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.06 }}
                          className="border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-full ${riskBg} flex items-center justify-center`}>
                                <span className={`text-sm font-bold ${riskColor}`}>
                                  {client.riskScore}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {client.client}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <div className={`h-2 w-2 rounded-full ${meta.bg}`} />
                                  <span className="text-xs text-muted-foreground">{meta.label}</span>
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrency(client.totalInvoiced)} invoiced
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge
                                variant={
                                  riskLevel === "High"
                                    ? "destructive"
                                    : riskLevel === "Medium"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="text-[10px]"
                              >
                                {riskLevel} Risk
                              </Badge>
                              <div className="flex items-center gap-1">
                                {client.trend === "worsening" && (
                                  <TrendingDown className="h-3 w-3 text-red-500" />
                                )}
                                {client.trend === "improving" && (
                                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                                )}
                                {client.trend === "stable" && (
                                  <ArrowRight className="h-3 w-3 text-amber-500" />
                                )}
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  {client.trend}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                Late Payments
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {client.latePayments}/{client.totalPayments}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                Late Rate
                              </p>
                              <p className={`text-sm font-semibold ${lateRate > 30 ? "text-red-600" : lateRate > 15 ? "text-amber-600" : "text-foreground"}`}>
                                {lateRate}%
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                Avg Days Late
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {client.avgDaysLate}d
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                Risk Score
                              </p>
                              <div className="flex items-center gap-2">
                                <Progress value={client.riskScore} className="flex-1 h-1.5" />
                                <span className={`text-xs font-medium ${riskColor}`}>
                                  {client.riskScore}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Platform Risk Concentration - Pro feature */}
            {isPro ? (
              <Card className="border-amber-300 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-600" />
                    <CardTitle className="text-lg">Platform Risk Concentration</CardTitle>
                    <Badge className="bg-amber-600 text-white text-[10px] h-5">Pro</Badge>
                  </div>
                  <CardDescription>
                    Analysis of your payment risk distribution across platforms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {platformBreakdown.map((platform) => {
                      const meta = platformMeta[platform.id];
                      const concentrationPct = Math.round(
                        (platform.totalEarned / totalEarned) * 100
                      );
                      const riskPct = Math.round(
                        (platform.atRiskAmount / atRiskAmount) * 100
                      );
                      return (
                        <div key={platform.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`h-2.5 w-2.5 rounded-full ${meta.bg}`} />
                              <span className="text-sm font-medium text-foreground">{meta.label}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {concentrationPct}% of revenue · {riskPct}% of risk
                            </span>
                          </div>
                          <div className="flex gap-1 h-3">
                            <div
                              className={`rounded-sm ${meta.bg} opacity-70`}
                              style={{ width: `${concentrationPct}%` }}
                            />
                            <div
                              className="rounded-sm bg-red-400"
                              style={{ width: `${riskPct}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <div className={`h-2 w-2 rounded-sm ${meta.bg} opacity-70`} />
                              Revenue share
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="h-2 w-2 rounded-sm bg-red-400" />
                              Risk share
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <Separator />
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                      <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Insight:</strong> Toptal represents{" "}
                        {Math.round((platformBreakdown[2].totalEarned / totalEarned) * 100)}% of your
                        revenue but{" "}
                        {Math.round((platformBreakdown[2].atRiskAmount / atRiskAmount) * 100)}% of your
                        risk. Consider diversifying or implementing milestone-based payments for Toptal
                        contracts.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2 border-border bg-muted/20">
                <CardContent className="p-6 text-center">
                  <Lock className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                  <h3 className="font-semibold text-foreground mb-1">Platform Risk Concentration</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    See how your payment risk is distributed across platforms with Pro
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => toast.info("Upgrade to Pro to unlock platform risk analysis")}
                  >
                    <Eye className="h-4 w-4 mr-1.5" />
                    Unlock with Pro
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Aging Report Tab (Task 2) ── */}
          <TabsContent value="aging" className="space-y-4">
            <AgingReportSection />
          </TabsContent>

          {/* ── Predictions Tab (Pro only) ── */}
          {isPro && (
            <TabsContent value="predictions" className="space-y-4">
              {/* Next Month Prediction */}
              <Card className="border-amber-300 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-600" />
                    <CardTitle className="text-lg">AI-Powered Predictions</CardTitle>
                    <Badge className="bg-amber-600 text-white text-[10px] h-5">Pro</Badge>
                  </div>
                  <CardDescription>
                    Machine learning predictions based on your payment history and seasonal patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-background border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Next Month Estimate</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(predictiveData.nextMonthEstimate)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Range: {formatCurrency(predictiveData.confidenceInterval[0])} –{" "}
                        {formatCurrency(predictiveData.confidenceInterval[1])}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-background border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Predicted Late Payments</p>
                      <p className="text-2xl font-bold text-red-600">
                        {predictiveData.predictedLatePayments}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        At-risk: {formatCurrency(predictiveData.predictedAtRiskAmount)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-background border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Seasonality Factor</p>
                      <p className="text-2xl font-bold text-foreground">
                        {(predictiveData.seasonalityFactor * 100 - 100).toFixed(0)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Above baseline trend
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cash Flow Forecast */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-amber-500" />
                    Cash Flow Forecast
                  </CardTitle>
                  <CardDescription>Weekly expected income with confidence levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {predictiveData.cashFlowForecast.map((week, idx) => (
                      <motion.div
                        key={week.week}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="flex items-center gap-4"
                      >
                        <span className="text-sm font-medium text-foreground w-16 flex-shrink-0">
                          {week.week}
                        </span>
                        <div className="flex-1 flex items-center gap-3">
                          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(week.expected / 4000) * 100}%`,
                              }}
                              transition={{ duration: 0.6, delay: idx * 0.1 }}
                            />
                            <span className="absolute inset-y-0 left-3 flex items-center text-[11px] font-semibold text-white">
                              {formatCurrency(week.expected)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 w-20">
                            <Progress
                              value={week.confidence}
                              className="flex-1 h-1.5"
                            />
                            <span className="text-[10px] text-muted-foreground w-8 text-right">
                              {week.confidence}%
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-sm bg-emerald-500" />
                        Expected income
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-sm bg-muted" />
                        Confidence level
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Risk Clients Next Month */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Predicted Risk Clients Next Month
                  </CardTitle>
                  <CardDescription>
                    Clients most likely to have late payments based on historical patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {predictiveData.topRiskNextMonth.map((client) => (
                      <Badge key={client} variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {client}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommended Actions */}
              <Card className="border-emerald-300 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-emerald-600" />
                    Recommended Actions
                  </CardTitle>
                  <CardDescription>
                    AI-generated suggestions to protect your income
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {predictiveData.recommendedActions.map((action, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border hover:bg-muted/20 transition-colors"
                      >
                        <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-emerald-600">{idx + 1}</span>
                        </div>
                        <p className="text-sm text-foreground">{action}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto flex-shrink-0 text-xs h-7"
                          onClick={() =>
                            toast.success("Action applied", {
                              description: `Recommendation #${idx + 1} has been noted.`,
                            })
                          }
                        >
                          Apply
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </motion.div>
  );
}
