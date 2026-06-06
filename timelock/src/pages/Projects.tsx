import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";

// Feature Components
import { ProjectList } from "@/components/project-protection/ProjectList";
// HIDDEN: ProjectProtectionScore — Component commented out
// import { ProjectProtectionScore } from "@/components/project-protection/ProjectProtectionScore";
// HIDDEN: ProjectHealthDashboardNew — Component commented out
// import { ProjectHealthDashboardNew } from "@/components/project-protection/ProjectHealthDashboardNew";
// HIDDEN: ProjectRiskTimeline — Component commented out
// import { ProjectRiskTimeline } from "@/components/project-protection/ProjectRiskTimeline";
// HIDDEN: MilestoneProtection — Component commented out
// import { MilestoneProtection } from "@/components/project-protection/MilestoneProtection";
// HIDDEN: AdaptiveEvidenceSystem — Component commented out
// import { AdaptiveEvidenceSystem } from "@/components/project-protection/AdaptiveEvidenceSystem";
// HIDDEN: ProtectionRiskHeatmap — Component commented out
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

  const projects = useQuery(api.projects.projectProtection.getMyProjects, {});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  useEffect(() => {
    console.log("Projects query result:", projects);
    console.log("Projects length:", projects?.length ?? 0);
  }, [projects]);

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

  useEffect(() => {
    if (!selectedProjectId && safeProjects.length > 0) {
      setSelectedProjectId(safeProjects[0]._id);
    }
  }, [safeProjects, selectedProjectId]);

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

                {/* HIDDEN: All 6 feature components commented out below */}
                {/* HIDDEN: Protection Score — <ProjectProtectionScore /> */}
                {/* HIDDEN: Project Health Dashboard — <ProjectHealthDashboardNew /> */}
                {/* HIDDEN: Risk Timeline Analysis — <ProjectRiskTimeline /> */}
                {/* HIDDEN: Milestone Protection — <MilestoneProtection /> */}
                {/* HIDDEN: Adaptive Evidence System — <AdaptiveEvidenceSystem /> */}
                {/* HIDDEN: Protection Risk Heatmap — <ProtectionRiskHeatmap /> */}
              </>
            )}
          </div>
      </div>
    </div>
  );
}
