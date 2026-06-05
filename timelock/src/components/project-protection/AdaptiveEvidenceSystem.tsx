import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { AdaptiveEvidenceTimeline } from "./adaptive-evidence/AdaptiveEvidenceTimeline";

interface AdaptiveEvidenceSystemProps {
  projectId?: Id<"projects">;
  tier: string;
  onUpgrade?: () => void;
}

// Convex IDs are alphanumeric (e.g., "kg2abc123def456") — mock IDs like "proj_1" contain underscores
const isValidConvexId = (id: unknown): id is Id<"projects"> =>
  typeof id === "string" && id.length >= 10 && !id.includes("_");

export function AdaptiveEvidenceSystem({ projectId, tier, onUpgrade }: AdaptiveEvidenceSystemProps) {
  if (!projectId || !isValidConvexId(projectId)) {
    return (
      <Card className="border border-border">
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a project to view adaptive evidence system</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <AdaptiveEvidenceTimeline 
      projectData={{ _id: projectId }} 
      tier={tier} 
      onUpgrade={onUpgrade} 
    />
  );
}