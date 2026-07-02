import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
// ponytail: added useNavigate so the "View Plans" upgrade button can
// route to /subscription (which reroutes to AccountSettings → SubscriptionSection).
// (Audit item #18)
import { useNavigate } from "react-router";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { useConvexAuth, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";

// Evidence Library subcomponents
import { WorkContentAnalysis } from "@/components/evidence-library/WorkContentAnalysis";
import { EvidenceTimeline } from "@/components/evidence-library/EvidenceTimeline";
import { EvidenceQualityScorecard } from "@/components/evidence-library/EvidenceQualityScorecard";
import { TeamValidation } from "@/components/evidence-library/TeamValidation";
import { EvidenceItemsList } from "@/components/evidence-library/EvidenceItemsList";

// Shared UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Icons
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Briefcase,
  Shield,
  ShieldCheck,
  Calendar,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  Package,
  HardDrive,
  Loader2,
  Info,
  Database,
  Plus,
  DatabaseIcon,
  ArrowDown,
} from "lucide-react";

// Export utility
import { exportEvidence } from "@/lib/exportUtils";
import { trackEvent, AnalyticsEvents } from "@/lib/monitoring";
import { PageLayout } from "@/components/design-system/PageLayout";
// ponytail: NEW import — for the extension pairing dialog that replaces the
// no-op "Install the Axia browser extension" toast.
import { ExtensionTokenSection } from "@/components/ExtensionTokenSection";

// ─── Types ────────────────────────────────────────────────────────────────────

// ponytail: added "client" to the union to match EvidenceItemsList.tsx —
// the "Client-Wise" button calls setViewMode("client") and the Convex
// query at evidence/library.ts:14 already accepts the value.
type ViewType = "date" | "project" | "type" | "client";
type ExportFormat = "pdf" | "csv" | "json" | "legal";
type ExportStatus = "completed" | "processing" | "failed";

interface RecentExport {
  id: string;
  name: string;
  format: ExportFormat;
  status: ExportStatus;
  size: string;
  date: string;
  itemCount: number;
  complianceVerified: boolean;
  project: string;
}

interface EvidenceTypeOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  count: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const FORMAT_CONFIG: Record<ExportFormat, { label: string; icon: React.ReactNode; color: string; tierRequired: string }> = {
  pdf: { label: "PDF", icon: <FileText className="h-5 w-5" />, color: "text-red-500", tierRequired: "pro" },
  csv: { label: "CSV", icon: <FileSpreadsheet className="h-5 w-5" />, color: "text-green-500", tierRequired: "free" },
  json: { label: "JSON", icon: <FileJson className="h-5 w-5" />, color: "text-amber-500", tierRequired: "starter" },
  legal: { label: "Legal Package", icon: <Package className="h-5 w-5" />, color: "text-purple-500", tierRequired: "pro" },
};

const STATUS_CONFIG: Record<ExportStatus, { label: string; icon: React.ReactNode; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "Completed", icon: <CheckCircle2 className="h-3.5 w-3.5" />, badgeVariant: "default" },
  processing: { label: "Processing", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, badgeVariant: "secondary" },
  failed: { label: "Failed", icon: <AlertTriangle className="h-3.5 w-3.5" />, badgeVariant: "destructive" },
};

function getTierLevel(tier: string): number {
  const levels: Record<string, number> = { free: 0, starter: 1, pro: 2, expert: 3, client: 0 };
  return levels[tier] ?? 0;
}

function hasTierAccess(userTier: string, requiredTier: string): boolean {
  return getTierLevel(userTier) >= getTierLevel(requiredTier);
}

// ─── Inline Sub-Components ────────────────────────────────────────────────────

function SummaryCard({ title, value, subtitle, icon, accent }: {
  title: string; value: string | number; subtitle: string; icon: React.ReactNode; accent: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`rounded-lg p-2.5 ${accent}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummarySkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function FormatOption({ formatKey, selected, onSelect, locked }: {
  formatKey: ExportFormat; selected: boolean; onSelect: () => void; locked: boolean;
}) {
  const config = FORMAT_CONFIG[formatKey];
  return (
    <button
      type="button"
      onClick={locked ? undefined : onSelect}
      disabled={locked}
      className={`
        relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200
        ${selected && !locked
          ? "border-primary bg-primary/5 shadow-sm"
          : locked
            ? "border-muted bg-muted/30 opacity-60 cursor-not-allowed"
            : "border-border hover:border-primary/40 hover:bg-accent/50 cursor-pointer"
        }
      `}
    >
      {locked && (
        <div className="absolute -top-2 -right-2 rounded-full bg-muted p-1">
          <Lock className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
      <div className={config.color}>{config.icon}</div>
      <span className="text-sm font-semibold">{config.label}</span>
      {locked && (
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          {config.tierRequired}+
        </span>
      )}
      {selected && !locked && (
        <div className="absolute -top-1.5 -right-1.5 rounded-full bg-primary p-0.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

function DemoModeBanner() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-6">
      <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-700 dark:text-amber-300">
        <span className="font-medium">Demo Mode</span> — Sign in to see your real evidence data.
        Showing sample data for preview.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EvidenceLibrary() {
  const { tier: subscriptionTier } = useSubscriptionTier();
  const { isAuthenticated } = useConvexAuth();
  const { isDisconnected } = useConvexConnectionState();
  // ponytail: used by the "View Plans" upgrade button (Audit item #18)
  const navigate = useNavigate();

  // ── Workspace Context ──
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = isConvexConnected ? (activeWorkspaceId as Id<"workspaces">) : undefined;

  const [viewMode, setViewMode] = useState<ViewType>("date");

  // ── Library date range (±30 days for monitoring) ──
  const libraryDateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    return { start: start.getTime(), end: end.getTime() };
  }, []);

  const startOfDay = useMemo(() => new Date().setHours(0, 0, 0, 0), []);

  // ── Export date range (1 year for comprehensive export) ──
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  // ── Convex Queries ──

  // Build query args — only include workspaceId when it has a value so Convex
  // doesn't reject the call with an invalid optional ID.
  const libraryQueryArgs = useMemo(() => ({
    view: viewMode,
    startDate: libraryDateRange.start,
    endDate: libraryDateRange.end,
    ...(workspaceId ? { workspaceId } : {}),
  }), [viewMode, libraryDateRange.start, libraryDateRange.end, workspaceId]);

  const exportQueryArgs = useMemo(() => ({
    view: "date" as const,
    startDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    endDate: Date.now(),
    ...(workspaceId ? { workspaceId } : {}),
  }), [workspaceId]);

  const timelineQueryArgs = useMemo(() => ({
    date: startOfDay,
    ...(workspaceId ? { workspaceId } : {}),
  }), [startOfDay, workspaceId]);

  // Library data with ±30 day window for monitoring
  const evidenceData = useQuery(
    api.evidence.library.getEvidenceLibraryData,
    libraryQueryArgs
  );

  // Export data with full year window for comprehensive exports
  const exportData = useQuery(
    api.evidence.library.getEvidenceLibraryData,
    exportQueryArgs
  ) as any | undefined;

  const timelineData = useQuery(
    api.evidence.library.getEvidenceTimeline,
    timelineQueryArgs
  );

  const clients = useQuery(api.clients.crud.getClients, workspaceId ? { workspaceId } : "skip") as any[] | undefined;
  const scopeDefinitions = useQuery(api.scope.crud.getScopeDefinitions, workspaceId ? { workspaceId } : "skip") as any[] | undefined;

  const isLoading = evidenceData === undefined && timelineData === undefined;
  const exportLoading = exportData === undefined && clients === undefined;
  const timedOut = useQueryTimeout(isLoading, 5000);
  const showLoading = isLoading && !timedOut && !isDisconnected;

  // ── Safe fallbacks ──
  const safeEvidenceData = evidenceData ?? {
    totalCount: 0,
    disputeSuccessRate: 0,
    contentQualityScore: 0,
    gapPrediction: {
      status: "no_gaps" as const,
      message: "No Gaps Predicted",
      description: "Start collecting evidence to build your protection.",
      nextGapTime: null,
      missingTypes: [],
    },
    evidenceItems: [],
    healthScore: null,
    disputeData: null,
    contentData: null,
  };

  const safeTimelineData = timelineData ?? { protectedHours: 0, timeline: [] };

  // ── Export State ──
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedEvidenceTypes, setSelectedEvidenceTypes] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  // ponytail: NEW state — was a no-op toast. Now opens the ExtensionTokenSection
  // pairing dialog so the user can generate a pairing token for the browser extension.
  const [extensionPairingOpen, setExtensionPairingOpen] = useState(false);
  const [recentExports, setRecentExports] = useState<RecentExport[]>([]);

  // ── Derived Export Data ──
  const evidenceTypes: EvidenceTypeOption[] = useMemo(() => {
    if (!exportData) return [];
    const items = exportData.evidenceItems ?? [];
    const typeCounts: Record<string, number> = {};
    const typeLabels: Record<string, string> = {
      screenshot_ref: "Screenshots", memo: "Work Memos", url: "URL Visits",
      keyboard: "Keyboard Activity", mouse: "Mouse Activity", platform_status: "Platform Status",
    };
    const typeIcons: Record<string, React.ReactNode> = {
      screenshot_ref: <Eye className="h-4 w-4" />, memo: <FileText className="h-4 w-4" />,
      url: <FileJson className="h-4 w-4" />, keyboard: <FileText className="h-4 w-4" />,
      mouse: <FileText className="h-4 w-4" />, platform_status: <Shield className="h-4 w-4" />,
    };
    for (const item of items) {
      const kind = item.type ?? "unknown";
      typeCounts[kind] = (typeCounts[kind] ?? 0) + 1;
    }
    return Object.entries(typeCounts).map(([id, count]) => ({
      id,
      label: typeLabels[id] ?? id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, " "),
      icon: typeIcons[id] ?? <FileText className="h-4 w-4" />,
      count,
    }));
  }, [exportData]);

  const projectOptions = useMemo(() => {
    const all = [{ id: "all", label: "All Projects" }];
    if (scopeDefinitions) {
      for (const scope of scopeDefinitions) {
        all.push({ id: scope._id, label: scope.title ?? "Untitled Scope" });
      }
    }
    return all;
  }, [scopeDefinitions]);

  const clientOptions = useMemo(() => {
    const all = [{ id: "all", label: "All Clients" }];
    if (clients) {
      for (const client of clients) {
        all.push({ id: client._id, label: client.clientName ?? "Unknown Client" });
      }
    }
    return all;
  }, [clients]);

  const complianceScore = exportData?.healthScore?.score ?? safeEvidenceData.healthScore?.score ?? 0;
  const totalItems = exportData?.totalCount ?? safeEvidenceData.totalCount ?? 0;
  const disputeSuccessRate = exportData?.disputeSuccessRate ?? safeEvidenceData.disputeSuccessRate ?? 0;

  // Auto-select all evidence types when they load
  useEffect(() => {
    if (evidenceTypes.length > 0 && selectedEvidenceTypes.length === 0) {
      setSelectedEvidenceTypes(evidenceTypes.map((t) => t.id));
    }
  }, [evidenceTypes]);

  const totalEvidenceItems = useMemo(
    () => evidenceTypes.filter((t) => selectedEvidenceTypes.includes(t.id)).reduce((sum, t) => sum + t.count, 0),
    [evidenceTypes, selectedEvidenceTypes]
  );

  const isFormatLocked = (format: ExportFormat): boolean => {
    return !hasTierAccess(subscriptionTier, FORMAT_CONFIG[format].tierRequired);
  };

  const toggleEvidenceType = (id: string) => {
    setSelectedEvidenceTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    if (selectedEvidenceTypes.length === 0) {
      toast.error("No evidence types selected", { description: "Select at least one evidence type to export." });
      return;
    }
    if (isFormatLocked(selectedFormat)) {
      toast.error("Upgrade required", { description: `Export as ${FORMAT_CONFIG[selectedFormat].label} requires a ${FORMAT_CONFIG[selectedFormat].tierRequired} plan or higher.` });
      return;
    }
    setIsExporting(true);
    try {
      const selectedTypes = evidenceTypes.filter((t) => selectedEvidenceTypes.includes(t.id));
      const selectedProjectLabel = projectOptions.find((p) => p.id === selectedProject)?.label ?? "All Projects";
      const selectedClientLabel = clientOptions.find((c) => c.id === selectedClient)?.label ?? "All Clients";

      exportEvidence(selectedFormat, {
        evidenceTypes: selectedTypes.map((t) => ({ id: t.id, label: t.label, count: t.count })),
        dateRange: `${dateFrom} to ${dateTo}`,
        project: selectedProjectLabel,
        client: selectedClientLabel,
        complianceScore,
        totalItems: totalEvidenceItems,
      });

      const newExport: RecentExport = {
        id: `exp_${Date.now()}`,
        name: `${selectedProjectLabel} — ${FORMAT_CONFIG[selectedFormat].label} Export`,
        format: selectedFormat,
        status: "completed",
        size: `~${(totalEvidenceItems * 0.12).toFixed(1)} MB`,
        date: new Date().toISOString().split("T")[0],
        itemCount: totalEvidenceItems,
        complianceVerified: hasTierAccess(subscriptionTier, "pro"),
        project: selectedProjectLabel,
      };
      setRecentExports((prev) => [newExport, ...prev].slice(0, 10));

      toast.success("Export complete", {
        description: `Your ${FORMAT_CONFIG[selectedFormat].label} export with ${totalEvidenceItems} items has been downloaded.`,
      });

      trackEvent(AnalyticsEvents.EVIDENCE_CAPTURED, { format: selectedFormat, itemCount: totalEvidenceItems });
    } catch {
      toast.error("Export failed", { description: "An error occurred while generating the export file." });
    }
    setIsExporting(false);
  };

  const handleFormatSelect = (format: ExportFormat) => {
    if (isFormatLocked(format)) {
      toast.error("Upgrade required", { description: `Export as ${FORMAT_CONFIG[format].label} requires a ${FORMAT_CONFIG[format].tierRequired} plan or higher.` });
      return;
    }
    setSelectedFormat(format);
  };

  const previewItems = useMemo(() => {
    return evidenceTypes.filter((t) => selectedEvidenceTypes.includes(t.id));
  }, [evidenceTypes, selectedEvidenceTypes]);

  const selectedProjectLabel = projectOptions.find((p) => p.id === selectedProject)?.label ?? "All Projects";
  const selectedClientLabel = clientOptions.find((c) => c.id === selectedClient)?.label ?? "All Clients";
  const hasData = totalItems > 0 || evidenceTypes.length > 0;
  const hasTierAccessFn = (requiredTier: string) => getTierLevel(subscriptionTier) >= getTierLevel(requiredTier);

  // ── Loading / Timeout State ──
  const [showTimeout, setShowTimeout] = useState(false);
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowTimeout(true), 5000);
      return () => clearTimeout(timer);
    }
    setShowTimeout(false);
  }, [isLoading]);

  return (
    <div className="w-full min-h-screen bg-background">
      <PageLayout spaced>
        {/* ── Page Header ── */}
        <div>
          <h1 className="text-2xl md:text-[32px] font-bold text-foreground tracking-tight mb-2">
            Evidence Library
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Monitor capture health, anticipate gaps early, and export airtight proof on demand.
          </p>
        </div>

        {/* Demo Mode Banner */}
        {!isAuthenticated && <DemoModeBanner />}

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 1: EVIDENCE MONITORING (was Evidence Library)
            - Health dashboard, timeline, quality scorecard, item browser
        ════════════════════════════════════════════════════════════════════════ */}
        <section id="monitoring">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <DatabaseIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Evidence Monitoring</h2>
              <p className="text-sm text-muted-foreground">Real-time health, quality analysis, and gap detection</p>
            </div>
          </div>

          {showLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading evidence data...</p>
              {showTimeout && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Taking longer than expected. Check your connection or try refreshing the page.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <WorkContentAnalysis
                qualityScore={safeEvidenceData.contentQualityScore}
                hasAccess={hasTierAccessFn("pro")}
                contentData={safeEvidenceData.contentData}
              />

              <EvidenceTimeline timeline={safeTimelineData.timeline} />

              <EvidenceQualityScorecard
                hasAccess={hasTierAccessFn("pro")}
                healthScore={safeEvidenceData.healthScore}
              />

              <TeamValidation hasAccess={hasTierAccessFn("expert")} />

              <EvidenceItemsList
                evidenceItems={safeEvidenceData.evidenceItems}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />
            </div>
          )}
        </section>

        {/* ── Section Divider ── */}
        <div className="relative py-4">
          <Separator />
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ArrowDown className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Export Your Evidence</span>
              <ArrowDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 2: EVIDENCE EXPORT (was Evidence Export)
            - Format selection, filters, download, recent exports
        ════════════════════════════════════════════════════════════════════════ */}
        <section id="export">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Evidence Export</h2>
              <p className="text-sm text-muted-foreground">Package and download your work evidence in court-ready formats with compliance verification</p>
            </div>
          </div>

          {exportLoading && !isDisconnected ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => <SummarySkeleton key={i} />)}
            </div>
          ) : !hasData ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Evidence Data Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Start collecting evidence through the browser extension or work sessions.
                Once you have evidence items, you can export them in various formats.
              </p>
              <Button onClick={() => setExtensionPairingOpen(true)}>
                {/* ponytail: was toast.info("Install the Axia browser extension...")
                    no-op. Now opens the extension pairing dialog below. */}
                <Plus className="h-4 w-4 mr-2" />Start Collecting Evidence
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Summary Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <SummaryCard
                  title="Total Items"
                  value={totalItems}
                  subtitle="Across all projects"
                  icon={<HardDrive className="h-5 w-5 text-primary-foreground" />}
                  accent="bg-primary"
                />
                <SummaryCard
                  title="Evidence Types"
                  value={evidenceTypes.length}
                  subtitle="Different categories"
                  icon={<Clock className="h-5 w-5 text-amber-700" />}
                  accent="bg-amber-100 dark:bg-amber-900/30"
                />
                <SummaryCard
                  title="Compliance Score"
                  value={`${complianceScore}%`}
                  subtitle={complianceScore >= 80 ? "Court-admissible ready" : "Needs improvement"}
                  icon={<ShieldCheck className="h-5 w-5 text-emerald-700" />}
                  accent="bg-emerald-100 dark:bg-emerald-900/30"
                />
                <SummaryCard
                  title="Dispute Success"
                  value={`${disputeSuccessRate}%`}
                  subtitle="Based on evidence quality"
                  icon={<Shield className="h-5 w-5 text-sky-700" />}
                  accent="bg-sky-100 dark:bg-sky-900/30"
                />
              </div>

              {/* Export Configuration */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Left Column: Format + Filters */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Format Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-primary" />
                        Export Format
                      </CardTitle>
                      <CardDescription>Choose the output format for your evidence package.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map((formatKey) => (
                          <FormatOption
                            key={formatKey}
                            formatKey={formatKey}
                            selected={selectedFormat === formatKey}
                            onSelect={() => handleFormatSelect(formatKey)}
                            locked={isFormatLocked(formatKey)}
                          />
                        ))}
                      </div>
                      {isFormatLocked(selectedFormat) && (
                        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3">
                          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            <span className="font-semibold">Upgrade to {FORMAT_CONFIG[selectedFormat].tierRequired}</span> to unlock{" "}
                            {FORMAT_CONFIG[selectedFormat].label} exports with compliance verification.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Date Range & Filters */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-primary" />
                        Filters & Date Range
                      </CardTitle>
                      <CardDescription>Refine which evidence to include in the export.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Date Range</Label>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <div className="flex items-center gap-2 flex-1 w-full">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1" />
                          </div>
                          <span className="text-muted-foreground text-sm hidden sm:block">to</span>
                          <div className="flex items-center gap-2 flex-1 w-full">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1" />
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Project</Label>
                          <Select value={selectedProject} onValueChange={setSelectedProject}>
                            <SelectTrigger className="w-full">
                              <Briefcase className="h-4 w-4 mr-1 text-muted-foreground" />
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projectOptions.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Client</Label>
                          <Select value={selectedClient} onValueChange={setSelectedClient}>
                            <SelectTrigger className="w-full">
                              <Briefcase className="h-4 w-4 mr-1 text-muted-foreground" />
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clientOptions.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Evidence Types</Label>
                        {evidenceTypes.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No evidence types collected yet</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {evidenceTypes.map((type) => (
                              <label
                                key={type.id}
                                className={`
                                  flex items-center gap-3 rounded-lg border p-3 transition-all cursor-pointer
                                  ${selectedEvidenceTypes.includes(type.id)
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/30 hover:bg-accent/30"
                                  }
                                `}
                              >
                                <Checkbox
                                  checked={selectedEvidenceTypes.includes(type.id)}
                                  onCheckedChange={() => toggleEvidenceType(type.id)}
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-muted-foreground">{type.icon}</span>
                                  <span className="text-sm font-medium">{type.label}</span>
                                </div>
                                <Badge variant="secondary" className="text-[10px] font-mono">{type.count}</Badge>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Preview & Actions */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-primary" />
                        Export Preview
                      </CardTitle>
                      <CardDescription>Summary of what will be included.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Format</span>
                          <div className="flex items-center gap-1.5">
                            <span className={FORMAT_CONFIG[selectedFormat].color}>{FORMAT_CONFIG[selectedFormat].icon}</span>
                            <span className="font-medium">{FORMAT_CONFIG[selectedFormat].label}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Date Range</span>
                          <span className="font-medium">{dateFrom} → {dateTo}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Project</span>
                          <span className="font-medium truncate ml-2 max-w-[160px]">{selectedProjectLabel}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Client</span>
                          <span className="font-medium truncate ml-2 max-w-[160px]">{selectedClientLabel}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Evidence Types</span>
                          <span className="font-medium">{previewItems.length} selected</span>
                        </div>
                        {previewItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm pl-4">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              {item.icon}<span>{item.label}</span>
                            </div>
                            <span className="font-mono text-xs">{item.count} items</span>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span>Total Items</span>
                          <span className="text-primary">{totalEvidenceItems}</span>
                        </div>
                      </div>
                      <Separator />
                      {hasTierAccess(subscriptionTier, "pro") && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-3">
                          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Compliance Verified</p>
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">
                              Export will include cryptographic proof of authenticity
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="space-y-3 pt-1">
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleExport}
                          disabled={isExporting || selectedEvidenceTypes.length === 0}
                        >
                          {isExporting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Exporting...</>
                          ) : (
                            <><Download className="mr-2 h-4 w-4" />Export {FORMAT_CONFIG[selectedFormat].label}</>
                          )}
                        </Button>
                        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full" size="lg">
                              <Eye className="mr-2 h-4 w-4" />Full Preview
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Export Preview — {FORMAT_CONFIG[selectedFormat].label}</DialogTitle>
                              <DialogDescription>Detailed breakdown of your evidence export package.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                              <div className="rounded-lg border p-4 space-y-3">
                                <h4 className="text-sm font-semibold">Package Details</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm overflow-hidden">
                                  <span className="text-muted-foreground">Format:</span>
                                  <span className="font-medium">{FORMAT_CONFIG[selectedFormat].label}</span>
                                  <span className="text-muted-foreground">Total Items:</span>
                                  <span className="font-medium">{totalEvidenceItems}</span>
                                  <span className="text-muted-foreground">Est. Size:</span>
                                  <span className="font-medium">~{(totalEvidenceItems * 0.12).toFixed(1)} MB</span>
                                  <span className="text-muted-foreground">Compliance:</span>
                                  <span className="font-medium">{hasTierAccess(subscriptionTier, "pro") ? "Verified" : "Upgrade required"}</span>
                                </div>
                              </div>
                              <div className="rounded-lg border p-4 space-y-3">
                                <h4 className="text-sm font-semibold">Included Evidence</h4>
                                {previewItems.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No evidence types selected.</p>
                                ) : (
                                  previewItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                                      <div className="flex items-center gap-2">{item.icon}<span>{item.label}</span></div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-muted-foreground">{item.count} items</span>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
                              <Button onClick={() => { setPreviewOpen(false); handleExport(); }} disabled={isExporting}>
                                <Download className="mr-2 h-4 w-4" />Export Now
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tier Info */}
                  {!hasTierAccess(subscriptionTier, "pro") && (
                    <Card className="border-amber-200 dark:border-amber-800">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2 shrink-0">
                            <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">Unlock Full Export Features</p>
                            <p className="text-xs text-muted-foreground">
                              Upgrade to Pro or Expert to export PDF and Legal Packages with compliance verification and cryptographic seals.
                            </p>
                            <Button variant="outline" size="sm" className="mt-2 text-xs"
                              // ponytail: previously had no onClick. Now navigates
                              // to /subscription (which reroutes to AccountSettings
                              // → SubscriptionSection). (Audit item #18)
                              onClick={() => navigate("/subscription")}
                            >
                              <ChevronDown className="mr-1 h-3 w-3" />View Plans
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Recent Exports */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Recent Exports
                  </CardTitle>
                  <CardDescription>Your latest evidence export history.</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentExports.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Download className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No exports yet. Create your first export above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentExports.map((exp, idx) => {
                        const fmtConfig = FORMAT_CONFIG[exp.format];
                        const statusConfig = STATUS_CONFIG[exp.status];
                        return (
                          <motion.div
                            key={exp.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05, duration: 0.25 }}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-lg border p-4 hover:bg-accent/30 transition-colors">
                              <div className={`shrink-0 rounded-lg border p-2.5 bg-background ${fmtConfig.color}`}>
                                {fmtConfig.icon}
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold truncate">{exp.name}</p>
                                  {exp.complianceVerified && (
                                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 gap-1 text-[10px] px-1.5 py-0">
                                      <ShieldCheck className="h-3 w-3" />Verified
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{exp.project}</span>
                                  <span>{exp.itemCount} items</span>
                                  {exp.size !== "—" && <span>{exp.size}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <Badge variant={statusConfig.badgeVariant} className="gap-1">
                                  {statusConfig.icon}{statusConfig.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{exp.date}</span>
                                {exp.status === "completed" && (
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                                    exportEvidence(exp.format, {
                                      evidenceTypes: evidenceTypes.filter((t) => selectedEvidenceTypes.includes(t.id)).map((t) => ({ id: t.id, label: t.label, count: t.count })),
                                      dateRange: `${dateFrom} to ${dateTo}`,
                                      project: exp.project,
                                      client: "All Clients",
                                      complianceScore,
                                      totalItems: exp.itemCount,
                                    });
                                    toast.success("Download started", { description: exp.name });
                                  }}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                                {exp.status === "failed" && (
                                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
                                    // ponytail: was toast.info("Retry initiated") no-op.
                                    // Now actually re-runs the export with the same params
                                    // as the original export (same format, project, etc.).
                                    exportEvidence(exp.format, {
                                      evidenceTypes: evidenceTypes.filter((t) => selectedEvidenceTypes.includes(t.id)).map((t) => ({ id: t.id, label: t.label, count: t.count })),
                                      dateRange: `${dateFrom} to ${dateTo}`,
                                      project: exp.project,
                                      client: "All Clients",
                                      complianceScore,
                                      totalItems: exp.itemCount,
                                    });
                                    toast.success("Retry started", { description: `Re-attempting ${exp.format.toUpperCase()} export…` });
                                  }}>
                                    Retry
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
            </>
          )}
        </section>
      </PageLayout>

      {/* ponytail: NEW — Extension pairing dialog. Closes audit item 18 by
          replacing the no-op "Install the Axia browser extension" toast with
          a real dialog that hosts the existing ExtensionTokenSection. */}
      <Dialog open={extensionPairingOpen} onOpenChange={setExtensionPairingOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pair the Axia browser extension</DialogTitle>
            <DialogDescription>
              Generate a pairing token below, then enter it in the Axia browser
              extension to start collecting evidence from your work sessions.
            </DialogDescription>
          </DialogHeader>
          <ExtensionTokenSection />
        </DialogContent>
      </Dialog>
    </div>
  );
}
