import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle, Shield } from "lucide-react";

interface PremiumValueSectionProps {
  protectedAmount: number;
  atRiskAmount: number;
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

export function PremiumValueSection({ protectedAmount, atRiskAmount }: PremiumValueSectionProps) {
  return (
    <motion.div
      className="w-[300px] bg-card border border-border rounded-lg p-6"
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[Space_Grotesk] font-bold text-xl text-foreground">Your Premium Status</h3>
        <span className="flex items-center text-emerald-600">
          <CheckCircle className="w-5 h-5 mr-2" />
          <span className="font-medium text-sm">Premium Verified</span>
        </span>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Protected this month:</span>
          <span className="font-[Space_Grotesk] text-emerald-600 font-semibold">
            ${formatCurrency(protectedAmount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">At risk (prevention):</span>
          <span className="font-[Space_Grotesk] text-emerald-600 font-semibold">
            ${formatCurrency(atRiskAmount)}
          </span>
        </div>
      </div>

      <div className="p-4 bg-accent/50 rounded-lg mb-4">
        <div className="flex items-center mb-2">
          <Shield className="w-5 h-5 text-primary mr-2" />
          <span className="font-medium text-sm text-foreground">TIMELock Expert Verification</span>
        </div>
        <p className="text-xs text-muted-foreground">
          All dispute reports are verified by TIMELock's expert system with 83% success rate
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button className="w-full bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90">
          View All Dispute Reports
        </Button>
        <Button variant="secondary" className="w-full py-3 font-medium">
          Manage Subscription
        </Button>
      </div>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        Unlimited reports • 83% dispute success rate • Priority support
      </div>
    </motion.div>
  );
}
