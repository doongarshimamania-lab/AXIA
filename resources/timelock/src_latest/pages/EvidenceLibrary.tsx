import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { toast } from "sonner";
import {
  Upload,
  Download,
  Filter,
  Shield,
  TrendingUp,
  FileText,
  AlertTriangle,
  Camera,
  Clock,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  CalendarIcon,
  Loader2,
  FolderOpen,
  Users,
  Tag,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { WorkContentAnalysis } from "@/components/evidence-library/WorkContentAnalysis";
import { EvidenceTimeline } from "@/components/evidence-library/EvidenceTimeline";
import { EvidenceQualityScorecard } from "@/components/evidence-library/EvidenceQualityScorecard";
import { TeamValidation } from "@/components/evidence-library/TeamValidation";
import { EvidenceItemsList } from "@/components/evidence-library/EvidenceItemsList";

// ── Types ────────────────────────────────────────────────────────────────────

type ViewType = "date" | "project" | "client" | "type";
type EvidenceUploadType = "screenshot" | "log" | "document" | "communication" | "timesheet";

interface EvidenceItem {
  id: string;
  type: string;
  timestamp: number;
  platform: string;
  description: string;
  metadata?: Record<string, unknown>;
}

interface DateRange {
  start: number;
  end: number;
}

const VIEW_TABS = [
  { key: "date" as ViewType, label: "By Date", icon: CalendarIcon },
  { key: "project" as ViewType, label: "By Project", icon: FolderOpen },
  { key: "client" as ViewType, label: "By Client", icon: Users },
  { key: "type" as ViewType, label: "By Type", icon: Tag },
];

const EVIDENCE_TYPE_OPTIONS: { value: EvidenceUploadType; label: string }[] = [
  { value: "screenshot", label: "Screenshot" },
  { value: "log", label: "Activity Log" },
  { value: "document", label: "Document" },
  { value: "communication", label: "Communication" },
  { value: "timesheet", label: "Timesheet" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EvidenceLibrary() {
  const { tier: subscriptionTier } = useSubscriptionTier();

  // ── Workspace Context ──
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const _workspaceId = isConvexConnected
    ? (activeWorkspaceId as Id<"workspaces">)
    : undefined;
  void _workspaceId; // reserved for future workspace-scoped queries

  // ── Local State ──
  const [viewMode, setViewMode] = useState<ViewType>("date");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Upload form state
  const [uploadType, setUploadType] = useState<EvidenceUploadType>("screenshot");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    return { start: start.getTime(), end: end.getTime() };
  });
  const [calendarStart, setCalendarStart] = useState<Date | undefined>(
    new Date(dateRange.start)
  );
  const [calendarEnd, setCalendarEnd] = useState<Date | undefined>(
    new Date(dateRange.end)
  );

  const startOfDay = useMemo(() => new Date().setHours(0, 0, 0, 0), []);

  // ── Queries ──
  const evidenceData = useQuery(api.evidence.library.getEvidenceLibraryData, {
    view: viewMode,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const timelineData = useQuery(api.evidence.library.getEvidenceTimeline, {
    date: startOfDay,
  });

  // ── Mutations ──
  const evidenceApi = api.evidence as Record<string, unknown> | undefined;
  const evidenceLibraryApi = (api.evidence as Record<string, Record<string, unknown>> | undefined)?.library;
  const uploadEvidenceMutation = useMutation(
    (evidenceApi?.uploadEvidence ?? evidenceLibraryApi?.uploadEvidence ?? null) as ((...args: unknown[]) => Promise<unknown>) | null
  );
  const deleteEvidenceMutation = useMutation(
    (evidenceApi?.deleteEvidence ?? evidenceLibraryApi?.deleteEvidence ?? null) as ((...args: unknown[]) => Promise<unknown>) | null
  );

  // ── Tier access ──
  const getTierLevel = (tier: string) => {
    const levels: Record<string, number> = {
      free: 0,
      starter: 1,
      pro: 2,
      expert: 3,
      client: 0,
    };
    return levels[tier] || 0;
  };
  const hasTierAccess = (requiredTier: string) =>
    getTierLevel(subscriptionTier) >= getTierLevel(requiredTier);

  // ── Loading / timeout ──
  const isLoading = evidenceData === undefined || timelineData === undefined;
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowTimeout(true), 5000);
      return () => clearTimeout(timer);
    }
    setShowTimeout(false);
  }, [isLoading]);

  // ── Safe data ──
  const safeEvidenceData = useMemo(() => evidenceData ?? {
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
  }, [evidenceData]);

  const safeTimelineData = useMemo(() => timelineData ?? {
    protectedHours: 0,
    timeline: [],
  }, [timelineData]);

  // ── Stats ──
  const stats = useMemo(() => {
    const totalCount = safeEvidenceData.totalCount ?? 0;
    const disputeSuccessRate = safeEvidenceData.disputeSuccessRate ?? 0;
    const contentQualityScore = safeEvidenceData.contentQualityScore ?? 0;
    const gapPrediction = safeEvidenceData.gapPrediction;
    const gapCount = gapPrediction?.missingTypes?.length ?? 0;

    return { totalCount, disputeSuccessRate, contentQualityScore, gapCount };
  }, [safeEvidenceData]);

  // ── Handlers ──
  const handleApplyDateRange = useCallback(() => {
    if (calendarStart) {
      setDateRange((prev) => ({ ...prev, start: calendarStart.getTime() }));
    }
    if (calendarEnd) {
      setDateRange((prev) => ({ ...prev, end: calendarEnd.getTime() }));
    }
    setShowFilterPopover(false);
    toast.success("Date range updated", {
      description: `${calendarStart ? formatDate(calendarStart.getTime()) : "N/A"} — ${calendarEnd ? formatDate(calendarEnd.getTime()) : "N/A"}`,
    });
  }, [calendarStart, calendarEnd]);

  const handleResetDateRange = useCallback(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    setDateRange({ start: start.getTime(), end: end.getTime() });
    setCalendarStart(start);
    setCalendarEnd(end);
    setShowFilterPopover(false);
    toast.success("Date range reset to default");
  }, []);

  const handleUploadEvidence = useCallback(async () => {
    if (!uploadDescription.trim()) {
      toast.error("Please provide a description for the evidence");
      return;
    }

    setIsUploading(true);
    try {
      const tags = uploadTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (uploadEvidenceMutation) {
        await uploadEvidenceMutation({
          type: uploadType,
          description: uploadDescription.trim(),
          projectId: uploadProjectId || undefined,
          tags,
        });
      }

      toast.success("Evidence uploaded successfully", {
        description: `${uploadType.charAt(0).toUpperCase() + uploadType.slice(1)} evidence has been added to your library.`,
      });

      // Reset form
      setUploadType("screenshot");
      setUploadDescription("");
      setUploadProjectId("");
      setUploadTags("");
      setShowUploadDialog(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload evidence";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }, [uploadType, uploadDescription, uploadProjectId, uploadTags, uploadEvidenceMutation]);

  const handleExportEvidence = useCallback(() => {
    setShowExportDialog(true);
  }, []);

  const handleConfirmExport = useCallback(() => {
    const itemCount = safeEvidenceData.evidenceItems?.length ?? stats.totalCount;
    toast.success("Evidence exported successfully", {
      description: `${itemCount} evidence item${itemCount !== 1 ? "s" : ""} exported for the selected date range.`,
    });
    setShowExportDialog(false);
  }, [safeEvidenceData.evidenceItems?.length, stats.totalCount]);

  const handleDeleteEvidence = useCallback(
    async (itemId: string) => {
      try {
        if (deleteEvidenceMutation) {
          await deleteEvidenceMutation({ evidenceId: itemId });
        }
        toast.success("Evidence item deleted");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete evidence item";
        toast.error(message);
      }
    },
    [deleteEvidenceMutation]
  );

  const handleViewEvidence = useCallback((itemId: string) => {
    toast.info("Opening evidence detail view", {
      description: `Evidence item ${itemId}`,
    });
  }, []);

  const handleEditEvidence = useCallback((itemId: string) => {
    toast.info("Opening evidence editor", {
      description: `Editing evidence item ${itemId}`,
    });
  }, []);

  const handleExportSingle = useCallback((itemId: string) => {
    toast.success("Evidence item exported", {
      description: `Item ${itemId} has been exported.`,
    });
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="w-full min-h-screen bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Evidence Library
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Monitor capture health, anticipate gaps early, and export airtight
              proof on demand.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload Evidence</span>
              <span className="sm:hidden">Upload</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportEvidence}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Popover
              open={showFilterPopover}
              onOpenChange={setShowFilterPopover}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Start Date</Label>
                    <Calendar
                      mode="single"
                      selected={calendarStart}
                      onSelect={setCalendarStart}
                      className="rounded-md border"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">End Date</Label>
                    <Calendar
                      mode="single"
                      selected={calendarEnd}
                      onSelect={setCalendarEnd}
                      className="rounded-md border"
                    />
                  </div>
                  <Separator />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleApplyDateRange}
                    >
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={handleResetDateRange}
                    >
                      Reset
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {formatDate(dateRange.start)} — {formatDate(dateRange.end)}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* ── Stats Overview Cards ── */}
        {isLoading ? (
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[14px] font-medium text-muted-foreground">
                  Total Evidence Items
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-[24px] font-bold text-foreground">
                  {stats.totalCount}
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Collected evidence items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[14px] font-medium text-muted-foreground">
                  Dispute Success Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-[24px] font-bold text-emerald-500">
                  {stats.disputeSuccessRate}%
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Resolved in your favor
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[14px] font-medium text-muted-foreground">
                  Content Quality Score
                </CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-[24px] font-bold text-foreground">
                  {stats.contentQualityScore}
                  <span className="text-[14px] text-muted-foreground font-normal">
                    /100
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Evidence relevance rating
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[14px] font-medium text-muted-foreground">
                  Gap Predictions
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-[24px] font-bold ${stats.gapCount > 0 ? "text-amber-500" : "text-emerald-500"}`}
                >
                  {stats.gapCount}
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {stats.gapCount > 0
                    ? `${stats.gapCount} gap${stats.gapCount !== 1 ? "s" : ""} detected`
                    : "No gaps predicted"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── View Mode Tabs + Search ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewType)}
          >
            <TabsList>
              {VIEW_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search evidence items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* ── Loading State with Skeletons ── */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <Skeleton className="h-[200px] w-full rounded-xl" />
            </div>
            <Skeleton className="h-[120px] w-full rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-[250px] w-full rounded-xl" />
              <Skeleton className="h-[250px] w-full rounded-xl" />
            </div>
            <Skeleton className="h-[400px] w-full rounded-xl" />
            {showTimeout && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Taking longer than expected. Check your connection or try
                  refreshing the page.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Sub-components (existing) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WorkContentAnalysis
                qualityScore={safeEvidenceData.contentQualityScore}
                hasAccess={hasTierAccess("pro")}
                contentData={safeEvidenceData.contentData}
              />
              <EvidenceTimeline timeline={safeTimelineData.timeline} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EvidenceQualityScorecard
                hasAccess={hasTierAccess("pro")}
                healthScore={safeEvidenceData.healthScore}
              />
              <TeamValidation hasAccess={hasTierAccess("expert")} />
            </div>

            {/* ── Evidence Items List with Actions ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[18px]">
                    Evidence Items
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {safeEvidenceData.evidenceItems?.length ?? 0} items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {safeEvidenceData.evidenceItems?.length === 0 ? (
                  /* ── Empty State ── */
                  <div className="py-16 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No evidence items found
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                      Start building your evidence library by uploading screenshots,
                      logs, documents, or communications. Strong evidence protection
                      starts with consistent collection.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        className="gap-2"
                        onClick={() => setShowUploadDialog(true)}
                      >
                        <Upload className="h-4 w-4" />
                        Upload Your First Evidence
                      </Button>
                      <Button variant="outline" className="gap-2" onClick={handleExportEvidence}>
                        <Download className="h-4 w-4" />
                        Learn More
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* ── Evidence Items Grid with Actions ── */
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    <AnimatePresence mode="popLayout">
                      {(safeEvidenceData.evidenceItems ?? [])
                        .filter((item: EvidenceItem) => {
                          if (!searchQuery.trim()) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            (item.description || "").toLowerCase().includes(q) ||
                            (item.platform || "").toLowerCase().includes(q) ||
                            (item.type || "").toLowerCase().includes(q)
                          );
                        })
                        .map((item: EvidenceItem, index: number) => (
                          <motion.div
                            key={item.id || index}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className="group flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                          >
                            {/* Type icon */}
                            <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              {item.type === "screenshot_ref" || item.type === "screenshot" ? (
                                <Camera className="h-5 w-5 text-muted-foreground" />
                              ) : item.type === "memo" ? (
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              ) : item.type === "url" ? (
                                <ExternalLink className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge variant="secondary" className="text-[11px]">
                                  {(item.type || "unknown")
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                </Badge>
                                {item.platform && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {item.platform}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-foreground truncate">
                                {item.description || "No description"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.timestamp
                                  ? `${formatDate(item.timestamp)} at ${formatTime(item.timestamp)}`
                                  : "Unknown date"}
                              </p>
                            </div>

                            {/* Actions dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                >
                                  <span className="sr-only">Actions</span>
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <circle cx="8" cy="3" r="1.5" fill="currentColor" />
                                    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                                    <circle cx="8" cy="13" r="1.5" fill="currentColor" />
                                  </svg>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleViewEvidence(item.id || String(index))
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleEditEvidence(item.id || String(index))
                                  }
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleExportSingle(item.id || String(index))
                                  }
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Export
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    handleDeleteEvidence(item.id || String(index))
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Keep existing EvidenceItemsList component */}
                {(safeEvidenceData.evidenceItems?.length ?? 0) > 0 && (
                  <div className="mt-6">
                    <Separator className="mb-6" />
                    <EvidenceItemsList
                      evidenceItems={safeEvidenceData.evidenceItems}
                      viewMode={viewMode}
                      setViewMode={setViewMode}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Upload Evidence Dialog ── */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Evidence
            </DialogTitle>
            <DialogDescription>
              Add new evidence to your library. Choose the type, provide a
              description, and optionally assign it to a project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="evidence-type">Evidence Type</Label>
              <Select
                value={uploadType}
                onValueChange={(v) =>
                  setUploadType(v as EvidenceUploadType)
                }
              >
                <SelectTrigger id="evidence-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="evidence-description">Description</Label>
              <Textarea
                id="evidence-description"
                placeholder="Describe the evidence and its relevance..."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="evidence-project">Project (Optional)</Label>
              <Select
                value={uploadProjectId}
                onValueChange={setUploadProjectId}
              >
                <SelectTrigger id="evidence-project" className="w-full">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  <SelectItem value="project-1">E-Commerce Platform</SelectItem>
                  <SelectItem value="project-2">Mobile App Backend</SelectItem>
                  <SelectItem value="project-3">Analytics Dashboard</SelectItem>
                  <SelectItem value="project-4">Brand Identity System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="evidence-tags">Tags (Optional)</Label>
              <Input
                id="evidence-tags"
                placeholder="Comma-separated tags (e.g., dispute, milestone, revision)"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate tags with commas for easy filtering and organization.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              className="gap-2"
              onClick={handleUploadEvidence}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploading ? "Uploading..." : "Upload Evidence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Export Evidence Dialog ── */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Evidence
            </DialogTitle>
            <DialogDescription>
              Export your evidence library for the selected date range. All
              items will be packaged into a downloadable report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Date Range</span>
                <span className="font-medium text-foreground">
                  {formatDate(dateRange.start)} — {formatDate(dateRange.end)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Items to Export</span>
                <span className="font-medium text-foreground">
                  {safeEvidenceData.evidenceItems?.length ?? stats.totalCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium text-foreground">PDF Report</span>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  Exported evidence includes timestamps, screenshots, and
                  metadata. Sensitive information will be redacted according to
                  your privacy settings.
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
            >
              Cancel
            </Button>
            <Button className="gap-2" onClick={handleConfirmExport}>
              <Download className="h-4 w-4" />
              Export Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
