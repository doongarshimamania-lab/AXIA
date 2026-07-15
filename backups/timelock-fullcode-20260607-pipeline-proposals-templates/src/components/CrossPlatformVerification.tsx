import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, AlertTriangle, RefreshCw, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CrossPlatformVerificationProps {
  subscriptionTier?: "free" | "starter" | "pro" | "expert" | "client";
  onVerify?: () => void;
  onUpgrade?: () => void;
}

export function CrossPlatformVerification({ 
  subscriptionTier = "free",
  onVerify,
  onUpgrade 
}: CrossPlatformVerificationProps) {
  // PRO+ feature
  const hasAccess = subscriptionTier === "pro" || subscriptionTier === "expert";

  // Mock data for demo
  const verification: {
    platforms: string[];
    verificationStatus: "verified" | "partial" | "failed";
    consistencyScore: number;
    discrepancies: any[];
    verifiedAt: number;
  } = {
    platforms: ["upwork", "fiverr", "toptal"],
    verificationStatus: "verified",
    consistencyScore: 94,
    discrepancies: [],
    verifiedAt: Date.now() - 2 * 60 * 60 * 1000,
  };

  const handleVerify = async () => {
    toast.success("Cross-platform verification initiated");
    onVerify?.();
  };

  const getStatusColor = () => {
    switch (verification.verificationStatus) {
      case "verified":
        return "text-emerald-500";
      case "partial":
        return "text-orange-500";
      case "failed":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = () => {
    switch (verification.verificationStatus) {
      case "verified":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "partial":
      case "failed":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <Shield className="w-5 h-5 text-muted-foreground" />;
    }
  };

  // Locked state for FREE/STARTER
  if (!hasAccess) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center p-6 bg-card rounded-lg border border-border shadow-lg max-w-sm">
            <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h4 className="font-bold text-lg mb-2">Cross-Platform Verification</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to Pro to verify work consistency across Upwork, Fiverr, and Toptal simultaneously
            </p>
            <Button onClick={onUpgrade} className="w-full">
              Upgrade to Pro
            </Button>
          </div>
        </div>

        <div className="filter blur-sm pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Shield className="w-6 h-6 text-primary mr-2" />
              <h3 className="font-bold text-xl text-foreground">Cross-Platform Verification</h3>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary">PRO</Badge>
          </div>
          <div className="space-y-4">
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
          <Shield className="w-6 h-6 text-primary mr-2" />
          <h3 className="font-bold text-xl text-foreground">Cross-Platform Verification</h3>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary">PRO</Badge>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <div className="font-medium text-foreground">Verification Status</div>
              <div className={`text-sm ${getStatusColor()}`}>
                {verification.verificationStatus.charAt(0).toUpperCase() +
                  verification.verificationStatus.slice(1)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              {verification.consistencyScore}%
            </div>
            <div className="text-xs text-muted-foreground">Consistency Score</div>
          </div>
        </div>

        <div>
          <div className="text-sm text-muted-foreground mb-2">Connected Platforms</div>
          <div className="flex gap-2">
            {verification.platforms.map((platform) => (
              <Badge key={platform} variant="outline">
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </Badge>
            ))}
          </div>
        </div>

        {verification.discrepancies.length > 0 && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
              <div>
                <div className="font-medium text-foreground text-sm">
                  {verification.discrepancies.length} Discrepancy Found
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Review and resolve to improve consistency score
                </div>
              </div>
            </div>
          </div>
        )}

        <Button onClick={handleVerify} className="w-full gap-2">
          <RefreshCw className="w-4 h-4" />
          Run Verification
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          Last verified {Math.floor((Date.now() - verification.verifiedAt) / (1000 * 60 * 60))}h ago
        </div>
      </div>
    </Card>
  );
}