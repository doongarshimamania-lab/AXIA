"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Share2,
  Eye,
  MessageSquare,
  Edit,
  Crown,
  Users,
  User,
  Shield,
  FolderKanban,
  Receipt,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { TransferOwnershipDialog } from "./TransferOwnershipDialog";

type AccessLevel = "read" | "comment" | "collaborate" | "full";

const ACCESS_CONFIG: Record<
  AccessLevel,
  { label: string; icon: React.ElementType; description: string; color: string }
> = {
  read: {
    label: "Read",
    icon: Eye,
    description: "Can view only",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  comment: {
    label: "Comment",
    icon: MessageSquare,
    description: "Can view and add comments",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  collaborate: {
    label: "Collaborate",
    icon: Edit,
    description: "Can edit and add comments",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  full: {
    label: "Full Access",
    icon: Crown,
    description: "Can edit, share, and delete",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  client: { label: "Client", icon: Users, color: "text-blue-500" },
  project: { label: "Project", icon: FolderKanban, color: "text-purple-500" },
  deal: { label: "Deal", icon: BarChart3, color: "text-amber-500" },
  proposal: { label: "Proposal", icon: FileText, color: "text-emerald-500" },
};

export function ShareRecordsPanel() {
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTargetRecord, setShareTargetRecord] = useState<any>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferRecord, setTransferRecord] = useState<any>(null);

  // ── Fetch share records ──
  const shareRecords = useQuery(
    activeWorkspaceId && isConvexConnected && (api as any).permissions?.shareRecords?.getWorkspaceShareRecords
      ? (api as any).permissions.shareRecords.getWorkspaceShareRecords
      : "skip",
    activeWorkspaceId ? { workspaceId: activeWorkspaceId as any } : "skip"
  ) as any[] | undefined;

  // ── Fetch share stats ──
  const shareStats = useQuery(
    activeWorkspaceId && isConvexConnected && (api as any).permissions?.shareRecords?.getShareStats
      ? (api as any).permissions.shareRecords.getShareStats
      : "skip",
    activeWorkspaceId ? { workspaceId: activeWorkspaceId as any } : "skip"
  ) as any | undefined;

  // ── Mutations ──
  const shareRecord = useMutation(
    (api as any).permissions?.shareRecord?.shareRecord ?? "skip"
  );
  const unshareRecord = useMutation(
    (api as any).permissions?.shareRecord?.unshareRecord ?? "skip"
  );

  // ── Filter records ──
  const filteredRecords = (shareRecords ?? []).filter((record: any) => {
    if (filterType !== "all" && record.recordType !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        record.recordName?.toLowerCase().includes(q) ||
        record.ownerName?.toLowerCase().includes(q) ||
        record.sharing?.some((s: any) =>
          (s.userName || "").toLowerCase().includes(q) ||
          (s.teamName || "").toLowerCase().includes(q)
        )
      );
    }
    return true;
  });

  // ── Handlers ──
  const handleShare = async (args: { teamId?: string; userId?: string; access: AccessLevel; note?: string }) => {
    if (!shareTargetRecord) return;
    try {
      await shareRecord({
        tableName: shareTargetRecord.recordType,
        recordId: shareTargetRecord.recordId,
        ...args,
      });
      toast.success("Access granted successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to share");
    }
  };

  const handleUnshare = async (args: { teamId?: string; userId?: string }) => {
    if (!shareTargetRecord) return;
    try {
      await unshareRecord({
        tableName: shareTargetRecord.recordType,
        recordId: shareTargetRecord.recordId,
        ...args,
      });
      toast.success("Access removed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove access");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Share Stats ── */}
      {shareStats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Share2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Shared Records</div>
                <div className="text-lg font-bold">{shareStats.totalSharedRecords}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Access Entries</div>
                <div className="text-lg font-bold">{shareStats.totalSharingEntries}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Read Access</div>
                <div className="text-lg font-bold">{shareStats.byAccessLevel?.read || 0}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Edit className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Collaborate+</div>
                <div className="text-lg font-bold">
                  {(shareStats.byAccessLevel?.collaborate || 0) + (shareStats.byAccessLevel?.full || 0)}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Crown className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Full Access</div>
                <div className="text-lg font-bold">{shareStats.byAccessLevel?.full || 0}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records, owners, or shared members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="client">Clients</SelectItem>
            <SelectItem value="project">Projects</SelectItem>
            <SelectItem value="deal">Deals</SelectItem>
            <SelectItem value="proposal">Proposals</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Share Records List ── */}
      {!shareRecords ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Share2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Shared Records</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            {searchQuery || filterType !== "all"
              ? "No records match your search criteria"
              : "When you share clients, projects, deals, or proposals with team members, they will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record: any) => {
            const typeConfig = TYPE_CONFIG[record.recordType] || TYPE_CONFIG.client;
            const TypeIcon = typeConfig.icon;
            const isExpanded = expandedRecord === record.recordId;

            return (
              <Card key={record.recordId} className="border-border/50 hover:border-border transition-colors">
                <CardContent className="p-0">
                  {/* ── Record Header ── */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedRecord(isExpanded ? null : record.recordId)}
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center bg-muted ${typeConfig.color}`}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{record.recordName}</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-0 bg-muted">
                          {typeConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>Owner: {record.ownerName}</span>
                        <span>·</span>
                        <span>{record.sharing?.length || 0} shared</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {record.sharing?.slice(0, 3).map((entry: any, idx: number) => {
                        const accessKey = (entry.access || "read") as AccessLevel;
                        const config = ACCESS_CONFIG[accessKey] || ACCESS_CONFIG.read;
                        return (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={`text-[10px] h-5 px-1.5 border-0 ${config.color}`}
                          >
                            {entry.teamName || entry.userName || "Unknown"}
                          </Badge>
                        );
                      })}
                      {record.sharing?.length > 3 && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                          +{record.sharing.length - 3}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareTargetRecord(record);
                        setShareDialogOpen(true);
                      }}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  {/* ── Expanded Sharing Details ── */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-3 space-y-2">
                      {record.sharing?.map((entry: any, idx: number) => {
                        const accessKey = (entry.access || "read") as AccessLevel;
                        const config = ACCESS_CONFIG[accessKey] || ACCESS_CONFIG.read;
                        const AccessIcon = config.icon;

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 shrink-0">
                                {entry.teamId ? (
                                  <Users className="w-4 h-4 text-primary" />
                                ) : (
                                  <User className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium">
                                  {entry.teamName || entry.userName || "Unknown"}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 h-4 border-0 ${config.color}`}
                                  >
                                    <AccessIcon className="w-2.5 h-2.5 mr-0.5" />
                                    {config.label}
                                  </Badge>
                                  {entry.teamId && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                      Team
                                    </Badge>
                                  )}
                                  {entry.note && (
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                      {entry.note}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={async () => {
                                try {
                                  await unshareRecord({
                                    tableName: record.recordType,
                                    recordId: record.recordId,
                                    teamId: entry.teamId,
                                    userId: entry.userId,
                                  });
                                  toast.success("Access removed");
                                } catch (err: any) {
                                  toast.error(err?.message || "Failed to remove access");
                                }
                              }}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        );
                      })}

                      {/* ── Transfer Ownership Button ── */}
                      <div className="pt-2 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                          onClick={() => {
                            setTransferRecord({
                              recordId: record.recordId,
                              recordType: record.recordType,
                              recordName: record.recordName,
                              currentOwnerId: record.ownerId,
                              currentOwnerName: record.ownerName,
                            });
                            setTransferDialogOpen(true);
                          }}
                        >
                          <Crown className="h-3.5 w-3.5" />
                          Transfer Ownership
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Share Dialog ── */}
      {shareDialogOpen && shareTargetRecord && (
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-500" />
                Share {shareTargetRecord.recordName}
              </DialogTitle>
              <DialogDescription>
                Manage access to this {shareTargetRecord.recordType}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-muted-foreground">
                Use the ShareDialog component from the record's own page to add new sharing entries. This panel shows an overview of all shared records.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Transfer Ownership Dialog ── */}
      {transferDialogOpen && transferRecord && (
        <TransferOwnershipDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          recordId={transferRecord.recordId}
          recordType={transferRecord.recordType}
          recordName={transferRecord.recordName}
          currentOwnerId={transferRecord.currentOwnerId}
          currentOwnerName={transferRecord.currentOwnerName}
          onTransferComplete={() => {
            setTransferDialogOpen(false);
            setTransferRecord(null);
          }}
        />
      )}
    </div>
  );
}
