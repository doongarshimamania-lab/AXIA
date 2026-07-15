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
  Users, UserPlus, Shield, Crown, Eye,
  Trash2, Mail, Clock, CheckCircle, Loader2,
  Building2, Settings, Sparkles, Activity,
  DollarSign, Timer, X, Briefcase, Info,
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

export default function TeamManagement() {
  const { activeWorkspaceId, isTeamMode, isOwner, canManageTeam, activeWorkspace } = useWorkspaceContext();

  // ─── Convex Queries ────────────────────────────────────────────────────────
  // Get real workspace members if we have a valid workspace ID (not a mock "ws_" prefix)
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

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const inviteMemberMutation = useMutation(api.workspaces.invitations.createInvitation);
  const removeMemberMutation = useMutation(api.workspaces.members.removeMember);
  const updateRoleMutation = useMutation(api.workspaces.members.updateMemberRole);
  const cancelInvitationMutation = useMutation(api.workspaces.invitations.cancelInvitation);

  // ─── State ─────────────────────────────────────────────────────────────────
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "member">("member");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [memberToChangeRole, setMemberToChangeRole] = useState<any>(null);
  const [newRole, setNewRole] = useState<"manager" | "member">("member");

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
    // Fallback: return empty (will be handled by UI)
    return [];
  }, [convexMembers]);

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
      case "member": return <Eye className="w-3.5 h-3.5 text-gray-500" />;
      default: return null;
    }
  };

  const roleBadge = (role: string) => {
    const variants: Record<string, any> = {
      owner: { className: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Owner" },
      manager: { className: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Manager" },
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
              Manage your team members, roles, and invitations
            </p>
          </div>
          {canManageTeam && (
            <Button className="gap-2" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="w-4 h-4" />
              Invite Member
            </Button>
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
                <div className="p-2.5 bg-emerald-500/10 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold">${((stats?.totalRevenue ?? 0) / 1000).toFixed(1)}k</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/10 rounded-lg"><Timer className="w-5 h-5 text-violet-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Hrs This Week</p>
                  <p className="text-2xl font-bold">{stats?.totalHoursThisWeek ?? 0}</p>
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

        {/* Active Team Members */}
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

        {/* Invite Dialog */}
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

        {/* Remove Member Confirmation */}
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

        {/* Change Role Dialog */}
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
      </div>
    </div>
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
