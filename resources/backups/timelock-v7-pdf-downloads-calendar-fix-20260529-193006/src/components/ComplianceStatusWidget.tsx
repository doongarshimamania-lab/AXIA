import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ComplianceStatusWidgetProps {
  status: "active" | "at_risk" | "rejected";
  message: string;
  countdown?: number;
  onActionClick?: () => void;
  rightContent?: ReactNode;
  // New props for conversion engine
  atRiskAmount?: number;
  subscriptionTier?: string;
}

export function ComplianceStatusWidget({ 
  status, 
  message, 
  countdown, 
  onActionClick,
  rightContent,
  atRiskAmount = 0,
  subscriptionTier = "free"
}: ComplianceStatusWidgetProps) {
  const [timeLeft, setTimeLeft] = useState(countdown || 0);
  const [animatedAmount, setAnimatedAmount] = useState(0);

  useEffect(() => {
    if (countdown && countdown > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [countdown]);

  // Animate at-risk amount
  useEffect(() => {
    if (atRiskAmount > 0 && (status === "at_risk" || status === "rejected")) {
      const increment = Math.ceil(atRiskAmount / 20);
      const timer = setInterval(() => {
        setAnimatedAmount((prev) => {
          if (prev >= atRiskAmount) {
            clearInterval(timer);
            return atRiskAmount;
          }
          return Math.min(prev + increment, atRiskAmount);
        });
      }, 83); // 83ms per digit as specified

      return () => clearInterval(timer);
    }
  }, [atRiskAmount, status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = () => {
    switch (status) {
      case "active":
        return {
          bg: "bg-primary",
          icon: CheckCircle,
          iconColor: "text-primary-foreground",
          textColor: "text-primary-foreground",
          animation: "pulse",
        };
      case "at_risk":
        return {
          bg: "bg-gradient-to-b from-orange-500 to-orange-600",
          icon: AlertTriangle,
          iconColor: "text-white",
          textColor: "text-white",
          animation: "shake",
        };
      case "rejected":
        return {
          bg: "bg-destructive",
          icon: XCircle,
          iconColor: "text-destructive-foreground",
          textColor: "text-destructive-foreground",
          animation: "pulse",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Show loss aversion engine for at-risk or rejected status
  const showLossAversion = (status === "at_risk" || status === "rejected") && atRiskAmount > 0;

  return (
    <motion.div
      className={`min-h-[60px] ${config.bg} flex flex-col px-6 py-4 text-base`}
      initial={{ opacity: 0, y: -60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={
              config.animation === "pulse"
                ? { scale: [1, 1.05, 1], opacity: [1, 0.9, 1] }
                : { rotate: [-5, 5, -5, 0] }
            }
            transition={{
              duration: config.animation === "pulse" ? 2 : 0.5,
              repeat: Infinity,
              repeatDelay: config.animation === "pulse" ? 0 : 1.5,
            }}
          >
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </motion.div>
          
          <span className={`${config.textColor} ${status === "at_risk" ? "font-semibold uppercase" : ""}`}>
            {message}
            {timeLeft > 0 && (
              <span className="ml-2 font-mono">
                [{formatTime(timeLeft)}]
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {typeof rightContent !== "undefined" && (
            <div className={`text-xs md:text-sm ${config.textColor}`}>
              {rightContent}
            </div>
          )}
        </div>
      </div>

      {/* Loss Aversion Engine */}
      {showLossAversion && (
        <motion.div
          className="mt-4 space-y-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
        >
          <div className={config.textColor}>
            You're at risk of losing{" "}
            <motion.span 
              className="text-xl font-medium font-[Space_Grotesk]"
              key={animatedAmount}
            >
              ${animatedAmount.toFixed(2)}
            </motion.span>{" "}
            this block
          </div>
          
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button
              onClick={onActionClick}
              className="w-full h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Generate Dispute Report (Saves{" "}
              <span className="font-medium font-[Space_Grotesk] text-green-200">
                ${(animatedAmount * 0.83).toFixed(2)}
              </span>
              )
            </Button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}