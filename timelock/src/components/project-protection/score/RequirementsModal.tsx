import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RequirementMapping } from "@/types/projectProtection";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirements: RequirementMapping[];
}

export function RequirementsModal({ open, onOpenChange, requirements }: Props) {
  const matchedCount = requirements.filter(r => r.status === 'matched').length;
  const matchRate = Math.round((matchedCount / requirements.length) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-500" />
            Client Requirements Mapping - Full Analysis
          </DialogTitle>
          <DialogDescription>Review how your evidence matches client requirements.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Match Rate</span>
              <span className="text-2xl font-bold">{matchRate}%</span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-500 transition-all" 
                style={{ width: `${matchRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {matchedCount} of {requirements.length} requirements matched with evidence
            </p>
          </div>

          <div className="space-y-3">
            {requirements.map((req) => (
              <div key={req.id} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-base mb-1">{req.requirement}</h4>
                    <div className="flex items-center gap-2">
                      {req.status === 'matched' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <Badge variant={req.status === 'matched' ? 'default' : 'destructive'}>
                        {req.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Evidence Count:</span>
                    <p className="font-bold">{req.evidenceCount} files</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Impact Value:</span>
                    <p className="font-bold text-amber-600 dark:text-amber-400">
                      ${req.impactValue.toLocaleString()}
                    </p>
                  </div>
                </div>

                {req.status !== 'matched' && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-300">Action Required</p>
                      <p className="text-red-700 dark:text-red-400">
                        This requirement lacks sufficient evidence. Upload work samples or documentation to improve protection.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
