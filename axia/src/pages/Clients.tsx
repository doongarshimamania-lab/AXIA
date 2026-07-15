import { useState, useEffect, useRef } from "react";
// ponytail: ClientPolicyProfile section REMOVED per user request — the
// Portal Link / Edit / Share / Transfer Ownership / Delete Client buttons
// have been MOVED into the Client Protection Hub (ClientList) component's
// header. The tier-gated analysis card is gone. ClientList is untouched.
import { ClientList } from "@/components/client-protection/ClientList";
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
import { Trash2, Loader2, Shield, Plus, Upload, Settings2, Pencil, Tag as TagIcon, X } from "lucide-react";
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
  // ponytail: NEW — updateClient mutation used by the Edit Client dialog so
  // users can edit client fields after creating a client (previously the
  // only way to fix a typo was to delete the client and re-add it).
  const updateClientMutation = useMutation(api.clients.crud.updateClient);
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
  // ponytail: NEW — Edit Client dialog state. Tracks which client is being
  // edited plus the form fields. The dialog reuses the same field shape as
  // the Add Client dialog so users see a consistent form.
  const [showEditClient, setShowEditClient] = useState(false);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  // ponytail: detached TagPicker state for the Add Client dialog — held locally
  // until createClientMutation returns the new client ID, then persisted via setEntityTags.
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  // ponytail: tag-filter state for the client list — null = no filter, string = tagId.
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  // ponytail: per-card Manage-tags + Share state has been MOVED back into the
  // restored <ClientList> component (it owns its own popover/dialog state).
  // Clients.tsx no longer needs shareClientId / shareToken / shareLoading /
  // copied / manageTagsFor — those lived in the inline replacement and are
  // gone now that ClientList is back.

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
    // ponytail: pass through contact + ownership fields so the action toolbar
    // in ClientList can use them (PortalLinkDialog needs contactEmail, the
    // Transfer Ownership flow needs the current owner id).
    contactEmail: c.contactEmail,
    contactName: c.contactName,
    userId: c.userId,
    sharing: c.sharing,
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

  // ponytail: NEW — opens the Edit Client dialog pre-filled with the selected
  // client's current field values. The user can tweak any field and save.
  // The actual mutation call happens in handleSaveEdit below.
  const openEditDialog = (client: any) => {
    if (!client) return;
    setEditClientId(client._id);
    setClientName(client.clientName ?? client.name ?? "");
    setPlatform((client.platform ?? "upwork") as any);
    setHourlyRate(String(client.hourlyRate ?? ""));
    setContractType((client.contractType ?? "hourly") as any);
    setRiskLevel((client.riskLevel ?? "medium") as any);
    setFormTagIds(Array.isArray(client.tagIds) ? client.tagIds : []);
    setShowEditClient(true);
  };

  // ponytail: NEW — saves the edited client via the updateClient Convex mutation.
  // Re-attaches the current tag selection via setEntityTags (same pattern as
  // Add Client — updateClient doesn't accept tagIds directly).
  const handleSaveEdit = async () => {
    if (!editClientId) return;
    if (!clientName || !hourlyRate) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateClientMutation({
        clientId: editClientId as any,
        clientName,
        platform,
        hourlyRate: Number(hourlyRate),
        contractType,
        riskLevel,
      });
      if (formTagIds.length > 0) {
        try {
          await setEntityTagsMutation({
            entityType: "clients",
            entityId: editClientId as any,
            tagIds: formTagIds as any,
          });
        } catch (tagErr: any) {
          console.warn("[Clients] failed to update tags on edited client:", tagErr?.message);
        }
      }
      toast.success("Client updated successfully!");
      setShowEditClient(false);
      resetForm();
      setEditClientId(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update client");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ponytail: NEW — handlers passed into ClientList's action toolbar. Each
  // one wires a button in the toolbar to the corresponding dialog/confirmation
  // flow that already lives in Clients.tsx. This keeps ClientList dumb (just
  // renders buttons) and Clients.tsx in charge of state.
  const handleShareClientFromToolbar = (client: any) => {
    setSharingRecord({
      id: client._id,
      type: "client",
      sharing: client?.sharing || [],
    });
    setShowShareDialog(true);
  };
  const handleTransferOwnershipFromToolbar = (_client: any) => {
    setShowTransferDialog(true);
  };
  const handleDeleteClientFromToolbar = (_client: any) => {
    setShowDeleteConfirm(true);
  };

  // ponytail: per-card Share/Manage-tags/copy-link helpers were MOVED into the
  // restored <ClientList> component. The inline `clientWorkspaceApi`,
  // `generateToken`, `isMockId`, `generateDemoToken`, `handleShareClient`,
  // `copyShareLink`, and `getRiskColor` helpers that lived here have been
  // removed because ClientList owns its own state now.

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
              Manage clients and protection settings.
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
                  Connect your account to manage clients and protection settings.
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

            {/* ponytail: <ClientList> component — renders the "Client Protection Hub"
                card with the Add Client button, the per-card stats grid, and the
                per-selected-client action toolbar (Portal Link / Edit / Share /
                Transfer / Delete) that used to live in the now-removed Client
                Policy Profile section. Stats default to 0 because the `clients`
                table doesn't have protectionScore/totalHours/totalValue fields. */}
            <ClientList
              clients={filteredClients}
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
              onAddClient={() => setShowAddClient(true)}
              // ponytail: NEW — Edit Client dialog opens from the toolbar's
              // "Edit" button. openEditDialog pre-fills the form fields.
              onEditClient={openEditDialog}
              // ponytail: NEW — Share / Transfer / Delete wired to the
              // existing dialogs/confirmations in this file.
              onShareClient={handleShareClientFromToolbar}
              onTransferOwnership={handleTransferOwnershipFromToolbar}
              onDeleteClient={handleDeleteClientFromToolbar}
              // ponytail: NEW — permission flags so the toolbar can hide
              // actions the user isn't allowed to perform.
              canShareRecords={canShareRecords}
              canDeleteRecords={canDeleteRecords}
              canShare={perms.canShare}
              canDelete={perms.canDelete}
              isOwner={perms.isOwner}
              subscriptionTier={subscriptionTier}
              onUpgrade={() => toast.info("Upgrade feature coming soon")}
              // ponytail: pass tags + tag-bearing fields so the list can render
              // badges and a "Manage tags" popover on each card.
              allTags={allTags}
            />

            {/* ponytail: Client Policy Profile section REMOVED per user request.
                The Portal Link / Edit / Share / Transfer Ownership / Delete
                Client buttons have been MOVED into the Client Protection Hub
                (ClientList) component's header. The tier-gated analysis card
                (Free / Starter / Pro / Expert) is gone — the screenshot
                confirmed it was the section the user wanted removed, NOT the
                hub. The hub still shows the per-client stats grid + payment
                pattern analysis section. */}

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

            {/* ponytail: Client Policy Profile section was restored above. */}
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

        {/* ponytail: NEW — Edit Client dialog. Reuses the same form fields as
            Add Client (Client Name / Platform / Hourly Rate / Contract Type /
            Risk Level / Tags) so users see a consistent shape. openEditDialog
            pre-fills the fields with the selected client's current values
            before opening. Save calls the updateClient Convex mutation. */}
        <Dialog open={showEditClient} onOpenChange={setShowEditClient}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>Update the details for this client. Changes are saved immediately.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-client-name">Client Name *</Label>
                <Input
                  id="edit-client-name"
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
                <Label htmlFor="edit-hourly-rate">Hourly Rate ($) *</Label>
                <Input
                  id="edit-hourly-rate"
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

              {/* ponytail: detached TagPicker — IDs are held in `formTagIds` and
                  attached after the client is updated via setEntityTags. */}
              <div className="space-y-2">
                <Label>Tags (optional)</Label>
                <TagPicker
                  entityType="clients"
                  initialTagIds={formTagIds}
                  onChange={setFormTagIds}
                  categoryHint="client"
                  placeholder="Update tags for this client..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditClient(false);
                  resetForm();
                  setEditClientId(null);
                }}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={!clientName || !hourlyRate || isSavingEdit}>
                {isSavingEdit ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </div>
  );
}
