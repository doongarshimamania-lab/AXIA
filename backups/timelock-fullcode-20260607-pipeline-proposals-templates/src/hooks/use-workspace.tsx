import { useCallback, useMemo, createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────
export type WorkspaceType = "personal" | "team";
export type WorkspaceRole = "owner" | "manager" | "member";
export type AccountMode = "solo" | "team";

export interface WorkspaceInfo {
  _id: string;
  name: string;
  type: WorkspaceType;
  description?: string;
  membership?: { role: WorkspaceRole };
}

export interface WorkspaceContext {
  activeWorkspace: WorkspaceInfo | null;
  workspaces: WorkspaceInfo[];
  role: WorkspaceRole | null;
  accountMode: AccountMode;
  isTeamMode: boolean;
  isSoloMode: boolean;
  isOwner: boolean;
  isManager: boolean;
  isMember: boolean;
  canManageTeam: boolean;
  canManageBilling: boolean;
  activeWorkspaceId: string | null;
  isLoading: boolean;
  isAvailable: boolean;
  setAccountMode: (mode: AccountMode) => void;
  switchToWorkspace: (workspaceId: string) => void;
  createTeamWorkspace: (name: string, description?: string) => void;
  upgradeToTeam: () => void;
}

// ─── Local storage keys ──────────────────────────────────────
const STORAGE_KEY_MODE = "axia_account_mode";
const STORAGE_KEY_WORKSPACES = "axia_workspaces";
const STORAGE_KEY_ACTIVE_WS = "axia_active_workspace";

// Default solo workspace
const DEFAULT_SOLO_WORKSPACE: WorkspaceInfo = {
  _id: "ws_solo_default",
  name: "My Workspace",
  type: "personal",
  description: "Your personal freelancer workspace",
  membership: { role: "owner" },
};

// Default team workspace (pre-seeded so demo shows team features)
const DEFAULT_TEAM_WORKSPACE: WorkspaceInfo = {
  _id: "ws_team_axia",
  name: "Axia Agency",
  type: "team",
  description: "Full-service digital agency workspace — design, development, and strategy",
  membership: { role: "owner" },
};

const DEFAULT_WORKSPACES = [DEFAULT_TEAM_WORKSPACE, DEFAULT_SOLO_WORKSPACE];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return fallback;
}

function saveToStorage(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const WorkspaceCtx = createContext<WorkspaceContext>({
  activeWorkspace: DEFAULT_SOLO_WORKSPACE,
  workspaces: [DEFAULT_SOLO_WORKSPACE],
  role: "owner",
  accountMode: "solo",
  isTeamMode: false,
  isSoloMode: true,
  isOwner: true,
  isManager: true,
  isMember: true,
  canManageTeam: true,
  canManageBilling: true,
  activeWorkspaceId: "ws_solo_default",
  isLoading: false,
  isAvailable: true,
  setAccountMode: () => {},
  switchToWorkspace: () => {},
  createTeamWorkspace: () => {},
  upgradeToTeam: () => {},
});

export function useWorkspaceContext() {
  return useContext(WorkspaceCtx);
}

// ─── Provider Component ───────────────────────────────────────
// Uses localStorage for workspace state so it works without auth.
// Convex queries are NOT called here because the workspace tables
// haven't been deployed to Convex yet. When they are, we can add
// safe query hooks back.

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [accountMode, setAccountModeState] = useState<AccountMode>(
    loadFromStorage(STORAGE_KEY_MODE, "team")
  );
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>(
    loadFromStorage(STORAGE_KEY_WORKSPACES, DEFAULT_WORKSPACES)
  );
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(
    loadFromStorage(STORAGE_KEY_ACTIVE_WS, DEFAULT_TEAM_WORKSPACE._id)
  );

  const activeWorkspace = useMemo(() => {
    return workspaces.find(ws => ws._id === activeWorkspaceId) || workspaces[0] || DEFAULT_SOLO_WORKSPACE;
  }, [workspaces, activeWorkspaceId]);

  const role = activeWorkspace?.membership?.role as WorkspaceRole | null;

  const setAccountMode = useCallback((mode: AccountMode) => {
    setAccountModeState(mode);
    saveToStorage(STORAGE_KEY_MODE, mode);

    if (mode === "solo") {
      const soloWs = workspaces.find(ws => ws.type === "personal") || DEFAULT_SOLO_WORKSPACE;
      setActiveWorkspaceId(soloWs._id);
      saveToStorage(STORAGE_KEY_ACTIVE_WS, soloWs._id);
    } else if (mode === "team") {
      const teamWs = workspaces.find(ws => ws.type === "team");
      if (teamWs) {
        setActiveWorkspaceId(teamWs._id);
        saveToStorage(STORAGE_KEY_ACTIVE_WS, teamWs._id);
      }
    }
  }, [workspaces]);

  const switchToWorkspace = useCallback((workspaceId: string) => {
    const ws = workspaces.find(w => w._id === workspaceId);
    if (ws) {
      setActiveWorkspaceId(workspaceId);
      saveToStorage(STORAGE_KEY_ACTIVE_WS, workspaceId);
      const newMode = ws.type === "team" ? "team" : "solo";
      setAccountModeState(newMode);
      saveToStorage(STORAGE_KEY_MODE, newMode);
    }
  }, [workspaces]);

  const createTeamWorkspace = useCallback((name: string, description?: string) => {
    const newWs: WorkspaceInfo = {
      _id: `ws_team_${Date.now()}`,
      name,
      type: "team",
      description,
      membership: { role: "owner" },
    };
    const updated = [...workspaces, newWs];
    setWorkspaces(updated);
    saveToStorage(STORAGE_KEY_WORKSPACES, updated);
    setActiveWorkspaceId(newWs._id);
    saveToStorage(STORAGE_KEY_ACTIVE_WS, newWs._id);
    setAccountModeState("team");
    saveToStorage(STORAGE_KEY_MODE, "team");
  }, [workspaces]);

  const upgradeToTeam = useCallback(() => {
    const updated = workspaces.map(ws => {
      if (ws._id === activeWorkspaceId && ws.type === "personal") {
        return { ...ws, type: "team" as WorkspaceType, name: ws.name + " (Team)" };
      }
      return ws;
    });
    setWorkspaces(updated);
    saveToStorage(STORAGE_KEY_WORKSPACES, updated);
    setAccountModeState("team");
    saveToStorage(STORAGE_KEY_MODE, "team");
  }, [workspaces, activeWorkspaceId]);

  const contextValue = useMemo<WorkspaceContext>(() => ({
    activeWorkspace,
    workspaces,
    role,
    accountMode,
    isTeamMode: accountMode === "team",
    isSoloMode: accountMode === "solo",
    isOwner: role === "owner",
    isManager: role === "manager" || role === "owner",
    isMember: !!role,
    canManageTeam: role === "owner" || role === "manager",
    canManageBilling: role === "owner",
    activeWorkspaceId,
    isLoading: false,
    isAvailable: true,
    setAccountMode,
    switchToWorkspace,
    createTeamWorkspace,
    upgradeToTeam,
  }), [activeWorkspace, workspaces, role, accountMode, activeWorkspaceId, setAccountMode, switchToWorkspace, createTeamWorkspace, upgradeToTeam]);

  return (
    <WorkspaceCtx.Provider value={contextValue}>
      {children}
    </WorkspaceCtx.Provider>
  );
}

// ─── Rich Mock Data for Team Workspace ────────────────────────
// These hooks return realistic mock data so the Team Management
// page looks fully populated for demo and review purposes.

const MOCK_MEMBERS = [
  {
    _id: "mem_001",
    userId: "user_owner",
    name: "Alex Rivera",
    displayName: "Alex Rivera",
    email: "alex.rivera@axiaagency.com",
    image: "",
    role: "owner" as WorkspaceRole,
    status: "active",
    joinedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 5 * 60 * 1000,
    projectsAssigned: 8,
    hoursThisWeek: 34.5,
  },
  {
    _id: "mem_002",
    userId: "user_manager_1",
    name: "Priya Sharma",
    displayName: "Priya Sharma",
    email: "priya.sharma@axiaagency.com",
    image: "",
    role: "manager" as WorkspaceRole,
    status: "active",
    joinedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 15 * 60 * 1000,
    projectsAssigned: 5,
    hoursThisWeek: 28.0,
  },
  {
    _id: "mem_003",
    userId: "user_manager_2",
    name: "Jordan Kim",
    displayName: "Jordan Kim",
    email: "jordan.kim@axiaagency.com",
    image: "",
    role: "manager" as WorkspaceRole,
    status: "active",
    joinedAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 2 * 60 * 60 * 1000,
    projectsAssigned: 3,
    hoursThisWeek: 22.5,
  },
  {
    _id: "mem_004",
    userId: "user_member_1",
    name: "Sam Chen",
    displayName: "Sam Chen",
    email: "sam.chen@axiaagency.com",
    image: "",
    role: "member" as WorkspaceRole,
    status: "active",
    joinedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 1 * 60 * 60 * 1000,
    projectsAssigned: 4,
    hoursThisWeek: 40.0,
  },
  {
    _id: "mem_005",
    userId: "user_member_2",
    name: "Elena Volkov",
    displayName: "Elena Volkov",
    email: "elena.volkov@axiaagency.com",
    image: "",
    role: "member" as WorkspaceRole,
    status: "active",
    joinedAt: Date.now() - 21 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 30 * 60 * 1000,
    projectsAssigned: 2,
    hoursThisWeek: 35.0,
  },
  {
    _id: "mem_006",
    userId: "user_member_3",
    name: "Marcus Thompson",
    displayName: "Marcus Thompson",
    email: "marcus.t@axiaagency.com",
    image: "",
    role: "member" as WorkspaceRole,
    status: "active",
    joinedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 4 * 60 * 60 * 1000,
    projectsAssigned: 3,
    hoursThisWeek: 18.0,
  },
  {
    _id: "mem_007",
    userId: "user_member_4",
    name: "Aisha Patel",
    displayName: "Aisha Patel",
    email: "aisha.patel@axiaagency.com",
    image: "",
    role: "member" as WorkspaceRole,
    status: "invited",
    joinedAt: null,
    lastActiveAt: null,
    invitedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    projectsAssigned: 0,
    hoursThisWeek: 0,
  },
  {
    _id: "mem_008",
    userId: "user_member_5",
    name: "Lucas Weber",
    displayName: "Lucas Weber",
    email: "lucas.w@freelance.dev",
    image: "",
    role: "member" as WorkspaceRole,
    status: "invited",
    joinedAt: null,
    lastActiveAt: null,
    invitedAt: Date.now() - 6 * 60 * 60 * 1000,
    projectsAssigned: 0,
    hoursThisWeek: 0,
  },
];

const MOCK_STATS = {
  memberCount: 8,
  clientCount: 12,
  activeProjectCount: 6,
  pendingInvoiceCount: 4,
  totalRevenue: 47850,
  totalHoursThisWeek: 178,
  protectionScore: 94,
};

export function useWorkspaceMembers(workspaceId: string | null) {
  // @ts-ignore — workspaces API may not be deployed yet; safe-convex-react returns undefined
  const workspacesApi = (api as any).workspaces;
  const hasMembersApi = !!(workspacesApi?.members?.getMembers);

  const convexMembers = useQuery(
    hasMembersApi && workspaceId ? workspacesApi.members.getMembers : "skip",
    workspaceId ? { workspaceId: workspaceId as string } : "skip"
  ) as any[] | undefined;

  // If Convex returns data, map it. Otherwise fall back to mock.
  if (convexMembers && convexMembers.length > 0) {
    return convexMembers.map((m: any) => ({
      _id: m._id,
      userId: m.userId,
      name: m.user?.name ?? m.user?.email ?? "Unknown",
      displayName: m.user?.name ?? m.user?.email ?? "Unknown",
      email: m.user?.email ?? "",
      image: m.user?.image ?? "",
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      lastActiveAt: m.lastActiveAt ?? null,
      projectsAssigned: 0,
      hoursThisWeek: 0,
    }));
  }

  // Fallback to mock data
  return MOCK_MEMBERS;
}

export function useWorkspaceStats(workspaceId: string | null) {
  // @ts-ignore — workspaces API may not be deployed yet
  const workspacesApi = (api as any).workspaces;
  const hasStatsApi = !!(workspacesApi?.crud?.getWorkspaceStats);

  const convexStats = useQuery(
    hasStatsApi && workspaceId ? workspacesApi.crud.getWorkspaceStats : "skip",
    workspaceId ? { workspaceId: workspaceId as string } : "skip"
  ) as any | undefined;

  if (convexStats) {
    return {
      memberCount: convexStats.memberCount ?? 0,
      clientCount: convexStats.clientCount ?? 0,
      activeProjectCount: convexStats.activeProjectCount ?? 0,
      pendingInvoiceCount: convexStats.pendingInvoiceCount ?? 0,
      totalRevenue: convexStats.totalRevenue ?? 0,
      totalHoursThisWeek: convexStats.totalHoursThisWeek ?? 0,
      protectionScore: convexStats.protectionScore ?? 0,
    };
  }

  return MOCK_STATS;
}

export function useInviteMember() {
  // @ts-ignore — workspaces API may not be deployed yet
  const workspacesApi = (api as any).workspaces;
  const hasInviteApi = !!(workspacesApi?.invitations?.createInvitation);
  const inviteMutation = useMutation(
    hasInviteApi ? workspacesApi.invitations.createInvitation : null
  );
  return async (args: { workspaceId: string; email: string; role: WorkspaceRole }) => {
    if (!hasInviteApi || !inviteMutation) {
      // Demo mode: just pretend it worked
      return { success: true, invitationId: `inv_${Date.now()}` };
    }
    try {
      await inviteMutation({
        workspaceId: args.workspaceId as string,
        email: args.email,
        role: args.role as "manager" | "member",
      });
      return { success: true, invitationId: `inv_${Date.now()}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useRemoveMember() {
  // @ts-ignore — workspaces API may not be deployed yet
  const workspacesApi = (api as any).workspaces;
  const hasRemoveApi = !!(workspacesApi?.members?.removeMember);
  const removeMutation = useMutation(
    hasRemoveApi ? workspacesApi.members.removeMember : null
  );
  return async (args: { workspaceId: string; memberId: string }) => {
    if (!hasRemoveApi || !removeMutation) {
      return { success: true };
    }
    try {
      await removeMutation({
        memberId: args.memberId as string,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useUpdateMemberRole() {
  // @ts-ignore — workspaces API may not be deployed yet
  const workspacesApi = (api as any).workspaces;
  const hasUpdateRoleApi = !!(workspacesApi?.members?.updateMemberRole);
  const updateRoleMutation = useMutation(
    hasUpdateRoleApi ? workspacesApi.members.updateMemberRole : null
  );
  return async (args: { workspaceId: string; memberId: string; role: WorkspaceRole }) => {
    if (!hasUpdateRoleApi || !updateRoleMutation) {
      return { success: true };
    }
    try {
      await updateRoleMutation({
        memberId: args.memberId as string,
        role: args.role as "owner" | "manager" | "member",
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useCancelInvitation() {
  // @ts-ignore — workspaces API may not be deployed yet
  const workspacesApi = (api as any).workspaces;
  const hasCancelApi = !!(workspacesApi?.invitations?.cancelInvitation);
  const cancelMutation = useMutation(
    hasCancelApi ? workspacesApi.invitations.cancelInvitation : null
  );
  return async (args: { invitationId: string }) => {
    if (!hasCancelApi || !cancelMutation) {
      return { success: true };
    }
    try {
      await cancelMutation({
        invitationId: args.invitationId as string,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useConvertToTeamWorkspace() {
  return async (_args: any) => {
    return { success: true };
  };
}

export function useCreatePersonalWorkspace() {
  return async (_args: any) => {
    return { success: true };
  };
}

export function useCreateTeamWorkspace() {
  return async (_args: any) => {
    return { success: true };
  };
}

export function useSwitchWorkspace() {
  return async (_args: any) => {
    return { success: true };
  };
}

export function useUpdateWorkspace() {
  return async (_args: any) => {
    return { success: true };
  };
}

export function useAcceptInvitation() {
  return async (_args: any) => {
    return { success: true };
  };
}

export function useDeclineInvitation() {
  return async (_args: any) => {
    return { success: true };
  };
}

export function useTransferOwnership() {
  return async (_args: any) => {
    return { success: true };
  };
}

export function useDeleteWorkspace() {
  return async (_args: any) => {
    return { success: true };
  };
}

export function useActiveWorkspace() {
  return null;
}

export function useUserWorkspaces() {
  return null;
}

export function useMyInvitations() {
  return null;
}

export function useInvitationByToken(_token: string | null) {
  return null;
}
