import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import {
  FileText,
  Briefcase,
  Clock,
  Shield,
  Receipt,
  Ruler,
  DollarSign,
  Bell,
  Play,
  Plus,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export interface WorkflowAction {
  id: string;
  label: string;
  icon: React.ElementType;
  feature: string;
  url: string;
  variant?: "default" | "outline" | "ghost";
  color?: string;
  requiresData?: boolean;
  disabled?: boolean;
}

interface WorkflowActionsProps {
  actions: WorkflowAction[];
  title?: string;
  compact?: boolean;
}

export function WorkflowActions({
  actions,
  title = "Quick Actions",
  compact = false,
}: WorkflowActionsProps) {
  const navigate = useNavigate();

  if (actions.length === 0) return null;

  const handleAction = (action: WorkflowAction) => {
    if (action.disabled) {
      toast.info(`Complete the current step first to unlock this action`);
      return;
    }
    navigate(action.url);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <TooltipProvider key={action.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={action.variant || "outline"}
                    size="sm"
                    className={`h-7 text-[11px] gap-1 ${action.color || ""}`}
                    onClick={() => handleAction(action)}
                    disabled={action.disabled}
                  >
                    <Icon className="h-3 w-3" />
                    {action.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {action.feature}: {action.label}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
    >
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{title}:</span>
      <div className="flex items-center gap-2 flex-wrap">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Button
                variant={action.variant || "outline"}
                size="sm"
                className={`h-8 text-xs gap-1.5 ${action.color || ""}`}
                onClick={() => handleAction(action)}
                disabled={action.disabled}
              >
                <Icon className="h-3.5 w-3.5" />
                {action.label}
                {!action.disabled && <ArrowRight className="h-3 w-3 opacity-50" />}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Preset Workflow Action Sets ──────────────────────────────────────────────

export function getProposalActions(proposalId: string, proposalStatus: string): WorkflowAction[] {
  const actions: WorkflowAction[] = [];
  
  if (proposalStatus === "signed") {
    actions.push({
      id: "convert-to-project",
      label: "Create Project",
      icon: Briefcase,
      feature: "Projects",
      url: `/projects?createFromProposal=${proposalId}`,
      variant: "default",
      color: "bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white",
    });
  }

  actions.push({
    id: "view-scope",
    label: "View Scope",
    icon: Ruler,
    feature: "Scope",
    url: `/scope?proposalId=${proposalId}`,
    variant: "outline",
  });

  return actions;
}

export function getProjectActions(projectId: string, projectName?: string): WorkflowAction[] {
  const nameParam = projectName ? `&projectName=${encodeURIComponent(projectName)}` : "";
  
  return [
    {
      id: "start-timer",
      label: "Start Timer",
      icon: Play,
      feature: "Time Tracking",
      url: `/time-tracking?project=${projectId}${nameParam}`,
      variant: "default",
      color: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    {
      id: "create-invoice",
      label: "Create Invoice",
      icon: Receipt,
      feature: "Invoices",
      url: `/invoices/new?projectId=${projectId}${nameParam}`,
      variant: "outline",
    },
    {
      id: "view-scope",
      label: "Scope",
      icon: Ruler,
      feature: "Scope",
      url: `/scope?projectId=${projectId}${nameParam}`,
      variant: "outline",
    },
    {
      id: "view-evidence",
      label: "Evidence",
      icon: Shield,
      feature: "Evidence",
      url: `/evidence-library?projectId=${projectId}${nameParam}`,
      variant: "outline",
    },
  ];
}

export function getTimeTrackingActions(projectId?: string): WorkflowAction[] {
  const actions: WorkflowAction[] = [];

  if (projectId) {
    actions.push({
      id: "attach-invoice",
      label: "Create Invoice",
      icon: Receipt,
      feature: "Invoices",
      url: `/invoices/new?projectId=${projectId}`,
      variant: "outline",
    });
  }

  actions.push({
    id: "add-evidence",
    label: "Add Evidence",
    icon: Shield,
    feature: "Evidence",
    url: `/evidence-library`,
    variant: "outline",
  });

  return actions;
}

export function getInvoiceActions(invoiceId: string, hasProofs?: boolean): WorkflowAction[] {
  const actions: WorkflowAction[] = [];

  if (!hasProofs) {
    actions.push({
      id: "attach-evidence",
      label: "Attach Evidence",
      icon: Shield,
      feature: "Evidence",
      url: `/evidence-library?invoiceId=${invoiceId}`,
      variant: "default",
      color: "bg-indigo-600 hover:bg-indigo-700 text-white",
    });
  }

  actions.push({
    id: "set-reminder",
    label: "Payment Reminders",
    icon: Bell,
    feature: "Reminders",
    url: `/payment-patterns`,
    variant: "outline",
  });

  actions.push({
    id: "client-pattern",
    label: "Client Pattern",
    icon: DollarSign,
    feature: "Payments",
    url: `/payment-patterns`,
    variant: "outline",
  });

  return actions;
}

export function getScopeActions(projectId?: string, projectName?: string): WorkflowAction[] {
  const nameParam = projectName ? `&projectName=${encodeURIComponent(projectName)}` : "";
  const actions: WorkflowAction[] = [];

  if (projectId) {
    actions.push({
      id: "link-project",
      label: "View Project",
      icon: Briefcase,
      feature: "Projects",
      url: `/projects`,
      variant: "outline",
    });
  }

  actions.push({
    id: "formalize-invoice",
    label: "Create Invoice for Changes",
    icon: Receipt,
    feature: "Invoices",
    url: projectId ? `/invoices/new?projectId=${projectId}${nameParam}` : `/invoices/new`,
    variant: "default",
    color: "bg-amber-600 hover:bg-amber-700 text-white",
  });

  return actions;
}
