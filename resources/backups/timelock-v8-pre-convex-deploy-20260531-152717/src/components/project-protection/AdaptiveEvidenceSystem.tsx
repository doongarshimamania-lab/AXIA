import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { AdaptiveEvidenceTimeline } from "./adaptive-evidence/AdaptiveEvidenceTimeline";

interface AdaptiveEvidenceSystemProps {
  projectId?: Id<"projects">;
  tier: string;
  onUpgrade?: () => void;
}

export function AdaptiveEvidenceSystem({ projectId, tier, onUpgrade }: AdaptiveEvidenceSystemProps) {
  if (!projectId) {
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