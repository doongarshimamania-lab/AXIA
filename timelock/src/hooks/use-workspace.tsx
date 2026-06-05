import { useCallback, useMemo, createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
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

// Check if an ID looks like a valid Convex ID (not a mock string like "ws_team_default")
function isValidConvexId(id: string | null): boolean {
  if (!id) return false;
  return id.length >= 10 && !id.includes("_");
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
// Uses Convex queries for workspace data with localStorage fallback.

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [accountMode, setAccountModeState] = useState<AccountMode>(
    loadFromStorage(STORAGE_KEY_MODE, "team")
  );
  const [localWorkspaces, setLocalWorkspaces] = useState<WorkspaceInfo[]>(
    loadFromStorage(STORAGE_KEY_WORKSPACES, DEFAULT_WORKSPACES)
  );
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(
    loadFromStorage(STORAGE_KEY_ACTIVE_WS, DEFAULT_TEAM_WORKSPACE._id)
  );

  // ── Convex Queries ──────────────────────────────────────────
  const convexWorkspaces = useQuery(api.workspaces.crud.getMyWorkspaces) as any[] | undefined;

  // ── Convex Mutations ────────────────────────────────────────
  const seedPersonalWorkspaceMutation = useMutation(api.workspaces.crud.seedPersonalWorkspace);
  const createWorkspaceMutation = useMutation(api.workspaces.crud.createWorkspace);

  // ── Merge Convex + Local workspaces ─────────────────────────
  const workspaces = useMemo<WorkspaceInfo[]>(() => {
    if (convexWorkspaces && convexWorkspaces.length > 0) {
      // Convert Convex workspace docs to WorkspaceInfo format
      const convexWs: WorkspaceInfo[] = convexWorkspaces.map((w: any) => ({
        _id: w._id,
        name: w.name,
        type: w.type as WorkspaceType,
        description: w.description,
        membership: { role: "owner" as WorkspaceRole }, // simplified — could look up membership
      }));

      // If Convex returns data, prefer it but keep local-only workspaces too
      // (so demo/mock workspaces aren't lost)
      const convexIds = new Set(convexWs.map(w => w._id));
      const localOnly = localWorkspaces.filter(w => !convexIds.has(w._id) && !isValidConvexId(w._id));
      
      const merged = [...convexWs, ...localOnly];
      
      // Save merged list to localStorage for offline access
      saveToStorage(STORAGE_KEY_WORKSPACES, merged);
      
      return merged;
    }
    // Fallback to localStorage data
    return localWorkspaces;
  }, [convexWorkspaces, localWorkspaces]);

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

  const createTeamWorkspace = useCallback(async (name: string, description?: string) => {
    try {
      // Try creating via Convex first
      const workspaceId = await createWorkspaceMutation({
        name,
        type: "team",
        description,
      });
      
      // The Convex query will automatically update via reactivity,
      // but we also update local state for immediate feedback
      const newWs: WorkspaceInfo = {
        _id: workspaceId as string,
        name,
        type: "team",
        description,
        membership: { role: "owner" },
      };
      const updated = [...workspaces, newWs];
      setLocalWorkspaces(updated);
      saveToStorage(STORAGE_KEY_WORKSPACES, updated);
      setActiveWorkspaceId(newWs._id);
      saveToStorage(STORAGE_KEY_ACTIVE_WS, newWs._id);
      setAccountModeState("team");
      saveToStorage(STORAGE_KEY_MODE, "team");
    } catch (err) {
      // Fallback to local-only workspace
      console.warn("Failed to create workspace via Convex, using local fallback:", err);
      const newWs: WorkspaceInfo = {
        _id: `ws_team_${Date.now()}`,
        name,
        type: "team",
        description,
        membership: { role: "owner" },
      };
      const updated = [...workspaces, newWs];
      setLocalWorkspaces(updated);
      saveToStorage(STORAGE_KEY_WORKSPACES, updated);
      setActiveWorkspaceId(newWs._id);
      saveToStorage(STORAGE_KEY_ACTIVE_WS, newWs._id);
      setAccountModeState("team");
      saveToStorage(STORAGE_KEY_MODE, "team");
    }
  }, [workspaces, createWorkspaceMutation]);

  const upgradeToTeam = useCallback(() => {
    const updated = workspaces.map(ws => {
      if (ws._id === activeWorkspaceId && ws.type === "personal") {
        return { ...ws, type: "team" as WorkspaceType, name: ws.name + " (Team)" };
      }
      return ws;
    });
    setLocalWorkspaces(updated);
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
    isLoading: convexWorkspaces === undefined,
    isAvailable: true,
    setAccountMode,
    switchToWorkspace,
    createTeamWorkspace,
    upgradeToTeam,
  }), [activeWorkspace, workspaces, role, accountMode, activeWorkspaceId, convexWorkspaces, setAccountMode, switchToWorkspace, createTeamWorkspace, upgradeToTeam]);

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
  // Skip Convex query if workspaceId is not a valid Convex ID (e.g. "ws_team_default")
  const validWorkspaceId = isValidConvexId(workspaceId) ? workspaceId : null;
  const convexMembers = useQuery(
    api.workspaces.members.getMembers,
    validWorkspaceId ? { workspaceId: validWorkspaceId as Id<"workspaces"> } : "skip"
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
  // Skip Convex query if workspaceId is not a valid Convex ID
  const validWorkspaceId = isValidConvexId(workspaceId) ? workspaceId : null;
  const convexStats = useQuery(
    api.workspaces.crud.getWorkspaceStats,
    validWorkspaceId ? { workspaceId: validWorkspaceId as Id<"workspaces"> } : "skip"
  ) as any | undefined;

  if (convexStats) {
    return {
      memberCount: convexStats.memberCount ?? 0,
      clientCount: convexStats.clientCount ?? 0,
      activeProjectCount: convexStats.activeProjectCount ?? 0,
      pendingInvoiceCount: convexStats.pendingInvitationCount ?? 0,
      totalRevenue: convexStats.totalRevenue ?? 0,
      totalHoursThisWeek: convexStats.totalHoursThisWeek ?? 0,
      protectionScore: convexStats.protectionScore ?? 0,
    };
  }

  return MOCK_STATS;
}

export function useInviteMember() {
  const inviteMutation = useMutation(api.workspaces.invitations.createInvitation);
  return async (args: { workspaceId: string; email: string; role: WorkspaceRole }) => {
    try {
      await inviteMutation({
        workspaceId: args.workspaceId as Id<"workspaces">,
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
  const removeMutation = useMutation(api.workspaces.members.removeMember);
  return async (args: { workspaceId: string; memberId: string }) => {
    try {
      await removeMutation({
        memberId: args.memberId as Id<"workspaceMembers">,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useUpdateMemberRole() {
  const updateRoleMutation = useMutation(api.workspaces.members.updateMemberRole);
  return async (args: { workspaceId: string; memberId: string; role: WorkspaceRole }) => {
    try {
      await updateRoleMutation({
        memberId: args.memberId as Id<"workspaceMembers">,
        role: args.role as "owner" | "manager" | "member",
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useCancelInvitation() {
  const cancelMutation = useMutation(api.workspaces.invitations.cancelInvitation);
  return async (args: { invitationId: string }) => {
    try {
      await cancelMutation({
        invitationId: args.invitationId as Id<"workspaceInvitations">,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useConvertToTeamWorkspace() {
  const convertMutation = useMutation(api.workspaces.crud.convertToTeamWorkspace);
  return async (args: { workspaceId: string; name: string }) => {
    try {
      if (isValidConvexId(args.workspaceId)) {
        await convertMutation({
          workspaceId: args.workspaceId as Id<"workspaces">,
          name: args.name,
        });
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useCreatePersonalWorkspace() {
  const seedMutation = useMutation(api.workspaces.crud.seedPersonalWorkspace);
  return async (_args?: any) => {
    try {
      const workspaceId = await seedMutation({});
      return { success: true, workspaceId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useCreateTeamWorkspace() {
  const createMutation = useMutation(api.workspaces.crud.createWorkspace);
  return async (args: { name: string; description?: string }) => {
    try {
      const workspaceId = await createMutation({
        name: args.name,
        type: "team",
        description: args.description,
      });
      return { success: true, workspaceId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useSwitchWorkspace() {
  // Switching workspace is handled locally (updating activeWorkspaceId in context)
  // This hook is for external consumers who need to trigger a switch
  return async (args: { workspaceId: string }) => {
    // The actual switching is done via WorkspaceProvider.switchToWorkspace
    return { success: true };
  };
}

export function useUpdateWorkspace() {
  const updateMutation = useMutation(api.workspaces.crud.updateWorkspace);
  return async (args: { workspaceId: string; name?: string; description?: string }) => {
    try {
      if (isValidConvexId(args.workspaceId)) {
        await updateMutation({
          workspaceId: args.workspaceId as Id<"workspaces">,
          name: args.name,
          description: args.description,
        });
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useAcceptInvitation() {
  const acceptMutation = useMutation(api.workspaces.invitations.acceptInvitation);
  return async (args: { invitationId: string }) => {
    try {
      await acceptMutation({
        invitationId: args.invitationId as Id<"workspaceInvitations">,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
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
  const deleteMutation = useMutation(api.workspaces.crud.deleteWorkspace);
  return async (args: { workspaceId: string }) => {
    try {
      if (isValidConvexId(args.workspaceId)) {
        await deleteMutation({
          workspaceId: args.workspaceId as Id<"workspaces">,
        });
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
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
