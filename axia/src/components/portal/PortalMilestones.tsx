// ──────────────────────────────────────────────────────────────────────────────
// components/portal/PortalMilestones.tsx — Client-facing milestone sign-off.
//
// P1-d: Clients see a list of milestones for a deliverable, with the ability
// to approve or reject milestones that the freelancer has marked "ready".
//
// Renders:
//   - Vertical timeline of milestones (ordered)
//   - Status badges (pending / ready / approved / rejected)
//   - Approve / Reject buttons on "ready" milestones
//   - Ready notes from freelancer (if provided)
//   - Client notes (rejection reason or approval comment)
//
// ponytail: reuses portal.milestones API. No client-side trust — all data
// comes from the JWT-scoped backend.
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Circle,
  Clock,
  CheckCircle2,
  XCircle,
  Flag,
  Send,
} from "lucide-react";
import { toast } from "sonner";

interface PortalMilestonesProps {
  token: string;
  deliverableId: string;
}

export function PortalMilestones({ token, deliverableId }: PortalMilestonesProps) {
  const milestones = useQuery(api.portal.milestones.listMilestones, {
    token,
    deliverableId,
  });

  const approveMilestone = useMutation(api.portal.milestones.approveMilestone);
  const rejectMilestone = useMutation(api.portal.milestones.rejectMilestone);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  async function handleApprove(milestoneId: string) {
    setActing(true);
    try {
      await approveMilestone({ token, milestoneId: milestoneId as any });
      toast.success("Milestone approved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to approve");
    } finally {
      setActing(false);
    }
  }

  async function handleReject(milestoneId: string) {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setActing(true);
    try {
      await rejectMilestone({
        token,
        milestoneId: milestoneId as any,
        reason: rejectReason.trim(),
      });
      toast.success("Milestone rejected — freelancer notified");
      setRejectingId(null);
      setRejectReason("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to reject");
    } finally {
      setActing(false);
    }
  }

  if (milestones === undefined) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    );
  }

  if (milestones.length === 0) {
    return null; // ponytail: don't render the section at all if no milestones
  }

  const readyCount = milestones.filter((m: any) => m.status === "ready").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Flag className="h-4 w-4 text-violet-500" />
          Milestones
          {readyCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
              {readyCount} awaiting sign-off
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {milestones.map((m: any, idx: number) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              isLast={idx === milestones.length - 1}
              rejectingId={rejectingId}
              rejectReason={rejectReason}
              acting={acting}
              onSetRejectingId={setRejectingId}
              onSetRejectReason={setRejectReason}
              onApprove={() => handleApprove(m.id)}
              onReject={() => handleReject(m.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MilestoneRow({
  milestone,
  isLast,
  rejectingId,
  rejectReason,
  acting,
  onSetRejectingId,
  onSetRejectReason,
  onApprove,
  onReject,
}: {
  milestone: any;
  isLast: boolean;
  rejectingId: string | null;
  rejectReason: string;
  acting: boolean;
  onSetRejectingId: (id: string | null) => void;
  onSetRejectReason: (s: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { status, title, description, order } = milestone;
  const isReady = status === "ready";
  const isRejecting = rejectingId === milestone.id;

  return (
    <div className="relative pl-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[7px] top-4 bottom-0 w-px bg-slate-200" />
      )}
      {/* Timeline dot */}
      <div className="absolute left-0 top-1">
        <StatusDot status={status} />
      </div>

      <div className="pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-400">#{order}</span>
          <h4 className="text-sm font-medium text-slate-900">{title}</h4>
          <StatusBadge status={status} />
        </div>
        <p className="text-sm text-slate-600 mb-2">{description}</p>

        {/* Freelancer ready notes */}
        {milestone.readyNotes && (
          <div className="text-xs bg-slate-50 rounded p-2 mb-2">
            <span className="font-medium text-slate-700">Freelancer notes: </span>
            <span className="text-slate-600">{milestone.readyNotes}</span>
          </div>
        )}

        {/* Client decision notes */}
        {milestone.clientNotes && (
          <div className={`text-xs rounded p-2 mb-2 ${
            status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
            <span className="font-medium">
              {status === "approved" ? "Your note: " : "Your reason: "}
            </span>
            {milestone.clientNotes}
          </div>
        )}

        {/* Action buttons for "ready" milestones */}
        {isReady && !isRejecting && (
          <div className="flex items-center gap-2 mt-2">
            <Button
              size="sm"
              onClick={onApprove}
              disabled={acting}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSetRejectingId(milestone.id)}
              disabled={acting}
              className="h-7 text-xs"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Reject
            </Button>
          </div>
        )}

        {/* Reject reason form */}
        {isReady && isRejecting && (
          <div className="mt-2 space-y-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => onSetRejectReason(e.target.value)}
              placeholder="Explain why this milestone doesn't meet expectations…"
              rows={2}
              maxLength={1000}
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={onReject}
                disabled={acting || !rejectReason.trim()}
                className="h-7 text-xs bg-red-600 hover:bg-red-700"
              >
                {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                Send rejection
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onSetRejectingId(null);
                  onSetRejectReason("");
                }}
                disabled={acting}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Decision timestamp */}
        {milestone.clientDecisionAt && (
          <p className="text-[11px] text-slate-400 mt-1">
            {status === "approved" ? "Approved" : "Rejected"} on{" "}
            {new Date(milestone.clientDecisionAt).toLocaleString()}
          </p>
        )}
        {isReady && milestone.markedReadyAt && (
          <p className="text-[11px] text-slate-400 mt-1">
            Ready for review since {new Date(milestone.markedReadyAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "approved") return <div className="h-3.5 w-3.5 rounded-full bg-emerald-500 flex items-center justify-center"><CheckCircle2 className="h-2.5 w-2.5 text-white" /></div>;
  if (status === "rejected") return <div className="h-3.5 w-3.5 rounded-full bg-red-400 flex items-center justify-center"><XCircle className="h-2.5 w-2.5 text-white" /></div>;
  if (status === "ready") return <div className="h-3.5 w-3.5 rounded-full bg-amber-400 animate-pulse" />;
  return <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300" />;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px]">Rejected</Badge>;
  if (status === "ready") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] animate-pulse">Action required</Badge>;
  return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
}
