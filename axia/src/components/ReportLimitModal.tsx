import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ReportLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  monthlyLoss: number;
  monthlySavings: number;
}

export function ReportLimitModal({ 
  isOpen, 
  onClose, 
  onUpgrade, 
  monthlyLoss, 
  monthlySavings 
}: ReportLimitModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-destructive font-[Space_Grotesk]">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            REPORT LIMIT REACHED
          </DialogTitle>
          <DialogDescription>You have used your free dispute reports for this month.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-base font-semibold text-foreground">
            You've used your 1 free dispute report this month.
          </p>
          
          <div className="space-y-2">
            <p className="text-foreground">
              You're at risk of losing{" "}
              <span className="text-xl font-medium text-destructive font-[Space_Grotesk]">
                ${monthlyLoss.toFixed(2)}
              </span>{" "}
              this month
            </p>
            
            <p className="text-foreground">
              Premium users save{" "}
              <span className="text-xl font-medium text-emerald-600 font-[Space_Grotesk]">
                ${monthlySavings.toFixed(2)}
              </span>{" "}
              with unlimited reports
            </p>
          </div>

          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Button
              onClick={onUpgrade}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
            >
              Upgrade to Premium (Save{" "}
              <span className="font-medium font-[Space_Grotesk] text-emerald-200">
                ${monthlySavings.toFixed(2)}
              </span>{" "}
              this month)
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
