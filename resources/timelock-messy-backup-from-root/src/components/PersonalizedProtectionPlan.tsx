import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Shield, Settings, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PersonalizedProtectionPlanProps {
  subscriptionTier?: "free" | "starter" | "pro" | "expert" | "client";
  onCustomize?: () => void;
  onUpgrade?: () => void;
}

export function PersonalizedProtectionPlan({ 
  subscriptionTier = "free",
  onCustomize,
  onUpgrade 
}: PersonalizedProtectionPlanProps) {
  // EXPERT-only feature
  const hasFullAccess = subscriptionTier === "expert";
  const hasBasicAccess = subscriptionTier === "pro";
  const isLocked = subscriptionTier === "free" || subscriptionTier === "starter";

  // Mock plan data
  const plan = {
    planName: "Balanced Protection",
    planType: "balanced" as const,
    protectionGoals: {
      targetDisputeRate: 2,
      minEvidenceQuality: 85,
      autoScreenshotFrequency: 10,
    },
    performance: {
      disputesAvoided: 12,
      hoursProtected: 340,
      incomeSecured: 15300,
    },
    customRules: [
      {
        ruleId: "auto_screenshot",
        ruleName: "Auto Screenshot Every 10 Minutes",
        enabled: true,
      },
      {
        ruleId: "activity_monitor",
        ruleName: "Monitor Critical Activities",
        enabled: true,
      },
    ],
  };

  const disputeRateProgress = (1 / plan.protectionGoals.targetDisputeRate) * 100;
  const evidenceQualityProgress = 92;

  // Locked state for FREE/STARTER
  if (isLocked) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center p-6 bg-card rounded-lg border border-border shadow-lg max-w-sm">
            <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h4 className="font-bold text-lg mb-2">Personalized Protection Plan</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to Pro for basic protection plans or Expert for full adaptive protection with custom rules
            </p>
            <Button onClick={onUpgrade} className="w-full">
              Upgrade to Pro
            </Button>
          </div>
        </div>

        <div className="filter blur-sm pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Target className="w-6 h-6 text-primary mr-2" />
              <h3 className="font-bold text-xl text-foreground">Your Protection Plan</h3>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary">EXPERT</Badge>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg h-20" />
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted rounded-lg h-16" />
              <div className="p-3 bg-muted rounded-lg h-16" />
              <div className="p-3 bg-muted rounded-lg h-16" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Basic access for PRO (limited features)
  if (hasBasicAccess) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Target className="w-6 h-6 text-primary mr-2" />
            <h3 className="font-bold text-xl text-foreground">Your Protection Plan</h3>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary">PRO</Badge>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-foreground">Basic Protection</div>
              <Badge variant="outline">Standard</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Standard protection for your work patterns
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-emerald-500">8</div>
              <div className="text-xs text-muted-foreground mt-1">Disputes Avoided</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-500">240h</div>
              <div className="text-xs text-muted-foreground mt-1">Hours Protected</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">$8.4k</div>
              <div className="text-xs text-muted-foreground mt-1">Income Secured</div>
            </div>
          </div>

          <div className="p-3 bg-accent/50 rounded-md border border-border">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-foreground font-medium mb-1">
                  Upgrade to Expert for full adaptive protection
                </p>
                <p className="text-xs text-muted-foreground">
                  Get custom rules, advanced goals, and personalized recommendations
                </p>
                <Button onClick={onUpgrade} variant="outline" size="sm" className="mt-2 h-7">
                  Upgrade to Expert
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Full access for EXPERT
  return (
    <Card className="p-6 bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Target className="w-6 h-6 text-primary mr-2" />
          <h3 className="font-bold text-xl text-foreground">Your Protection Plan</h3>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary">EXPERT</Badge>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-foreground">{plan.planName}</div>
            <Badge variant="outline">
              {plan.planType.charAt(0).toUpperCase() + plan.planType.slice(1)}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Optimized for your work patterns and risk tolerance
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-emerald-500">
              {plan.performance.disputesAvoided}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Disputes Avoided</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-blue-500">
              {plan.performance.hoursProtected}h
            </div>
            <div className="text-xs text-muted-foreground mt-1">Hours Protected</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">
              ${(plan.performance.incomeSecured / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-muted-foreground mt-1">Income Secured</div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-foreground mb-2">Protection Goals</div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Dispute Rate Target</span>
                <span className="text-foreground">
                  &lt;{plan.protectionGoals.targetDisputeRate}%
                </span>
              </div>
              <Progress value={disputeRateProgress} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Evidence Quality</span>
                <span className="text-foreground">{evidenceQualityProgress}%</span>
              </div>
              <Progress value={evidenceQualityProgress} className="h-2" />
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-foreground mb-2">Active Rules</div>
          <div className="space-y-2">
            {plan.customRules.map((rule) => (
              <div
                key={rule.ruleId}
                className="flex items-center justify-between p-2 bg-muted rounded text-sm"
              >
                <span className="text-foreground">{rule.ruleName}</span>
                <Badge variant={rule.enabled ? "default" : "outline"} className="text-xs">
                  {rule.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={onCustomize} variant="outline" className="w-full gap-2">
          <Settings className="w-4 h-4" />
          Customize Plan
        </Button>

        <div className="p-3 bg-accent/50 rounded-md">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
            <p className="text-xs text-foreground">
              Your plan is performing 23% better than the average balanced plan
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}