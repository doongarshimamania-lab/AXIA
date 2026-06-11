import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface UpgradePromptProps {
  message: string;
  valueGap: number;
  targetTier: string;
  description: string;
  onUpgrade?: () => void;
}

export function UpgradePrompt({ message, valueGap, targetTier, description, onUpgrade }: UpgradePromptProps) {
  const tierPricing: Record<string, string> = {
    starter: "$4/mo",
    pro: "$7/mo",
    expert: "$12/mo",
  };

  return (
    <motion.div
      className="p-6 border-t border-border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground">
          {message}
        </h4>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button
          onClick={onUpgrade}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
        >
          Upgrade to {targetTier.charAt(0).toUpperCase() + targetTier.slice(1)} → {tierPricing[targetTier]}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
