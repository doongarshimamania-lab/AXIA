import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { DashboardFree } from "./health/DashboardFree";
import { DashboardStarter } from "./health/DashboardStarter";
import { DashboardPro } from "./health/DashboardPro";
import { DashboardExpert } from "./health/DashboardExpert";

interface ProjectHealthDashboardNewProps {
  projectData: any;
  tier: string;
  onUpgrade?: () => void;
}

export function ProjectHealthDashboardNew({ projectData, tier, onUpgrade }: ProjectHealthDashboardNewProps) {
  // Validate projectData exists
  if (!projectData) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border">
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <h3 className="font-medium text-foreground mb-1">No Project Selected</h3>
          <p className="text-sm text-muted-foreground">Select a project to view health dashboard</p>
        </div>
      </Card>
    );
  }

  // Check if project ID is a valid Convex ID (not a mock string like "proj_1")
  const rawId = projectData._id as string;
  const isValidConvexId = rawId && rawId.length >= 10 && !rawId.includes("_");
  const projectId = isValidConvexId ? (rawId as Id<"projects">) : null;

  // Fetch backend data — skip if projectId is not a valid Convex ID
  const backendData = useQuery(
    api.projects.projectHealthDashboard.getProjectHealthDashboard,
    projectId ? { projectId, userTier: tier, guestUserId: projectData.userId } : "skip"
  );

  // Loading state
  if (backendData === undefined) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading timeline health data...</p>
        </div>
      </Card>
    );
  }

  // Error state
  if (!backendData) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border">
        <div className="text-center py-4">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load timeline health data</p>
        </div>
      </Card>
    );
  }

  // Render tier-specific dashboard
  const normalizedTier = tier.toLowerCase();

  switch (normalizedTier) {
    case "free":
      return <DashboardFree data={backendData} onUpgrade={onUpgrade} />;
    case "starter":
      return <DashboardStarter data={backendData} onUpgrade={onUpgrade} />;
    case "pro":
      return <DashboardPro data={backendData} onUpgrade={onUpgrade} />;
    case "expert":
      return <DashboardExpert data={backendData} />;
    default:
      return <DashboardFree data={backendData} onUpgrade={onUpgrade} />;
  }
}