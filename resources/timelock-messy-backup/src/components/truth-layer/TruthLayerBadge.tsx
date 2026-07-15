import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  getVerificationStatus,
  getScoreColor,
  getScoreBgColor,
  type VerificationItem,
} from "./truthLayerHelpers";

// ─── Types ──────────────────────────────────────────────────────────────────

export type BadgeSize = "sm" | "md" | "lg";

export interface TruthLayerBadgeProps {
  /** Verification score 0-100 */
  score: number;
  /** Optional label to show next to the badge */
  label?: string;
  /** Size variant: sm (inline badges), md (cards), lg (headers) */
  size?: BadgeSize;
  /** Detail items to show in tooltip and expanded view */
  details?: VerificationItem[];
  /** Whether to show the score percentage */
  showScore?: boolean;
  /** Whether to show the expandable detail panel on click */
  expandable?: boolean;
  /** Optional className override */
  className?: string;
}

// ─── Icon Mapping ───────────────────────────────────────────────────────────

function getShieldIcon(status: ReturnType<typeof getVerificationStatus>, sizeClass: string) {
  switch (status) {
    case "verified":
      return <ShieldCheck className={`${sizeClass} text-emerald-500`} />;
    case "partial":
      return <ShieldAlert className={`${sizeClass} text-amber-500`} />;
    case "unverified":
      return <ShieldQuestion className={`${sizeClass} text-slate-400`} />;
  }
}

// ─── Size Config ────────────────────────────────────────────────────────────

const SIZE_CONFIG: Record<
  BadgeSize,
  {
    iconSize: string;
    fontSize: string;
    padding: string;
    scoreFontSize: string;
    detailFontSize: string;
  }
> = {
  sm: {
    iconSize: "h-3.5 w-3.5",
    fontSize: "text-[10px]",
    padding: "px-1.5 py-0.5 gap-1",
    scoreFontSize: "text-[9px]",
    detailFontSize: "text-[10px]",
  },
  md: {
    iconSize: "h-4 w-4",
    fontSize: "text-xs",
    padding: "px-2 py-1 gap-1.5",
    scoreFontSize: "text-[11px]",
    detailFontSize: "text-xs",
  },
  lg: {
    iconSize: "h-5 w-5",
    fontSize: "text-sm",
    padding: "px-3 py-1.5 gap-2",
    scoreFontSize: "text-sm",
    detailFontSize: "text-sm",
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function TruthLayerBadge({
  score,
  label,
  size = "md",
  details = [],
  showScore = true,
  expandable = false,
  className = "",
}: TruthLayerBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = getVerificationStatus(score);
  const colorClass = getScoreColor(score);
  const config = SIZE_CONFIG[size];

  const verifiedItems = details.filter((d) => d.verified).length;
  const totalItems = details.length;

  // Tooltip content
  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-semibold">
        Truth Layer: {score}%
      </div>
      {label && <div className="text-[10px] opacity-80">{label}</div>}
      {details.length > 0 && (
        <div className="border-t border-white/20 pt-1 mt-1 space-y-0.5">
          {details.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className={item.verified ? "text-emerald-300" : "text-red-300"}>
                {item.verified ? "✓" : "○"}
              </span>
              <span className="text-[10px]">{item.label}</span>
            </div>
          ))}
        </div>
      )}
      {details.length === 0 && totalItems === 0 && (
        <div className="text-[10px] opacity-70 italic">No verification data</div>
      )}
    </div>
  );

  const badgeContent = (
    <motion.div
      className={`inline-flex items-center rounded-full border bg-background/80 backdrop-blur-sm transition-colors ${
        status === "verified"
          ? "border-emerald-500/25 bg-emerald-500/5"
          : status === "partial"
          ? "border-amber-500/25 bg-amber-500/5"
          : "border-slate-400/25 bg-slate-400/5"
      } ${config.padding} ${expandable ? "cursor-pointer" : ""} ${className}`}
      onClick={expandable ? () => setIsExpanded(!isExpanded) : undefined}
      whileHover={expandable ? { scale: 1.02 } : undefined}
      whileTap={expandable ? { scale: 0.98 } : undefined}
      layout
    >
      {getShieldIcon(status, config.iconSize)}
      {label && (
        <span className={`${config.fontSize} font-medium text-foreground`}>{label}</span>
      )}
      {showScore && (
        <span className={`${config.scoreFontSize} font-bold ${colorClass}`}>
          {score}%
        </span>
      )}
      {expandable && details.length > 0 && (
        <motion.span
          className="text-muted-foreground"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg
            className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </motion.span>
      )}
    </motion.div>
  );

  return (
    <div className="inline-block">
      {details.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px]">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      ) : (
        badgeContent
      )}

      {/* Expanded Detail Panel */}
      <AnimatePresence>
        {expandable && isExpanded && details.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 p-2.5 rounded-lg border border-border bg-card/80 backdrop-blur-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={`${config.detailFontSize} font-medium text-foreground`}>
                  Verification Details
                </span>
                <span className={`${config.detailFontSize} text-muted-foreground`}>
                  {verifiedItems}/{totalItems} verified
                </span>
              </div>
              {details.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex-shrink-0 ${
                      item.verified ? "text-emerald-500" : "text-slate-400"
                    }`}
                  >
                    {item.verified ? (
                      <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
                    ) : (
                      <Shield className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className={`${config.detailFontSize} text-foreground`}>{item.label}</p>
                    {item.detail && !item.verified && (
                      <p className={`${config.detailFontSize} text-amber-600 dark:text-amber-400`}>
                        {item.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
