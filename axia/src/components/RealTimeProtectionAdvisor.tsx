import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, AlertCircle, Info, AlertTriangle, X, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Alert {
  _id: string;
  alertType: string;
  severity: "info" | "warning" | "critical";
  message: string;
  recommendation: string;
  actionRequired: boolean;
  triggeredAt: number;
}

interface RealTimeProtectionAdvisorProps {
  subscriptionTier?: "free" | "starter" | "pro" | "expert";
  onResolveAlert?: (alertId: string) => void;
  onUpgrade?: () => void;
}

export function RealTimeProtectionAdvisor({ 
  subscriptionTier = "free",
  onResolveAlert,
  onUpgrade 
}: RealTimeProtectionAdvisorProps) {
  // PRO+ feature
  const hasAccess = subscriptionTier === "pro" || subscriptionTier === "expert";

  // Mock alerts for demo
  const alerts: Alert[] = [
    {
      _id: "alert1",
      alertType: "screenshot_needed",
      severity: "warning",
      message: "No screenshots captured in the last 15 minutes",
      recommendation: "Capture a screenshot now to maintain evidence quality",
      actionRequired: true,
      triggeredAt: Date.now() - 5 * 60 * 1000,
    },
    {
      _id: "alert2",
      alertType: "activity_gap",
      severity: "info",
      message: "Activity gap detected during work session",
      recommendation: "Add a memo explaining the gap",
      actionRequired: false,
      triggeredAt: Date.now() - 30 * 60 * 1000,
    },
  ];

  const handleResolve = (alertId: string) => {
    toast.success("Alert resolved");
    onResolveAlert?.(alertId);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive/10 border-destructive/20";
      case "warning":
        return "bg-orange-500/10 border-orange-500/20";
      case "info":
        return "bg-blue-500/10 border-blue-500/20";
      default:
        return "bg-muted border-border";
    }
  };

  // Locked state for FREE/STARTER
  if (!hasAccess) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center p-6 bg-card rounded-lg border border-border shadow-lg max-w-sm">
            <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h4 className="font-bold text-lg mb-2">Real-Time Protection Advisor</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to Pro to get AI-powered real-time alerts and recommendations during your work sessions
            </p>
            <Button onClick={onUpgrade} className="w-full">
              Upgrade to Pro
            </Button>
          </div>
        </div>

        <div className="filter blur-sm pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Bell className="w-6 h-6 text-primary mr-2" />
              <h3 className="font-bold text-xl text-foreground">Real-Time Protection Advisor</h3>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary">PRO</Badge>
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-muted rounded-lg h-24" />
            <div className="p-4 bg-muted rounded-lg h-24" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Bell className="w-6 h-6 text-primary mr-2" />
          <h3 className="font-bold text-xl text-foreground">Real-Time Protection Advisor</h3>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary">PRO</Badge>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <div className="text-sm text-muted-foreground">No active alerts</div>
            <div className="text-xs text-muted-foreground mt-1">
              Your protection is optimal
            </div>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert._id}
              className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    <div className="font-medium text-foreground text-sm mb-1">
                      {alert.message}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {alert.recommendation}
                    </div>
                    {alert.actionRequired && (
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Take Action
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => handleResolve(alert._id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-3 bg-accent/50 rounded-md">
        <p className="text-xs text-foreground">
          <span className="font-medium">AI-Powered:</span> Advisor learns from your work patterns
          to provide personalized protection recommendations
        </p>
      </div>
    </Card>
  );
}