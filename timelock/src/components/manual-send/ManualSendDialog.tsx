import { useState, useEffect } from "react";
import { useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Mail,
  MessageCircle,
  Smartphone,
  Slack,
  Send,
  Phone,
  Truck,
  User,
  Calendar as CalendarIcon,
  HelpCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ManualSendChannel =
  | "email"
  | "whatsapp"
  | "sms"
  | "slack"
  | "telegram"
  | "in_person"
  | "phone"
  | "courier"
  | "other";

export type ManualSendEntityType = "proposal" | "invoice";

interface ManualSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: ManualSendEntityType;
  entityId: string;
  entityTitle: string; // proposal title or invoice number
  defaultRecipient?: string; // client email or phone if known
  triggeredByNotificationId?: Id<"notifications">;
  onSuccess?: () => void;
}

// ─────────────────────────────────────────────
// Channel metadata
// ─────────────────────────────────────────────

const CHANNELS: {
  value: ManualSendChannel;
  label: string;
  icon: typeof Mail;
  placeholder: string;
  description: string;
}[] = [
  { value: "email", label: "Email", icon: Mail, placeholder: "client@example.com", description: "Sent the document as an email attachment or link." },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, placeholder: "+1 555 010 1234", description: "Sent the PDF via WhatsApp chat." },
  { value: "sms", label: "SMS", icon: Smartphone, placeholder: "+1 555 010 1234", description: "Sent a text message with the share link." },
  { value: "slack", label: "Slack", icon: Slack, placeholder: "@client or #channel", description: "Posted in a Slack Connect channel or DM." },
  { value: "telegram", label: "Telegram", icon: Send, placeholder: "@username", description: "Sent via Telegram chat." },
  { value: "in_person", label: "In-person", icon: User, placeholder: "Who you handed it to", description: "Handed a printed copy in person." },
  { value: "phone", label: "Phone call", icon: Phone, placeholder: "Person spoken to", description: "Walked them through it on a call." },
  { value: "courier", label: "Courier / mail", icon: Truck, placeholder: "Delivery address", description: "Mailed a physical copy." },
  { value: "other", label: "Other", icon: HelpCircle, placeholder: "Describe recipient", description: "Some other delivery channel." },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ManualSendDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityTitle,
  defaultRecipient = "",
  triggeredByNotificationId,
  onSuccess,
}: ManualSendDialogProps) {
  const [channel, setChannel] = useState<ManualSendChannel>("email");
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  // YYYY-MM-DD format for <input type="date">
  const [sentDateStr, setSentDateStr] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setChannel("email");
      setRecipient(defaultRecipient);
      setSubject("");
      setNotes("");
      setSentDateStr(new Date().toISOString().slice(0, 10));
      setSubmitting(false);
    }
  }, [open, defaultRecipient]);

  const logProposalManualSend = useMutation(api.manualSends.logProposalManualSend);
  const logInvoiceManualSend = useMutation(api.manualSends.logInvoiceManualSend);

  const handleSubmit = async () => {
    if (!recipient.trim()) {
      toast.error("Recipient is required", {
        description: "Please enter who you sent it to (email, phone, name, etc.).",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Parse YYYY-MM-DD as a local-date timestamp at noon (avoids TZ rollover)
      const sentAt = new Date(sentDateStr + "T12:00:00").getTime();
      const baseArgs = {
        channel,
        recipient: recipient.trim(),
        subject: subject.trim() || undefined,
        notes: notes.trim() || undefined,
        sentAt,
        triggeredByNotificationId,
      };

      if (entityType === "proposal") {
        await logProposalManualSend({
          ...baseArgs,
          proposalId: entityId as Id<"proposals">,
        });
      } else {
        await logInvoiceManualSend({
          ...baseArgs,
          invoiceId: entityId as Id<"invoices">,
        });
      }

      toast.success("Marked as sent", {
        description: `Logged in your timeline. ${entityType === "proposal" ? "Proposal" : "Invoice"} status updated & follow-ups scheduled.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to log manual send", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedChannel = CHANNELS.find((c) => c.value === channel)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[18px]">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Mark as sent manually
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            Record that you sent <span className="font-semibold text-foreground">{entityTitle}</span> to your client outside AXIA. We'll update the status, log this in the timeline, and schedule follow-ups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Channel */}
          <div className="space-y-1.5">
            <Label htmlFor="channel" className="text-[12px] font-semibold">
              How did you send it?
            </Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as ManualSendChannel)}>
              <SelectTrigger id="channel" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <SelectItem key={c.value} value={c.value} className="py-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{c.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{selectedChannel.description}</p>
          </div>

          {/* Recipient */}
          <div className="space-y-1.5">
            <Label htmlFor="recipient" className="text-[12px] font-semibold">
              Recipient <span className="text-red-500">*</span>
            </Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={selectedChannel.placeholder}
              className="h-10"
            />
          </div>

          {/* Subject (optional, channel-dependent) */}
          {channel === "email" && (
            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-[12px] font-semibold">
                Subject line <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={`Proposal: ${entityTitle}`}
                className="h-10"
              />
            </div>
          )}

          {/* Send date */}
          <div className="space-y-1.5">
            <Label htmlFor="sentDate" className="text-[12px] font-semibold">
              When did you send it?
            </Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="sentDate"
                type="date"
                value={sentDateStr}
                onChange={(e) => setSentDateStr(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                min="2024-01-01"
                className="h-10 pl-9"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-[12px] font-semibold">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. I CC'd their COO and attached the project brief as well."
              className="min-h-[64px] text-[13px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !recipient.trim()} className="gap-1.5">
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Logging...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark as sent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
