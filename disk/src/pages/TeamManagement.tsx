import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users, UserPlus, Shield, Crown, Eye,
  Trash2, Mail, Clock, CheckCircle, Loader2,
  Building2, Settings, Sparkles, Activity,
  DollarSign, Timer, X, Briefcase, Info,
  Plus, Pencil, Palette, ChevronUp, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import {
  useWorkspaceContext,
} from "@/hooks/use-workspace";

// ─── Demo Mode Banner ────────────────────────────────────────
function DemoModeBanner() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-6">
      <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-700 dark:text-amber-300">
        <span className="font-medium">Demo Mode</span> — Sign in to manage your real team. 
        Showing sample team data for preview.
      </p>
    </div>
  );
}

// ─── Loading Skeletons ───────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-10" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function MembersSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Team Color Options ──────────────────────────────────────
const TEAM_COLORS = [
  "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#EC4899", "#6366F1", "#64748B", "#F97316", "#475569",
];

export default function TeamManagement() {
  const { activeWorkspaceId, isTeamMode, isOwner, canManageTeam, activeWorkspace } = useWorkspaceContext();

  // ─── Convex Queries ────────────────────────────────────────────────────────
  const hasRealWorkspaceId = activeWorkspaceId && !activeWorkspaceId.startsWith("ws_");

  const convexMembers = useQuery(
    hasRealWorkspaceId ? api.workspaces.members.getMembers : "skip",
    hasRealWorkspaceId ? { workspaceId: activeWorkspaceId as any } : "skip"
  ) as any[] | undefined;

  const convexStats = useQuery(
    hasRealWorkspaceId ? api.workspaces.crud.getWorkspaceStats : "skip",
    hasRealWorkspaceId ? { workspaceId: activeWorkspaceId as any } : "skip"
  ) as any | undefined;

  const convexInvitations = useQuery(
    hasRealWorkspaceId ? api.workspaces.invitations.getInvitations : "skip",
    hasRealWorkspaceId ? { workspaceId: activeWorkspaceId as any, status: "pending" as const } : "skip"
  ) as any[] | undefined;

  // ─── Teams queries ─────────────────────────────────────────────────────────
  const teamsApi = (api as any).teams?.crud;
  const hasTeamsApi = !!teamsApi?.getTeams;

  const convexTeams = useQuery(
    hasTeamsApi && hasRealWorkspaceId ? teamsApi.getTeams : "skip",
    hasRealWorkspaceId ? { workspaceId: activeWorkspaceId as any } : "skip"
  ) as any[] | undefined;

  // ─── Team Members per team ──────────────────────────────────────────────────
  const hasTeamMembersApi = !!teamsApi?.getTeamMembers;

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const inviteMemberMutation = useMutation(api.workspaces.invitations.createInvitation);
  const removeMemberMutation = useMutation(api.workspaces.members.removeMember);
  const updateRoleMutation = useMutation(api.workspaces.members.updateMemberRole);
  const cancelInvitationMutation = useMutation(api.workspaces.invitations.cancelInvitation);

  // Team mutations
  const createTeamMutation = useMutation(hasTeamsApi ? teamsApi.createTeam : null);
  const updateTeamMutation = useMutation(hasTeamsApi ? teamsApi.updateTeam : null);
  const deleteTeamMutation = useMutation(hasTeamsApi ? teamsApi.deleteTeam : null);
  const addTeamMemberMutation = useMutation(hasTeamsApi ? teamsApi.addTeamMember : null);
  const removeTeamMemberMutation = useMutation(hasTeamsApi ? teamsApi.removeTeamMember : null);

  // ─── State ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>("members");

  // Invite dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "member">("member");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Remove/change role
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [memberToChangeRole, setMemberToChangeRole] = useState<any>(null);
  const [newRole, setNewRole] = useState<"manager" | "member">("member");

  // Team CRUD state
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0]);
  const [teamDescription, setTeamDescription] = useState("");
  const [teamIsCrossTeam, setTeamIsCrossTeam] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Edit team
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamColor, setEditTeamColor] = useState("");
  const [editTeamDescription, setEditTeamDescription] = useState("");
  const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);

  // Delete team
  const [teamToDelete, setTeamToDelete] = useState<any>(null);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  // Add member to team
  const [teamToAddMember, setTeamToAddMember] = useState<any>(null);
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [addMemberRole, setAddMemberRole] = useState<"lead" | "member">("member");
  const [isAddingTeamMember, setIsAddingTeamMember] = useState(false);

  // Remove member from team
  const [teamMemberToRemove, setTeamMemberToRemove] = useState<any>(null);
  const [teamMemberRemoveTeamId, setTeamMemberRemoveTeamId] = useState<string>("");

  // ─── Map Convex data to UI shape ───────────────────────────────────────────
  const members = useMemo(() => {
    if (convexMembers && convexMembers.length > 0) {
      return convexMembers.map((m: any) => ({
        _id: m._id,
        userId: m.userId,
        name: m.userName ?? m.userEmail ?? "Unknown",
        displayName: m.userName ?? m.userEmail ?? "Unknown",
        email: m.userEmail ?? "",
        image: m.userImage ?? "",
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        lastActiveAt: m.lastActiveAt ?? null,
        projectsAssigned: 0,
        hoursThisWeek: 0,
      }));
    }
    return [];
  }, [convexMembers]);

  const teams = useMemo(() => {
    if (convexTeams && convexTeams.length > 0) {
      return convexTeams;
    }
    return [];
  }, [convexTeams]);

  const stats = useMemo(() => {
    if (convexStats) {
      return {
        memberCount: convexStats.memberCount ?? 0,
        clientCount: convexStats.clientCount ?? 0,
        activeProjectCount: convexStats.activeProjectCount ?? 0,
        pendingInvoiceCount: 0,
        totalRevenue: 0,
        totalHoursThisWeek: 0,
        protectionScore: 0,
      };
    }
    return null;
  }, [convexStats]);

  const invitations = useMemo(() => {
    if (convexInvitations && convexInvitations.length > 0) {
      return convexInvitations.map((inv: any) => ({
        _id: inv._id,
        name: inv.email,
        displayName: inv.email,
        email: inv.email,
        role: inv.role,
        invitedAt: inv.createdAt,
        invitedBy: inv.inviterName,
      }));
    }
    return [];
  }, [convexInvitations]);

  const isLoading = hasRealWorkspaceId && (convexMembers === undefined);
  const isDemoMode = !hasRealWorkspaceId;

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!inviteEmail.trim() || !activeWorkspaceId) return;
    setIsInviting(true);
    try {
      if (hasRealWorkspaceId) {
        await inviteMemberMutation({
          workspaceId: activeWorkspaceId as any,
          email: inviteEmail.trim(),
          role: inviteRole,
        });
      }
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteMessage("");
      setShowInviteDialog(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await removeMemberMutation({ memberId: memberToRemove._id });
      toast.success(`${memberToRemove.name} removed from workspace`);
      setMemberToRemove(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to remove member");
    }
  };

  const handleChangeRole = async () => {
    if (!memberToChangeRole) return;
    try {
      await updateRoleMutation({ memberId: memberToChangeRole._id, role: newRole });
      toast.success(`Role updated to ${newRole}`);
      setMemberToChangeRole(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to update role");
    }
  };

  const handleCancelInvitation = async (invitation: any) => {
    try {
      await cancelInvitationMutation({ invitationId: invitation._id });
      toast.success(`Invitation to ${invitation.email || invitation.name} cancelled`);
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel invitation");
    }
  };

  // ─── Team CRUD Handlers ────────────────────────────────────────────────────
  const handleCreateTeam = async () => {
    if (!teamName.trim() || !activeWorkspaceId) return;
    setIsCreatingTeam(true);
    try {
      if (createTeamMutation && hasRealWorkspaceId) {
        await createTeamMutation({
          workspaceId: activeWorkspaceId as any,
          name: teamName.trim(),
          color: teamColor,
          description: teamDescription.trim() || undefined,
          isCrossTeam: teamIsCrossTeam || undefined,
        });
      }
      toast.success(`Team "${teamName}" created!`);
      setShowCreateTeamDialog(false);
      setTeamName("");
      setTeamColor(TEAM_COLORS[0]);
      setTeamDescription("");
      setTeamIsCrossTeam(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to create team");
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;
    setIsUpdatingTeam(true);
    try {
      if (updateTeamMutation) {
        await updateTeamMutation({
          teamId: editingTeam._id,
          name: editTeamName.trim() || undefined,
          color: editTeamColor || undefined,
          description: editTeamDescription.trim() || undefined,
        });
      }
      toast.success("Team updated!");
      setEditingTeam(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to update team");
    } finally {
      setIsUpdatingTeam(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;
    setIsDeletingTeam(true);
    try {
      if (deleteTeamMutation) {
        await deleteTeamMutation({ teamId: teamToDelete._id });
      }
      toast.success(`Team "${teamToDelete.name}" deleted`);
      setTeamToDelete(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete team");
    } finally {
      setIsDeletingTeam(false);
    }
  };

  const handleAddTeamMember = async () => {
    if (!teamToAddMember || !addMemberUserId) return;
    setIsAddingTeamMember(true);
    try {
      if (addTeamMemberMutation) {
        await addTeamMemberMutation({
          teamId: teamToAddMember._id,
          userId: addMemberUserId as any,
          role: addMemberRole,
        });
      }
      toast.success("Member added to team!");
      setTeamToAddMember(null);
      setAddMemberUserId("");
      setAddMemberRole("member");
    } catch (e: any) {
      toast.error(e.message || "Failed to add member to team");
    } finally {
      setIsAddingTeamMember(false);
    }
  };

  const handleRemoveTeamMember = async () => {
    if (!teamMemberToRemove || !teamMemberRemoveTeamId) return;
    try {
      if (removeTeamMemberMutation) {
        await removeTeamMemberMutation({
          teamId: teamMemberRemoveTeamId as any,
          userId: teamMemberToRemove.userId as any,
        });
      }
      toast.success("Member removed from team");
      setTeamMemberToRemove(null);
      setTeamMemberRemoveTeamId("");
    } catch (e: any) {
      toast.error(e.message || "Failed to remove member from team");
    }
  };

  // ─── Not in team mode: Show upgrade prompt ────────────────
  if (!isTeamMode) {
    return <SoloModePrompt />;
  }

  const activeMembers = members.filter((m: any) => m.status === "active");
  const ownerCount = activeMembers.filter((m: any) => m.role === "owner").length;
  const managerCount = activeMembers.filter((m: any) => m.role === "manager").length;
  const memberCount = activeMembers.filter((m: any) => m.role === "member").length;

  const roleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="w-3.5 h-3.5 text-amber-500" />;
      case "manager": return <Shield className="w-3.5 h-3.5 text-blue-500" />;
      case "lead": return <Shield className="w-3.5 h-3.5 text-emerald-500" />;
      case "member": return <Eye className="w-3.5 h-3.5 text-gray-500" />;
      default: return null;
    }
  };

  const roleBadge = (role: string) => {
    const variants: Record<string, any> = {
      owner: { className: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Owner" },
      manager: { className: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Manager" },
      lead: { className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Lead" },
      member: { className: "bg-gray-500/10 text-gray-600 border-gray-500/20", label: "Member" },
    };
    const v = variants[role] || variants.member;
    return (
      <Badge variant="outline" className={`gap-1 ${v.className}`}>
        {roleIcon(role)}
        {v.label}
      </Badge>
    );
  };

  const formatLastActive = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 5) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatJoined = (timestamp: number | null) => {
    if (!timestamp) return "";
    const diffMs = Date.now() - timestamp;
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays < 1) return "Joined today";
    if (diffDays < 30) return `Joined ${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `Joined ${diffMonths}mo ago`;
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-purple-500" />
              {activeWorkspace?.name || "Team Workspace"}
            </h1>
            <p className="text-muted-foreground">
              Manage your team members, teams, and invitations
            </p>
          </div>
          {canManageTeam && (
            <div className="flex gap-2">
              <Button className="gap-2" onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="w-4 h-4" />
                Invite Member
              </Button>
            </div>
          )}
        </div>

        {/* Demo Mode Banner */}
        {isDemoMode && <DemoModeBanner />}

        {/* Stats Cards */}
        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 rounded-lg"><Users className="w-5 h-5 text-purple-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Members</p>
                  <p className="text-2xl font-bold">{stats?.memberCount ?? activeMembers.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg"><Shield className="w-5 h-5 text-emerald-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="text-2xl font-bold">{teams.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-lg"><Building2 className="w-5 h-5 text-blue-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Clients</p>
                  <p className="text-2xl font-bold">{stats?.clientCount ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/10 rounded-lg"><CheckCircle className="w-5 h-5 text-green-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold">{stats?.activeProjectCount ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-lg"><Mail className="w-5 h-5 text-amber-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Invites</p>
                  <p className="text-2xl font-bold">{invitations.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/10 rounded-lg"><DollarSign className="w-5 h-5 text-violet-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold">${((stats?.totalRevenue ?? 0) / 1000).toFixed(1)}k</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Protection Score */}
        {(stats?.protectionScore ?? 0) > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-bold">Team Protection Score</h2>
              </div>
              <span className="text-2xl font-bold text-purple-600">{stats?.protectionScore ?? 0}%</span>
            </div>
            <Progress value={stats?.protectionScore ?? 0} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              Based on evidence collection compliance, dispute success rate, and team activity across all platforms.
            </p>
          </Card>
        )}

        {/* Role Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-sm">Owners</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">{ownerCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Full access + billing</p>
          </Card>
          <Card className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-sm">Managers</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{managerCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Manage team + projects</p>
          </Card>
          <Card className="p-4 bg-gray-50/50 dark:bg-gray-950/20 border-gray-200/50 dark:border-gray-800/30">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-sm">Members</span>
            </div>
            <p className="text-3xl font-bold text-gray-600">{memberCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Track time + submit work</p>
          </Card>
        </div>

        {/* Tabs: Members / Teams */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="members" className="gap-1.5">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-1.5">
              <Shield className="w-4 h-4" />
              Teams
            </TabsTrigger>
          </TabsList>

          {/* ─── Members Tab ──────────────────────────────────────────────────── */}
          <TabsContent value="members" className="space-y-6 mt-4">
            {isLoading ? (
              <MembersSkeleton />
            ) : (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    Active Members
                  </h2>
                  <Badge variant="outline" className="text-xs">{activeMembers.length} seats</Badge>
                </div>

                {activeMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Invite your colleagues to start collaborating
                    </p>
                    {canManageTeam && (
                      <Button onClick={() => setShowInviteDialog(true)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite First Member
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeMembers.map((member: any) => (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="w-11 h-11">
                              <AvatarFallback className="bg-primary/10 text-sm font-semibold">
                                {member.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                              </AvatarFallback>
                            </Avatar>
                            {(Date.now() - (member.lastActiveAt || 0)) < 30 * 60 * 1000 && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {member.displayName || member.name}
                              {roleBadge(member.role)}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-3">
                              <span>{member.email}</span>
                              {member.lastActiveAt && (
                                <>
                                  <span className="text-border">|</span>
                                  <span className="flex items-center gap-1">
                                    <Activity className="w-3 h-3" />
                                    {formatLastActive(member.lastActiveAt)}
                                  </span>
                                </>
                              )}
                              {member.joinedAt && (
                                <>
                                  <span className="text-border">|</span>
                                  <span>{formatJoined(member.joinedAt)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                            {member.projectsAssigned > 0 && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5" />
                                {member.projectsAssigned} projects
                              </span>
                            )}
                            {member.hoursThisWeek > 0 && (
                              <span className="flex items-center gap-1">
                                <Timer className="w-3.5 h-3.5" />
                                {member.hoursThisWeek}h/week
                              </span>
                            )}
                          </div>

                          {isOwner && member.role !== "owner" && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Change role"
                                onClick={() => {
                                  setMemberToChangeRole(member);
                                  setNewRole(member.role === "manager" ? "member" : "manager");
                                }}
                              >
                                <Shield className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                title="Remove member"
                                onClick={() => setMemberToRemove(member)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <Card className="p-6 border-amber-200/50 dark:border-amber-800/30">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Mail className="w-5 h-5 text-amber-500" />
                    Pending Invitations
                  </h2>
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                    {invitations.length} pending
                  </Badge>
                </div>
                <div className="space-y-3">
                  {invitations.map((inv: any) => (
                    <div
                      key={inv._id}
                      className="flex items-center justify-between p-4 border border-amber-200/50 dark:border-amber-800/30 rounded-lg bg-amber-50/30 dark:bg-amber-950/10"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-11 h-11 opacity-70">
                          <AvatarFallback className="bg-amber-100 dark:bg-amber-900/30 text-sm font-semibold text-amber-600">
                            {inv.name?.split("@")[0]?.charAt(0).toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {inv.email || inv.name}
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                            {roleBadge(inv.role)}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3">
                            <span>{inv.email}</span>
                            {inv.invitedAt && (
                              <>
                                <span className="text-border">|</span>
                                <span>Invited {formatLastActive(inv.invitedAt)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 hover:text-amber-700"
                          title="Resend invitation"
                          onClick={() => toast.success(`Invitation resent to ${inv.email}`)}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          title="Cancel invitation"
                          onClick={() => handleCancelInvitation(inv)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ─── Teams Tab ────────────────────────────────────────────────────── */}
          <TabsContent value="teams" className="space-y-6 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                Teams
              </h2>
              {canManageTeam && (
                <Button
                  className="gap-2"
                  onClick={() => setShowCreateTeamDialog(true)}
                >
                  <Plus className="w-4 h-4" />
                  Create Team
                </Button>
              )}
            </div>

            {teams.length === 0 ? (
              <Card className="p-8">
                <div className="text-center">
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create teams to organize your workspace members and control record access
                  </p>
                  {canManageTeam && (
                    <Button onClick={() => setShowCreateTeamDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Team
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {teams.map((team: any) => (
                  <TeamCard
                    key={team._id}
                    team={team}
                    members={members}
                    canManage={canManageTeam}
                    onEdit={(t: any) => {
                      setEditingTeam(t);
                      setEditTeamName(t.name);
                      setEditTeamColor(t.color);
                      setEditTeamDescription(t.description || "");
                    }}
                    onDelete={(t: any) => setTeamToDelete(t)}
                    onAddMember={(t: any) => setTeamToAddMember(t)}
                    onRemoveMember={(member: any) => {
                      setTeamMemberToRemove(member);
                      setTeamMemberRemoveTeamId(team._id);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Activity Feed */}
        <Card className="p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-green-500" />
            Recent Activity
          </h2>
          {activeMembers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="w-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Team activity will appear here as members join and collaborate</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeMembers.slice(0, 5).map((member: any, i: number) => {
                const actions = [
                  { action: "was active", target: "", icon: Activity },
                  { action: "updated their profile", target: "", icon: Settings },
                  { action: "joined the workspace", target: "", icon: Users },
                ];
                const act = actions[i % actions.length];
                return (
                  <div key={member._id} className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg mt-0.5">
                      <act.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{member.displayName || member.name}</span>{" "}
                        {act.action}{" "}
                        {act.target && <span className="font-medium">{act.target}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.lastActiveAt ? formatLastActive(member.lastActiveAt) : formatJoined(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ─── Invite Dialog ──────────────────────────────────────────────────── */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Invite Team Member
              </DialogTitle>
              <DialogDescription>
                Send an invitation to join your workspace.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="font-medium">Member</div>
                          <div className="text-xs text-muted-foreground">Track time, submit work, view assigned projects</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="font-medium">Manager</div>
                          <div className="text-xs text-muted-foreground">View all projects, manage assignments, approve time logs</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-msg">Personal Message (optional)</Label>
                <Textarea
                  id="invite-msg"
                  placeholder="Hey! Join our team workspace on Axia..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
                {isInviting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                ) : (
                  <><Mail className="w-4 h-4 mr-2" />Send Invitation</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Remove Member Confirmation ─────────────────────────────────────── */}
        <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {memberToRemove?.name} from this workspace? 
                They will lose access to all projects, clients, and data in this workspace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ─── Change Role Dialog ─────────────────────────────────────────────── */}
        <Dialog open={!!memberToChangeRole} onOpenChange={() => setMemberToChangeRole(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Change Role</DialogTitle>
              <DialogDescription>
                Change {memberToChangeRole?.name}'s role in this workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMemberToChangeRole(null)}>Cancel</Button>
              <Button onClick={handleChangeRole}>Update Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Create Team Dialog ─────────────────────────────────────────────── */}
        <Dialog open={showCreateTeamDialog} onOpenChange={setShowCreateTeamDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Team
              </DialogTitle>
              <DialogDescription>
                Create a team to organize members and control access to records.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name *</Label>
                <Input
                  id="team-name"
                  placeholder="e.g. Engineering, Design, Management"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Team Color</Label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        teamColor === color ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setTeamColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-desc">Description</Label>
                <Textarea
                  id="team-desc"
                  placeholder="What does this team do?"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <input
                  type="checkbox"
                  id="cross-team"
                  checked={teamIsCrossTeam}
                  onChange={(e) => setTeamIsCrossTeam(e.target.checked)}
                  className="rounded"
                />
                <div>
                  <Label htmlFor="cross-team" className="text-sm font-medium cursor-pointer">
                    Cross-team (Management)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Members can see all records across all teams in this workspace
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateTeamDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateTeam} disabled={isCreatingTeam || !teamName.trim()}>
                {isCreatingTeam ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  "Create Team"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Edit Team Dialog ───────────────────────────────────────────────── */}
        <Dialog open={!!editingTeam} onOpenChange={() => setEditingTeam(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Edit Team
              </DialogTitle>
              <DialogDescription>
                Update team details for "{editingTeam?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-team-name">Team Name</Label>
                <Input
                  id="edit-team-name"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Team Color</Label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        editTeamColor === color ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditTeamColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-team-desc">Description</Label>
                <Textarea
                  id="edit-team-desc"
                  value={editTeamDescription}
                  onChange={(e) => setEditTeamDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTeam(null)}>Cancel</Button>
              <Button onClick={handleUpdateTeam} disabled={isUpdatingTeam}>
                {isUpdatingTeam ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</>
                ) : (
                  "Update Team"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Delete Team Confirmation ───────────────────────────────────────── */}
        <AlertDialog open={!!teamToDelete} onOpenChange={() => setTeamToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Team</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the "{teamToDelete?.name}" team? 
                All team memberships will be removed. Records assigned to this team will become unassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTeam}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeletingTeam}
              >
                {isDeletingTeam ? "Deleting..." : "Delete Team"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ─── Add Member to Team Dialog ──────────────────────────────────────── */}
        <Dialog open={!!teamToAddMember} onOpenChange={() => setTeamToAddMember(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add Member to {teamToAddMember?.name}
              </DialogTitle>
              <DialogDescription>
                Select a workspace member to add to this team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Member</Label>
                <Select value={addMemberUserId} onValueChange={setAddMemberUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMembers.map((member: any) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-[9px]">
                              {member.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          {member.displayName || member.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team Role</Label>
                <Select value={addMemberRole} onValueChange={(v: any) => setAddMemberRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-500" />
                        <span>Member</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="lead">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span>Lead</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTeamToAddMember(null)}>Cancel</Button>
              <Button onClick={handleAddTeamMember} disabled={isAddingTeamMember || !addMemberUserId}>
                {isAddingTeamMember ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                ) : (
                  "Add to Team"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Remove Team Member Confirmation ────────────────────────────────── */}
        <AlertDialog open={!!teamMemberToRemove} onOpenChange={() => setTeamMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove from Team</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {teamMemberToRemove?.userName ?? teamMemberToRemove?.name ?? "this member"} from this team? 
                They will remain a workspace member but lose team-level access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveTeamMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ─── Team Card Component ──────────────────────────────────────
function TeamCard({
  team,
  members,
  canManage,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
}: {
  team: any;
  members: any[];
  canManage: boolean;
  onEdit: (team: any) => void;
  onDelete: (team: any) => void;
  onAddMember: (team: any) => void;
  onRemoveMember: (member: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Fetch team members
  const teamsApi = (api as any).teams?.crud;
  const hasTeamMembersApi = !!teamsApi?.getTeamMembers;
  const teamMembers = useQuery(
    hasTeamMembersApi ? teamsApi.getTeamMembers : "skip",
    { teamId: team._id }
  ) as any[] | undefined;

  const activeTeamMembers = teamMembers?.filter((m: any) => true) ?? [];
  const leadCount = activeTeamMembers.filter((m: any) => m.role === "lead").length;
  const teamMemberCount = activeTeamMembers.filter((m: any) => m.role === "member").length;

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: team.color || "#8B5CF6" }}
          >
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold flex items-center gap-2">
              {team.name}
              {team.isCrossTeam && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/10 text-purple-600 border-purple-500/20">
                  Cross-team
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {activeTeamMembers.length} member{activeTeamMembers.length !== 1 ? "s" : ""}
              {leadCount > 0 && ` · ${leadCount} lead${leadCount !== 1 ? "s" : ""}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                title="Edit team"
                onClick={() => onEdit(team)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                title="Delete team"
                onClick={() => onDelete(team)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
          <Button variant="ghost" size="sm" className="p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Description */}
      {team.description && (
        <div className="px-4 pb-2 text-sm text-muted-foreground">
          {team.description}
        </div>
      )}

      {/* Expanded: Members */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Team Members</span>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-7 text-xs"
                onClick={() => onAddMember(team)}
              >
                <UserPlus className="w-3 h-3" />
                Add
              </Button>
            )}
          </div>
          {activeTeamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No members in this team yet
            </p>
          ) : (
            <div className="space-y-2">
              {activeTeamMembers.map((member: any) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-primary/10">
                        {(member.userName ?? "U").split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        {member.userName ?? member.userEmail ?? "Unknown"}
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1 py-0 h-4 ${
                            member.role === "lead"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-gray-500/10 text-gray-600 border-gray-500/20"
                          }`}
                        >
                          {member.role}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{member.userEmail}</div>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveMember(member)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Solo Mode Prompt ─────────────────────────────────────────
function SoloModePrompt() {
  const { isOwner, upgradeToTeam } = useWorkspaceContext();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      upgradeToTeam();
      toast.success("Upgraded to team workspace!");
    } catch (e: any) {
      toast.error(e.message || "Failed to upgrade");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Teams Workspace</h1>
          <p className="text-muted-foreground">
            Collaborate with your team and manage projects together
          </p>
        </div>

        <Card className="p-8 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Upgrade to Team Workspace</h2>
            <p className="text-muted-foreground mb-6">
              You're currently in solo mode. Upgrade to a team workspace to invite members, 
              manage roles, and collaborate on projects together.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-left">
              <div className="p-3 bg-white/50 dark:bg-white/5 rounded-lg">
                <Users className="w-5 h-5 text-purple-500 mb-2" />
                <div className="text-sm font-medium">Multi-User</div>
                <div className="text-xs text-muted-foreground">Add team members with role-based access</div>
              </div>
              <div className="p-3 bg-white/50 dark:bg-white/5 rounded-lg">
                <Shield className="w-5 h-5 text-blue-500 mb-2" />
                <div className="text-sm font-medium">3 Roles</div>
                <div className="text-xs text-muted-foreground">Owner, Manager, Member permissions</div>
              </div>
              <div className="p-3 bg-white/50 dark:bg-white/5 rounded-lg">
                <Eye className="w-5 h-5 text-green-500 mb-2" />
                <div className="text-sm font-medium">Client Portal</div>
                <div className="text-xs text-muted-foreground">Share verified work with clients</div>
              </div>
            </div>

            {isOwner ? (
              <Button size="lg" className="gap-2" onClick={handleUpgrade} disabled={isUpgrading}>
                {isUpgrading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Upgrading...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />Upgrade to Team</>
                )}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ask the workspace owner to upgrade to a team workspace.
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              Your existing data stays intact. You can switch between solo and team modes anytime.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
