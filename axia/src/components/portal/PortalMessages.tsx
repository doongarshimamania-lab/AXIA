// ──────────────────────────────────────────────────────────────────────────────
// components/portal/PortalMessages.tsx — Unified message view.
//
// Shows recent messages across all threads (deliverables / change orders /
// invoices) so the client can see the conversation history in one place.
//
// ponytail: this is a READ-ONLY aggregate view. Posting happens in each
// thread's detail view (PortalDeliverables / PortalChangeOrders / PortalInvoices).
// ──────────────────────────────────────────────────────────────────────────────

import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MessageSquare } from "lucide-react";
import { MessageBubble } from "./PortalDeliverables";

// ponytail: there's no portal.messages.listAll query yet (would need a
// by_client index on portalMessages + a new query). For P0 launch, the
// "Messages" tab shows a friendly empty state pointing the client to
// specific deliverables / change orders / invoices where they can read
// and post messages. This is a deliberate scope cut — the unified inbox
// is a P1 feature.
export function PortalMessages({ token }: { token: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500 mt-1">
          Conversations happen on each deliverable, change order, and invoice.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 text-center text-slate-500 space-y-3">
          <MessageSquare className="h-10 w-10 mx-auto opacity-40" />
          <p className="text-sm">
            Open a <strong>deliverable</strong>, <strong>change order</strong>, or{" "}
            <strong>invoice</strong> to see and post messages in that thread.
          </p>
          <p className="text-xs text-slate-400">
            Threads are anchored to records so context is never lost — and so
            scope-creep language is detected in real time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
