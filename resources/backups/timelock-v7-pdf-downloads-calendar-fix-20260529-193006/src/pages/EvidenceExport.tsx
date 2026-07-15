import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
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
  Package,
  HardDrive,
  Loader2,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { exportEvidence } from "@/lib/exportUtils";

// --- Types ---
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

// --- Mock Data ---
const MOCK_EVIDENCE_TYPES: EvidenceTypeOption[] = [
  { id: "screenshots", label: "Screenshots", icon: <Eye className="h-4 w-4" />, count: 47 },
  { id: "activity_logs", label: "Activity Logs", icon: <FileText className="h-4 w-4" />, count: 128 },
  { id: "work_memos", label: "Work Memos", icon: <FileText className="h-4 w-4" />, count: 23 },
  { id: "compliance_records", label: "Compliance Records", icon: <Shield className="h-4 w-4" />, count: 56 },
];

const MOCK_PROJECTS = [
  { id: "all", label: "All Projects" },
  { id: "proj_1", label: "E-Commerce Redesign" },
  { id: "proj_2", label: "Mobile App MVP" },
  { id: "proj_3", label: "Brand Identity Package" },
  { id: "proj_4", label: "API Integration Layer" },
];

const MOCK_CLIENTS = [
  { id: "all", label: "All Clients" },
  { id: "client_1", label: "TechStart Inc." },
  { id: "client_2", label: "GreenLeaf Studios" },
  { id: "client_3", label: "NovaCorp" },
  { id: "client_4", label: "BlueSky Ventures" },
];

const MOCK_RECENT_EXPORTS: RecentExport[] = [
  {
    id: "exp_001",
    name: "E-Commerce Redesign — Full Evidence",
    format: "legal",
    status: "completed",
    size: "14.2 MB",
    date: "2025-02-28",
    itemCount: 89,
    complianceVerified: true,
    project: "E-Commerce Redesign",
  },
  {
    id: "exp_002",
    name: "Weekly Activity Report",
    format: "pdf",
    status: "completed",
    size: "3.8 MB",
    date: "2025-02-25",
    itemCount: 34,
    complianceVerified: true,
    project: "Mobile App MVP",
  },
  {
    id: "exp_003",
    name: "Work Memos Export",
    format: "csv",
    status: "completed",
    size: "1.1 MB",
    date: "2025-02-22",
    itemCount: 23,
    complianceVerified: false,
    project: "Brand Identity Package",
  },
  {
    id: "exp_004",
    name: "Compliance Audit Package",
    format: "legal",
    status: "processing",
    size: "—",
    date: "2025-03-01",
    itemCount: 56,
    complianceVerified: false,
    project: "API Integration Layer",
  },
  {
    id: "exp_005",
    name: "February Screenshot Archive",
    format: "json",
    status: "failed",
    size: "—",
    date: "2025-02-20",
    itemCount: 47,
    complianceVerified: false,
    project: "E-Commerce Redesign",
  },
];

// --- Helpers ---
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

// --- Sub-Components ---

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
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
          <div className={`rounded-lg p-2.5 ${accent}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FormatOption({
  formatKey,
  selected,
  onSelect,
  locked,
}: {
  formatKey: ExportFormat;
  selected: boolean;
  onSelect: () => void;
  locked: boolean;
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

// --- Main Component ---
export default function EvidenceExport() {
  const { tier } = useSubscriptionTier();

  // State
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv");
  const [dateFrom, setDateFrom] = useState("2025-01-01");
  const [dateTo, setDateTo] = useState("2025-03-01");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedEvidenceTypes, setSelectedEvidenceTypes] = useState<string[]>([
    "screenshots",
    "activity_logs",
    "work_memos",
    "compliance_records",
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [recentExports] = useState<RecentExport[]>(MOCK_RECENT_EXPORTS);

  // Derived
  const totalEvidenceItems = useMemo(
    () => MOCK_EVIDENCE_TYPES.filter((t) => selectedEvidenceTypes.includes(t.id)).reduce((sum, t) => sum + t.count, 0),
    [selectedEvidenceTypes]
  );

  const complianceScore = 94;

  const isFormatLocked = (format: ExportFormat): boolean => {
    const requiredTier = FORMAT_CONFIG[format].tierRequired;
    return !hasTierAccess(tier, requiredTier);
  };

  const toggleEvidenceType = (id: string) => {
    setSelectedEvidenceTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    if (selectedEvidenceTypes.length === 0) {
      toast.error("No evidence types selected", {
        description: "Select at least one evidence type to export.",
      });
      return;
    }

    if (isFormatLocked(selectedFormat)) {
      toast.error("Upgrade required", {
        description: `Export as ${FORMAT_CONFIG[selectedFormat].label} requires a ${FORMAT_CONFIG[selectedFormat].tierRequired} plan or higher.`,
      });
      return;
    }

    setIsExporting(true);

    // Generate a real downloadable file
    try {
      const selectedTypes = MOCK_EVIDENCE_TYPES.filter((t) => selectedEvidenceTypes.includes(t.id));
      exportEvidence(selectedFormat, {
        evidenceTypes: selectedTypes.map((t) => ({ id: t.id, label: t.label, count: t.count })),
        dateRange: `${dateFrom} to ${dateTo}`,
        project: selectedProjectLabel,
        client: selectedClientLabel,
        complianceScore,
        totalItems: totalEvidenceItems,
      });
      toast.success("Export complete", {
        description: `Your ${FORMAT_CONFIG[selectedFormat].label} export with ${totalEvidenceItems} items has been downloaded.`,
      });
    } catch (err) {
      toast.error("Export failed", {
        description: "An error occurred while generating the export file.",
      });
    }

    setIsExporting(false);
  };

  const handleFormatSelect = (format: ExportFormat) => {
    if (isFormatLocked(format)) {
      toast.error("Upgrade required", {
        description: `Export as ${FORMAT_CONFIG[format].label} requires a ${FORMAT_CONFIG[format].tierRequired} plan or higher.`,
      });
      return;
    }
    setSelectedFormat(format);
  };

  // Preview data
  const previewItems = useMemo(() => {
    return MOCK_EVIDENCE_TYPES.filter((t) => selectedEvidenceTypes.includes(t.id));
  }, [selectedEvidenceTypes]);

  const selectedProjectLabel = MOCK_PROJECTS.find((p) => p.id === selectedProject)?.label ?? "All Projects";
  const selectedClientLabel = MOCK_CLIENTS.find((c) => c.id === selectedClient)?.label ?? "All Clients";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full min-h-screen bg-background"
    >
      <div className="p-6 md:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
            Evidence Export
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Package and download your work evidence in court-ready formats with compliance verification.
          </p>
        </div>

        {/* Summary Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Items"
            value={254}
            subtitle="Across all projects"
            icon={<HardDrive className="h-5 w-5 text-primary-foreground" />}
            accent="bg-primary"
          />
          <SummaryCard
            title="Last Export"
            value="2d ago"
            subtitle="Feb 28, 2025"
            icon={<Clock className="h-5 w-5 text-amber-700" />}
            accent="bg-amber-100 dark:bg-amber-900/30"
          />
          <SummaryCard
            title="Compliance Score"
            value={`${complianceScore}%`}
            subtitle="Court-admissible ready"
            icon={<ShieldCheck className="h-5 w-5 text-emerald-700" />}
            accent="bg-emerald-100 dark:bg-emerald-900/30"
          />
          <SummaryCard
            title="Verified Exports"
            value={3}
            subtitle="Compliance-sealed"
            icon={<Shield className="h-5 w-5 text-sky-700" />}
            accent="bg-sky-100 dark:bg-sky-900/30"
          />
        </div>

        {/* Export Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                {/* Date Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Date Range</Label>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 w-full">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <span className="text-muted-foreground text-sm hidden sm:block">to</span>
                    <div className="flex items-center gap-2 flex-1 w-full">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Project & Client Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Project</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger className="w-full">
                        <Briefcase className="h-4 w-4 mr-1 text-muted-foreground" />
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_PROJECTS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
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
                        {MOCK_CLIENTS.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Evidence Type Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Evidence Types</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MOCK_EVIDENCE_TYPES.map((type) => (
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
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {type.count}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Preview & Actions */}
          <div className="space-y-6">
            {/* Export Preview */}
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
                      <span className={FORMAT_CONFIG[selectedFormat].color}>
                        {FORMAT_CONFIG[selectedFormat].icon}
                      </span>
                      <span className="font-medium">{FORMAT_CONFIG[selectedFormat].label}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Date Range</span>
                    <span className="font-medium">
                      {dateFrom} → {dateTo}
                    </span>
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
                        {item.icon}
                        <span>{item.label}</span>
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

                {/* Compliance Badge */}
                {hasTierAccess(tier, "pro") && (
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

                {/* Actions */}
                <div className="space-y-3 pt-1">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleExport}
                    disabled={isExporting || selectedEvidenceTypes.length === 0}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export {FORMAT_CONFIG[selectedFormat].label}
                      </>
                    )}
                  </Button>

                  <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" size="lg">
                        <Eye className="mr-2 h-4 w-4" />
                        Full Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Export Preview — {FORMAT_CONFIG[selectedFormat].label}</DialogTitle>
                        <DialogDescription>
                          Detailed breakdown of your evidence export package.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                        <div className="rounded-lg border p-4 space-y-3">
                          <h4 className="text-sm font-semibold">Package Details</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-muted-foreground">Format:</span>
                            <span className="font-medium">{FORMAT_CONFIG[selectedFormat].label}</span>
                            <span className="text-muted-foreground">Total Items:</span>
                            <span className="font-medium">{totalEvidenceItems}</span>
                            <span className="text-muted-foreground">Est. Size:</span>
                            <span className="font-medium">~{(totalEvidenceItems * 0.12).toFixed(1)} MB</span>
                            <span className="text-muted-foreground">Compliance:</span>
                            <span className="font-medium">
                              {hasTierAccess(tier, "pro") ? "✓ Verified" : "— Upgrade required"}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-lg border p-4 space-y-3">
                          <h4 className="text-sm font-semibold">Included Evidence</h4>
                          {previewItems.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No evidence types selected.</p>
                          ) : (
                            previewItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                                <div className="flex items-center gap-2">
                                  {item.icon}
                                  <span>{item.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-muted-foreground">{item.count} items</span>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="rounded-lg border p-4 space-y-2">
                          <h4 className="text-sm font-semibold">Filters Applied</h4>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                              <Calendar className="h-3 w-3 mr-1" />
                              {dateFrom} → {dateTo}
                            </Badge>
                            <Badge variant="outline">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {selectedProjectLabel}
                            </Badge>
                            <Badge variant="outline">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {selectedClientLabel}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                          Close
                        </Button>
                        <Button
                          onClick={() => {
                            setPreviewOpen(false);
                            handleExport();
                          }}
                          disabled={isExporting}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export Now
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Tier Info */}
            {!hasTierAccess(tier, "pro") && (
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
                      <Button variant="outline" size="sm" className="mt-2 text-xs">
                        <ChevronDown className="mr-1 h-3 w-3" />
                        View Plans
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
                      {/* Format Icon */}
                      <div className={`shrink-0 rounded-lg border p-2.5 bg-background ${fmtConfig.color}`}>
                        {fmtConfig.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">{exp.name}</p>
                          {exp.complianceVerified && (
                            <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 gap-1 text-[10px] px-1.5 py-0">
                              <ShieldCheck className="h-3 w-3" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {exp.project}
                          </span>
                          <span>{exp.itemCount} items</span>
                          {exp.size !== "—" && <span>{exp.size}</span>}
                        </div>
                      </div>

                      {/* Status & Meta */}
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={statusConfig.badgeVariant} className="gap-1">
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{exp.date}</span>
                        {exp.status === "completed" && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                            // Re-download the completed export
                            exportEvidence(exp.format, {
                              evidenceTypes: MOCK_EVIDENCE_TYPES.filter((t) => selectedEvidenceTypes.includes(t.id)).map((t) => ({ id: t.id, label: t.label, count: t.count })),
                              dateRange: `${dateFrom} to ${dateTo}`,
                              project: exp.project,
                              client: "All Clients",
                              complianceScore,
                              totalItems: exp.itemCount,
                            });
                            toast.success("Download started", { description: `${exp.name}` });
                          }}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {exp.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() =>
                              toast.info("Retry initiated", {
                                description: "Re-attempting export...",
                              })
                            }
                          >
                            Retry
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
      </div>
    </motion.div>
  );
}
