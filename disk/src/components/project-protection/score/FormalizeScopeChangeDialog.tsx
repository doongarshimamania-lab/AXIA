import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileText, DollarSign, Clock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: Id<"projects">;
  projectName: string;
}

export function FormalizeScopeChangeDialog({ open, onOpenChange, projectId, projectName }: Props) {
  const [changeDescription, setChangeDescription] = useState("");
  const [originalScope, setOriginalScope] = useState("");
  const [newScope, setNewScope] = useState("");
  const [timeImpact, setTimeImpact] = useState("");
  const [budgetImpact, setBudgetImpact] = useState("");
  const [deliverableImpact, setDeliverableImpact] = useState("");
  const [clientAcknowledgment, setClientAcknowledgment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createFormalization = useMutation(api.projects.scopeFormalization.createFormalization);

  const handleSubmit = async () => {
    if (!changeDescription || !originalScope || !newScope) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createFormalization({
        projectId,
        changeDescription,
        originalScope,
        newScope,
        impactAssessment: {
          timeImpact: timeImpact || "No time impact specified",
          budgetImpact: budgetImpact || "No budget impact specified",
          deliverableImpact: deliverableImpact || "No deliverable impact specified",
        },
        clientAcknowledgment: clientAcknowledgment || undefined,
      });

      toast.success("Scope change formalized successfully!");
      
      // Reset form
      setChangeDescription("");
      setOriginalScope("");
      setNewScope("");
      setTimeImpact("");
      setBudgetImpact("");
      setDeliverableImpact("");
      setClientAcknowledgment("");
      
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to formalize scope change");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Formalize Scope Change - {projectName}
          </DialogTitle>
          <DialogDescription>
            Document scope changes to protect your work and maintain clear client expectations.
            This creates a formal record that can be referenced in case of disputes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Alert Banner */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <p className="font-bold mb-1">Why formalize scope changes?</p>
              <p>Unformalized scope creep is the #1 cause of payment disputes. Documenting changes protects your income and maintains professional boundaries.</p>
            </div>
          </div>

          {/* Change Description */}
          <div>
            <Label htmlFor="changeDescription" className="flex items-center gap-1">
              Change Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="changeDescription"
              placeholder="Describe what changed in the project scope..."
              value={changeDescription}
              onChange={(e) => setChangeDescription(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Original Scope */}
          <div>
            <Label htmlFor="originalScope" className="flex items-center gap-1">
              Original Scope <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="originalScope"
              placeholder="What was originally agreed upon..."
              value={originalScope}
              onChange={(e) => setOriginalScope(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>

          {/* New Scope */}
          <div>
            <Label htmlFor="newScope" className="flex items-center gap-1">
              New Scope <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="newScope"
              placeholder="What is now expected..."
              value={newScope}
              onChange={(e) => setNewScope(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Impact Assessment */}
          <div className="border rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Impact Assessment
            </h4>
            
            <div>
              <Label htmlFor="timeImpact" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Time Impact
              </Label>
              <Input
                id="timeImpact"
                placeholder="e.g., +10 hours, 2 extra weeks"
                value={timeImpact}
                onChange={(e) => setTimeImpact(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="budgetImpact">
                <DollarSign className="w-3 h-3 inline mr-1" />
                Budget Impact
              </Label>
              <Input
                id="budgetImpact"
                placeholder="e.g., +$500, 20% increase"
                value={budgetImpact}
                onChange={(e) => setBudgetImpact(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="deliverableImpact">Deliverable Impact</Label>
              <Input
                id="deliverableImpact"
                placeholder="e.g., 3 additional features, revised timeline"
                value={deliverableImpact}
                onChange={(e) => setDeliverableImpact(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Client Acknowledgment */}
          <div>
            <Label htmlFor="clientAcknowledgment">
              Client Acknowledgment (Optional)
            </Label>
            <Textarea
              id="clientAcknowledgment"
              placeholder="Paste client's email, message, or approval here..."
              value={clientAcknowledgment}
              onChange={(e) => setClientAcknowledgment(e.target.value)}
              rows={3}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Including client acknowledgment strengthens your protection score
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isSubmitting ? "Formalizing..." : "Formalize Change"}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
