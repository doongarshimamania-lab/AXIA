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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowRightLeft,
  Crown,
  Loader2,
  AlertTriangle,
  User,
  Users,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceContext } from "@/hooks/use-workspace";

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  recordType: "workspace" | "project" | "client" | "deal";
  recordName: string;
  currentOwnerId?: string;
  currentOwnerName?: string;
  onTransferComplete?: () => void;
}

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  recordId,
  recordType,
  recordName,
  currentOwnerId,
  currentOwnerName,
  onTransferComplete,
}: TransferOwnershipDialogProps) {
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();

  // ── State ──
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Fetch workspace members ──
  const members = useQuery(
    activeWorkspaceId && isConvexConnected && (api as any).workspaces?.members?.getMembers
      ? (api as any).workspaces.members.getMembers
      : "skip",
    activeWorkspaceId ? { workspaceId: activeWorkspaceId as any, status: "active" as any } : "skip"
  ) as any[] | undefined;

  // ── Transfer mutations ──
  const transferWorkspace = useMutation(
    (api as any).permissions?.transferOwnership?.transferWorkspaceOwnership ?? "skip"
  );
  const transferProject = useMutation(
    (api as any).permissions?.transferOwnership?.transferProjectOwnership ?? "skip"
  );
  const transferClient = useMutation(
    (api as any).permissions?.transferOwnership?.transferClientOwnership ?? "skip"
  );
  const transferDeal = useMutation(
    (api as any).permissions?.transferOwnership?.transferDealOwnership ?? "skip"
  );

  // ── Filtered members (exclude current owner) ──
  const eligibleMembers = useMemo(() => {
    if (!members) return [];
    return members.filter((m: any) => {
      if (m.role === "owner") return false; // current owner, skip
      if (currentOwnerId && m.userId === currentOwnerId) return false;
      if (m.status !== "active") return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (m.userName || "").toLowerCase().includes(q) ||
          (m.userEmail || "").toLowerCase().includes(q) ||
          (m.title || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [members, currentOwnerId, searchQuery]);

  const selectedMember = eligibleMembers.find((m: any) => m.userId === selectedMemberId || m._id === selectedMemberId);

  // ── Handlers ──
  const handleTransfer = async () => {
    if (!selectedMemberId) {
      toast.error("Please select a member to transfer ownership to");
      return;
    }

    setIsTransferring(true);
    try {
      const newOwnerId = selectedMember?.userId || selectedMemberId;

      switch (recordType) {
        case "workspace":
          await transferWorkspace({ workspaceId: recordId as any, newOwnerId });
          break;
        case "project":
          await transferProject({ projectId: recordId as any, newOwnerId });
          break;
        case "client":
          await transferClient({ clientId: recordId as any, newOwnerId });
          break;
        case "deal":
          await transferDeal({ dealId: recordId as any, newOwnerId });
          break;
      }

      toast.success(`${recordTypeLabel} ownership transferred successfully`);
      onOpenChange(false);
      setSelectedMemberId("");
      setSearchQuery("");
      onTransferComplete?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to transfer ownership");
    } finally {
      setIsTransferring(false);
      setConfirmOpen(false);
    }
  };

  // ── Record type label ──
  const recordTypeLabel = recordType
    ? recordType.charAt(0).toUpperCase() + recordType.slice(1)
    : "Record";

  const typeIcon = recordType === "workspace"
    ? Shield
    : recordType === "project"
      ? Users
      : User;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              Transfer {recordTypeLabel} Ownership
            </DialogTitle>
            <DialogDescription>
              Transfer ownership of <strong>{recordName}</strong> to another workspace member. This action cannot be easily undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* ── Current owner ── */}
            {currentOwnerName && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium">Current Owner</div>
                  <div className="text-sm text-muted-foreground">{currentOwnerName}</div>
                </div>
              </div>
            )}

            {/* ── Warning ── */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <strong className="text-foreground">Important:</strong> Transferring ownership gives the new owner full control over this {recordType}. You will be demoted to Manager role and will no longer be able to delete or transfer this {recordType} without their permission.
              </div>
            </div>

            {/* ── Member search ── */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select New Owner</Label>
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm"
              />

              {/* ── Member list ── */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {eligibleMembers.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    {members === undefined
                      ? "Loading members..."
                      : "No eligible members found"}
                  </div>
                ) : (
                  eligibleMembers.map((member: any) => {
                    const isSelected = (member.userId || member._id) === selectedMemberId;
                    return (
                      <button
                        key={member._id}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedMemberId(member.userId || member._id)}
                      >
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {member.userName || member.userEmail || "Unknown"}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {member.userEmail && (
                              <span className="text-xs text-muted-foreground truncate">
                                {member.userEmail}
                              </span>
                            )}
                            {member.title && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                {member.title}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-4 ${
                                member.role === "manager"
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0"
                                  : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-0"
                              }`}
                            >
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!selectedMemberId) {
                  toast.error("Please select a member first");
                  return;
                }
                setConfirmOpen(true);
              }}
              disabled={!selectedMemberId || isTransferring}
              className="gap-2"
            >
              {isTransferring ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-4 h-4" />
              )}
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation Dialog ── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirm Ownership Transfer
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to transfer ownership of <strong>{recordName}</strong> to{" "}
              <strong>{selectedMember?.userName || selectedMember?.userEmail || "the selected member"}</strong>.
              This will demote you to Manager role. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransfer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
