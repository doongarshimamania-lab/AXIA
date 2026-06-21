import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { ProjectRiskTimelineFree } from "./ProjectRiskTimelineFree";
import { ProjectRiskTimelineStarter } from "./ProjectRiskTimelineStarter";
import { ProjectRiskTimelinePro } from "./ProjectRiskTimelinePro";
import { ProjectRiskTimelineExpert } from "./ProjectRiskTimelineExpert";
import { TimelineRiskData } from "@/types/projectProtection";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectRiskTimelineProps {
  projectData: any;
  tier: string;
  onUpgrade?: () => void;
  guestUserId?: string;
}

const isValidProjectId = (value: unknown): value is Id<"projects"> => {
  return typeof value === "string" && value.length > 0;
};

const isValidUserId = (value: unknown): value is Id<"users"> => {
  return typeof value === "string" && value.length > 0;
};

export function ProjectRiskTimeline({ projectData, tier, onUpgrade, guestUserId }: ProjectRiskTimelineProps) {
  const projectId = projectData?._id;
  const hasValidProjectId = isValidProjectId(projectId);
  
  // Ensure guestUserId is treated as a string or undefined for the query
  const validGuestUserId = isValidUserId(guestUserId) ? guestUserId : undefined;

  const backendData = useQuery(
    api.projects.riskTimeline.getProjectRiskTimeline,
    hasValidProjectId
      ? {
          projectId: projectId as Id<"projects">,
          guestUserId: validGuestUserId as Id<"users">,
          tierOverride: tier.toLowerCase(),
        }
      : "skip"
  );

  // Loading state
  if (hasValidProjectId && backendData === undefined) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border min-h-[300px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing timeline risks...</p>
        </div>
      </Card>
    );
  }

  // Handle case where backend returns null (shouldn't happen with latest backend update, but safe to keep)
  // OR if the query was skipped due to invalid ID
  if (!backendData && hasValidProjectId) {
     return (
      <Card className="p-6 bg-card rounded-xl border border-border min-h-[300px] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">Unable to load timeline data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We couldn't retrieve the risk analysis for this project.
          </p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </Card>
    );
  }

  // If we skipped the query because of invalid project ID OR no project data
  if (!hasValidProjectId || !projectData) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border min-h-[300px] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">No Project Selected</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select a project to view the risk timeline analysis.
          </p>
        </div>
      </Card>
    );
  }

  const props = {
    data: backendData as TimelineRiskData,
    onUpgrade,
  };

  switch (tier.toLowerCase()) {
    case "starter":
      return <ProjectRiskTimelineStarter {...props} />;
    case "pro":
      return <ProjectRiskTimelinePro {...props} />;
    case "expert":
      return <ProjectRiskTimelineExpert {...props} />;
    default:
      return <ProjectRiskTimelineFree {...props} />;
  }
}