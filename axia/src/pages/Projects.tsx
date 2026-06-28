import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Share2, ArrowRightLeft, Tag as TagIcon, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { useWorkspacePermissions, usePermissions } from "@/hooks/use-permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { ShareDialog } from "@/components/ShareDialog";
import { TransferOwnershipDialog } from "@/components/TransferOwnershipDialog";
// ponytail: import reusable tag components for picker, badges, and filter bar.
import { TagPicker, TagBadges } from "@/components/tags";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Feature Components
import { ProjectList } from "@/components/project-protection/ProjectList";
import { PageLayout } from "@/components/design-system/PageLayout";

interface Project {
  _id: Id<"projects">;
  userId: Id<"users"> | string;
  clientId: Id<"clients">;
  projectName: string;
  hourlyRate: number;
  projectType: "ongoing" | "fixed" | "milestone";
  protectionLevel: "standard" | "enhanced" | "maximum";
  status: string;
  createdAt: number;
  lastActivityAt: number;
  clientName?: string;
  totalHours?: number;
  protectionScore?: number;
  activeSession?: boolean;
  totalValue?: number;
  atRiskAmount?: number;
  rejectedHours?: number;
}

export default function Projects() {
  const { isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tier } = useSubscriptionTier();

  // ── P1 FIX: Consume createFromProposal URL param ──
  // When user clicks "Convert to Project" from a signed proposal,
  // they arrive here with ?createFromProposal=<proposalId>
  const createFromProposal = searchParams.get("createFromProposal");

  useEffect(() => {
    if (createFromProposal) {
      // Clear the param so we don't show the toast again on re-render
      setSearchParams({}, { replace: true });
      toast.success("Project auto-created from signed proposal!", {
        description: "Check your projects list — a project and scope were automatically created when the proposal was signed.",
        duration: 8000,
      });
    }
  }, [createFromProposal, setSearchParams]);

  // ── Workspace Context ──
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = isConvexConnected ? (activeWorkspaceId as Id<"workspaces">) : undefined;

  // ── Permissions ──
  const { canDeleteRecords, canShareRecords } = useWorkspacePermissions();

  const [isSeeding, setIsSeeding] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharingRecord, setSharingRecord] = useState<{id: string, type: string, sharing: any[]} | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const seedTestProjectsMutation = useMutation(api.seedProjects.seedTestProjects);
  // ponytail: real New Project dialog (replaces dev-only "Add Test Project" path)
  const addProjectMutation = useMutation(api.projects.projectProtectionSimple.addProject);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProject, setNewProject] = useState({ projectName: "", clientId: "", hourlyRate: "50", projectType: "ongoing" as "ongoing" | "fixed" | "milestone", protectionLevel: "enhanced" as "standard" | "enhanced" | "maximum" });
  const clientsList = useQuery(
    isConvexConnected && workspaceId ? api.clients.crud.getClients : "skip",
    isConvexConnected && workspaceId ? { workspaceId } : "skip"
  );
  // ponytail: load the workspace's tags so we can render TagBadges on each project card
  // and a tag-filter chip bar above the grid.
  const tagsData = useQuery(api.tags.crud.getTags, { workspaceId: workspaceId as any });
  const allTags: any[] = tagsData ?? [];
  // ponytail: detached TagPicker state for the New Project dialog — held locally
  // until addProjectMutation returns the new project ID, then persisted via setEntityTags.
  const [newProjectTagIds, setNewProjectTagIds] = useState<string[]>([]);
  // ponytail: tag-filter state — null = no filter, string = tagId.
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // ponytail: generic setEntityTags mutation — used to attach tags to a freshly-created
  // project (the create mutation doesn't accept tagIds directly).
  const setEntityTagsMutation = useMutation(api.tags.crud.setEntityTags);

  // ── Convex mutations for sharing ──
  const shareRecordMutation = useMutation(api.permissions.shareRecord.shareRecord);
  const unshareRecordMutation = useMutation(api.permissions.shareRecord.unshareRecord);
  
  const handleUpgrade = () => navigate("/subscription");

  const projects = useQuery(api.projects.projectProtection.getMyProjects, {});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { isDisconnected } = useConvexConnectionState();
  const isLoading = projects === undefined;
  const loadingTimedOut = useQueryTimeout(isLoading, 3000);
  const showLoading = isLoading && !loadingTimedOut && !isDisconnected;
  const safeProjects = projects ?? [];

  // ── Selected project & its permissions (hooks MUST be called at top level) ──
  const selectedProject = selectedProjectId
    ? safeProjects.find((p: any) => p._id === selectedProjectId) ?? null
    : null;
  const perms = usePermissions(selectedProject as any);

  // ponytail: tag-filtered projects — when a filter chip is active, narrow the list
  // to projects whose tagIds include the selected tag. Falls back to the full list
  // when no filter is set.
  const filteredProjects = useMemo(() => {
    if (!activeTagFilter) return safeProjects;
    return safeProjects.filter((p: any) => Array.isArray(p.tagIds) && p.tagIds.includes(activeTagFilter));
  }, [safeProjects, activeTagFilter]);

  useEffect(() => {
    if (!selectedProjectId && filteredProjects.length > 0) {
      setSelectedProjectId(filteredProjects[0]._id);
    }
  }, [filteredProjects, selectedProjectId]);

  useEffect(() => {
    if (isSeeding) {
      const timer = setTimeout(() => {
        setIsSeeding(false);
        toast.error("Request timed out. Please try again.");
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isSeeding]);

  useEffect(() => {
    if (safeProjects.length > 0 && isSeeding) {
      setIsSeeding(false);
    }
  }, [safeProjects, isSeeding]);

  const handleCreateTestProjects = async () => {
    setIsSeeding(true);
    try {
      const result = await seedTestProjectsMutation({});
      if (result?.success) {
        toast.success("Test projects created successfully");
      } else {
        toast.error("Failed to create test projects");
        setIsSeeding(false);
      }
    } catch (error) {
      console.error("Failed to seed test projects:", error);
      setIsSeeding(false);
      toast.error("Failed to create test projects");
    }
  };

  // ponytail: real create-project handler. Requires a client (matches schema).
  const handleCreateProject = async () => {
    if (!newProject.projectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!newProject.clientId) {
      toast.error("Please select a client");
      return;
    }
    if (!workspaceId) {
      toast.error("No active workspace — please reload");
      return;
    }
    try {
      const newProjectId = await addProjectMutation({
        projectName: newProject.projectName.trim(),
        clientId: newProject.clientId as any,
        hourlyRate: Number(newProject.hourlyRate) || 50,
        projectType: newProject.projectType,
        protectionLevel: newProject.protectionLevel,
        workspaceId,
      } as any);
      // ponytail: attach the form's selected tags to the new project via the
      // generic setEntityTags mutation (addProject doesn't accept tagIds).
      if (newProjectId && newProjectTagIds.length > 0) {
        try {
          await setEntityTagsMutation({
            entityType: "projects",
            entityId: newProjectId,
            tagIds: newProjectTagIds as any,
          });
        } catch (tagErr: any) {
          console.warn("[Projects] failed to attach tags to new project:", tagErr?.message);
        }
      }
      toast.success("Project created!");
      setShowNewProjectDialog(false);
      setNewProject({ projectName: "", clientId: "", hourlyRate: "50", projectType: "ongoing", protectionLevel: "enhanced" });
      setNewProjectTagIds([]);
    } catch (err: any) {
      toast.error("Failed to create project", { description: err?.message });
    }
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <PageLayout className="space-y-8">
          {/* ponytail: responsive header — title + action buttons in one row on sm+,
              stacked on mobile. All buttons size="sm" so mobile and laptop match. */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
                Project Protection
              </h1>
              <p className="text-[16px] text-muted-foreground">
                Manage your project protection, track evidence, and monitor dispute risks.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
            {/* ponytail: real New Project dialog — production path */}
            <Button onClick={() => setShowNewProjectDialog(true)} size="sm" className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
            <Button onClick={handleCreateTestProjects} disabled={isSeeding} variant="outline" size="sm">
              {isSeeding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Test Project
            </Button>
            {(canShareRecords || perms.canShare) && selectedProjectId && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  setSharingRecord({
                    id: selectedProjectId,
                    type: "project",
                    sharing: selectedProject?.sharing || [],
                  });
                  setShowShareDialog(true);
                }}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}
            {perms.isOwner && selectedProjectId && (
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
            </div>
          </div>

          <div className="space-y-6">
            {showLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
              </div>
            ) : (
              <>
                {/* ponytail: tag-filter chip bar above the grid — toggle pattern. */}
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
                {/* Project List / Selection */}
                <ProjectList 
                projects={filteredProjects.map((p: any) => ({
                  ...p,
                  _id: p._id,
                  protectionLevel: p.protectionLevel || "standard",
                  protectionScore: p.protectionScore || 0,
                  totalHours: p.totalHours || 0,
                  totalValue: p.totalValue || 0,
                  atRiskAmount: p.atRiskAmount || 0,
                  activeSession: p.activeSession || false,
                  rejectedHours: p.rejectedHours || 0,
                  projectType: p.projectType || "ongoing"
                }))}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
                onAddProject={handleCreateTestProjects}
                subscriptionTier={tier}
                onUpgrade={() => navigate("/subscription")}
                // ponytail: pass tags + tag-bearing fields so the list can render
                // badges and a "Manage tags" popover on each card.
                allTags={allTags}
              />
              </>
            )}
          </div>
      </PageLayout>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        recordId={sharingRecord?.id || ""}
        recordType={sharingRecord?.type || "project"}
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
        recordId={selectedProjectId || ""}
        recordType="project"
        recordName={selectedProject?.projectName || "Unknown Project"}
        currentOwnerId={(selectedProject as any)?.userId}
        onTransferComplete={() => setShowTransferDialog(false)}
      />

      {/* ponytail: New Project dialog — inline, no new component file */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">New Project</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Project Name *</label>
                <input
                  className="w-full p-2 border rounded-md bg-background border-input h-9"
                  value={newProject.projectName}
                  onChange={(e) => setNewProject((p) => ({ ...p, projectName: e.target.value }))}
                  placeholder="e.g., Website Redesign"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Client *</label>
                {clientsList && Array.isArray(clientsList) && clientsList.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No clients yet. <a href="/clients" className="underline">Add a client first</a>.
                  </p>
                ) : (
                  <select
                    className="w-full p-2 border rounded-md bg-background border-input h-9"
                    value={newProject.clientId}
                    onChange={(e) => setNewProject((p) => ({ ...p, clientId: e.target.value }))}
                  >
                    <option value="">Select a client…</option>
                    {(clientsList as any[])?.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.clientName || c.name || c.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-md bg-background border-input h-9"
                    value={newProject.hourlyRate}
                    onChange={(e) => setNewProject((p) => ({ ...p, hourlyRate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Type</label>
                  <select
                    className="w-full p-2 border rounded-md bg-background border-input h-9"
                    value={newProject.projectType}
                    onChange={(e) => setNewProject((p) => ({ ...p, projectType: e.target.value as any }))}
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="fixed">Fixed</option>
                    <option value="milestone">Milestone</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Protection Level</label>
                <select
                  className="w-full p-2 border rounded-md bg-background border-input h-9"
                  value={newProject.protectionLevel}
                  onChange={(e) => setNewProject((p) => ({ ...p, protectionLevel: e.target.value as any }))}
                >
                  <option value="standard">Standard</option>
                  <option value="enhanced">Enhanced</option>
                  <option value="maximum">Maximum</option>
                </select>
              </div>
              {/* ponytail: detached TagPicker — IDs are held in `newProjectTagIds` and
                  attached after the project is created via setEntityTags. */}
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Tags (optional)</label>
                <TagPicker
                  entityType="projects"
                  initialTagIds={newProjectTagIds}
                  onChange={setNewProjectTagIds}
                  categoryHint="project"
                  placeholder="Add tags for this project..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowNewProjectDialog(false)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white" onClick={handleCreateProject}>
                Create Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
