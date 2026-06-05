import { AlertTriangle, Shield } from "lucide-react";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ProjectProtectionScoreData } from "@/types/projectProtection";
import { ProtectionScoreCardFree } from "./score/ProtectionScoreCardFree";
import { ProtectionScoreCardStarter } from "./score/ProtectionScoreCardStarter";
import { ProtectionScoreCardPro } from "./score/ProtectionScoreCardPro";
import { ProtectionScoreCardExpert } from "./score/ProtectionScoreCardExpert";

interface ProjectProtectionScoreProps {
  projectId?: Id<"projects">;
  tier: string;
  onUpgrade?: () => void;
}

const isValidConvexId = (value: unknown): value is Id<"projects"> => {
  // Convex IDs are alphanumeric strings (e.g., "kg2abc123def456") with no underscores
  // Mock IDs like "proj_1", "deal_1" contain underscores and will cause Convex errors
  return typeof value === "string" && value.length >= 10 && !value.includes("_");
};

export function ProjectProtectionScore({ projectId, tier, onUpgrade }: ProjectProtectionScoreProps) {
  const normalizedTier = tier.toLowerCase();
  const validProjectId = isValidConvexId(projectId) ? (projectId as Id<"projects">) : null;
  const isDemoMode = !validProjectId;

  const queryFn: any = api.projects.projectProtectionScore.getProjectProtectionScore;
  const queryArgs = validProjectId
    ? { projectId: validProjectId, userTier: normalizedTier }
    : "skip";
  const rawData = useQuery(queryFn, queryArgs);

  // Get project name for formalization
  const project = useQuery(
    api.projects.projectProtection.getProjectProtectionDetails,
    validProjectId ? { projectId: validProjectId } : "skip"
  );
  const projectName = project?.project?.projectName;

  if (validProjectId && rawData === undefined) {
    return (
      <div className="rounded-2xl p-6 bg-card border border-border animate-pulse">
        <div className="h-64 bg-muted/20 rounded-xl"></div>
      </div>
    );
  }

  if (validProjectId && rawData === null) {
    return (
      <div className="rounded-2xl p-6 bg-card border border-border">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Failed to load protection score</p>
        </div>
      </div>
    );
  }

  // Use rawData if available, otherwise we'd use demo data (omitted for brevity, relying on backend for now)
  // In a real demo scenario, we'd construct a full ProjectProtectionScoreData object here.
  const protectionData = rawData as ProjectProtectionScoreData;

  if (!protectionData) {
    return (
      <div className="rounded-2xl p-6 bg-card border border-border">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">No Project Selected</h3>
          <p className="text-sm text-muted-foreground">Select a project to view its protection score</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Core Positioning Statement */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-medium text-muted-foreground tracking-tight">
          Your work is <span className="text-primary font-bold">payment-protected</span>
        </h2>
      </div>

      {normalizedTier === "expert" && (
        <ProtectionScoreCardExpert 
          data={protectionData} 
          onUpgrade={onUpgrade}
          projectId={validProjectId || undefined}
          projectName={projectName}
        />
      )}
      {normalizedTier === "pro" && (
        <ProtectionScoreCardPro 
          data={protectionData} 
          onUpgrade={onUpgrade}
          projectId={validProjectId || undefined}
          projectName={projectName}
        />
      )}
      {normalizedTier === "starter" && (
        <ProtectionScoreCardStarter data={protectionData} onUpgrade={onUpgrade} />
      )}
      {(normalizedTier === "free" || !["expert", "pro", "starter"].includes(normalizedTier)) && (
        <ProtectionScoreCardFree data={protectionData} onUpgrade={onUpgrade} />
      )}
    </div>
  );
}