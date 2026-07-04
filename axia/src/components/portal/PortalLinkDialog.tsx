// ──────────────────────────────────────────────────────────────────────────────
// components/portal/PortalLinkDialog.tsx — Freelancer-facing "Generate portal
// link" button + dialog.
//
// USAGE:
//   <PortalLinkDialog clientId={selectedClient._id} clientName={selectedClient.clientName} />
//
// FLOW:
//   1. Freelancer clicks "Portal Link" button
//   2. Dialog opens, calls issueToken mutation
//   3. Returns a /workspace/:token URL + "Copy" + "Open" + "Email to client"
//   4. Freelancer can revoke from same dialog
//
// SECURITY: token is shown ONCE on generation. Refreshing the dialog queries
// listTokensForClient which returns only metadata (no raw tokens). This forces
// re-issue if the freelancer loses the link, which is safer than storing raw
// tokens in the DB.
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useMutation, useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Check, ExternalLink, Loader2, ShieldOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function PortalLinkDialog({
  clientId,
  clientName,
  contactEmail,
}: {
  clientId: string;
  clientName: string;
  contactEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const issueToken = useMutation(api.portal.tokens.issueToken);
  const revokeTokens = useMutation(api.portal.tokens.revokeTokensForClient);
  const existingTokens = useQuery(
    api.portal.tokens.listTokensForClient,
    open ? { clientId: clientId as any } : "skip",
  );

  async function handleIssue() {
    setIssuing(true);
    try {
      const result: any = await issueToken({ clientId: clientId as any });
      setToken(result.token);
      setExpiresAt(result.expiresAt);
      toast.success("Portal link generated");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate portal link");
    } finally {
      setIssuing(false);
    }
  }

  async function handleRevoke() {
    setRevoking(true);
    try {
      const result: any = await revokeTokens({ clientId: clientId as any });
      toast.success(`Revoked ${result.revokedCount} token(s). Client portal access disabled.`);
      setToken(null);
      setExpiresAt(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to revoke");
    } finally {
      setRevoking(false);
    }
  }

  function handleCopy() {
    if (!token) return;
    const url = `${window.location.origin}/workspace/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  }

  const portalUrl = token ? `${window.location.origin}/workspace/${token}` : null;
  const hasExistingActive = (existingTokens ?? []).some((t: any) => !t.revoked);

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) {
        // ponytail: clear token on close so it's not lingering in component state
        setToken(null);
        setExpiresAt(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="h-4 w-4" />
          Portal Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Client Portal — {clientName}</DialogTitle>
          <DialogDescription>
            Generate a secure, token-based link your client can use to view deliverables,
            approve change orders, and pay invoices. No login required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Existing tokens */}
          {hasExistingActive && !token && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <p className="font-medium mb-1">Active link exists</p>
              <p>Issuing a new link will automatically revoke the previous one.</p>
            </div>
          )}

          {/* New token URL */}
          {portalUrl && (
            <div className="space-y-2">
              <Label>Portal URL (share with client)</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={portalUrl}
                  className="text-xs font-mono"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              {expiresAt && (
                <p className="text-xs text-slate-500">
                  Expires {new Date(expiresAt).toLocaleDateString()} ·{" "}
                  {Math.floor((expiresAt - Date.now()) / (24 * 60 * 60 * 1000))} days
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" asChild>
                  <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" /> Open
                  </a>
                </Button>
                {contactEmail && (
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                        `Your Axia portal link from ${"your freelancer"}`,
                      )}&body=${encodeURIComponent(
                        `Hi ${clientName},\n\nYou can access your project portal here:\n${portalUrl}\n\nThis link expires in 7 days.\n\nThanks!`,
                      )}`}
                    >
                      Email to client
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Existing token metadata */}
          {!token && (existingTokens ?? []).length > 0 && (
            <div className="space-y-1">
              <Label>Token history</Label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {(existingTokens ?? []).slice(0, 5).map((t: any) => (
                  <div key={t._id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                    <span className="font-mono">{t.token.slice(0, 12)}…</span>
                    {t.revoked ? (
                      <Badge variant="secondary">revoked</Badge>
                    ) : (
                      <Badge variant="default">active</Badge>
                    )}
                    <span className="text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {hasExistingActive && !token && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevoke}
              disabled={revoking}
              className="text-red-600 hover:text-red-700"
            >
              {revoking ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ShieldOff className="h-3 w-3 mr-1" />
              )}
              Revoke all links
            </Button>
          )}
          {!token ? (
            <Button onClick={handleIssue} disabled={issuing}>
              {issuing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              {hasExistingActive ? "Generate new link" : "Generate portal link"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
