import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TimelineSegment } from "@/types/projectProtection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { useState } from "react";
import { FormalizeScopeChangeDialog } from "./FormalizeScopeChangeDialog";
import { Id } from "@/convex/_generated/dataModel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segments: TimelineSegment[];
  projectId?: Id<"projects">;
  projectName?: string;
}

export function ScopeDefenseModal({ open, onOpenChange, segments, projectId, projectName }: Props) {
  const [formalizeDialogOpen, setFormalizeDialogOpen] = useState(false);

  const hasHighRisk = segments.some(seg => seg.riskLevel === 'high');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Scope Defense Timeline - Detailed Analysis
            </DialogTitle>
            <DialogDescription>Track project phases and identify scope creep risk levels.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              This timeline tracks your project phases and identifies scope creep risk levels. 
              Each segment represents a portion of your project with associated risk and value metrics.
            </p>

            {hasHighRisk && projectId && projectName && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-red-800 dark:text-red-200">High Risk Detected</p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        Scope creep detected in one or more project phases. Formalize changes to protect your income.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setFormalizeDialogOpen(true)}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Formalize Now
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {segments?.map((segment) => (
                <div key={segment.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-lg">{segment.label}</h4>
                      <p className="text-sm text-muted-foreground">
                        Project Progress: {segment.start}% - {segment.end}%
                      </p>
                    </div>
                    <Badge variant={
                      segment.riskLevel === 'high' ? 'destructive' : 
                      segment.riskLevel === 'medium' ? 'default' : 
                      'secondary'
                    }>
                      {segment.riskLevel === 'high' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {segment.riskLevel === 'low' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {segment.riskLevel.toUpperCase()} RISK
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Phase Duration:</span>
                      <p className="font-bold">{segment.end - segment.start}% of project</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Protected Value:</span>
                      <p className="font-bold text-green-600 dark:text-green-400">
                        ${segment.value.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-muted/50 rounded text-xs">
                    <p className="font-medium mb-1">Risk Assessment:</p>
                    {segment.riskLevel === 'high' && (
                      <p>High scope creep risk detected. Ensure all changes are documented and formalized with client approval.</p>
                    )}
                    {segment.riskLevel === 'medium' && (
                      <p>Moderate risk level. Continue monitoring for requirement changes and maintain evidence coverage.</p>
                    )}
                    {segment.riskLevel === 'low' && (
                      <p>Low risk phase. Maintain current documentation standards to keep protection levels high.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {projectId && projectName && (
        <FormalizeScopeChangeDialog
          open={formalizeDialogOpen}
          onOpenChange={setFormalizeDialogOpen}
          projectId={projectId}
          projectName={projectName}
        />
      )}
    </>
  );
}