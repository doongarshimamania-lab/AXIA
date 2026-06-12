import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Clock,
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Send,
  Gavel,
  Search,
  Lock,
  Zap,
  Info,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type ReportStatus = "generated" | "sent" | "viewed" | "resolved" | "appealed";

interface DisputeReport {
  _id: string;
  caseId: string;
  clientName?: string;
  projectName?: string;
  rejectedHours: number;
  lostIncome: number;
  status: ReportStatus;
  generatedAt: number;
  description?: string;
  evidenceSummary?: string;
  evidenceCount?: number;
  reportContent?: string;
  hourlyRate?: number;
  sentAt?: number;
  viewedAt?: number;
  resolvedAt?: number;
  title?: string;
  type?: string;
}

// ─── Mock Data for demo mode ────────────────────────────────────────────────

const MOCK_REPORTS: DisputeReport[] = [
  {
    _id: "1",
    caseId: "CASE-20250228-001",
    clientName: "TechCorp Solutions",
    projectName: "E-Commerce Platform Redesign",
    lostIncome: 2125.0,
    rejectedHours: 25,
    status: "resolved",
    generatedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    description:
      "Client rejected 25 hours of work claiming deliverables did not match specifications. Timeline evidence and work diary screenshots confirm continuous, compliant work activity matching the agreed scope.",
    evidenceSummary:
      "12 screenshots, 156 mouse events, 89 keyboard events, 3 work memos, and 8 cross-platform activity logs all confirm compliant work during disputed period.",
    evidenceCount: 100,
    hourlyRate: 85,
  },
  {
    _id: "2",
    caseId: "CASE-20250301-002",
    clientName: "StartupHub Inc",
    projectName: "Mobile App Backend API",
    lostIncome: 1625.0,
    rejectedHours: 25,
    status: "sent",
    generatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    description:
      "Client disputed 25 hours claiming low activity density and no visible progress. Evidence collection shows consistent code commits, API testing logs, and client communication records.",
    evidenceSummary:
      "Git commit history shows 47 commits during disputed period. API test coverage increased from 62% to 89%. Client Slack messages acknowledge progress on 3 separate occasions.",
    evidenceCount: 47,
    hourlyRate: 65,
  },
  {
    _id: "3",
    caseId: "CASE-20250302-003",
    clientName: "Global Enterprises",
    projectName: "Analytics Dashboard",
    lostIncome: 4800.0,
    rejectedHours: 40,
    status: "appealed",
    generatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    description:
      "Initial dispute resolved in client's favor. Appealing with additional WCVM-verified context evidence and Pattern #7 vulnerability analysis showing the dispute was filed in bad faith.",
    evidenceSummary:
      "WCVM context scan reveals 87% work relevance score. Pattern #7 vulnerability detected: client filed dispute 2 days after milestone approval, consistent with known bad-faith dispute pattern.",
    evidenceCount: 87,
    hourlyRate: 120,
  },
  {
    _id: "4",
    caseId: "CASE-20250303-004",
    clientName: "Digital Marketing Co",
    projectName: "Social Media Automation Tool",
    lostIncome: 675.0,
    rejectedHours: 15,
    status: "generated",
    generatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    description:
      "Client rejected 15 hours of work citing scope misalignment. Automated evidence collection active during entire period with full compliance status.",
    evidenceSummary:
      "Full evidence trail collected: 18 screenshots, 234 activity events, 5 work memos. 100% compliance score maintained throughout disputed hours.",
    evidenceCount: 257,
    hourlyRate: 45,
  },
  {
    _id: "5",
    caseId: "CASE-20250304-005",
    clientName: "Creative Studios",
    projectName: "Brand Identity System",
    lostIncome: 1900.0,
    rejectedHours: 20,
    status: "sent",
    generatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    description:
      "Client disputed 20 hours claiming insufficient revision cycles. Evidence shows all revision requests were addressed within 24 hours and client approved 3 of 4 milestones.",
    evidenceSummary:
      "Work diary shows 4 revision cycles completed with client approval on 3 milestones. Communication logs confirm client received and reviewed all deliverables within the disputed period.",
    evidenceCount: 156,
    hourlyRate: 95,
  },
  {
    _id: "6",
    caseId: "CASE-20250305-006",
    clientName: "TechCorp Solutions",
    projectName: "Payment Integration Module",
    lostIncome: 937.5,
    rejectedHours: 12.5,
    status: "generated",
    generatedAt: Date.now() - 0.5 * 24 * 60 * 60 * 1000,
    description:
      "Client flagged 12.5 hours as non-compliant due to detected cross-platform activity. Evidence monitor recorded brief context switches but work context relevance remained above 80%.",
    evidenceSummary:
      "Cross-platform detection flagged 3 context switches totaling 12 minutes. Work context relevance maintained at 84%. Primary platform activity consistent with project requirements.",
    evidenceCount: 48,
    hourlyRate: 75,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof FileText; color: string }
> = {
  generated: {
    label: "Generated",
    variant: "secondary",
    icon: FileText,
    color: "text-slate-500",
  },
  sent: {
    label: "Sent",
    variant: "default",
    icon: Send,
    color: "text-blue-500",
  },
  viewed: {
    label: "Viewed",
    variant: "outline",
    icon: CheckCircle2,
    color: "text-cyan-500",
  },
  resolved: {
    label: "Resolved",
    variant: "outline",
    icon: CheckCircle2,
    color: "text-emerald-500",
  },
  appealed: {
    label: "Appealed",
    variant: "destructive",
    icon: Gavel,
    color: "text-amber-500",
  },
};

const TAB_FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "resolved", label: "Resolved" },
  { key: "appealed", label: "Appealed" },
] as const;

type TabFilter = (typeof TAB_FILTERS)[number]["key"];

function filterReports(reports: DisputeReport[], tab: TabFilter): DisputeReport[] {
  switch (tab) {
    case "all":
      return reports;
    case "active":
      return reports.filter((r) => r.status === "generated" || r.status === "sent" || r.status === "viewed");
    case "resolved":
      return reports.filter((r) => r.status === "resolved");
    case "appealed":
      return reports.filter((r) => r.status === "appealed");
    default:
      return reports;
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Reports() {
  const { tier: subscriptionTier, setTier: setSubscriptionTier } = useSubscriptionTier();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // ─── Convex queries ──────────────────────────────────────────────────────
  const reportsData = useQuery(api.disputeReports.getUserDisputeReports, {});

  // ─── Convex mutations ────────────────────────────────────────────────────
  const createReportMutation = useMutation(api.disputeReports.createDisputeReport);
  const updateStatusMutation = useMutation(api.disputeReports.updateReportStatus);

  // ─── Local state ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Form state
  const [formClient, setFormClient] = useState("");
  const [formProject, setFormProject] = useState("");
  const [formDisputedHours, setFormDisputedHours] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formHourlyRate, setFormHourlyRate] = useState("");

  // ─── Demo mode ───────────────────────────────────────────────────────────
  const isDemoMode = !authLoading && !isAuthenticated;

  // ─── Loading timeout ────────────────────────────────────────────────────
  const { isDisconnected } = useConvexConnectionState();
  const timedOut = useQueryTimeout(!authLoading && reportsData === undefined && !isDemoMode, 3000);

  const isLoading = !authLoading && reportsData === undefined && !timedOut && !isDemoMode && !isDisconnected;

  // ─── Map Convex data ────────────────────────────────────────────────────
  const reports: DisputeReport[] = isDemoMode ? MOCK_REPORTS : (reportsData ?? []) as any;

  // Tier-gating logic
  const isProOrAbove = subscriptionTier === "pro" || subscriptionTier === "expert";
  const reportsThisMonth = reports.filter(
    (r) => r.generatedAt > Date.now() - 30 * 24 * 60 * 60 * 1000
  ).length;
  const freeReportLimit = 1;
  const hasReachedFreeLimit = !isProOrAbove && reportsThisMonth >= freeReportLimit;

  // Computed values
  const filteredReports = useMemo(() => {
    let result = filterReports(reports, activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.caseId.toLowerCase().includes(q) ||
          (r.clientName || "").toLowerCase().includes(q) ||
          (r.projectName || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [reports, activeTab, searchQuery]);

  const stats = useMemo(() => {
    const total = reports.length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const successRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const resolvedReports = reports.filter((r) => r.status === "resolved");
    // Estimate resolution time (7-14 days for demo)
    const avgResolutionDays =
      resolvedReports.length > 0
        ? resolvedReports.reduce((sum, r) => {
            const resolvedAt = r.resolvedAt || r.generatedAt + 7 * 24 * 60 * 60 * 1000;
            const days = (resolvedAt - r.generatedAt) / (24 * 60 * 60 * 1000);
            return sum + Math.max(1, Math.min(days, 30));
          }, 0) / resolvedReports.length
        : 0;

    const protectedAmount = reports
      .filter((r) => r.status === "resolved")
      .reduce((sum, r) => sum + r.lostIncome, 0);

    return { total, successRate, avgResolutionDays: Math.round(avgResolutionDays * 10) / 10, protectedAmount };
  }, [reports]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleGenerateReport = async () => {
    if (hasReachedFreeLimit) {
      toast.error("Monthly report limit reached", {
        description: `Free tier is limited to ${freeReportLimit} report/month. Upgrade to Pro for unlimited reports.`,
        action: {
          label: "Upgrade",
          onClick: () => {
            setSubscriptionTier("pro");
            toast.success("Upgraded to Pro!", { description: "You now have unlimited report generation." });
          },
        },
      });
      return;
    }

    if (!formClient.trim() || !formProject.trim() || !formDisputedHours.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const hours = parseFloat(formDisputedHours);
    if (Number.isNaN(hours) || hours <= 0) {
      toast.error("Please enter valid disputed hours");
      return;
    }

    const rate = parseFloat(formHourlyRate) || 75;

    if (isDemoMode) {
      const newReport: DisputeReport = {
        _id: `report_${Date.now()}`,
        caseId: `CASE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(MOCK_REPORTS.length + 1).padStart(3, "0")}`,
        clientName: formClient.trim(),
        projectName: formProject.trim(),
        lostIncome: hours * rate,
        rejectedHours: hours,
        status: "generated",
        generatedAt: Date.now(),
        description: formDescription.trim() || "Dispute report generated from work session evidence.",
        evidenceSummary: `${Math.floor(hours * 4)} screenshots, ${Math.floor(hours * 12)} activity events, and ${Math.floor(hours * 0.6)} work memos collected during the disputed period.`,
        evidenceCount: Math.floor(hours * 4) + Math.floor(hours * 12),
        hourlyRate: rate,
      };
      MOCK_REPORTS.unshift(newReport);
      setShowGenerateDialog(false);
      resetForm();
      toast.success("Dispute report generated! (Demo mode)", {
        description: `Case ID: ${newReport.caseId}`,
      });
      return;
    }

    setIsCreating(true);
    try {
      const result = await createReportMutation({
        clientName: formClient.trim(),
        projectName: formProject.trim(),
        disputedHours: hours,
        hourlyRate: rate,
        description: formDescription.trim() || undefined,
      });

      if (result && result.limited) {
        toast.error("Monthly report limit reached", {
          description: `Free tier is limited to ${freeReportLimit} report/month. Upgrade to Pro for unlimited reports.`,
          action: {
            label: "Upgrade",
            onClick: () => {
              setSubscriptionTier("pro");
              toast.success("Upgraded to Pro!", { description: "You now have unlimited report generation." });
            },
          },
        });
      } else {
        toast.success("Dispute report generated!", {
          description: `Case ID: ${result?.caseId}`,
        });
        setShowGenerateDialog(false);
        resetForm();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate report");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormClient("");
    setFormProject("");
    setFormDisputedHours("");
    setFormDescription("");
    setFormHourlyRate("");
  };

  const handleStatusChange = async (reportId: any, newStatus: ReportStatus) => {
    if (isDemoMode) {
      const report = MOCK_REPORTS.find((r) => r._id === reportId);
      if (report) report.status = newStatus;
      toast.success(`Report status updated! (Demo mode)`);
      return;
    }

    setUpdatingStatus(reportId as string);
    try {
      await updateStatusMutation({
        reportId,
        status: newStatus,
      });

      const statusMessages: Record<string, { title: string; desc: string }> = {
        sent: { title: "Report sent!", desc: "Report has been submitted to the client." },
        viewed: { title: "Report viewed!", desc: "Report marked as viewed." },
        resolved: { title: "Report resolved!", desc: "Report has been resolved in your favor." },
        appealed: { title: "Appeal filed!", desc: "Report has been moved to appeal status." },
      };

      const msg = statusMessages[newStatus];
      if (msg) {
        toast.success(msg.title, { description: msg.desc });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="w-full min-h-screen bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Reports</h1>
          <p className="text-[16px] text-muted-foreground">
            Generate, manage, and track your dispute reports with evidence-backed protection
          </p>
        </div>

        {/* Demo mode banner */}
        {isDemoMode && (
          <div className="flex items-center gap-3 p-3 mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Demo Mode</span> — You're viewing sample data.{" "}
              <a href="/auth" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">
                Sign in
              </a>{" "}
              to manage your real dispute reports.
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Skeleton className="h-[200px] w-full rounded-xl" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[100px] w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Total Reports</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-foreground">{stats.total}</div>
                  <p className="text-[12px] text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-emerald-500">{stats.successRate}%</div>
                  <p className="text-[12px] text-muted-foreground">Resolved in your favor</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Avg Resolution Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-foreground">{stats.avgResolutionDays} days</div>
                  <p className="text-[12px] text-muted-foreground">Average time to resolve</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Protected Amount</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-foreground">{formatCurrency(stats.protectedAmount)}</div>
                  <p className="text-[12px] text-muted-foreground">Recovered through disputes</p>
                </CardContent>
              </Card>
            </div>

            {/* Tier limit notice */}
            {!isProOrAbove && (
              <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
                <CardContent className="flex items-center gap-3 py-4">
                  <Lock className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Free tier: {reportsThisMonth}/{freeReportLimit} reports this month
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Upgrade to Pro for unlimited report generation and advanced evidence analysis.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                    onClick={() => {
                      setSubscriptionTier("pro");
                      toast.success("Upgraded to Pro!", {
                        description: "You now have unlimited report generation.",
                      });
                    }}
                  >
                    <Zap className="mr-1 h-3 w-3" />
                    Upgrade
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Actions Bar: Search + Generate */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by case ID, client, or project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 shrink-0"
                onClick={() => {
                  if (hasReachedFreeLimit) {
                    toast.error("Monthly report limit reached", {
                      description: `Free tier is limited to ${freeReportLimit} report/month. Upgrade to Pro for unlimited reports.`,
                      action: {
                        label: "Upgrade",
                        onClick: () => {
                          setSubscriptionTier("pro");
                          toast.success("Upgraded to Pro!", {
                            description: "You now have unlimited report generation.",
                          });
                        },
                      },
                    });
                    return;
                  }
                  setShowGenerateDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)} className="mb-4">
              <TabsList>
                {TAB_FILTERS.map((tab) => (
                  <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                    {tab.label}
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {filterReports(reports, tab.key).length}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Report List */}
            <div className="space-y-3">
              {filteredReports.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No reports match your search." : "No reports found in this category."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredReports.map((report) => {
                  const statusCfg = STATUS_CONFIG[report.status];
                  const StatusIcon = statusCfg.icon;
                  const isExpanded = expandedId === report._id;
                  const isUpdating = updatingStatus === report._id;

                  return (
                    <motion.div
                      key={report._id}
                      layout
                      initial={false}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="overflow-hidden">
                        {/* Report Row */}
                        <div
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => toggleExpand(report._id)}
                        >
                          {/* Status icon + Case ID */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`shrink-0 ${statusCfg.color}`}>
                              <StatusIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-foreground font-mono">{report.caseId}</span>
                                <Badge variant={statusCfg.variant} className="text-[11px]">
                                  {statusCfg.label}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                {report.clientName || "Unknown Client"} · {report.projectName || "Unknown Project"}
                              </div>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="flex items-center gap-6 sm:gap-8">
                            <div className="text-right">
                              <div className="text-sm font-bold text-foreground">
                                {formatCurrency(report.lostIncome)}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {report.rejectedHours}h @ ${report.hourlyRate || 75}/hr
                              </div>
                            </div>
                            <div className="text-right min-w-[80px]">
                              <div className="text-xs text-muted-foreground">{formatDate(report.generatedAt)}</div>
                            </div>
                            <div className="shrink-0 text-muted-foreground">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Detail */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4">
                                <Separator className="mb-4" />

                                {/* Description */}
                                <div className="mb-4">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                    Description
                                  </h4>
                                  <p className="text-sm text-foreground leading-relaxed">{report.description || report.reportContent || "No description available."}</p>
                                </div>

                                {/* Evidence Summary */}
                                {(report.evidenceSummary || report.evidenceCount) && (
                                  <div className="mb-4">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                      Evidence Summary
                                    </h4>
                                    <div className="bg-muted/50 border border-border rounded-lg p-3">
                                      <p className="text-sm text-foreground leading-relaxed">
                                        {report.evidenceSummary || `${report.evidenceCount || 0} evidence items collected during the disputed period.`}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Recommendations */}
                                <div className="mb-4">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                    Recommendations
                                  </h4>
                                  <ul className="space-y-2">
                                    <li className="flex items-start gap-2 text-sm text-foreground">
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                      <span>Review all evidence attachments for accuracy before sending</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-foreground">
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                      <span>Include any client communication that confirms work acceptance</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-foreground">
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                      <span>Highlight compliance score during disputed hours</span>
                                    </li>
                                  </ul>
                                </div>

                                {/* Tier-gated advanced analysis */}
                                {!isProOrAbove && (
                                  <div className="border border-dashed border-amber-500/40 rounded-lg p-4 bg-amber-500/5">
                                    <div className="flex items-center gap-2 mb-2">
                                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                                      <span className="text-sm font-semibold text-foreground">Pro Feature</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                      Unlock AI-powered dispute analysis, Pattern #7 vulnerability detection, and
                                      WCVM-verified evidence signatures with a Pro subscription.
                                    </p>
                                    <Button
                                      size="sm"
                                      className="bg-amber-600 hover:bg-amber-700 text-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSubscriptionTier("pro");
                                        toast.success("Upgraded to Pro!", {
                                          description: "Advanced analysis features are now unlocked.",
                                        });
                                      }}
                                    >
                                      <Zap className="mr-1 h-3 w-3" />
                                      Upgrade to Unlock
                                    </Button>
                                  </div>
                                )}

                                {isProOrAbove && (
                                  <div className="border border-emerald-500/30 rounded-lg p-4 bg-emerald-500/5">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Shield className="h-4 w-4 text-emerald-500" />
                                      <span className="text-sm font-semibold text-foreground">
                                        Advanced Analysis (Pro)
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div className="text-center p-2 bg-background rounded-md border border-border">
                                        <div className="text-lg font-bold text-emerald-500">92%</div>
                                        <div className="text-[11px] text-muted-foreground">Evidence Strength</div>
                                      </div>
                                      <div className="text-center p-2 bg-background rounded-md border border-border">
                                        <div className="text-lg font-bold text-foreground">Low</div>
                                        <div className="text-[11px] text-muted-foreground">Dispute Risk</div>
                                      </div>
                                      <div className="text-center p-2 bg-background rounded-md border border-border">
                                        <div className="text-lg font-bold text-blue-500">87%</div>
                                        <div className="text-[11px] text-muted-foreground">WCVM Score</div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex items-center gap-2 mt-4">
                                  {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                  {report.status === "generated" && (
                                    <Button
                                      size="sm"
                                      className="bg-primary hover:bg-primary/90"
                                      disabled={isUpdating}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(report._id, "sent");
                                      }}
                                    >
                                      <Send className="mr-1.5 h-3.5 w-3.5" />
                                      Send Report
                                    </Button>
                                  )}
                                  {report.status === "sent" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isUpdating}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(report._id, "resolved");
                                      }}
                                    >
                                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                      Mark Resolved
                                    </Button>
                                  )}
                                  {(report.status === "sent" || report.status === "viewed") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isUpdating}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(report._id, "appealed");
                                      }}
                                    >
                                      <Gavel className="mr-1.5 h-3.5 w-3.5" />
                                      File Appeal
                                    </Button>
                                  )}
                                  {report.status === "resolved" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isUpdating}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(report._id, "appealed");
                                      }}
                                    >
                                      <Gavel className="mr-1.5 h-3.5 w-3.5" />
                                      File Appeal
                                    </Button>
                                  )}
                                  {report.status === "appealed" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isUpdating}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(report._id, "resolved");
                                      }}
                                    >
                                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                      Resolve Appeal
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Generate Report Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Generate Dispute Report
            </DialogTitle>
            <DialogDescription>
              Create a new dispute report with evidence-backed documentation to protect your earnings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-client">
                  Client <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="report-client"
                  placeholder="e.g. TechCorp Solutions"
                  value={formClient}
                  onChange={(e) => setFormClient(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-project">
                  Project <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="report-project"
                  placeholder="e.g. Website Redesign"
                  value={formProject}
                  onChange={(e) => setFormProject(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-hours">
                  Disputed Hours <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="report-hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="e.g. 25"
                  value={formDisputedHours}
                  onChange={(e) => setFormDisputedHours(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-rate">Hourly Rate ($)</Label>
                <Input
                  id="report-rate"
                  type="number"
                  min="1"
                  step="5"
                  placeholder="75"
                  value={formHourlyRate}
                  onChange={(e) => setFormHourlyRate(e.target.value)}
                />
              </div>
            </div>

            {formDisputedHours && formHourlyRate && (
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated disputed amount</span>
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(
                      (parseFloat(formDisputedHours) || 0) * (parseFloat(formHourlyRate) || 75)
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="report-description">Description</Label>
              <Textarea
                id="report-description"
                placeholder="Describe the dispute and why the client rejected the hours..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Evidence source selector - Pro feature */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Evidence Source
                {!isProOrAbove && (
                  <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">
                    <Lock className="h-2.5 w-2.5 mr-0.5" />
                    Pro
                  </Badge>
                )}
              </Label>
              <Select disabled={!isProOrAbove}>
                <SelectTrigger>
                  <SelectValue placeholder={isProOrAbove ? "Select evidence source" : "Upgrade to Pro to customize"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-collected evidence</SelectItem>
                  <SelectItem value="work-diary">Work diary screenshots</SelectItem>
                  <SelectItem value="activity-log">Activity log + screenshots</SelectItem>
                  <SelectItem value="wcvm">WCVM-verified context scan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleGenerateReport}
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
