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
      className="p-6 border-t border-slate-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-900">
          {message}
        </h4>
        <p className="text-sm text-slate-600">{description}</p>
        <Button
          onClick={onUpgrade}
          className="w-full text-white shadow-md"
          style={{ background: "linear-gradient(to right, var(--platinum-800), var(--platinum-700))" }}
        >
          Upgrade to {targetTier.charAt(0).toUpperCase() + targetTier.slice(1)} → {tierPricing[targetTier]}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
