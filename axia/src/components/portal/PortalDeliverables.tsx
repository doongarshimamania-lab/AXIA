// ──────────────────────────────────────────────────────────────────────────────
// components/portal/PortalDeliverables.tsx — Deliverables list + per-deliverable
// thread with scope-creep banner.
//
// ponytail: reuses the existing portal.deliverables + portal.messages APIs.
// No client-side trust — everything comes from the JWT-scoped backend.
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FolderKanban,
  Loader2,
  ArrowLeft,
  Send,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export function PortalDeliverables({ token }: { token: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const data = useQuery(api.portal.deliverables.listMyDeliverables, { token });

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (selectedId) {
    return (
      <DeliverableDetail
        token={token}
        deliverableId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Deliverables</h1>
        <p className="text-sm text-slate-500 mt-1">
          {data.completedDeliverables} of {data.totalDeliverables} completed
        </p>
      </div>

      {data.deliverables.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-slate-500">
            <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No deliverables yet. Your freelancer will add them as the project progresses.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.deliverables.map((d: any) => (
            <Card key={d.id} className="hover:shadow-sm transition-shadow cursor-pointer" >
              <CardContent
                className="pt-5 pb-5"
                onClick={() => setSelectedId(d.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon status={d.status} />
                      <h3 className="font-medium text-slate-900 truncate">{d.name}</h3>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{d.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      {d.projectName && <span>{d.projectName}</span>}
                      {d.estimatedHours && <span>{d.estimatedHours}h est.</span>}
                      <span className="capitalize">{d.status.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "in_progress") return <Clock className="h-4 w-4 text-amber-500" />;
  return <Circle className="h-4 w-4 text-slate-300" />;
}

function DeliverableDetail({
  token,
  deliverableId,
  onBack,
}: {
  token: string;
  deliverableId: string;
  onBack: () => void;
}) {
  const deliverable = useQuery(api.portal.deliverables.getDeliverable, { token, deliverableId });
  const messages = useQuery(
    api.portal.messages.listMessages,
    { token, threadType: "deliverable", deliverableId },
  );
  const postMessage = useMutation(api.portal.messages.postMessage);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const result: any = await postMessage({
        token,
        threadType: "deliverable",
        deliverableId,
        content: draft.trim(),
      });
      if (result?.scopeCreepDetected) {
        toast.warning("Message sent. Note: your freelancer was flagged to review this for possible scope creep.");
      } else {
        toast.success("Message sent");
      }
      setDraft("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  if (deliverable === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (deliverable === null) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-slate-500">Deliverable not found.</p>
          <Button variant="outline" className="mt-3" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to deliverables
        </Button>
        <h1 className="text-2xl font-semibold text-slate-900">{deliverable.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{deliverable.scopeTitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{deliverable.description}</p>
          <div className="flex items-center gap-3 mt-4 text-xs">
            <Badge variant="outline" className="capitalize">{deliverable.status.replace("_", " ")}</Badge>
            {deliverable.estimatedHours && (
              <Badge variant="outline">{deliverable.estimatedHours}h estimated</Badge>
            )}
            <Badge variant="outline">
              {deliverable.revisionCount}/{deliverable.revisionLimit} revisions
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Message thread */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages === undefined ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">No messages yet. Start the conversation below.</p>
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
              placeholder="Type a message for your freelancer…"
              rows={3}
              maxLength={10000}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Messages are scanned for scope-creep language to help your freelancer flag changes.
              </p>
              <Button onClick={handleSend} disabled={sending || !draft.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MessageBubble({ message }: { message: any }) {
  const isClient = message.authorRole === "client";
  return (
    <div className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 ${
          isClient ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-900"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${isClient ? "text-violet-100" : "text-slate-500"}`}>
            {message.authorName}
          </span>
          <span className={`text-[10px] ${isClient ? "text-violet-200" : "text-slate-400"}`}>
            {new Date(message.createdAt).toLocaleString()}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        {message.scopeCreepDetected && (
          <div
            className={`mt-2 flex items-center gap-1 text-[11px] px-2 py-1 rounded ${
              isClient ? "bg-violet-500/30 text-violet-50" : "bg-amber-100 text-amber-800"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Flagged for scope review (score: {message.scopeCreepScore})</span>
          </div>
        )}
      </div>
    </div>
  );
}
