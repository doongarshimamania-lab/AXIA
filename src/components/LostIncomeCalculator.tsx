import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface LostIncomeCalculatorProps {
  platformLosses: {
    upwork: number;
    fiverr: number;
    toptal: number;
  };
  subscriptionTier: "free" | "starter" | "pro" | "expert" | "client";
  onUpgradeClick: () => void;
  atRiskAmount?: number;
}

export function LostIncomeCalculator({
  platformLosses,
  subscriptionTier,
  onUpgradeClick,
  atRiskAmount = 0,
}: LostIncomeCalculatorProps) {
  const [animatedLoss, setAnimatedLoss] = useState(0);
  const [animatedSavings, setAnimatedSavings] = useState(0);
  const [animatedNetValue, setAnimatedNetValue] = useState(0);

  const totalLoss = platformLosses.upwork + platformLosses.fiverr + platformLosses.toptal;
  
  // Determine recommended tier and pricing based on current tier
  const tierPricing: Record<string, number> = {
    free: 7, // Starter
    starter: 15, // Pro
    pro: 49, // Expert
  };
  
  const tierSuccessRates: Record<string, number> = {
    free: 0.45, // Starter: 45%
    starter: 0.83, // Pro: 83%
    pro: 0.95, // Expert: 95%
  };
  
  const recommendedCost = tierPricing[subscriptionTier] || 7;
  const recommendedSuccessRate = tierSuccessRates[subscriptionTier] || 0.45;
  const savingsAmount = Math.round((atRiskAmount || totalLoss) * recommendedSuccessRate * 100) / 100;
  const netValue = Math.max(savingsAmount - recommendedCost, 0);

  useEffect(() => {
    const lossInterval = setInterval(() => {
      setAnimatedLoss((prev) => {
        if (prev >= totalLoss) {
          clearInterval(lossInterval);
          return totalLoss;
        }
        return prev + 1;
      });
    }, 83);

    const savingsInterval = setInterval(() => {
      setAnimatedSavings((prev) => {
        if (prev >= savingsAmount) {
          clearInterval(savingsInterval);
          return savingsAmount;
        }
        return prev + 1;
      });
    }, 83);

    const netValueInterval = setInterval(() => {
      setAnimatedNetValue((prev) => {
        if (prev >= netValue) {
          clearInterval(netValueInterval);
          return netValue;
        }
        return prev + 1;
      });
    }, 83);

    return () => {
      clearInterval(lossInterval);
      clearInterval(savingsInterval);
      clearInterval(netValueInterval);
    };
  }, [totalLoss, savingsAmount, netValue]);

  return (
    <motion.div
      className="w-[300px] bg-card border border-border rounded-lg p-6"
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-xl font-bold text-foreground mb-4 tracking-tight font-[Space_Grotesk]">
        Your Premium Value
      </h3>

      <div className="space-y-4">
        {/* Current Status */}
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-2">
            Axia has protected: 
            <span className="text-destructive font-medium font-[Space_Grotesk]">
              ${animatedLoss.toFixed(2)}
            </span> this month (Free Tier)
          </div>
          <div className="text-sm text-muted-foreground">
            You're at risk of losing 
            <span className="text-destructive font-medium font-[Space_Grotesk]">
              ${(atRiskAmount || totalLoss).toFixed(2)}
            </span> this month
          </div>
        </div>

        {/* Premium Value Breakdown */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="text-sm font-semibold text-foreground">
            {subscriptionTier === "free" && "With Starter ($7/mo):"}
            {subscriptionTier === "starter" && "With Pro ($15/mo):"}
            {subscriptionTier === "pro" && "With Expert ($49/mo):"}
          </div>
          
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>
              • Save{" "}
              <span className="text-emerald-600 font-medium font-[Space_Grotesk]">
                ${animatedSavings.toFixed(2)}
              </span>{" "}
              in potential denials
            </li>
            <li>• {Math.round(recommendedSuccessRate * 100)}% dispute success rate</li>
            <li>• Priority dispute support (24h response)</li>
          </ul>

          <div className="text-center pt-2">
            <div className="text-sm text-muted-foreground mb-1">Net value:</div>
            <motion.div
              className="text-2xl font-bold text-emerald-600 font-[Space_Grotesk]"
              key={animatedNetValue}
            >
              ${animatedNetValue.toFixed(2)}/month
            </motion.div>
            <div className="text-xs text-muted-foreground">
              (${animatedSavings.toFixed(2)} - ${recommendedCost})
            </div>
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-foreground">Upwork</span>
            <span className="font-[Space_Grotesk] text-primary">
              ${platformLosses.upwork.toFixed(0)} lost → $
              {Math.max(platformLosses.upwork - 7, 0).toFixed(0)} net
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-foreground">Fiverr</span>
            <span className="font-[Space_Grotesk] text-emerald-500">
              ${platformLosses.fiverr.toFixed(0)} lost → $
              {Math.max(platformLosses.fiverr - 7, 0).toFixed(0)} net
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-foreground">Toptal</span>
            <span className="font-[Space_Grotesk] text-violet-500">
              ${platformLosses.toptal.toFixed(0)} lost → $
              {Math.max(platformLosses.toptal - 7, 0).toFixed(0)} net
            </span>
          </div>
        </div>

        {/* CTA Button */}
        {(subscriptionTier === "free" || subscriptionTier === "starter" || subscriptionTier === "pro") && netValue > 0 && (
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Button
              onClick={onUpgradeClick}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 h-14 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {subscriptionTier === "free" && `Upgrade to Starter for $7/mo`}
              {subscriptionTier === "starter" && `Upgrade to Pro for $15/mo`}
              {subscriptionTier === "pro" && `Upgrade to Expert for $49/mo`}
            </Button>
          </motion.div>
        )}

        {subscriptionTier === "expert" && (
          <div className="text-center p-4 bg-muted border border-border rounded">
            <Badge variant="default" className="bg-emerald-600 text-white">
              ✅ Protected
            </Badge>
            <div className="text-xs text-muted-foreground mt-2">
              Dispute reports available for all rejected time
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-muted-foreground text-center">
        <div className="font-semibold mb-1">Average Success Rate: 83%</div>
        <div>Based on Axia Expert verification</div>
      </div>
    </motion.div>
  );
}