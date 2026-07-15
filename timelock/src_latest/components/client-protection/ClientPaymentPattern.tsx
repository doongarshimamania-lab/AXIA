import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentPattern {
  hasPattern: boolean;
  disputeRate: number;
  disputeCycle: string;
  highRiskPeriod: string;
  paymentTriggers: string[];
  protectionPlan: Array<{ action: string; impact: string }>;
}

interface ClientPaymentPatternProps {
  paymentPattern: PaymentPattern | undefined;
  tier: string;
}

export function ClientPaymentPattern({ paymentPattern, tier }: ClientPaymentPatternProps) {
  // PRO+ feature - Payment Pattern Analysis
  if (tier === "free" || tier === "starter") {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100 font-bold">
            Payment Pattern Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-slate-400 opacity-50" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Upgrade to {tier === "free" ? "Starter" : "Pro"} to unlock payment pattern analysis
            </p>
            <div className="text-xs text-slate-500 dark:text-slate-500">
              Identify high-risk payment periods and get proactive protection plans
            </div>
            <Button className="mt-4 bg-primary hover:bg-primary/90 text-white font-semibold">
              Upgrade to {tier === "free" ? "Starter → $4/mo" : "Pro → $7/mo"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900 dark:to-amber-800 border-2 border-amber-200 dark:border-amber-700 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-amber-900 dark:text-amber-100 font-bold">
          Payment Pattern Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!paymentPattern || !paymentPattern.hasPattern ? (
          <div className="text-center py-8 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No payment patterns detected yet. Add clients and work sessions to analyze payment behavior.</p>
          </div>
        ) : (
          <>
            <div className="p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700">
              <div className="text-base font-semibold text-amber-900 dark:text-amber-100 mb-2">
                High-Risk Payment Pattern Detected
              </div>
              <div className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                This client has a {paymentPattern.disputeRate}% dispute rate. Pattern detected: {paymentPattern.disputeCycle}
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">High-risk period: {paymentPattern.highRiskPeriod}</span>
              </div>
            </div>

            {paymentPattern.paymentTriggers && paymentPattern.paymentTriggers.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Payment Triggers:
                </div>
                {paymentPattern.paymentTriggers.map((trigger: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    {trigger}
                  </div>
                ))}
              </div>
            )}

            {paymentPattern.protectionPlan && paymentPattern.protectionPlan.length > 0 && (
              <div className="p-4 bg-muted dark:bg-primary/10 rounded-xl border border-border dark:border-border">
                <div className="text-sm font-medium text-primary dark:text-primary mb-3">
                  Proactive Protection Plan
                </div>
                <div className="space-y-2">
                  {paymentPattern.protectionPlan.map((plan: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                      <span className="text-lg">✅</span>
                      <div className="flex-1">
                        <div className="text-sm text-primary dark:text-primary">{plan.action}</div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          Impact: {plan.impact}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}