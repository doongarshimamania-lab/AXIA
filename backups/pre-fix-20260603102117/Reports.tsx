import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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

// ─── Types ───────────────────────────────────────────────────────────────────

type ReportStatus = "generated" | "sent" | "resolved" | "appealed";

interface DisputeReport {
  id: string;
  caseId: string;
  client: string;
  project: string;
  amountDisputed: number;
  disputedHours: number;
  status: ReportStatus;
  generatedAt: number;
  description: string;
  evidenceSummary: string;
  recommendations: string[];
  hourlyRate: number;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_REPORTS: DisputeReport[] = [
  {
    id: "1",
    caseId: "CASE-20250228-001",
    client: "TechCorp Solutions",
    project: "E-Commerce Platform Redesign",
    amountDisputed: 2125.0,
    disputedHours: 25,
    status: "resolved",
    generatedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    description:
      "Client rejected 25 hours of work claiming deliverables did not match specifications. Timeline evidence and work diary screenshots confirm continuous, compliant work activity matching the agreed scope.",
    evidenceSummary:
      "12 screenshots, 156 mouse events, 89 keyboard events, 3 work memos, and 8 cross-platform activity logs all confirm compliant work during disputed period.",
    recommendations: [
      "Submit work diary screenshots with timestamp overlay as primary evidence",
      "Reference milestone approval email from Feb 10 as scope confirmation",
      "Highlight 92% compliance score during disputed hours",
    ],
    hourlyRate: 85,
  },
  {
    id: "2",
    caseId: "CASE-20250301-002",
    client: "StartupHub Inc",
    project: "Mobile App Backend API",
    amountDisputed: 1625.0,
    disputedHours: 25,
    status: "sent",
    generatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    description:
      "Client disputed 25 hours claiming low activity density and no visible progress. Evidence collection shows consistent code commits, API testing logs, and client communication records.",
    evidenceSummary:
      "Git commit history shows 47 commits during disputed period. API test coverage increased from 62% to 89%. Client Slack messages acknowledge progress on 3 separate occasions.",
    recommendations: [
      "Attach git commit log with timestamps as primary evidence",
      "Include API test coverage report showing measurable progress",
      "Reference client's Slack acknowledgments as implied approval",
    ],
    hourlyRate: 65,
  },
  {
    id: "3",
    caseId: "CASE-20250302-003",
    client: "Global Enterprises",
    project: "Analytics Dashboard",
    amountDisputed: 4800.0,
    disputedHours: 40,
    status: "appealed",
    generatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    description:
      "Initial dispute resolved in client's favor. Appealing with additional WCVM-verified context evidence and Pattern #7 vulnerability analysis showing the dispute was filed in bad faith.",
    evidenceSummary:
      "WCVM context scan reveals 87% work relevance score. Pattern #7 vulnerability detected: client filed dispute 2 days after milestone approval, consistent with known bad-faith dispute pattern.",
    recommendations: [
      "Emphasize WCVM verification signature as independent audit trail",
      "Present Pattern #7 vulnerability analysis showing bad-faith filing timeline",
      "Request platform arbitration with cross-platform evidence correlation",
    ],
    hourlyRate: 120,
  },
  {
    id: "4",
    caseId: "CASE-20250303-004",
    client: "Digital Marketing Co",
    project: "Social Media Automation Tool",
    amountDisputed: 675.0,
    disputedHours: 15,
    status: "generated",
    generatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    description:
      "Client rejected 15 hours of work citing scope misalignment. Automated evidence collection active during entire period with full compliance status.",
    evidenceSummary:
      "Full evidence trail collected: 18 screenshots, 234 activity events, 5 work memos. 100% compliance score maintained throughout disputed hours.",
    recommendations: [
      "Review and send report with full evidence attachment",
      "Include scope agreement document from project kickoff",
      "Highlight 100% compliance score during disputed period",
    ],
    hourlyRate: 45,
  },
  {
    id: "5",
    caseId: "CASE-20250304-005",
    client: "Creative Studios",
    project: "Brand Identity System",
    amountDisputed: 1900.0,
    disputedHours: 20,
    status: "sent",
    generatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    description:
      "Client disputed 20 hours claiming insufficient revision cycles. Evidence shows all revision requests were addressed within 24 hours and client approved 3 of 4 milestones.",
    evidenceSummary:
      "Work diary shows 4 revision cycles completed with client approval on 3 milestones. Communication logs confirm client received and reviewed all deliverables within the disputed period.",
    recommendations: [
      "Attach milestone approval records as primary evidence",
      "Include revision turnaround time analysis (avg 18hrs vs 24hr SLA)",
      "Reference client's milestone approval as implied acceptance",
    ],
    hourlyRate: 95,
  },
  {
    id: "6",
    caseId: "CASE-20250305-006",
    client: "TechCorp Solutions",
    project: "Payment Integration Module",
    amountDisputed: 937.5,
    disputedHours: 12.5,
    status: "generated",
    generatedAt: Date.now() - 0.5 * 24 * 60 * 60 * 1000,
    description:
      "Client flagged 12.5 hours as non-compliant due to detected cross-platform activity. Evidence monitor recorded brief context switches but work context relevance remained above 80%.",
    evidenceSummary:
      "Cross-platform detection flagged 3 context switches totaling 12 minutes. Work context relevance maintained at 84%. Primary platform activity consistent with project requirements.",
    recommendations: [
      "Acknowledge context switches but emphasize 84% relevance score",
      "Provide minute-by-minute activity breakdown for disputed period",
      "Reference platform policy on acceptable idle/switching thresholds",
    ],
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
      return reports.filter((r) => r.status === "generated" || r.status === "sent");
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
  const [reports, setReports] = useState<DisputeReport[]>(MOCK_REPORTS);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formClient, setFormClient] = useState("");
  const [formProject, setFormProject] = useState("");
  const [formDisputedHours, setFormDisputedHours] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formHourlyRate, setFormHourlyRate] = useState("");

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
          r.client.toLowerCase().includes(q) ||
          r.project.toLowerCase().includes(q)
      );
    }
    return result;
  }, [reports, activeTab, searchQuery]);

  const stats = useMemo(() => {
    const total = reports.length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const successRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const resolvedReports = reports.filter((r) => r.status === "resolved");
    const avgResolutionDays =
      resolvedReports.length > 0
        ? resolvedReports.reduce((sum, r) => {
            // Simulate resolution time (7-14 days for demo)
            const days = 7 + Math.floor(Math.random() * 8);
            return sum + days;
          }, 0) / resolvedReports.length
        : 0;

    const protectedAmount = reports
      .filter((r) => r.status === "resolved")
      .reduce((sum, r) => sum + r.amountDisputed, 0);

    return { total, successRate, avgResolutionDays: Math.round(avgResolutionDays * 10) / 10, protectedAmount };
  }, [reports]);

  // Handlers
  const handleGenerateReport = () => {
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
    const newReport: DisputeReport = {
      id: `report_${Date.now()}`,
      caseId: `CASE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(reports.length + 1).padStart(3, "0")}`,
      client: formClient.trim(),
      project: formProject.trim(),
      amountDisputed: hours * rate,
      disputedHours: hours,
      status: "generated",
      generatedAt: Date.now(),
      description: formDescription.trim() || "Dispute report generated from work session evidence.",
      evidenceSummary: `${Math.floor(hours * 4)} screenshots, ${Math.floor(hours * 12)} activity events, and ${Math.floor(hours * 0.6)} work memos collected during the disputed period.`,
      recommendations: [
        "Review all evidence attachments for accuracy before sending",
        "Include any client communication that confirms work acceptance",
        "Highlight compliance score during disputed hours",
      ],
      hourlyRate: rate,
    };

    setReports((prev) => [newReport, ...prev]);
    setShowGenerateDialog(false);
    resetForm();
    toast.success("Dispute report generated!", {
      description: `Case ID: ${newReport.caseId}`,
    });
  };

  const resetForm = () => {
    setFormClient("");
    setFormProject("");
    setFormDisputedHours("");
    setFormDescription("");
    setFormHourlyRate("");
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
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Reports</h1>
          <p className="text-[16px] text-muted-foreground">
            Generate, manage, and track your dispute reports with evidence-backed protection
          </p>
        </div>

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
              const isExpanded = expandedId === report.id;

              return (
                <motion.div
                  key={report.id}
                  layout
                  initial={false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="overflow-hidden">
                    {/* Report Row */}
                    <div
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleExpand(report.id)}
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
                            {report.client} · {report.project}
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-6 sm:gap-8">
                        <div className="text-right">
                          <div className="text-sm font-bold text-foreground">
                            {formatCurrency(report.amountDisputed)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {report.disputedHours}h @ ${report.hourlyRate}/hr
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
                              <p className="text-sm text-foreground leading-relaxed">{report.description}</p>
                            </div>

                            {/* Evidence Summary */}
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                Evidence Summary
                              </h4>
                              <div className="bg-muted/50 border border-border rounded-lg p-3">
                                <p className="text-sm text-foreground leading-relaxed">{report.evidenceSummary}</p>
                              </div>
                            </div>

                            {/* Recommendations */}
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                Recommendations
                              </h4>
                              <ul className="space-y-2">
                                {report.recommendations.map((rec, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                    <span>{rec}</span>
                                  </li>
                                ))}
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
                              {report.status === "generated" && (
                                <Button
                                  size="sm"
                                  className="bg-primary hover:bg-primary/90"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReports((prev) =>
                                      prev.map((r) => (r.id === report.id ? { ...r, status: "sent" as const } : r))
                                    );
                                    toast.success("Report sent!", {
                                      description: `${report.caseId} has been submitted to the client.`,
                                    });
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReports((prev) =>
                                      prev.map((r) =>
                                        r.id === report.id ? { ...r, status: "resolved" as const } : r
                                      )
                                    );
                                    toast.success("Report marked as resolved!", {
                                      description: `${report.caseId} has been resolved in your favor.`,
                                    });
                                  }}
                                >
                                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                  Mark Resolved
                                </Button>
                              )}
                              {(report.status === "sent" || report.status === "resolved") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReports((prev) =>
                                      prev.map((r) =>
                                        r.id === report.id ? { ...r, status: "appealed" as const } : r
                                      )
                                    );
                                    toast.info("Appeal filed", {
                                      description: `${report.caseId} has been moved to appeal status.`,
                                    });
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReports((prev) =>
                                      prev.map((r) =>
                                        r.id === report.id ? { ...r, status: "resolved" as const } : r
                                      )
                                    );
                                    toast.success("Appeal resolved!", {
                                      description: `${report.caseId} appeal has been resolved.`,
                                    });
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
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleGenerateReport}>
              <FileText className="mr-1.5 h-4 w-4" />
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
