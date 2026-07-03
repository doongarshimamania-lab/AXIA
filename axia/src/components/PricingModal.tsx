import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
// ponytail: `import { toast } from "sonner"` removed — the only `toast.*`
// call in this file was the "payment integration coming soon!" early-return
// in handleUpgradeClick, which is gone now that upgrades persist via
// api.users.setMyTier. Removing the unused import keeps tsc --noEmit clean.

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier: string) => void;
  currentTier: string;
  currentLoss: number;
  potentialSavings: number;
  highlightSavings?: number;
  vulnerabilityScore?: number;
}

const TIER_PRICING = {
  free: 0,
  starter: 4,
  pro: 7,
  expert: 12,
};

const TIER_SUCCESS_RATES = {
  free: 22,
  starter: 45,
  pro: 83,
  expert: 95,
};

export function PricingModal({ 
  isOpen, 
  onClose, 
  onUpgrade, 
  currentTier = "free",
  currentLoss, 
  potentialSavings,
  highlightSavings,
  vulnerabilityScore = 0,
}: PricingModalProps) {
  const displaySavings = highlightSavings || potentialSavings;

  const handleUpgradeClick = (tier: string) => {
    // ponytail: previously this early-returned with a "payment integration
    // coming soon!" toast for any paid tier (starter/pro/expert), which
    // silently dropped the upgrade. Combined with `useSubscriptionTier`
    // only writing to localStorage (never Convex), this caused the
    // user-reported bug: "when i upgrade to any tier it doesnt stay in the
    // tier and automatically comes down to free".
    //
    // Fix: route ALL tier selections through `onUpgrade(tier)` — the
    // caller (Dashboard.handleUpgrade) now persists to the backend via
    // `api.users.setMyTier`. When real Stripe/payment integration lands,
    // gate paid tiers behind a checkout flow here.
    onUpgrade(tier);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground tracking-tight font-[Space_Grotesk]">
            Your ${displaySavings.toFixed(0)} savings are ready
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Choose the plan that protects your professional income
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-4 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Free Tier */}
          <motion.div
            className="border border-border rounded-lg p-3 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-sm font-bold text-foreground mb-1 font-[Space_Grotesk]">Free</h3>
            <div className="text-lg font-bold text-foreground mb-2 font-[Space_Grotesk]">$0</div>
            
            <div className="space-y-1 mb-2 text-[11px] flex-1">
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">1 Report/Month</span>
              </div>
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">22% Success</span>
              </div>
              <div className="flex items-start gap-1">
                <X className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground leading-tight">No Support</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full text-[10px] h-7 mt-auto" 
              disabled={currentTier === "free"}
            >
              {currentTier === "free" ? "Current" : "Free"}
            </Button>
          </motion.div>

          {/* Starter Tier */}
          <motion.div
            className="border border-border rounded-lg p-3 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="text-sm font-bold text-foreground mb-1 font-[Space_Grotesk]">Starter</h3>
            <div className="text-lg font-bold text-foreground mb-2 font-[Space_Grotesk]">
              $4<span className="text-[10px] text-muted-foreground">/mo</span>
            </div>
            
            <div className="space-y-1 mb-2 text-[11px] flex-1">
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">5 Reports/Month</span>
              </div>
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">45% Success</span>
              </div>
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">Email (48h)</span>
              </div>
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">Basic Evidence</span>
              </div>
            </div>

            <Button 
              onClick={() => handleUpgradeClick("starter")}
              className="w-full text-[10px] h-7 mt-auto"
              variant={currentTier === "free" ? "default" : "outline"}
              disabled={currentTier === "starter" || currentTier === "pro" || currentTier === "expert"}
            >
              {currentTier === "starter" ? "Current" : "Upgrade"}
            </Button>
          </motion.div>

          {/* Pro Tier */}
          <motion.div
            className="border-2 border-primary rounded-lg p-3 relative flex flex-col"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap">
              RECOMMENDED
            </div>
            
            <h3 className="text-sm font-bold text-foreground mb-1 font-[Space_Grotesk]">Pro</h3>
            <div className="text-lg font-bold text-foreground mb-2 font-[Space_Grotesk]">
              $7<span className="text-[10px] text-muted-foreground">/mo</span>
            </div>
            
            <div className="space-y-1 mb-2 text-[11px] flex-1">
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight"><strong>UNLIMITED</strong></span>
              </div>
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-emerald-500 leading-tight">83% Success</span>
              </div>
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">Priority (24h)</span>
              </div>
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">AI Prediction</span>
              </div>
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">Cross-Platform</span>
              </div>
            </div>

            <Button 
              onClick={() => handleUpgradeClick("pro")}
              className="w-full bg-primary hover:bg-primary/90 text-[10px] h-7 mt-auto"
              disabled={currentTier === "pro" || currentTier === "expert"}
            >
              {currentTier === "pro" ? "Current" : "Upgrade"}
            </Button>
          </motion.div>

          {/* Expert Tier */}
          <motion.div
            className="border border-border rounded-lg p-3 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-bold text-foreground mb-1 font-[Space_Grotesk]">Expert</h3>
            <div className="text-lg font-bold text-foreground mb-2 font-[Space_Grotesk]">
              $12<span className="text-[10px] text-muted-foreground">/mo</span>
            </div>
            
            <div className="space-y-1 mb-2 text-[11px] flex-1">
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">All Pro Features</span>
              </div>
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-emerald-500 leading-tight">95% Success</span>
              </div>
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">Dedicated (4h)</span>
              </div>
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">Policy Analysis</span>
              </div>
              <div className="flex items-start gap-1">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-tight">Team Validation</span>
              </div>
            </div>

            <Button 
              onClick={() => handleUpgradeClick("expert")}
              className="w-full text-[10px] h-7 mt-auto"
              variant="outline"
              disabled={currentTier === "expert"}
            >
              {currentTier === "expert" ? "Current" : "Upgrade"}
            </Button>
          </motion.div>

        </div>

        {highlightSavings && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Save <span className="font-medium font-[Space_Grotesk] text-emerald-600">${displaySavings.toFixed(2)}</span> this month with Premium
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}