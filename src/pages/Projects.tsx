import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Share2,
  Search,
  Briefcase,
  Shield,
  Clock,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Activity,
  Archive,
  ChevronRight,
  FolderOpen,
  CheckCircle2,
  Zap,
  Info,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { useWorkspacePermissions, usePermissions } from "@/hooks/use-permissions";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { ShareDialog } from "@/components/ShareDialog";
import { useNavigate } from "react-router";

// Feature Components
import { ProjectList } from "@/components/project-protection/ProjectList";

// ─── Types ─────────────────────────────────────────────────────────────────

// ─── Mock data for demo mode (unauthenticated) ──────────────────────────────

const MOCK_PROJECTS = [
  {
    _id: "proj_1" as any,
    projectName: "E-Commerce Platform Redesign",
    clientId: "client_1" as any,
    hourlyRate: 95,
    projectType: "ongoing" as const,
    protectionLevel: "maximum" as const,
    protectionScore: 92,
    totalHours: 148.5,
    totalValue: 14107,
    atRiskAmount: 0,
    activeSession: true,
    rejectedHours: 0,
    status: "active" as const,
    createdAt: Date.now() - 75 * 24 * 60 * 60 * 1000,
    sharing: [],
  },
  {
    _id: "proj_2" as any,
    projectName: "Mobile Banking App MVP",
    clientId: "client_2" as any,
    hourlyRate: 120,
    projectType: "milestone" as const,
    protectionLevel: "enhanced" as const,
    protectionScore: 78,
    totalHours: 213.0,
    totalValue: 25560,
    atRiskAmount: 3600,
    activeSession: false,
    rejectedHours: 4,
    status: "active" as const,
    createdAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
    sharing: [],
  },
  {
    _id: "proj_3" as any,
    projectName: "SaaS Dashboard Analytics",
    clientId: "client_3" as any,
    hourlyRate: 85,
    projectType: "fixed" as const,
    protectionLevel: "standard" as const,
    protectionScore: 65,
    totalHours: 96.0,
    totalValue: 8160,
    atRiskAmount: 2550,
    activeSession: false,
    rejectedHours: 8,
    status: "paused" as const,
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    sharing: [],
  },
  {
    _id: "proj_4" as any,
    projectName: "Healthcare Portal Integration",
    clientId: "client_4" as any,
    hourlyRate: 110,
    projectType: "ongoing" as const,
    protectionLevel: "enhanced" as const,
    protectionScore: 85,
    totalHours: 172.0,
    totalValue: 18920,
    atRiskAmount: 0,
    activeSession: false,
    rejectedHours: 0,
    status: "active" as const,
    createdAt: Date.now() - 200 * 24 * 60 * 60 * 1000,
    sharing: [],
  },
  {
    _id: "proj_5" as any,
    projectName: "Legacy API Migration",
    clientId: "client_5" as any,
    hourlyRate: 75,
    projectType: "fixed" as const,
    protectionLevel: "standard" as const,
    protectionScore: 42,
    totalHours: 64.0,
    totalValue: 4800,
    atRiskAmount: 4800,
    activeSession: false,
    rejectedHours: 12,
    status: "archived" as const,
    createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
    sharing: [],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function timeAgo(timestamp: number | undefined): string {
  if (!timestamp) return "—";
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

function getProtectionLevelColor(level: string) {
  switch (level) {
    case "standard":
      return "text-sky-600 bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800";
    case "enhanced":
      return "text-violet-600 bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800";
    case "maximum":
      return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800";
    default:
      return "text-muted-foreground bg-muted border-border";
  }
}

function getProtectionScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getProtectionScoreBg(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function getProjectTypeIcon(type: string) {
  switch (type) {
    case "ongoing":
      return <Activity className="h-3.5 w-3.5" />;
    case "fixed":
      return <DollarSign className="h-3.5 w-3.5" />;
    case "milestone":
      return <BarChart3 className="h-3.5 w-3.5" />;
    default:
      return <Briefcase className="h-3.5 w-3.5" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    case "archived":
      return (
        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border-0 text-xs">
          <Archive className="w-3 h-3 mr-1" />
          Archived
        </Badge>
      );
    case "paused":
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Paused
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ─── Skeleton Loaders ──────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="p-4 bg-card rounded-xl border border-border">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div>
          <Skeleton className="h-7 w-16 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </Card>
  );
}



// ─── Main Component ────────────────────────────────────────────────────────

export default function Projects() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { tier } = useSubscriptionTier();

  // ── Workspace Context ──
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = isConvexConnected
    ? (activeWorkspaceId as Id<"workspaces">)
    : undefined;

  // ── Permissions ──
  const { canShareRecords } = useWorkspacePermissions();

  // ── Local State ──
  const [isSeeding, setIsSeeding] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharingRecord, setSharingRecord] = useState<{
    id: string;
    type: string;
    sharing: Record<string, unknown>[];
  } | null>(null);


  // ── Create Project Dialog State ──
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formProjectName, setFormProjectName] = useState("");
  const [formClientId, setFormClientId] = useState<string>("");
  const [formHourlyRate, setFormHourlyRate] = useState("");
  const [formProjectType, setFormProjectType] = useState<
    "ongoing" | "fixed" | "milestone"
  >("ongoing");
  const [formProtectionLevel, setFormProtectionLevel] = useState<
    "standard" | "enhanced" | "maximum"
  >("standard");
  const [formDescription, setFormDescription] = useState("");

  // ── Filter / Search State ──
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // ── Convex Queries ──
  const projects = useQuery(
    api.projects.projectProtection.getMyProjects,
    {}
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  // Fetch clients for the create dialog dropdown
  const clientsData = useQuery(
    api.clients.crud.getClients,
    workspaceId ? { workspaceId } : {}
  );

  // Fetch project details for selected project
  const projectDetails = useQuery(
    selectedProjectId
      ? api.projects.projectProtection.getProjectProtectionDetails
      : "skip",
    selectedProjectId
      ? { projectId: selectedProjectId as Id<"projects"> }
      : "skip"
  );

  // Fetch protection score for selected project
  const protectionScoreData = useQuery(
    selectedProjectId
      ? api.projects.projectProtection.getProjectProtectionScore
      : "skip",
    selectedProjectId
      ? { projectId: selectedProjectId as Id<"projects"> }
      : "skip"
  );

  // Fetch milestone data for selected project
  const milestoneData = useQuery(
    selectedProjectId
      ? api.projects.projectProtection.getMilestoneProtection
      : "skip",
    selectedProjectId
      ? { projectId: selectedProjectId as Id<"projects"> }
      : "skip"
  );

  // ── Convex Mutations ──
  const seedTestProjectsMutation = useMutation(
    api.seedProjects.seedTestProjects
  );
  const addProjectMutation = useMutation(
    api.projects.projectProtection.addProject
  );
  const archiveProjectMutation = useMutation(
    api.projects.projectProtection.archiveProject
  );

  // Invoice generation from sessions
  const generateFromSessions = useMutation(api.invoices.generateInvoiceFromSessions);

  // ── Convex mutations for sharing ──
  const shareRecordMutation = useMutation(
    (api as any).permissions?.shareRecord ?? null
  );
  const unshareRecordMutation = useMutation(
    (api as any).permissions?.unshareRecord ?? null
  );

  // ── Loading timeout pattern ──
  const [queryTimeout, setQueryTimeout] = useState(false);

  useEffect(() => {
    if (projects === undefined) {
      const timer = setTimeout(() => {
        setQueryTimeout(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setQueryTimeout(false);
    }
  }, [projects]);

  const isLoading = authLoading || (projects === undefined && !queryTimeout);

  // ─── Determine demo mode ───────────────────────────────────────────────
  const isDemoMode = !authLoading && !isAuthenticated;

  const safeProjects = useMemo(
    () => (isDemoMode ? MOCK_PROJECTS : (projects ?? [])),
    [isDemoMode, projects]
  );

  // ── Derived Data ──
  const filteredProjects = useMemo(() => {
    let filtered = safeProjects.map((p: any) => ({
      ...p,
      _id: p._id,
      protectionLevel: p.protectionLevel || "standard",
      protectionScore: p.protectionScore || 0,
      totalHours: p.totalHours || 0,
      totalValue: p.totalValue || 0,
      atRiskAmount: p.atRiskAmount || 0,
      activeSession: p.activeSession || false,
      rejectedHours: p.rejectedHours || 0,
      projectType: p.projectType || "ongoing",
      status: p.status || "active",
    }));

    // Search by name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p: any) =>
        p.projectName?.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((p: any) => p.status === filterStatus);
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((p: any) => p.projectType === filterType);
    }

    return filtered;
  }, [safeProjects, searchQuery, filterStatus, filterType]);

  // ── Stats ──
  const stats = useMemo(() => {
    const all = safeProjects.map((p: any) => ({
      ...p,
      totalValue: p.totalValue || 0,
      atRiskAmount: p.atRiskAmount || 0,
      status: p.status || "active",
    }));
    return {
      totalProjects: all.length,
      activeProjects: all.filter((p: any) => p.status === "active").length,
      totalValue: all.reduce((sum: number, p: any) => sum + (p.totalValue || 0), 0),
      atRiskAmount: all.reduce(
        (sum: number, p: any) => sum + (p.atRiskAmount || 0),
        0
      ),
    };
  }, [safeProjects]);

  // ── Selected Project ──
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return (
      safeProjects.find((p: any) => p._id === selectedProjectId) ?? null
    );
  }, [safeProjects, selectedProjectId]);

  // ── Clients Map ──
  const clientsMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of clientsData ?? []) {
      map.set((c as any)._id, c);
    }
    return map;
  }, [clientsData]);

  // ── Auto-select first project ──
  useEffect(() => {
    if (!selectedProjectId && safeProjects.length > 0) {
      setSelectedProjectId(safeProjects[0]._id);
    }
  }, [safeProjects, selectedProjectId]);

  // ── Seeding timeout ──
  useEffect(() => {
    if (isSeeding) {
      const timer = setTimeout(() => {
        setIsSeeding(false);
        toast.error("Request timed out. Please try again.");
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isSeeding]);

  useEffect(() => {
    if (safeProjects.length > 0 && isSeeding) {
      setIsSeeding(false);
    }
  }, [safeProjects, isSeeding]);

  // ── Handlers ──
  const handleCreateTestProjects = async () => {
    setIsSeeding(true);
    try {
      const result = await seedTestProjectsMutation({});
      if (result?.success) {
        toast.success("Test projects created successfully");
      } else {
        toast.error("Failed to create test projects");
        setIsSeeding(false);
      }
    } catch (error) {
      console.error("Failed to seed test projects:", error);
      setIsSeeding(false);
      toast.error("Failed to create test projects");
    }
  };

  const handleCreateProject = async () => {
    if (!formProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    if (!formClientId) {
      toast.error("Please select a client");
      return;
    }
    if (!formHourlyRate || Number(formHourlyRate) <= 0) {
      toast.error("Please enter a valid hourly rate");
      return;
    }

    setIsCreating(true);
    try {
      const result = await addProjectMutation({
        projectName: formProjectName.trim(),
        clientId: formClientId as Id<"clients">,
        hourlyRate: Number(formHourlyRate),
        projectType: formProjectType,
        protectionLevel: formProtectionLevel,
      });
      if (result?.success) {
        toast.success("Project created successfully");
        setShowCreateDialog(false);
        resetCreateForm();
      } else {
        toast.error(result?.error || "Failed to create project");
      }
    } catch (error: any) {
      console.error("Failed to create project:", error);
      toast.error(error?.message || "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setFormProjectName("");
    setFormClientId("");
    setFormHourlyRate("");
    setFormProjectType("ongoing");
    setFormProtectionLevel("standard");
    setFormDescription("");
  };

  const handleArchiveProject = async () => {
    if (!selectedProjectId) return;
    try {
      const result = await archiveProjectMutation({
        projectId: selectedProjectId as Id<"projects">,
      });
      if (result?.success) {
        toast.success("Project archived");
        setSelectedProjectId(null);
      } else {
        toast.error(result?.error || "Failed to archive project");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to archive project");
    }
  };

  // ── Render ──
  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* ── Page Header ── */}
        {/* Demo mode banner */}
        {isDemoMode && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Demo Mode</span> — You're viewing sample data.{" "}
              <a href="/auth" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">
                Sign in
              </a>{" "}
              to manage your real projects.
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Project Protection
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Manage your project protection, track evidence, and monitor
              dispute risks.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {selectedProjectId &&
              (() => {
                const selectedProj = safeProjects.find(
                  (p: any) => p._id === selectedProjectId
                );
                const perms = usePermissions(selectedProj as any);
                return (canShareRecords || perms.canShare) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setSharingRecord({
                        id: selectedProjectId,
                        type: "project",
                        sharing: selectedProj?.sharing || [],
                      });
                      setShowShareDialog(true);
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                ) : null;
              })()}
            <Button
              onClick={handleCreateTestProjects}
              disabled={isSeeding}
              variant="outline"
              size="sm"
            >
              {isSeeding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Seed Demo
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Card className="p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30">
                    <Briefcase className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.totalProjects}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Projects
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.activeProjects}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Active Projects
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <DollarSign className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(stats.totalValue)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Value</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(stats.atRiskAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      At Risk Amount
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* ── Search & Filter Bar ── */}
        {!isLoading && safeProjects.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={filterStatus}
                onValueChange={setFilterStatus}
              >
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                </SelectContent>
              </Select>
              {(searchQuery || filterStatus !== "all" || filterType !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-muted-foreground"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("all");
                    setFilterType("all");
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Main Content: Two-Column Layout ── */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        ) : safeProjects.length === 0 ? (
          /* ── Empty State ── */
          <Card className="p-8 bg-card rounded-xl border border-border">
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  No projects yet
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Create your first project to start tracking protection scores,
                  collecting evidence, and safeguarding your freelance income.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCreateTestProjects}
                  disabled={isSeeding}
                >
                  {isSeeding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Load Demo Data
                </Button>
              </div>
            </div>
          </Card>
        ) : filteredProjects.length === 0 ? (
          /* ── No Results State ── */
          <Card className="p-8 bg-card rounded-xl border border-border">
            <div className="text-center space-y-3">
              <Search className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-lg font-semibold text-foreground">
                No matching projects
              </h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                  setFilterType("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ── Left Column: Project List (3/5 width) ── */}
            <div className="lg:col-span-3 space-y-4">
              <ProjectList
                projects={filteredProjects.map((p: any) => ({
                  ...p,
                  _id: p._id,
                  protectionLevel: p.protectionLevel || "standard",
                  protectionScore: p.protectionScore || 0,
                  totalHours: p.totalHours || 0,
                  totalValue: p.totalValue || 0,
                  atRiskAmount: p.atRiskAmount || 0,
                  activeSession: p.activeSession || false,
                  rejectedHours: p.rejectedHours || 0,
                  projectType: p.projectType || "ongoing",
                }))}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
                onAddProject={() => setShowCreateDialog(true)}
                subscriptionTier={tier}
                onUpgrade={() => navigate("/subscription")}
              />
            </div>

            {/* ── Right Column: Detail Panel (2/5 width) ── */}
            <div className="lg:col-span-2">
              {selectedProject ? (
                <div className="space-y-4 sticky top-6">
                  {/* ── Project Header Card ── */}
                  <Card className="overflow-hidden border border-border">
                    <div
                        className={`px-5 py-3 ${
                          selectedProject.protectionLevel === "maximum"
                            ? "bg-emerald-500/10 dark:bg-emerald-500/5"
                            : selectedProject.protectionLevel === "enhanced"
                            ? "bg-violet-500/10 dark:bg-violet-500/5"
                            : "bg-sky-500/10 dark:bg-sky-500/5"
                        }`}
                      >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getProjectTypeIcon(selectedProject.projectType)}
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {selectedProject.projectType} project
                          </span>
                        </div>
                        {getStatusBadge(selectedProject.status)}
                      </div>
                    </div>
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">
                          {selectedProject.projectName}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(selectedProject.hourlyRate)}/hr
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm text-muted-foreground">
                            Created {formatDate(selectedProject.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Protection Level Badge */}
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${getProtectionLevelColor(
                          selectedProject.protectionLevel
                        )}`}
                      >
                        <Shield className="h-4 w-4" />
                        {selectedProject.protectionLevel.charAt(0).toUpperCase() +
                          selectedProject.protectionLevel.slice(1)}{" "}
                        Protection
                      </div>

                      {/* Quick Stats Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Shield className="h-3 w-3" />
                            Protection Score
                          </div>
                          <div
                            className={`text-2xl font-bold ${getProtectionScoreColor(
                              selectedProject.protectionScore || 0
                            )}`}
                          >
                            {selectedProject.protectionScore || 0}%
                          </div>
                          <Progress
                            value={selectedProject.protectionScore || 0}
                            className="h-1.5 mt-1.5"
                          />
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Clock className="h-3 w-3" />
                            Total Hours
                          </div>
                          <div className="text-2xl font-bold text-foreground">
                            {selectedProject.totalHours || 0}h
                          </div>
                          <div className="text-xs text-muted-foreground mt-1.5">
                            {selectedProject.activeSession
                              ? "Session active"
                              : "No active session"}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <DollarSign className="h-3 w-3" />
                            Total Value
                          </div>
                          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(selectedProject.totalValue || 0)}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <AlertTriangle className="h-3 w-3" />
                            At Risk
                          </div>
                          <div
                            className={`text-2xl font-bold ${
                              (selectedProject.atRiskAmount || 0) > 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-foreground"
                            }`}
                          >
                            {formatCurrency(selectedProject.atRiskAmount || 0)}
                          </div>
                        </div>
                      </div>

                      {/* Rejected Hours Warning */}
                      {(selectedProject.rejectedHours || 0) > 0 && (
                        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-300">
                              {selectedProject.rejectedHours}h rejected
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                              Consider generating a dispute report to protect
                              this income.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Invoice Unbilled Hours Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                        onClick={async () => {
                          try {
                            const newInvoiceId = await generateFromSessions({
                              projectId: selectedProjectId as any,
                              dueDate: Date.now() + 30 * 86400000,
                            });
                            toast.success("Invoice created from sessions!");
                            navigate(`/invoices/new?edit=${newInvoiceId}`);
                          } catch (err: any) {
                            toast.error(err.message || "Failed to create invoice");
                          }
                        }}
                      >
                        <Receipt className="h-4 w-4" />
                        Invoice Unbilled Hours
                      </Button>
                    </CardContent>
                  </Card>

                  {/* ── Linked Client Card ── */}
                  <Card className="border border-border">
                    <CardHeader className="pb-3 pt-4 px-5">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        Linked Client
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4">
                      {(() => {
                        const client = clientsMap.get(
                          selectedProject.clientId
                        );
                        if (client) {
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground text-sm">
                                  {(client as any).clientName}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] capitalize"
                                >
                                  {(client as any).platform}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  Client rate:{" "}
                                  {formatCurrency(
                                    (client as any).hourlyRate || 0
                                  )}
                                  /hr
                                </span>
                                <span>
                                  Risk:{" "}
                                  <span
                                    className={`font-medium ${
                                      (client as any).riskLevel === "low"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : (client as any).riskLevel === "high"
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-amber-600 dark:text-amber-400"
                                    }`}
                                  >
                                    {(client as any).riskLevel || "medium"}
                                  </span>
                                </span>
                              </div>
                              {((client as any).contactEmail || (client as any).contactName) && (
                                <div className="text-xs text-muted-foreground">
                                  {(client as any).contactName && (
                                    <span>{(client as any).contactName}</span>
                                  )}
                                  {(client as any).contactEmail && (
                                    <span className="ml-1">
                                      &lt;{(client as any).contactEmail}&gt;
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }
                        // Fallback: show client ID if no data fetched
                        return (
                          <p className="text-xs text-muted-foreground">
                            Client information loading...
                          </p>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* ── Protection Score Details Card ── */}
                  {protectionScoreData &&
                    protectionScoreData.score !== undefined && (
                      <Card className="border border-border">
                        <CardHeader className="pb-3 pt-4 px-5">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            Protection Score Breakdown
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 pb-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Overall Score
                            </span>
                            <span
                              className={`text-lg font-bold ${getProtectionScoreColor(
                                protectionScoreData.score
                              )}`}
                            >
                              {protectionScoreData.score}%
                            </span>
                          </div>
                          <Progress
                            value={protectionScoreData.score}
                            className={`h-2 ${getProtectionScoreBg(
                              protectionScoreData.score
                            )}`}
                          />
                          <Separator />
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Evidence Quality
                              </span>
                              <span className="font-medium text-foreground">
                                {protectionScoreData.evidenceQuality}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Timeline Coverage
                              </span>
                              <span className="font-medium text-foreground">
                                {protectionScoreData.timelineCoverage}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Compliance Rate
                              </span>
                              <span className="font-medium text-foreground">
                                {protectionScoreData.complianceRate}%
                              </span>
                            </div>
                          </div>
                          {protectionScoreData.improvementOpportunity && (
                            <>
                              <Separator />
                              <div className="flex items-start gap-2">
                                <TrendingUp className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                  {protectionScoreData.improvementOpportunity}
                                </p>
                              </div>
                            </>
                          )}
                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-muted-foreground">
                              Tier Protection Rate
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {protectionScoreData.tierProtectionRate}% (
                              {protectionScoreData.subscriptionTier})
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* ── Milestones Card ── */}
                  {milestoneData &&
                    milestoneData.milestones &&
                    milestoneData.milestones.length > 0 && (
                      <Card className="border border-border">
                        <CardHeader className="pb-3 pt-4 px-5">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Weekly Milestones
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 pb-4 space-y-2">
                          {milestoneData.milestones.map(
                            (m: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      m.status === "protected"
                                        ? "bg-emerald-500"
                                        : m.status === "at_risk"
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                    }`}
                                  />
                                  <div>
                                    <p className="text-xs font-medium text-foreground">
                                      {m.period}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {m.hours}h · {formatCurrency(m.value)}
                                    </p>
                                  </div>
                                </div>
                                <Badge
                                  className={`text-[10px] border-0 ${
                                    m.status === "protected"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : m.status === "at_risk"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  }`}
                                >
                                  {m.protectionRate}%
                                </Badge>
                              </div>
                            )
                          )}
                          <Separator />
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/10 text-center">
                              <p className="font-bold text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(
                                  milestoneData.totalProtectedValue || 0
                                )}
                              </p>
                              <p className="text-emerald-600/70 dark:text-emerald-400/70 text-[10px]">
                                Protected
                              </p>
                            </div>
                            <div className="p-2 rounded bg-red-50 dark:bg-red-900/10 text-center">
                              <p className="font-bold text-red-700 dark:text-red-400">
                                {formatCurrency(
                                  milestoneData.totalAtRiskValue || 0
                                )}
                              </p>
                              <p className="text-red-600/70 dark:text-red-400/70 text-[10px]">
                                At Risk
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* ── Recent Activity Card ── */}
                  {projectDetails &&
                    projectDetails.sessions &&
                    projectDetails.sessions.length > 0 && (
                      <Card className="border border-border">
                        <CardHeader className="pb-3 pt-4 px-5">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            Recent Activity
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 pb-4">
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {projectDetails.sessions
                              .slice(0, 5)
                              .map((session: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition"
                                >
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate">
                                      {session.projectName || "Work Session"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {timeAgo(session.startTime)} ·{" "}
                                      {Math.round(
                                        (session.totalMinutes || 0) / 60
                                      )}
                                      h
                                    </p>
                                  </div>
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                </div>
                              ))}
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                            <span>
                              {projectDetails.totalSessions} total sessions
                            </span>
                            {projectDetails.totalReports > 0 && (
                              <span>
                                {projectDetails.totalReports} dispute reports
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* ── Actions Card ── */}
                  <Card className="border border-border">
                    <CardContent className="p-4 flex flex-wrap gap-2">
                      {selectedProject.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5"
                          onClick={handleArchiveProject}
                        >
                          <Archive className="h-3.5 w-3.5" />
                          Archive Project
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5"
                        onClick={() => {
                          setSharingRecord({
                            id: selectedProjectId!,
                            type: "project",
                            sharing:
                              (selectedProject as any)?.sharing || [],
                          });
                          setShowShareDialog(true);
                        }}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                /* No project selected */
                <Card className="p-8 bg-card rounded-xl border border-border">
                  <div className="text-center space-y-3">
                    <ChevronRight className="h-10 w-10 text-muted-foreground/30 mx-auto rotate-90" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Select a project
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Choose a project from the list to view details,
                      protection scores, milestones, and recent activity.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Create Project Dialog ── */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project to start tracking protection and evidence
              collection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="project-name">
                Project Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="project-name"
                placeholder="e.g., E-commerce Platform Redesign"
                value={formProjectName}
                onChange={(e) => setFormProjectName(e.target.value)}
              />
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <Label>
                Client <span className="text-red-500">*</span>
              </Label>
              <Select value={formClientId} onValueChange={setFormClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {(clientsData ?? []).length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No clients available — seed demo data first
                    </SelectItem>
                  ) : (
                    (clientsData ?? []).map((client: any) => (
                      <SelectItem key={client._id} value={client._id}>
                        {client.clientName} ({client.platform})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {(clientsData ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No clients found.{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={handleCreateTestProjects}
                    disabled={isSeeding}
                  >
                    Seed demo data
                  </Button>{" "}
                  to create test clients.
                </p>
              )}
            </div>

            {/* Hourly Rate */}
            <div className="space-y-2">
              <Label htmlFor="hourly-rate">
                Hourly Rate ($) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hourly-rate"
                type="number"
                placeholder="85"
                min="0"
                step="5"
                value={formHourlyRate}
                onChange={(e) => setFormHourlyRate(e.target.value)}
              />
            </div>

            {/* Project Type & Protection Level side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Type</Label>
                <Select
                  value={formProjectType}
                  onValueChange={(v: any) => setFormProjectType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Protection Level</Label>
                <Select
                  value={formProtectionLevel}
                  onValueChange={(v: any) => setFormProtectionLevel(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="enhanced">Enhanced</SelectItem>
                    <SelectItem value="maximum">Maximum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Protection Level Descriptions */}
            <div className="grid grid-cols-3 gap-2">
              <div
                className={`p-2 rounded-lg border text-center text-xs cursor-pointer transition ${
                  formProtectionLevel === "standard"
                    ? "border-sky-300 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-700"
                    : "border-border bg-muted/30"
                }`}
                onClick={() => setFormProtectionLevel("standard")}
              >
                <Shield className="h-4 w-4 mx-auto mb-1 text-sky-500" />
                <p className="font-medium">Standard</p>
                <p className="text-[10px] text-muted-foreground">Basic tracking</p>
              </div>
              <div
                className={`p-2 rounded-lg border text-center text-xs cursor-pointer transition ${
                  formProtectionLevel === "enhanced"
                    ? "border-violet-300 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-700"
                    : "border-border bg-muted/30"
                }`}
                onClick={() => setFormProtectionLevel("enhanced")}
              >
                <Shield className="h-4 w-4 mx-auto mb-1 text-violet-500" />
                <p className="font-medium">Enhanced</p>
                <p className="text-[10px] text-muted-foreground">+Auto evidence</p>
              </div>
              <div
                className={`p-2 rounded-lg border text-center text-xs cursor-pointer transition ${
                  formProtectionLevel === "maximum"
                    ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700"
                    : "border-border bg-muted/30"
                }`}
                onClick={() => setFormProtectionLevel("maximum")}
              >
                <Shield className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                <p className="font-medium">Maximum</p>
                <p className="text-[10px] text-muted-foreground">+Dispute prep</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                placeholder="Brief description of the project scope and deliverables..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetCreateForm();
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={
                !formProjectName.trim() ||
                !formClientId ||
                !formHourlyRate ||
                isCreating
              }
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Share Dialog ── */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        recordId={sharingRecord?.id || ""}
        recordType={sharingRecord?.type || "project"}
        currentSharing={(sharingRecord?.sharing || []) as any}
        onShare={async (args) => {
          try {
            if (shareRecordMutation) {
              await shareRecordMutation({
                recordId: sharingRecord?.id,
                recordType: sharingRecord?.type,
                ...args,
              });
            }
            toast.success("Record shared successfully");
          } catch (err: any) {
            toast.error(err?.message || "Failed to share record");
          }
        }}
        onUnshare={async (args) => {
          try {
            if (unshareRecordMutation) {
              await unshareRecordMutation({
                recordId: sharingRecord?.id,
                recordType: sharingRecord?.type,
                ...args,
              });
            }
            toast.success("Access removed");
          } catch (err: any) {
            toast.error(err?.message || "Failed to remove access");
          }
        }}
      />
    </div>
  );
}
