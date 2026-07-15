/**
 * ScopeApproval — public scope-approval page reached via shareable link.
 *
 * URL: /scope/approve/:token
 *
 * ponytail: NEW page — closes audit item 16. The Scope page's "Copy Approval Link"
 * button copies `${origin}/scope/approve/${approvalToken}` but no such route
 * existed, so every copied link 404'd into the NotFound catch-all. This page
 * consumes the existing `api.scope.crud.getScopeByApprovalToken` query (which
 * is intentionally public — clients approve without being platform users) and
 * the existing `api.scope.crud.approveScopeByClient` mutation.
 *
 * The page mirrors the ClientWorkspace pattern: token-in-URL, no auth required,
 * honest loading / not-found / already-approved / approved states.
 */
import { useState } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ScopeApproval() {
  const { token } = useParams<{ token: string }>();
  const [approving, setApproving] = useState(false);
  const [approvedJustNow, setApprovedJustNow] = useState(false);

  const scopeQuery = useQuery(
    token ? api.scope.crud.getScopeByApprovalToken : "skip",
    token ? { approvalToken: token } : "skip"
  ) as any | undefined;

  const { isDisconnected } = useConvexConnectionState();
  const timedOut = useQueryTimeout(scopeQuery === undefined, 4000);
  const isLoading = scopeQuery === undefined && !timedOut && !isDisconnected;

  const approveScope = useMutation(api.scope.crud.approveScopeByClient);

  const handleApprove = async () => {
    if (!token) return;
    setApproving(true);
    try {
      const result = await approveScope({ approvalToken: token });
      setApprovedJustNow(true);
      toast.success(`Approved: ${result.scopeTitle}`, {
        description: "The freelancer has been notified. You can close this page.",
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to approve scope");
    } finally {
      setApproving(false);
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading scope…</span>
        </div>
      </div>
    );
  }

  // ─── Connection-issue state ─────────────────────────────────────────────
  if (isDisconnected && scopeQuery === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">Can't reach server</h2>
            <p className="text-sm text-muted-foreground">
              We couldn't load this scope. Please check your internet connection and refresh the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Invalid / expired token state ──────────────────────────────────────
  if (!scopeQuery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">Scope not found</h2>
            <p className="text-sm text-muted-foreground">
              This approval link is invalid, expired, or the scope has been deleted.
              Please contact the freelancer for a fresh link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const alreadyApproved = Boolean(scopeQuery.clientApprovedAt) || approvedJustNow;

  // ─── Main view ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{scopeQuery.title}</h1>
            <p className="text-sm text-muted-foreground">Scope approval</p>
          </div>
        </div>

        {/* Approval status banner */}
        {alreadyApproved ? (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Scope approved
                </p>
                <p className="text-xs text-muted-foreground">
                  {scopeQuery.clientApprovedAt
                    ? `Approved on ${new Date(scopeQuery.clientApprovedAt).toLocaleString()}`
                    : "Approved just now — the freelancer has been notified."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  Awaiting your approval
                </p>
                <p className="text-xs text-muted-foreground">
                  Review the scope below and click Approve when you're ready. The freelancer will be notified.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scope details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scope description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {scopeQuery.description || "No description provided."}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-muted-foreground">Revision limit</p>
                <p className="text-sm font-medium text-foreground">{scopeQuery.revisionLimit ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated hours</p>
                <p className="text-sm font-medium text-foreground">
                  {scopeQuery.totalEstimatedHours ? `${scopeQuery.totalEstimatedHours}h` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deliverables */}
        {Array.isArray(scopeQuery.deliverables) && scopeQuery.deliverables.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deliverables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scopeQuery.deliverables.map((d: any, i: number) => (
                <div key={d.id ?? i} className="flex items-start gap-2 p-2 rounded-md border border-border bg-card">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{d.name}</p>
                    {d.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                    )}
                    {d.estimatedHours != null && (
                      <Badge variant="outline" className="mt-1 text-[10px] h-4">
                        {d.estimatedHours}h
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Trust footer */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2">
          <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>
            This approval creates a legally-referencable record of the agreed scope.
            Approving only confirms the scope above — it does not authorize additional
            charges or timeline changes.
          </p>
        </div>

        {/* Action button */}
        {!alreadyApproved && (
          <Button
            onClick={handleApprove}
            disabled={approving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            size="lg"
          >
            {approving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Approving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Scope
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
