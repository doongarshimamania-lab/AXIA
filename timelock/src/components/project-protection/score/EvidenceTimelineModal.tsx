import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EvidenceTimelineEntry } from "@/types/projectProtection";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeline: EvidenceTimelineEntry[];
}

export function EvidenceTimelineModal({ open, onOpenChange, timeline }: Props) {
  const verifiedCount = timeline.filter(e => e.status === 'verified').length;
  const verificationRate = Math.round((verifiedCount / timeline.length) * 100);
  const totalAtRisk = timeline.reduce((sum, e) => sum + e.valueAtRisk, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Evidence Timeline - Session Analysis
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Verification Rate</div>
              <div className="text-2xl font-bold">{verificationRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {verifiedCount} of {timeline.length} sessions verified
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Value at Risk</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                ${totalAtRisk.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                From unverified sessions
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {timeline.map((entry) => (
              <div key={entry.id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {entry.status === 'verified' && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {entry.status === 'partial' && (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    )}
                    {entry.status === 'missing' && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">{entry.time}</div>
                      <Badge 
                        variant={
                          entry.status === 'verified' ? 'default' : 
                          entry.status === 'partial' ? 'secondary' : 
                          'destructive'
                        }
                        className="text-xs"
                      >
                        {entry.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  {entry.valueAtRisk > 0 && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">At Risk</div>
                      <div className="font-bold text-red-600 dark:text-red-400">
                        ${entry.valueAtRisk.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalAtRisk > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-300 mb-1">
                    Evidence Gaps Detected
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Upload evidence for missing sessions to protect ${totalAtRisk.toLocaleString()} in work value.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
