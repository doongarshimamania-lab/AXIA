import { useState, useEffect, useRef, useCallback } from "react";
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
import { TagPicker, TagBadges } from "@/components/tags";

export default function Clients() {
  const { tier: subscriptionTier } = useSubscriptionTier();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // ─── Workspace Context ─────────────────────────────────────────────────
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = isConvexConnected ? (activeWorkspaceId as Id<"workspaces">) : undefined;

  // ─── Permissions ────────────────────────────────────────────────────────
  const { canDeleteRecords, canShareRecords } = useWorkspacePermissions();

  // ─── Convex mutations for sharing ───────────────────────────────────────
  const shareRecordMutation = useMutation(api.permissions.shareRecord.shareRecord);
  const unshareRecordMutation = useMutation(api.permissions.shareRecord.unshareRecord);

  // ─── Convex queries ────────────────────────────────────────────────────
  const clientsData = useQuery(api.clients.crud.getClients, workspaceId ? { workspaceId } : "skip");

  // ─── Convex mutations ──────────────────────────────────────────────────
  const createClientMutation = useMutation(api.clients.crud.createClient);
  const deleteClientMutation = useMutation(api.clients.crud.deleteClient);
  // ponytail: generic setEntityTags mutation — used to attach tags to a freshly-created
  // client (createClient doesn't accept tagIds directly, so we patch after).
  const setEntityTagsMutation = useMutation(api.tags.crud.setEntityTags);
  // ponytail: load the workspace's tags so we can render TagBadges on each client card
  // and a tag-filter chip bar above the list.
  const tagsData = useQuery(api.tags.crud.getTags, { workspaceId: workspaceId as any });
  const allTags: any[] = tagsData ?? [];

  // ─── Local state ───────────────────────────────────────────────────────
  const [showAddClient, setShowAddClient] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [sharingRecord, setSharingRecord] = useState<{id: string, type: string, sharing: any[]} | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [clientName, setClientName] = useState("");
  const [platform, setPlatform] = useState<"upwork" | "fiverr" | "toptal" | "freelancer" | "direct">("upwork");
  const [hourlyRate, setHourlyRate] = useState("");
  const [contractType, setContractType] = useState<"hourly" | "fixed">("hourly");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  // ponytail: detached TagPicker state for the Add Client dialog — held locally
  // until createClientMutation returns the new client ID, then persisted via setEntityTags.
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  // ponytail: tag-filter state for the client list — null = no filter, string = tagId.
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  // ponytail: per-card "Manage tags" popover state — holds the client _id whose
  // tag popover is currently open, or null when none is open.
  const [manageTagsFor, setManageTagsFor] = useState<string | null>(null);
  // ponytail: per-card "Share workspace" dialog state — holds the client _id
  // being shared, the generated token (once ready), and copy/loading flags.
  const [shareClientId, setShareClientId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ─── Loading timeout pattern ───────────────────────────────────────────
  const { isDisconnected } = useConvexConnectionState();
  const isLoading = !authLoading && clientsData === undefined;
  const loadingTimedOut = useQueryTimeout(isLoading, 3000);
  const showLoading = isLoading && !loadingTimedOut && !isDisconnected;

  // ─── Determine demo mode ───────────────────────────────────────────────
  const isDemoMode = !authLoading && !isAuthenticated;

  // ─── Map Convex data to ClientList shape ───────────────────────────────
  const realClients = (clientsData ?? []).map((c: any) => ({
    _id: c._id,
    clientName: c.clientName,
    platform: c.platform,
    hourlyRate: c.hourlyRate,
    contractType: c.contractType,
    riskLevel: c.riskLevel ?? "medium",
    protectionScore: c.protectionScore ?? 0,
    totalHours: c.totalHours ?? 0,
    totalValue: c.totalProjectValue ?? c.totalValue ?? 0,
    activeSession: c.activeSession ?? false,
    addedAt: c.addedAt,
    lastActivityAt: c.lastActivityAt,
    // ponytail: preserve tagIds from the patched schema so the list can show badges.
    tagIds: c.tagIds,
  }));

  // Use real clients only (empty array when demo/disconnected)
  const clients = realClients;

  // ponytail: tag-filtered clients — when a filter chip is active, narrow the list
  // to clients whose tagIds include the selected tag.
  const filteredClients = activeTagFilter
    ? clients.filter((c: any) => Array.isArray(c.tagIds) && c.tagIds.includes(activeTagFilter))
    : clients;

  // ─── Auto-select first client ──────────────────────────────────────────
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (!hasAutoSelected.current && !selectedClientId && clients.length > 0) {
      hasAutoSelected.current = true;
      setSelectedClientId(clients[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit selectedClientId to avoid infinite re-renders
  }, [clients]);

  // ─── Get selected client object ────────────────────────────────────────
  // IMPORTANT: Must be computed BEFORE usePermissions() call below
  const selectedClient = clients.find((c: any) => c._id === selectedClientId) ?? null;

  // ─── Permissions for selected client (hook MUST be at top level) ──────
  const perms = usePermissions(selectedClient as any);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleAddClient = async () => {
    if (!clientName || !hourlyRate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isDemoMode) {
      toast.success("Client added successfully! (Demo mode)");
      setShowAddClient(false);
      resetForm();
      return;
    }

    setIsCreating(true);
    try {
      const newClientId = await createClientMutation({
        clientName,
        platform,
        hourlyRate: Number(hourlyRate),
        contractType,
        riskLevel,
        ...(workspaceId ? { workspaceId } : {}),
      });
      // ponytail: attach the form's selected tags to the new client via the
      // generic setEntityTags mutation (createClient doesn't accept tagIds).
      if (newClientId && formTagIds.length > 0) {
        try {
          await setEntityTagsMutation({
            entityType: "clients",
            entityId: newClientId,
            tagIds: formTagIds as any,
          });
        } catch (tagErr: any) {
          console.warn("[Clients] failed to attach tags to new client:", tagErr?.message);
        }
      }
      toast.success("Client added successfully!");
      setShowAddClient(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add client");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClientId) return;

    if (isDemoMode) {
      toast.success("Client deleted! (Demo mode)");
      setSelectedClientId(null);
      setShowDeleteConfirm(false);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteClientMutation({ clientId: selectedClientId as any });
      toast.success("Client deleted successfully");
      setSelectedClientId(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete client");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const resetForm = () => {
    setClientName("");
    setHourlyRate("");
    setPlatform("upwork");
    setContractType("hourly");
    setRiskLevel("low");
    // ponytail: also reset the form's tag selection so the next client starts clean.
    setFormTagIds([]);
  };

  // ponytail: per-card Share handler — generates a client-workspace token via
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

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen bg-background">
      <PageLayout spaced>
        {/* ponytail: responsive header — stacks vertically on mobile, horizontally on sm+.
            All buttons use size="sm" so mobile and laptop render IDENTICAL button heights. */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-[32px] font-bold text-foreground tracking-tight mb-2">
              Clients
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Manage client policy profiles and protection settings.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowCustomFields(!showCustomFields)}
            >
              <Settings2 className="h-4 w-4" />
              Custom Fields
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowBulkImport(true)}
            >
              <Upload className="h-4 w-4" />
              Bulk Import
            </Button>
            <Button size="sm" onClick={() => setShowAddClient(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Custom Field Manager */}
        {showCustomFields && (
          <CustomFieldManager
            workspaceId={activeWorkspaceId}
            tableName="clients"
          />
        )}

        {/* Demo mode banner */}
        {isDemoMode && (
          <Card className="p-8 bg-card rounded-xl border border-border">
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Sign in to see your clients</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your account to manage client policy profiles and protection settings.
                </p>
              </div>
              <Button asChild>
                <a href="/auth">Sign In</a>
              </Button>
            </div>
          </Card>
        )}

        {/* Loading state */}
        {showLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[280px] w-full rounded-xl" />
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* ponytail: tag-filter chip bar above the client list — toggle pattern. */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1 inline-flex items-center gap-1">
                  <TagIcon className="h-3 w-3" /> Filter:
                </span>
                {allTags.map((t: any) => {
                  const isActive = activeTagFilter === t._id;
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => setActiveTagFilter(isActive ? null : t._id)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors ${
                        isActive
                          ? "bg-foreground text-background border-foreground"
                          : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                      }`}
                      style={isActive ? undefined : { borderColor: (t.color ?? "#888") + "66", color: t.color ?? undefined }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: t.color ?? "#888" }}
                      />
                      {t.name}
                      {isActive && <X className="h-3 w-3 ml-0.5" />}
                    </button>
                  );
                })}
                {activeTagFilter && (
                  <button
                    type="button"
                    onClick={() => setActiveTagFilter(null)}
                    className="text-xs text-muted-foreground underline hover:text-foreground ml-1"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}

            {/* ponytail: Client List — restored to the polished Card-based layout
                that lived in @/components/client-protection/ClientList before
                audit item #26. The fabricated stats (protectionScore %, totalHours,
                totalValue, fake Payment Pattern Analysis, fake Upgrade CTA) are
                GONE — only real fields from the `clients` table are rendered:
                name, platform, hourlyRate, contractType, riskLevel, tags.
                Per-card actions (Manage Tags popover, Share workspace dialog,
                risk badge) are preserved because they call real mutations.
                The selected-client Share/Transfer/Delete actions now live in a
                toolbar above the cards so they're reachable on mobile too. */}
            {filteredClients.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Client Protection Hub
                    </CardTitle>
                    <Button size="sm" onClick={() => setShowAddClient(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Client
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* ponytail: selected-client action toolbar — wraps on mobile. */}
                  {selectedClientId && (
                    <div className="flex items-center gap-2 flex-wrap pb-3 mb-3 border-b border-border">
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
                  <div className="space-y-3">
                    {filteredClients.map((c: any) => {
                      const isSelected = c._id === selectedClientId;
                      return (
                        <div
                          key={c._id}
                          className={`p-4 border border-border rounded-lg hover:bg-muted/50 transition cursor-pointer ${
                            isSelected ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedClientId(c._id === selectedClientId ? null : c._id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="min-w-0">
                                <div className="font-medium text-foreground truncate">{c.clientName}</div>
                                <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className="capitalize">{c.platform}</span>
                                  {typeof c.hourlyRate === "number" && (
                                    <span>${c.hourlyRate}/hr</span>
                                  )}
                                  {c.contractType && (
                                    <span className="capitalize">{c.contractType}</span>
                                  )}
                                </div>
                                {Array.isArray(c.tagIds) && c.tagIds.length > 0 && (
                                  <div className="mt-1">
                                    <TagBadges tagIds={c.tagIds} tags={allTags} max={3} size="xs" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* ponytail: Manage-tags popover */}
                              <Popover open={manageTagsFor === c._id} onOpenChange={(o) => setManageTagsFor(o ? c._id : null)}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={(e) => { e.stopPropagation(); setManageTagsFor(c._id); }}
                                    title="Manage tags"
                                  >
                                    <TagIcon className="h-3.5 w-3.5 mr-1" />
                                    Tags
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] sm:w-[320px]" align="end" onClick={(e) => e.stopPropagation()}>
                                  <div className="space-y-2">
                                    <div className="text-xs font-medium text-muted-foreground">Tags for {c.clientName}</div>
                                    <TagPicker
                                      entityType="clients"
                                      entityId={c._id}
                                      initialTagIds={c.tagIds ?? []}
                                      categoryHint="client"
                                    />
                                  </div>
                                </PopoverContent>
                              </Popover>
                              {c.riskLevel && (
                                <Badge className={getRiskColor(c.riskLevel)}>
                                  {c.riskLevel} risk
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/30"
                                onClick={(e) => handleShareClient(c._id, e)}
                                title="Share workspace with client"
                              >
                                <Share2 className="h-3.5 w-3.5 mr-1" />
                                Share
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )
            /* ponytail: Share-link Dialog for the per-card Share button.
               Kept outside the Card so it overlays the whole page when open. */}
            <Dialog open={shareClientId !== null} onOpenChange={(open) => { if (!open) { setShareClientId(null); setShareToken(null); } }}>
              <DialogContent className="sm:max-w-md max-w-[calc(100%-2rem)]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-violet-500" />
                    Share Client Workspace
                  </DialogTitle>
                  <DialogDescription>
                    Generate a shareable link for this client. They can view their projects, proposals, invoices, and team — no login required.
                  </DialogDescription>
                </DialogHeader>
                {shareLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : shareToken ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        {shareToken?.startsWith("demo-")
                          ? "Demo share link generated! (Using demo data — link will show sample content)"
                          : "Share link generated successfully!"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                        {window.location.origin}/workspace/{shareToken}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyShareLink}
                        className="shrink-0"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <a
                      href={`/workspace/${shareToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Preview as client
                    </a>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>Note:</strong> Anyone with this link can view this client's projects, proposals, and invoices. The client will only see their own data.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Unable to generate link. Make sure you're authenticated.
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Empty state with CTA */}
            {!isDemoMode && clients.length === 0 && (
              <Card className="p-8 bg-card rounded-xl border border-border">
                <div className="text-center space-y-4">
                  <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">No clients yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add your first client to start tracking protection and policy profiles.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <Button onClick={() => setShowAddClient(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Client
                    </Button>
                    <Button variant="outline" onClick={() => setShowBulkImport(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Bulk Import
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* ponytail: removed the entire "Client Policy Profile" section.
                It was a wrapper around <ClientPolicyProfile> which rendered
                fabricated protection-rate stats and relied on the now-deleted
                api.clients.clientPolicyProfile.getClientPolicyProfile query.
                The Share / Transfer / Delete buttons that used to live here
                have been moved up to the inline list header above. (Audit item #26) */}
          </>
        )}

        {/* Add Client Dialog */}
        <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>Fill in the details to add a new client to your workspace.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name *</Label>
                <Input
                  id="client-name"
                  placeholder="Enter client name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upwork">Upwork</SelectItem>
                    <SelectItem value="fiverr">Fiverr</SelectItem>
                    <SelectItem value="toptal">Toptal</SelectItem>
                    <SelectItem value="freelancer">Freelancer.com</SelectItem>
                    <SelectItem value="direct">Direct Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly-rate">Hourly Rate ($) *</Label>
                <Input
                  id="hourly-rate"
                  type="number"
                  placeholder="85"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contract Type</Label>
                <Select value={contractType} onValueChange={(v: any) => setContractType(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select value={riskLevel} onValueChange={(v: any) => setRiskLevel(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Fields */}
              <CustomFieldValues
                workspaceId={activeWorkspaceId}
                tableName="clients"
                values={customFieldValues}
                onChange={setCustomFieldValues}
              />
              {/* ponytail: detached TagPicker — IDs are held in `formTagIds` and
                  attached after the client is created via setEntityTags. */}
              <div className="space-y-2">
                <Label>Tags (optional)</Label>
                <TagPicker
                  entityType="clients"
                  initialTagIds={formTagIds}
                  onChange={setFormTagIds}
                  categoryHint="client"
                  placeholder="Add tags for this client..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddClient(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleAddClient} disabled={!clientName || !hourlyRate || isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Client"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Client</DialogTitle>
              <DialogDescription>This action cannot be undone. All associated data will be permanently removed.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground break-words">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  {selectedClient?.clientName ?? "this client"}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteClient}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Share Dialog */}
        <ShareDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          recordId={sharingRecord?.id || ""}
          recordType={sharingRecord?.type || "client"}
          currentSharing={sharingRecord?.sharing || []}
          onShare={async (args) => {
            try {
              if (shareRecordMutation) {
                await shareRecordMutation({
                  recordId: sharingRecord?.id,
                  recordType: sharingRecord?.type,
                  ...args,
                });
              }
              toast.success("Record shared successfully");
            } catch (err: any) {
              toast.error(err?.message || "Failed to share record");
            }
          }}
          onUnshare={async (args) => {
            try {
              if (unshareRecordMutation) {
                await unshareRecordMutation({
                  recordId: sharingRecord?.id,
                  recordType: sharingRecord?.type,
                  ...args,
                });
              }
              toast.success("Access removed");
            } catch (err: any) {
              toast.error(err?.message || "Failed to remove access");
            }
          }}
        />

        {/* Transfer Ownership Dialog */}
        <TransferOwnershipDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          recordId={selectedClientId || ""}
          recordType="client"
          recordName={(selectedClient as any)?.clientName || (selectedClient as any)?.name || "Unknown Client"}
          currentOwnerId={(selectedClient as any)?.userId}
          onTransferComplete={() => setShowTransferDialog(false)}
        />

        {/* Bulk Import Dialog */}
        <BulkImportDialog
          open={showBulkImport}
          onOpenChange={setShowBulkImport}
          tableName="clients"
          onImportComplete={() => {
            toast.success("Import complete");
          }}
        />
      </PageLayout>
    </div>
  );
}
