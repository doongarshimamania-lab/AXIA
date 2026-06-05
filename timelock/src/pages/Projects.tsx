import { useState, useEffect, Component } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, Plus, AlertTriangle, CheckCircle, Clock, LayoutDashboard, Activity, Target, Fingerprint, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router";

// Per-section error boundary so one failing section doesn't crash the whole page
class SectionErrorBoundary extends Component<{ children: React.ReactNode; name: string }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.warn(`[SectionErrorBoundary:${this.props.name}]`, err.message); }
  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-6 bg-card rounded-xl border border-border">
          <div className="text-center py-4">
            <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Failed to load {this.props.name}</p>
            <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false })}>Retry</Button>
          </div>
        </Card>
      );
    }
    return this.props.children;
  }
}
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";

// Feature Components
import { ProjectList } from "@/components/project-protection/ProjectList";
// The following components are hidden for now — will be re-enabled when ready:
// import { ProjectProtectionScore } from "@/components/project-protection/ProjectProtectionScore";
// import { ProjectHealthDashboardNew } from "@/components/project-protection/ProjectHealthDashboardNew";
// import { ProjectRiskTimeline } from "@/components/project-protection/ProjectRiskTimeline";
// import { MilestoneProtection } from "@/components/project-protection/MilestoneProtection";
// import { AdaptiveEvidenceSystem } from "@/components/project-protection/AdaptiveEvidenceSystem";
// import { EvidenceItemsList } from "@/components/evidence-library/EvidenceItemsList";
// import { ProtectionRiskHeatmap } from "@/components/project-protection/ProtectionRiskHeatmap";

interface Project {
  _id: Id<"projects">;
  userId: Id<"users"> | string;
  clientId: Id<"clients">;
  projectName: string;
  hourlyRate: number;
  projectType: "ongoing" | "fixed" | "milestone";
  protectionLevel: "standard" | "enhanced" | "maximum";
  status: string;
  createdAt: number;
  lastActivityAt: number;
  clientName?: string;
  totalHours?: number;
  protectionScore?: number;
  activeSession?: boolean;
  totalValue?: number;
  atRiskAmount?: number;
  rejectedHours?: number;
}

export default function Projects() {
  const { isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { tier } = useSubscriptionTier();
  const [isSeeding, setIsSeeding] = useState(false);
  const seedTestProjectsMutation = useMutation(api.seedProjects.seedTestProjects);
  
  const handleUpgrade = () => navigate("/subscription");

  // Query projects - this will automatically use guest user if not authenticated
  const projects = useQuery(api.projects.projectProtection.getMyProjects, {});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // Debug: Log projects state
  useEffect(() => {
    console.log("Projects query result:", projects);
    console.log("Projects length:", projects?.length ?? 0);
  }, [projects]);

  // Evidence & Reports Data
  const [viewMode, setViewMode] = useState<"date" | "project" | "client" | "type">("date");
  const evidenceData = useQuery(api.evidence.library.getEvidenceLibraryData, {
    view: viewMode,
    startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
    endDate: Date.now(),
  });
  const reports = useQuery(api.disputeReports.getUserDisputeReports, {});

  // Check if queries are still loading
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

  const isLoading = (projects === undefined && !queryTimeout);
  const safeProjects = projects ?? [];

  // Auto-select first project if none selected
  useEffect(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      setSelectedProjectId(projects[0]._id);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = safeProjects.find((p: any) => p._id === selectedProjectId);

  // Seeding logic
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

  const handleCreateTestProjects = async () => {
    setIsSeeding(true);
    try {
      const result = await seedTestProjectsMutation({});
      if (result.success) {
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

  // Calculate summary metrics
  const totalProtectedValue = safeProjects.reduce((acc: number, p: any) => acc + (p.totalValue || 0), 0);
  const activeProjectsCount = safeProjects.filter((p: any) => p.status === 'active').length;
  const avgProtectionScore = safeProjects.length > 0 
    ? Math.round(safeProjects.reduce((acc: number, p: any) => acc + (p.protectionScore || 0), 0) / safeProjects.length) 
    : 0;

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 space-y-8">
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Project Protection
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Manage your project protection, track evidence, and monitor dispute risks.
            </p>
          </div>

          <div className="mb-4">
            <Button onClick={handleCreateTestProjects} disabled={isSeeding} variant="outline" size="sm">
              {isSeeding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Test Project
            </Button>
          </div>

          <div className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
              </div>
            ) : (
              <>
                {/* Project List / Selection */}
                <ProjectList 
                projects={safeProjects.map((p: any) => ({
                  ...p,
                  _id: p._id,
                  protectionLevel: p.protectionLevel || "standard",
                  protectionScore: p.protectionScore || 0,
                  totalHours: p.totalHours || 0,
                  totalValue: p.totalValue || 0,
                  atRiskAmount: p.atRiskAmount || 0,
                  activeSession: p.activeSession || false,
                  rejectedHours: p.rejectedHours || 0,
                  projectType: p.projectType || "ongoing"
                }))}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
                onAddProject={handleCreateTestProjects}
                subscriptionTier={tier}
                onUpgrade={() => navigate("/subscription")}
              />

                {/* Feature sections hidden — will be re-enabled when ready */}
              </>
            )}
          </div>
      </div>
    </div>
  );
}