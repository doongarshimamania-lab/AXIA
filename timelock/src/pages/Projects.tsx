import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Share2, ArrowRightLeft } from "lucide-react";
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

  useEffect(() => {
    if (!selectedProjectId && safeProjects.length > 0) {
      setSelectedProjectId(safeProjects[0]._id);
    }
  }, [safeProjects, selectedProjectId]);

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

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <PageLayout className="space-y-8">
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Project Protection
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Manage your project protection, track evidence, and monitor dispute risks.
            </p>
          </div>

          <div className="mb-4 flex items-center gap-2">
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

          <div className="space-y-6">
            {showLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
              </div>
            ) : (
              <>
                {/* Project List / Selection */}
                <ProjectList 
                projects={safeProjects.map((p: any) => ({
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
    </div>
  );
}
