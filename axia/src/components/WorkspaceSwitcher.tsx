import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Check, ChevronDown, Globe, 
  Plus, Users, User, Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useWorkspaceContext,
} from "@/hooks/use-workspace";
import { toast } from "sonner";

export function WorkspaceSwitcher() {
  const { 
    activeWorkspace, workspaces, isTeamMode, isSoloMode, isOwner, 
    activeWorkspaceId, accountMode, switchToWorkspace,
    createTeamWorkspace, upgradeToTeam
  } = useWorkspaceContext();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsDescription, setNewWsDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSwitch = (workspaceId: string) => {
    switchToWorkspace(workspaceId);
    setIsOpen(false);
    toast.success("Workspace switched");
  };

  const handleCreateTeamWorkspace = () => {
    if (!newWsName.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    setIsCreating(true);
    try {
      createTeamWorkspace(newWsName.trim(), newWsDescription.trim() || undefined);
      setShowCreateDialog(false);
      setNewWsName("");
      setNewWsDescription("");
      toast.success("Team workspace created!");
    } catch (e: any) {
      toast.error(e.message || "Failed to create workspace");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpgradeToTeam = () => {
    try {
      upgradeToTeam();
      setShowUpgradeDialog(false);
      toast.success("Upgraded to team workspace! You can now invite members.");
    } catch (e: any) {
      toast.error(e.message || "Failed to upgrade workspace");
    }
  };

  const workspaceName = activeWorkspace?.name || "My Workspace";

  return (
    <>
      {/* Workspace Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-sidebar-accent transition-colors text-sidebar-foreground/80"
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
          isTeamMode 
            ? "bg-slate-600/20 text-purple-400" 
            : "bg-primary/10 text-primary"
        }`}>
          {isTeamMode ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="font-medium text-xs truncate">{workspaceName}</div>
          <div className="text-[10px] text-sidebar-foreground/40">
            {isTeamMode ? "Team Workspace" : "Personal"}
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-sidebar-foreground/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Workspace Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-2 py-1 space-y-0.5">
              {workspaces.map((ws) => (
                <button
                  key={ws._id}
                  onClick={() => handleSwitch(ws._id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                    ws._id === activeWorkspaceId
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-sidebar-accent text-sidebar-foreground/70"
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${
                    ws.type === "team" 
                      ? "bg-slate-600/20 text-purple-400" 
                      : "bg-primary/10 text-primary"
                  }`}>
                    {ws.type === "team" ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  </div>
                  <span className="truncate flex-1 text-left">{ws.name}</span>
                  {ws._id === activeWorkspaceId && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                </button>
              ))}

              <div className="border-t border-sidebar-border/50 my-1" />

              {isSoloMode && isOwner && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowUpgradeDialog(true);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-purple-400 hover:bg-slate-600/10 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upgrade to Team</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateDialog(true);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Workspace</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade to Team Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Upgrade to Team Workspace
            </DialogTitle>
            <DialogDescription>
              Convert your personal workspace into a team workspace. You'll be able to invite team members, 
              manage roles, and collaborate on projects together.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium">What changes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <Users className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Invite team members with Owner, Manager, or Member roles</span>
                </li>
                <li className="flex items-start gap-2">
                  <Globe className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>Client portal access for verified work and invoicing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />
                  <span>Team-level scope alerts and reporting dashboard</span>
                </li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Your existing data (clients, projects, invoices) stays intact. You can always switch back to 
              solo view, but team features remain available.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpgradeToTeam} disabled={isCreating}>
              {isCreating ? "Upgrading..." : "Upgrade to Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Team Workspace Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Team Workspace
            </DialogTitle>
            <DialogDescription>
              Create a new workspace for your agency or team. You'll be the owner with full access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Workspace Name *</Label>
              <Input
                id="ws-name"
                placeholder="e.g. Acme Agency"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-desc">Description</Label>
              <Textarea
                id="ws-desc"
                placeholder="What does your team do?"
                value={newWsDescription}
                onChange={(e) => setNewWsDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeamWorkspace} disabled={isCreating || !newWsName.trim()}>
              {isCreating ? "Creating..." : "Create Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
