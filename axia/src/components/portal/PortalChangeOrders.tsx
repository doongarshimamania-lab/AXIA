// ──────────────────────────────────────────────────────────────────────────────
// components/portal/PortalChangeOrders.tsx — List + approve/decline change orders.
//
// ponytail: reuses portal.changeOrders.* APIs. Approve is idempotent — if the
// CO was already approved, backend returns {alreadyApproved: true} and we
// surface a friendly toast.
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, Clock, FileText, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { MessageBubble } from "./PortalDeliverables";

export function PortalChangeOrders({ token }: { token: string }) {
  const changeOrders = useQuery(api.portal.changeOrders.listMyChangeOrders, { token });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (changeOrders === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (selectedId) {
    return (
      <ChangeOrderDetail
        token={token}
        changeOrderId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  const pending = changeOrders.filter((co: any) => co.status === "pending");
  const decided = changeOrders.filter((co: any) => co.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Change Orders</h1>
        <p className="text-sm text-slate-500 mt-1">
          {pending.length > 0
            ? `${pending.length} pending your review`
            : "No pending change orders"}
        </p>
      </div>

      {changeOrders.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-slate-500">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No change orders yet. When your freelancer proposes a change, it will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Pending your review</h2>
              {pending.map((co: any) => (
                <Card key={co.id} className="border-amber-200 bg-amber-50/30">
                  <CardContent
                    className="pt-5 pb-5 cursor-pointer"
                    onClick={() => setSelectedId(co.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">{co.title}</h3>
                        <p className="text-sm text-slate-600 line-clamp-2 mt-1">{co.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <Badge variant="outline" className="capitalize">{co.changeType}</Badge>
                          <span>+{co.impact.hoursAdded}h</span>
                          {co.impact.costImpact > 0 && <span>+${co.impact.costImpact}</span>}
                        </div>
                      </div>
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {decided.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">History</h2>
              {decided.map((co: any) => (
                <Card key={co.id} className="opacity-75">
                  <CardContent
                    className="pt-5 pb-5 cursor-pointer"
                    onClick={() => setSelectedId(co.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">{co.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-1 mt-1">{co.description}</p>
                      </div>
                      {co.status === "approved" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChangeOrderDetail({
  token,
  changeOrderId,
  onBack,
}: {
  token: string;
  changeOrderId: string;
  onBack: () => void;
}) {
  const messages = useQuery(
    api.portal.messages.listMessages,
    { token, threadType: "change_order", changeOrderId: changeOrderId as any },
  );
  const approve = useMutation(api.portal.changeOrders.approveChangeOrder);
  const decline = useMutation(api.portal.changeOrders.declineChangeOrder);
  const postMessage = useMutation(api.portal.messages.postMessage);
  const [declineReason, setDeclineReason] = useState("");
  const [draft, setDraft] = useState("");
  const [showDeclineBox, setShowDeclineBox] = useState(false);
  const [busy, setBusy] = useState(false);

  // We need the CO detail — list query returns it; filter
  const allCOs = useQuery(api.portal.changeOrders.listMyChangeOrders, { token });
  const co = allCOs?.find((c: any) => c.id === changeOrderId);

  async function handleApprove() {
    setBusy(true);
    try {
      const result: any = await approve({ token, changeOrderId: changeOrderId as any });
      if (result?.alreadyApproved) {
        toast.info("This change order was already approved.");
      } else {
        toast.success("Change order approved. Your freelancer has been notified.");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to approve");
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline() {
    setBusy(true);
    try {
      const result: any = await decline({
        token,
        changeOrderId: changeOrderId as any,
        reason: declineReason.trim() || undefined,
      });
      if (result?.alreadyRejected) {
        toast.info("This change order was already declined.");
      } else {
        toast.success("Change order declined. Your freelancer has been notified.");
      }
      setShowDeclineBox(false);
      setDeclineReason("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to decline");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (!draft.trim()) return;
    try {
      await postMessage({
        token,
        threadType: "change_order",
        changeOrderId: changeOrderId as any,
        content: draft.trim(),
      });
      setDraft("");
      toast.success("Message sent");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send");
    }
  }

  if (!co) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const isPending = co.status === "pending";

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to change orders
        </Button>
        <h1 className="text-2xl font-semibold text-slate-900">{co.title}</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="capitalize">{co.changeType}</Badge>
          <Badge
            variant={co.status === "approved" ? "default" : co.status === "rejected" ? "secondary" : "outline"}
            className="capitalize"
          >
            {co.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{co.description}</p>
          <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Hours added</p>
              <p className="font-medium">+{co.impact.hoursAdded}h</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Cost impact</p>
              <p className="font-medium">+${co.impact.costImpact}</p>
            </div>
            {co.impact.deadlineImpact && (
              <div>
                <p className="text-xs text-slate-400">Deadline impact</p>
                <p className="font-medium">+{co.impact.deadlineImpact}d</p>
              </div>
            )}
          </div>
          {co.reason && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Reason</p>
              <p className="text-sm text-slate-700">{co.reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isPending && (
        <Card className="border-violet-200 bg-violet-50/30">
          <CardContent className="pt-5 space-y-3">
            <h3 className="font-medium text-slate-900">Your decision</h3>
            {!showDeclineBox ? (
              <div className="flex gap-2">
                <Button onClick={handleApprove} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
                <Button variant="outline" onClick={() => setShowDeclineBox(true)} disabled={busy}>
                  <XCircle className="h-4 w-4 mr-2" /> Decline
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Reason for declining (optional)…"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowDeclineBox(false)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDecline} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Confirm decline
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Message thread */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Messages</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {messages === undefined ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((m: any) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          )}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              rows={2}
            />
            <div className="flex justify-end">
              <Button onClick={handleSend} disabled={!draft.trim()} size="sm">
                <Send className="h-3 w-3 mr-2" /> Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
