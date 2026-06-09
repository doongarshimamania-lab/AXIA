import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  FileText,
  Briefcase,
  Clock,
  Shield,
  Receipt,
  DollarSign,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface TimelineStep {
  feature: "proposal" | "project" | "time" | "evidence" | "invoice" | "payment";
  label: string;
  status: "completed" | "active" | "upcoming";
  url?: string;
  timestamp?: number;
}

interface ActivityTimelineProps {
  steps: TimelineStep[];
  title?: string;
}

const stepIconMap: Record<string, React.ElementType> = {
  proposal: FileText,
  project: Briefcase,
  time: Clock,
  evidence: Shield,
  invoice: Receipt,
  payment: DollarSign,
};

const stepColorMap: Record<string, { completed: string; active: string; upcoming: string }> = {
  proposal: { completed: "text-blue-500 bg-blue-500/20 border-blue-500/30", active: "text-blue-500 bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/20", upcoming: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
  project: { completed: "text-purple-500 bg-purple-500/20 border-purple-500/30", active: "text-purple-500 bg-purple-500/10 border-purple-500/50 ring-2 ring-purple-500/20", upcoming: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
  time: { completed: "text-emerald-500 bg-emerald-500/20 border-emerald-500/30", active: "text-emerald-500 bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/20", upcoming: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
  evidence: { completed: "text-indigo-500 bg-indigo-500/20 border-indigo-500/30", active: "text-indigo-500 bg-indigo-500/10 border-indigo-500/50 ring-2 ring-indigo-500/20", upcoming: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
  invoice: { completed: "text-amber-500 bg-amber-500/20 border-amber-500/30", active: "text-amber-500 bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20", upcoming: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
  payment: { completed: "text-green-500 bg-green-500/20 border-green-500/30", active: "text-green-500 bg-green-500/10 border-green-500/50 ring-2 ring-green-500/20", upcoming: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
};

function formatDate(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivityTimeline({ steps, title = "Project Flow" }: ActivityTimelineProps) {
  const navigate = useNavigate();

  if (steps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="py-2"
    >
      {title && (
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {title}
        </h4>
      )}
      <div className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const Icon = stepIconMap[step.feature] || FileText;
          const colors = stepColorMap[step.feature] || stepColorMap.project;
          const colorClass = colors[step.status];
          const isLast = idx === steps.length - 1;

          return (
            <div key={`${step.feature}-${idx}`} className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => step.url && step.status !== "upcoming" && navigate(step.url)}
                      disabled={!step.url || step.status === "upcoming"}
                      className={`flex flex-col items-center gap-1.5 group transition-all ${
                        step.url && step.status !== "upcoming" ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <div
                        className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                          step.status === "active" ? "scale-110" : ""
                        } ${colorClass}`}
                      >
                        {step.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : step.status === "active" ? (
                          <Icon className="h-4 w-4 animate-pulse" />
                        ) : (
                          <Circle className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-medium whitespace-nowrap ${
                          step.status === "completed"
                            ? "text-foreground"
                            : step.status === "active"
                            ? "text-primary"
                            : "text-muted-foreground/50"
                        }`}
                      >
                        {step.label}
                      </span>
                      {step.timestamp && step.status === "completed" && (
                        <span className="text-[9px] text-muted-foreground">
                          {formatDate(step.timestamp)}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {step.label} — {step.status === "completed" ? "Completed" : step.status === "active" ? "In Progress" : "Upcoming"}
                    {step.timestamp && ` (${formatDate(step.timestamp)})`}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 min-w-[24px] max-w-[60px] mx-1">
                  <div
                    className={`h-0.5 rounded-full ${
                      step.status === "completed" && steps[idx + 1]?.status !== "upcoming"
                        ? "bg-primary/40"
                        : step.status === "completed" && steps[idx + 1]?.status === "upcoming"
                        ? "bg-gradient-to-r from-primary/40 to-muted"
                        : "bg-muted"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Preset Timeline Builder ──────────────────────────────────────────────────

export function buildProjectTimeline(data: {
  hasProposal?: boolean;
  proposalSentAt?: number;
  proposalSignedAt?: number;
  hasProject?: boolean;
  projectCreatedAt?: number;
  hasTimeEntries?: boolean;
  hasEvidence?: boolean;
  hasInvoice?: boolean;
  invoiceCreatedAt?: number;
  hasPayment?: boolean;
  paymentReceivedAt?: number;
}): TimelineStep[] {
  const steps: TimelineStep[] = [];

  // Proposal
  if (data.hasProposal) {
    steps.push({
      feature: "proposal",
      label: "Proposal",
      status: data.proposalSignedAt ? "completed" : "active",
      url: "/proposals",
      timestamp: data.proposalSentAt,
    });
  } else {
    steps.push({ feature: "proposal", label: "Proposal", status: "upcoming", url: "/proposals" });
  }

  // Project
  if (data.hasProject) {
    steps.push({
      feature: "project",
      label: "Project",
      status: data.hasTimeEntries || data.hasEvidence ? "completed" : "active",
      url: "/projects",
      timestamp: data.projectCreatedAt,
    });
  } else {
    steps.push({ feature: "project", label: "Project", status: "upcoming", url: "/projects" });
  }

  // Time Tracking
  if (data.hasTimeEntries) {
    steps.push({
      feature: "time",
      label: "Time Tracked",
      status: data.hasInvoice ? "completed" : "active",
      url: "/time-tracking",
    });
  } else if (data.hasProject) {
    steps.push({ feature: "time", label: "Time Tracked", status: "upcoming", url: "/time-tracking" });
  } else {
    steps.push({ feature: "time", label: "Time Tracked", status: "upcoming" });
  }

  // Evidence
  if (data.hasEvidence) {
    steps.push({
      feature: "evidence",
      label: "Evidence",
      status: "completed",
      url: "/evidence-library",
    });
  } else if (data.hasTimeEntries) {
    steps.push({ feature: "evidence", label: "Evidence", status: "upcoming", url: "/evidence-library" });
  } else {
    steps.push({ feature: "evidence", label: "Evidence", status: "upcoming" });
  }

  // Invoice
  if (data.hasInvoice) {
    steps.push({
      feature: "invoice",
      label: "Invoice",
      status: data.hasPayment ? "completed" : "active",
      url: "/invoices",
      timestamp: data.invoiceCreatedAt,
    });
  } else if (data.hasTimeEntries) {
    steps.push({ feature: "invoice", label: "Invoice", status: "upcoming", url: "/invoices" });
  } else {
    steps.push({ feature: "invoice", label: "Invoice", status: "upcoming" });
  }

  // Payment
  if (data.hasPayment) {
    steps.push({
      feature: "payment",
      label: "Payment",
      status: "completed",
      url: "/payment-patterns",
      timestamp: data.paymentReceivedAt,
    });
  } else if (data.hasInvoice) {
    steps.push({ feature: "payment", label: "Payment", status: "upcoming", url: "/payment-patterns" });
  } else {
    steps.push({ feature: "payment", label: "Payment", status: "upcoming" });
  }

  return steps;
}
