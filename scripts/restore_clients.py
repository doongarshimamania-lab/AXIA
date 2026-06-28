#!/usr/bin/env python3
"""
Restore Clients.tsx to use the rebuilt ClientList + ClientPolicyProfile components.

This script does 4 things:
1. Replaces the import block (remove inline-only imports, add ClientList + ClientPolicyProfile imports).
2. Removes the now-unused state variables (shareClientId, shareToken, shareLoading, copied, manageTagsFor).
3. Removes the now-unused helper functions (clientWorkspaceApi, generateToken, isMockId,
   generateDemoToken, handleShareClient, copyShareLink, getRiskColor).
4. Replaces the inline Card + per-card rendering + Share Dialog with a <ClientList> call,
   AND restores the <ClientPolicyProfile> section below the list (with selected-client
   Share/Transfer/Delete action toolbar above it).
"""

from pathlib import Path

CLIENTS_TSX = Path("/home/z/my-project/axia/src/pages/Clients.tsx")
src = CLIENTS_TSX.read_text()

# ─── 1. Replace import block ─────────────────────────────────────────────────
old_imports = '''import { useState, useEffect, useRef, useCallback } from "react";
// ponytail: previously this page imported `ClientList` and `ClientPolicyProfile`
// from @/components/client-protection/. That tree was deleted per audit item #26
// because it rendered fabricated protection scores, totalHours, totalValue,
// and a fake "Payment Pattern Analysis" upgrade CTA. The polished card UI
// has now been restored INLINE below — but WITHOUT the fabricated stats.
// Only real fields from the `clients` table are shown: name, platform,
// hourly rate, contract type, risk level, tags. (Audit items #26 + #28)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { useWorkspacePermissions, usePermissions } from "@/hooks/use-permissions";
import { useQuery, useMutation, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Trash2, Loader2, Shield, Plus, Share2, Upload, Settings2, ArrowRightLeft, Tag as TagIcon, X, Copy, Check, ExternalLink } from "lucide-react";
import { ShareDialog } from "@/components/ShareDialog";
import { TransferOwnershipDialog } from "@/components/TransferOwnershipDialog";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { CustomFieldManager } from "@/components/CustomFieldManager";
import { CustomFieldValues } from "@/components/CustomFieldValues";
import { PageLayout } from "@/components/design-system/PageLayout";
// ponytail: import reusable tag components for picker, badges, and filter bar.
import { TagPicker, TagBadges } from "@/components/tags";'''

new_imports = '''import { useState, useEffect, useRef } from "react";
// ponytail: RESTORED imports of ClientList + ClientPolicyProfile from
// @/components/client-protection/. These were deleted per audit item #26
// (commit a94e296) and the inline replacement (commit 9ccc1db) lost the
// polished per-card stats grid (Protection Score / Total Hours / Total Value),
// the tier-gated Payment Pattern Analysis section, and the full Client Policy
// Profile section. User explicitly asked to restore the previous clients list,
// so both components are back. ClientPolicyProfile has been patched to render
// directly from selectedClient — the deleted Convex backend query is NOT
// re-introduced. (Audit item #26 partially reverted by user request.)
import { ClientList } from "@/components/client-protection/ClientList";
import { ClientPolicyProfile } from "@/components/client-protection/ClientPolicyProfile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { useWorkspacePermissions, usePermissions } from "@/hooks/use-permissions";
import { useQuery, useMutation, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Trash2, Loader2, Shield, Plus, Share2, Upload, Settings2, ArrowRightLeft, Tag as TagIcon, X } from "lucide-react";
import { ShareDialog } from "@/components/ShareDialog";
import { TransferOwnershipDialog } from "@/components/TransferOwnershipDialog";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { CustomFieldManager } from "@/components/CustomFieldManager";
import { CustomFieldValues } from "@/components/CustomFieldValues";
import { PageLayout } from "@/components/design-system/PageLayout";
// ponytail: import reusable tag components for picker, badges, and filter bar.
import { TagPicker, TagBadges } from "@/components/tags";'''

if old_imports in src:
    src = src.replace(old_imports, new_imports)
    print("Step 1: imports replaced")
else:
    print("Step 1: imports already updated, skipping")

# ─── 2. Remove unused state variables ────────────────────────────────────────
old_state = '''  // ponytail: per-card "Manage tags" popover state — holds the client _id whose
  // tag popover is currently open, or null when none is open.
  const [manageTagsFor, setManageTagsFor] = useState<string | null>(null);
  // ponytail: per-card "Share workspace" dialog state — holds the client _id
  // being shared, the generated token (once ready), and copy/loading flags.
  const [shareClientId, setShareClientId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

'''

new_state = '''  // ponytail: per-card Manage-tags + Share state has been MOVED back into the
  // restored <ClientList> component (it owns its own popover/dialog state).
  // Clients.tsx no longer needs shareClientId / shareToken / shareLoading /
  // copied / manageTagsFor — those lived in the inline replacement and are
  // gone now that ClientList is back.

'''

assert old_state in src, "old_state block not found"
src = src.replace(old_state, new_state)

# ─── 3. Remove unused helper functions ───────────────────────────────────────
old_helpers = '''  // ponytail: per-card Share handler — generates a client-workspace token via
  // the (currently optional) clientWorkspace.generateClientWorkspaceToken
  // mutation. Falls back to a demo token if the API isn't wired or the ID is
  // a mock ID (so demo-mode users can still see the share dialog).
  const clientWorkspaceApi = (api as any).clients?.clientWorkspace;
  const generateToken = useMutation(
    clientWorkspaceApi?.generateClientWorkspaceToken ?? null
  );

  const isMockId = (id: string): boolean => {
    if (id.startsWith("client_") || id.startsWith("mem_") || id.startsWith("proj_")) return true;
    if (id.length < 16 || id.includes("_")) return true;
    return false;
  };

  const generateDemoToken = (clientId: string): string => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const segments: string[] = ["demo"];
    for (let s = 0; s < 3; s++) {
      let seg = "";
      for (let i = 0; i < 8; i++) {
        seg += chars[Math.floor(Math.random() * chars.length)];
      }
      segments.push(seg);
    }
    return segments.join("-");
  };

  const handleShareClient = useCallback(async (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareClientId(clientId);
    setShareLoading(true);
    setShareToken(null);
    try {
      if (isMockId(clientId)) {
        const demoToken = generateDemoToken(clientId);
        setShareToken(demoToken);
      } else {
        if (!generateToken) {
          toast.error("Share feature requires authentication. Please sign in.");
          setShareClientId(null);
          setShareLoading(false);
          return;
        }
        const result = await generateToken({ clientId: clientId as any });
        if (result) {
          setShareToken(result.token);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate share link. You may need to be authenticated.");
      setShareClientId(null);
    }
    setShareLoading(false);
  }, [generateToken]);

  const copyShareLink = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/workspace/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-emerald-500 bg-emerald-500/10";
      case "medium": return "text-yellow-500 bg-yellow-500/10";
      case "high": return "text-red-500 bg-red-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────'''

new_helpers = '''  // ponytail: per-card Share/Manage-tags/copy-link helpers were MOVED into the
  // restored <ClientList> component. The inline `clientWorkspaceApi`,
  // `generateToken`, `isMockId`, `generateDemoToken`, `handleShareClient`,
  // `copyShareLink`, and `getRiskColor` helpers that lived here have been
  // removed because ClientList owns its own state now.

  // ─── Render ────────────────────────────────────────────────────────────'''

assert old_helpers in src, "old_helpers block not found"
src = src.replace(old_helpers, new_helpers)

# ─── 4. Replace inline Card + Share Dialog with <ClientList> + add <ClientPolicyProfile> section ────
# The old block starts at the comment "Client List — restored to the polished Card-based layout"
# and ends at the "Empty state with CTA" comment.

# Find the start: "{/* ponytail: Client List — restored to the polished Card-based layout"
# Find the end: "{/* Empty state with CTA */}"

start_marker = '''            {/* ponytail: Client List — restored to the polished Card-based layout'''
end_marker = '''            {/* Empty state with CTA */}'''

start_idx = src.index(start_marker)
end_idx = src.index(end_marker)

old_block = src[start_idx:end_idx]
print(f"Old block size: {len(old_block)} chars, {old_block.count(chr(10))} lines")

new_block = '''            {/* ponytail: RESTORED <ClientList> component from @/components/client-protection/.
                The inline replacement (commit 9ccc1db) lost the polished per-card
                stats grid (Protection Score / Total Hours / Total Value), the
                tier-gated Payment Pattern Analysis section, and the active-session
                indicator. ClientList brings all of that back. Stats default to 0
                because the `clients` table doesn't have protectionScore/totalHours/
                totalValue fields — same defensive behavior the original had. */}
            <ClientList
              clients={filteredClients}
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
              onAddClient={() => setShowAddClient(true)}
              subscriptionTier={subscriptionTier}
              onUpgrade={() => toast.info("Upgrade feature coming soon")}
              // ponytail: pass tags + tag-bearing fields so the list can render
              // badges and a "Manage tags" popover on each card.
              allTags={allTags}
            />

            {/* ponytail: RESTORED "Client Policy Profile" section that lived below
                the list before audit item #26. The selected-client Share / Transfer
                / Delete action toolbar sits at the top of this section so it's
                reachable on both mobile and laptop. The <ClientPolicyProfile>
                component renders a tier-gated analysis card (Free / Starter / Pro /
                Expert) using selectedClient data directly — the deleted Convex
                backend query is NOT re-introduced. */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-2xl font-black text-foreground">Client Policy Profile</h2>
                {selectedClientId && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {(canShareRecords || perms.canShare) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setSharingRecord({
                            id: selectedClientId!,
                            type: "client",
                            sharing: (selectedClient as any)?.sharing || [],
                          });
                          setShowShareDialog(true);
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                    )}
                    {perms.isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                        onClick={() => setShowTransferDialog(true)}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Transfer Ownership
                      </Button>
                    )}
                    {(canDeleteRecords || perms.canDelete) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Client
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {selectedClient ? (
                <ClientPolicyProfile
                  selectedClient={selectedClient}
                  tier={subscriptionTier}
                />
              ) : (
                <Card className="p-6 bg-card rounded-xl border border-border">
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Select a client to view policy profile
                  </div>
                </Card>
              )}
            </div>

            '''

src = src[:start_idx] + new_block + src[end_idx:]

# ─── Write back ──────────────────────────────────────────────────────────────
CLIENTS_TSX.write_text(src)
print(f"New file size: {len(src)} chars, {src.count(chr(10))} lines")
print("Done.")
