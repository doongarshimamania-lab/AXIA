import { useNavigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowRight,
  Plus,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { featureLabels } from "./navigationHelpers";

export interface Connection {
  feature: "proposal" | "project" | "time" | "evidence" | "invoice" | "scope" | "payment" | "reminder";
  itemId?: string;
  label: string;
  status: "connected" | "available" | "create_new";
  url: string;
  description: string;
}

interface FeatureConnectorProps {
  currentFeature: string;
  currentItemId?: string;
  connections: Connection[];
  title?: string;
}

const featureIconMap: Record<string, React.ElementType> = {
  proposal: FileText,
  project: Briefcase,
  time: Clock,
  evidence: Shield,
  invoice: Receipt,
  scope: Ruler,
  payment: DollarSign,
  reminder: Bell,
};

const featureColorMap: Record<string, string> = {
  proposal: "text-blue-500 bg-blue-500/10",
  project: "text-platinum-400 bg-platinum-500/10",
  time: "text-emerald-500 bg-emerald-500/10",
  evidence: "text-axia-teal-600 bg-axia-teal-500/10",
  invoice: "text-amber-500 bg-amber-500/10",
  scope: "text-primary bg-primary/10",
  payment: "text-green-500 bg-green-500/10",
  reminder: "text-red-500 bg-red-500/10",
};

const statusBadgeMap: Record<string, { label: string; className: string }> = {
  connected: {
    label: "Connected",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  },
  available: {
    label: "Available",
    className: "bg-blue-500/15 text-blue-600 border-blue-500/25",
  },
  create_new: {
    label: "Create New",
    className: "bg-platinum-500/15 text-platinum-400 border-platinum-500/25",
  },
};

export function FeatureConnector({
  currentFeature,
  currentItemId,
  connections,
  title = "Connected Features",
}: FeatureConnectorProps) {
  const navigate = useNavigate();

  if (connections.length === 0) return null;

  const connectedCount = connections.filter((c) => c.status === "connected").length;
  const availableCount = connections.filter((c) => c.status === "available").length;
  const createNewCount = connections.filter((c) => c.status === "create_new").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" />
              {title}
            </h3>
            <div className="flex items-center gap-2">
              {connectedCount > 0 && (
                <span className="text-[11px] text-emerald-600 font-medium">
                  {connectedCount} connected
                </span>
              )}
              {availableCount > 0 && (
                <span className="text-[11px] text-blue-600 font-medium">
                  {availableCount} available
                </span>
              )}
              {createNewCount > 0 && (
                <span className="text-[11px] text-platinum-400 font-medium">
                  {createNewCount} to create
                </span>
              )}
            </div>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {connections.map((connection, idx) => {
              const Icon = featureIconMap[connection.feature] || FileText;
              const colors = featureColorMap[connection.feature] || "text-gray-500 bg-gray-500/10";
              const [iconColor, iconBg] = colors.split(" ");
              const statusConfig = statusBadgeMap[connection.status];

              return (
                <motion.div
                  key={`${connection.feature}-${connection.itemId || idx}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <button
                    onClick={() => navigate(connection.url)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            {featureLabels[connection.feature] || connection.feature}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] h-4 px-1.5 ${statusConfig.className}`}
                          >
                            {connection.status === "connected" && <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />}
                            {connection.status === "create_new" && <Plus className="h-2.5 w-2.5 mr-0.5" />}
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {connection.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {connection.description}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
