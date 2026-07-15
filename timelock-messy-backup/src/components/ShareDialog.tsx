"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Share2,
  Users,
  User,
  X,
  Shield,
  Eye,
  MessageSquare,
  Edit,
  Crown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceContext } from "@/hooks/use-workspace";

type AccessLevel = "read" | "comment" | "collaborate" | "full";

interface SharingEntry {
  teamId?: string;
  userId?: string;
  access: string;
  grantedBy: string;
  grantedAt: number;
  note?: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  recordType: string;
  currentSharing?: Array<{
    teamId?: string;
    userId?: string;
    access: string;
    grantedBy: string;
    grantedAt: number;
  }>;
  onShare: (args: {
    teamId?: string;
    userId?: string;
    access: "read" | "comment" | "collaborate" | "full";
    note?: string;
  }) => Promise<void>;
  onUnshare: (args: { teamId?: string; userId?: string }) => Promise<void>;
}

const ACCESS_CONFIG: Record<
  AccessLevel,
  { label: string; icon: React.ElementType; description: string; badgeClass: string }
> = {
  read: {
    label: "Read",
    icon: Eye,
    description: "Can view only",
    badgeClass:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  comment: {
    label: "Comment",
    icon: MessageSquare,
    description: "Can view and add comments",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  collaborate: {
    label: "Collaborate",
    icon: Edit,
    description: "Can edit and add comments",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  full: {
    label: "Full Access",
    icon: Crown,
    description: "Can edit, share, and delete",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

export function ShareDialog({
  open,
  onOpenChange,
  recordId,
  recordType,
  currentSharing,
  onShare,
  onUnshare,
}: ShareDialogProps) {
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();

  // ── Fetch teams for team sharing ──
  const hasTeamsApi = !!(api as any).teams?.crud?.getTeams;
  const teams = useQuery(
    hasTeamsApi && isConvexConnected && activeWorkspaceId
      ? (api as any).teams.crud.getTeams
      : "skip",
    activeWorkspaceId ? { workspaceId: activeWorkspaceId as any } : "skip"
  ) as any[] | undefined;

  // ── Local state ──
  const [shareTarget, setShareTarget] = useState<"team" | "person">("team");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("read");
  const [note, setNote] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  // ── Enriched current sharing entries ──
  const sharingEntries = useMemo(() => {
    if (!currentSharing || currentSharing.length === 0) return [];

    return currentSharing.map((entry, idx) => {
      const enriched: SharingEntry & { _key: string; displayName: string } = {
        ...entry,
        _key: entry.teamId
          ? `team-${entry.teamId}`
          : entry.userId
            ? `user-${entry.userId}`
            : `entry-${idx}`,
        displayName: "Unknown",
      };

      // Resolve team name from fetched teams
      if (entry.teamId && teams && teams.length > 0) {
        const team = teams.find((t: any) => t._id === entry.teamId);
        if (team) {
          enriched.displayName = team.name || "Unnamed Team";
        } else {
          enriched.displayName = `Team ${entry.teamId.slice(-6)}`;
        }
      }

      // For user entries, show userId short form (caller can enrich further)
      if (entry.userId && !entry.teamId) {
        enriched.displayName = `User ${entry.userId.slice(-6)}`;
      }

      return enriched;
    });
  }, [currentSharing, teams]);

  // ── Handlers ──
  const handleShare = async () => {
    if (shareTarget === "team" && !selectedTeamId) {
      toast.error("Please select a team to share with");
      return;
    }
    if (shareTarget === "person" && !personEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    if (shareTarget === "person" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSharing(true);
    try {
      await onShare({
        ...(shareTarget === "team" ? { teamId: selectedTeamId } : {}),
        ...(shareTarget === "person" ? { userId: personEmail.trim() } : {}),
        access: accessLevel,
        note: note.trim() || undefined,
      });

      toast.success(
        `Shared with ${shareTarget === "team" ? "team" : personEmail.trim()} at ${ACCESS_CONFIG[accessLevel].label} access`
      );

      // Reset form
      setSelectedTeamId("");
      setPersonEmail("");
      setAccessLevel("read");
      setNote("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to share record");
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshare = async (entry: (typeof sharingEntries)[number]) => {
    const key = entry._key;
    setRemovingKey(key);
    try {
      await onUnshare({
        teamId: entry.teamId,
        userId: entry.userId,
      });
      toast.success("Access removed successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove access");
    } finally {
      setRemovingKey(null);
    }
  };

  // ── Record type label ──
  const recordTypeLabel = recordType
    ? recordType.charAt(0).toUpperCase() + recordType.slice(1).replace(/([A-Z])/g, " $1")
    : "Record";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            Share {recordTypeLabel}
          </DialogTitle>
          <DialogDescription>
            Manage who can access this {recordTypeLabel.toLowerCase()} and their permission level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ── Current sharing entries ── */}
          {sharingEntries.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Current Access
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sharingEntries.map((entry) => {
                  const accessKey = (entry.access || "read") as AccessLevel;
                  const config = ACCESS_CONFIG[accessKey] || ACCESS_CONFIG.read;
                  const AccessIcon = config.icon;

                  return (
                    <div
                      key={entry._key}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30 dark:bg-muted/20"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 shrink-0">
                          {entry.teamId ? (
                            <Users className="w-4 h-4 text-primary" />
                          ) : (
                            <User className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {entry.displayName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-4 border-0 ${config.badgeClass}`}
                            >
                              <AccessIcon className="w-2.5 h-2.5 mr-0.5" />
                              {config.label}
                            </Badge>
                            {entry.teamId && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4"
                              >
                                Team
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleUnshare(entry)}
                        disabled={removingKey === entry._key}
                        aria-label={`Remove access for ${entry.displayName}`}
                      >
                        {removingKey === entry._key ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Add new sharing ── */}
          <div className="space-y-3 border-t border-border pt-4">
            <Label className="text-sm font-medium">Add Access</Label>

            {/* Share target toggle */}
            <div className="flex gap-2">
              <Button
                variant={shareTarget === "team" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setShareTarget("team")}
              >
                <Users className="w-3.5 h-3.5" />
                Share with Team
              </Button>
              <Button
                variant={shareTarget === "person" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setShareTarget("person")}
              >
                <User className="w-3.5 h-3.5" />
                Share with Person
              </Button>
            </div>

            {/* Team selector OR Email input */}
            {shareTarget === "team" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Select Team</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams && teams.length > 0 ? (
                      teams.map((team: any) => (
                        <SelectItem key={team._id} value={team._id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{
                                backgroundColor: team.color || "#8B5CF6",
                              }}
                            />
                            <span>{team.name}</span>
                            {team.memberCount && (
                              <span className="text-xs text-muted-foreground">
                                ({team.memberCount} members)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_none" disabled>
                        No teams found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Email Address</Label>
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={personEmail}
                  onChange={(e) => setPersonEmail(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            {/* Access level selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Access Level</Label>
              <Select
                value={accessLevel}
                onValueChange={(v) => setAccessLevel(v as AccessLevel)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(ACCESS_CONFIG) as [
                      AccessLevel,
                      (typeof ACCESS_CONFIG)[AccessLevel],
                    ][]
                  ).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-3.5 h-3.5 shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-medium text-xs leading-tight">
                            {config.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-tight">
                            {config.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional note */}
            <div className="space-y-1.5">
              <Label className="text-xs">Note (optional)</Label>
              <Input
                placeholder="Why are you sharing this?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={
              isSharing ||
              (shareTarget === "team" && !selectedTeamId) ||
              (shareTarget === "person" && !personEmail.trim())
            }
            className="gap-2"
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
