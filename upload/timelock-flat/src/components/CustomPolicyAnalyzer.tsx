import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, PlusCircle, ScanSearch, Lock } from "lucide-react";

interface CustomPolicyAnalyzerProps {
  subscriptionTier?: "free" | "starter" | "pro" | "expert" | "client";
  onAddPolicy?: () => void;
  onScanWork?: () => void;
  onUpgrade?: () => void;
}

export function CustomPolicyAnalyzer({
  subscriptionTier = "free",
  onAddPolicy,
  onScanWork,
  onUpgrade,
}: CustomPolicyAnalyzerProps) {
  // PRO+ feature
  const hasAccess = subscriptionTier === "pro" || subscriptionTier === "expert";

  const policies = undefined as any[] | undefined;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Mock client policies for demo
  const clientPolicies = policies?.slice(0, 3).map((policy) => ({
    id: policy._id,
    clientName: policy.clientName,
    platform: policy.platform,
    lastUpdated: policy.lastUpdated,
    compliance: "high" as "high" | "medium" | "low",
    missingRequirements: 0,
  })) || [
    {
      id: "1",
      clientName: "Acme Corp",
      platform: "upwork",
      lastUpdated: Date.now() - 2 * 24 * 60 * 60 * 1000,
      compliance: "high" as const,
      missingRequirements: 0,
    },
    {
      id: "2",
      clientName: "TechStart Inc",
      platform: "custom",
      lastUpdated: Date.now() - 5 * 24 * 60 * 60 * 1000,
      compliance: "medium" as const,
      missingRequirements: 2,
    },
  ];

  // Locked state for FREE/STARTER
  if (!hasAccess) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center p-6 bg-card rounded-lg border border-border shadow-lg max-w-sm">
            <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h4 className="font-bold text-lg mb-2">Custom Policy Analyzer</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to Pro to analyze client contracts and platform policies automatically
            </p>
            <Button onClick={onUpgrade} className="w-full">
              Upgrade to Pro
            </Button>
          </div>
        </div>

        <div className="filter blur-sm pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FileText className="w-6 h-6 text-primary mr-2" />
              <h3 className="font-[Space_Grotesk] font-bold text-xl text-foreground">
                Custom Policy Analyzer
              </h3>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              PRO FEATURE
            </span>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg h-20" />
            <div className="p-3 bg-muted rounded-lg h-20" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FileText className="w-6 h-6 text-primary mr-2" />
          <h3 className="font-[Space_Grotesk] font-bold text-xl text-foreground">
            Custom Policy Analyzer
          </h3>
        </div>
        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
          PRO FEATURE
        </span>
      </div>

      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Active Client Policies</span>
          <span className="text-sm font-medium text-foreground">
            {clientPolicies.length}/3
          </span>
        </div>

        <div className="space-y-3">
          {clientPolicies.map((policy) => (
            <div
              key={policy.id}
              className="p-3 bg-muted rounded-lg border border-border/50 hover:border-primary/30 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-foreground">{policy.clientName}</h4>
                  <p className="text-xs text-muted-foreground">
                    {policy.platform} • Updated {formatDate(policy.lastUpdated)}
                  </p>
                </div>
                <div className="flex items-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      policy.compliance === "high"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : policy.compliance === "medium"
                        ? "bg-orange-500/10 text-orange-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {policy.compliance === "high"
                      ? "Full Compliance"
                      : policy.compliance === "medium"
                      ? "Partial Compliance"
                      : "Non-Compliant"}
                  </span>
                </div>
              </div>

              {policy.compliance !== "high" && (
                <div className="mt-2 pl-1">
                  <p className="text-xs text-muted-foreground">
                    {policy.missingRequirements} requirement
                    {policy.missingRequirements > 1 ? "s" : ""} missing
                  </p>
                  <button className="mt-1 text-xs text-primary hover:underline">
                    View Details
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={onAddPolicy}
          className="p-3 border border-dashed border-border rounded-lg hover:border-primary/50 transition text-left"
        >
          <div className="flex items-center mb-1">
            <PlusCircle className="w-4 h-4 mr-2 text-primary" />
            <span className="text-sm text-foreground">Add New Policy</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload client contract or platform policy
          </p>
        </button>

        <button
          onClick={onScanWork}
          className="p-3 border border-dashed border-border rounded-lg hover:border-primary/50 transition text-left"
        >
          <div className="flex items-center mb-1">
            <ScanSearch className="w-4 h-4 mr-2 text-primary" />
            <span className="text-sm text-foreground">Scan Current Work</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Check against all policies in 2 minutes
          </p>
        </button>
      </div>

      <div className="p-3 bg-accent/50 rounded-md">
        <p className="text-sm text-foreground">
          <span className="font-medium">How it works:</span> Upload your client's
          requirements document and TIMELock analyzes your work patterns to ensure
          compliance
        </p>
      </div>
    </Card>
  );
}