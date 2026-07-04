// ──────────────────────────────────────────────────────────────────────────────
// components/portal/PortalInvoices.tsx — Invoice list + pay flow.
//
// PAYMENT: Uses portal.payments.initiatePayment. With the mock provider (default
// when no Stripe account is configured), payment completes instantly and the
// invoice is marked paid in the same call. With Stripe, the client is redirected
// to a Stripe Checkout URL.
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { MessageBubble } from "./PortalDeliverables";

export function PortalInvoices({ token }: { token: string }) {
  const invoices = useQuery(api.portal.invoices.listMyInvoices, { token });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (invoices === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (selectedId) {
    return (
      <InvoiceDetail token={token} invoiceId={selectedId} onBack={() => setSelectedId(null)} />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
        <p className="text-sm text-slate-500 mt-1">{invoices.length} total</p>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-slate-500">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No invoices yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv: any) => (
            <Card key={inv.id} className="hover:shadow-sm transition-shadow">
              <CardContent
                className="pt-5 pb-5 cursor-pointer"
                onClick={() => setSelectedId(inv.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">
                        {inv.number ?? "Invoice"}
                      </h3>
                      <StatusBadge status={inv.status} />
                    </div>
                    <p className="text-sm text-slate-500">
                      {(inv.amount ?? 0).toLocaleString(undefined, {
                        style: "currency",
                        currency: inv.currency,
                      })}
                    </p>
                    {inv.dueDate && (
                      <p className="text-xs text-slate-400 mt-1">
                        Due {new Date(inv.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {inv.status === "paid" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "paid" ? "default" :
    status === "overdue" ? "destructive" :
    status === "draft" ? "secondary" :
    "outline";
  return <Badge variant={variant as any} className="capitalize">{status}</Badge>;
}

function InvoiceDetail({
  token,
  invoiceId,
  onBack,
}: {
  token: string;
  invoiceId: string;
  onBack: () => void;
}) {
  const invoice = useQuery(api.portal.invoices.getInvoice, { token, invoiceId: invoiceId as any });
  const payments = useQuery(api.portal.payments.getPaymentStatus, { token, invoiceId: invoiceId as any });
  const initiatePayment = useMutation(api.portal.payments.initiatePayment);
  const messages = useQuery(
    api.portal.messages.listMessages,
    { token, threadType: "invoice", invoiceId: invoiceId as any },
  );
  const [paying, setPaying] = useState(false);

  async function handlePay() {
    setPaying(true);
    try {
      const result: any = await initiatePayment({ token, invoiceId: invoiceId as any });
      if (result.alreadyPaid) {
        toast.info("This invoice is already paid.");
      } else if (result.checkoutUrl) {
        // Real provider (Stripe) — redirect
        window.location.href = result.checkoutUrl;
      } else {
        // Mock provider — instant completion
        toast.success("Payment complete! Invoice marked as paid.");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  if (invoice === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }
  if (invoice === null) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-slate-500">Invoice not found.</p>
          <Button variant="outline" className="mt-3" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isPaid = invoice.status === "paid" || (payments ?? []).some((p: any) => p.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to invoices
        </Button>
        <h1 className="text-2xl font-semibold text-slate-900">
          {invoice.number ?? "Invoice"}
        </h1>
        <StatusBadge status={invoice.status} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Amount</p>
              <p className="font-medium text-lg">
                {(invoice.amount ?? 0).toLocaleString(undefined, {
                  style: "currency",
                  currency: invoice.currency,
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Due date</p>
              <p className="font-medium">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Issued</p>
              <p className="font-medium">
                {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Paid</p>
              <p className="font-medium">
                {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>

          {invoice.notes && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {!isPaid && invoice.status !== "draft" && (
            <div className="pt-3 border-t border-slate-100">
              <Button onClick={handlePay} disabled={paying} className="w-full">
                {paying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Pay {(invoice.amount ?? 0).toLocaleString(undefined, {
                  style: "currency",
                  currency: invoice.currency,
                })}
              </Button>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Payments are processed securely. Axia never sees your card details.
              </p>
            </div>
          )}

          {isPaid && (
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">This invoice is paid</span>
            </div>
          )}

          {(payments ?? []).length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-1">
              <p className="text-xs text-slate-400 mb-2">Payment history</p>
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{p.provider}</span>
                  <span className="capitalize">{p.status}</span>
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message thread */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Messages about this invoice</CardTitle></CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
