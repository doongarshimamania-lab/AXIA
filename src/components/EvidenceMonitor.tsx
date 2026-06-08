import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock } from "lucide-react";

interface EvidenceMonitorProps {
  sessionId: Id<"workSessions"> | null;
}

export function EvidenceMonitor({ sessionId }: EvidenceMonitorProps) {
  const isActive = !!sessionId;

  if (!sessionId) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Evidence Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            No active evidence collection. Start a work session to begin monitoring.
          </p>
        </CardContent>
      </Card>
    );
  }

  const lastEventTime = "No events yet";

  return (
    <Card className={isActive ? "border-emerald-500/50" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Evidence Monitor
          </span>
          <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
            {isActive ? (
              <>
                <span className="inline-block h-2 w-2 bg-emerald-500 rounded-full animate-pulse mr-1" />
                Active
              </>
            ) : (
              "Finalized"
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total Events</span>
          <span className="text-sm font-semibold text-foreground">0</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last Event
          </span>
          <span className="text-xs text-foreground">{lastEventTime}</span>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Waiting for activity... Move your mouse, type, or navigate to collect evidence.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}