import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Hash,
  Lock,
  Plus,
  Search,
  MessageSquare,
  Users,
  X,
  Check,
} from "lucide-react";

export interface Channel {
  id: string;
  name: string;
  type: "channel" | "dm";
  isPrivate: boolean;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
  members?: number;
  avatar?: string;
}

export interface AvailableMember {
  id: string;
  name: string;
  role: string;
  isOnline?: boolean;
}

interface ChannelListProps {
  channels: Channel[];
  activeChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel: (name: string, isPrivate: boolean, memberIds?: string[]) => void;
  availableMembers?: AvailableMember[];
}

export function ChannelList({
  channels,
  activeChannelId,
  onChannelSelect,
  onCreateChannel,
  availableMembers = [],
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [isNewPrivate, setIsNewPrivate] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter((c) => c.name.toLowerCase().includes(q));
  }, [channels, searchQuery]);

  const regularChannels = filteredChannels.filter((c) => c.type === "channel");
  const dmChannels = filteredChannels.filter((c) => c.type === "dm");

  const totalUnread = channels.reduce((sum, c) => sum + c.unreadCount, 0);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return availableMembers;
    const q = memberSearchQuery.toLowerCase();
    return availableMembers.filter((m) => m.name.toLowerCase().includes(q));
  }, [availableMembers, memberSearchQuery]);

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleCreate = () => {
    if (newChannelName.trim()) {
      onCreateChannel(newChannelName.trim(), isNewPrivate, Array.from(selectedMemberIds));
      setNewChannelName("");
      setIsNewPrivate(false);
      setSelectedMemberIds(new Set());
      setMemberSearchQuery("");
      setShowCreateDialog(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setShowCreateDialog(open);
    if (!open) {
      setNewChannelName("");
      setIsNewPrivate(false);
      setSelectedMemberIds(new Set());
      setMemberSearchQuery("");
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="w-64 border-r border-border bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm">Messages</h2>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 min-w-5 flex items-center justify-center">
              {totalUnread}
            </Badge>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Channel List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Channels Section */}
          <div className="mb-3">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Channels
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {regularChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  activeChannelId === channel.id
                    ? "bg-primary/15 text-primary"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                }`}
              >
                {channel.isPrivate ? (
                  <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <span className="truncate flex-1 text-left text-xs font-medium">
                  {channel.name}
                </span>
                {channel.unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="text-[9px] h-4 min-w-4 px-1 flex items-center justify-center"
                  >
                    {channel.unreadCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* DMs Section */}
          <div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Direct Messages
              </span>
            </div>
            {dmChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  activeChannelId === channel.id
                    ? "bg-primary/15 text-primary"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-[9px] text-white font-bold">
                    {channel.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-background" />
                </div>
                <span className="truncate flex-1 text-left text-xs font-medium">
                  {channel.name}
                </span>
                {channel.unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="text-[9px] h-4 min-w-4 px-1 flex items-center justify-center"
                  >
                    {channel.unreadCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Create Channel Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Create Channel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Channel Name */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Channel Name
              </label>
              <Input
                placeholder="e.g. project-updates"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>

            {/* Privacy Toggle */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Visibility
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsNewPrivate(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm flex-1 ${
                    !isNewPrivate
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <Hash className="h-4 w-4" />
                  Public
                </button>
                <button
                  onClick={() => setIsNewPrivate(true)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm flex-1 ${
                    isNewPrivate
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  Private
                </button>
              </div>
            </div>

            {/* Member Selection */}
            {availableMembers.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Add Members
                  {selectedMemberIds.size > 0 && (
                    <span className="text-muted-foreground font-normal ml-1">
                      ({selectedMemberIds.size} selected)
                    </span>
                  )}
                </label>

                {/* Selected members chips */}
                {selectedMemberIds.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {Array.from(selectedMemberIds).map((memberId) => {
                      const member = availableMembers.find((m) => m.id === memberId);
                      if (!member) return null;
                      return (
                        <button
                          key={memberId}
                          onClick={() => toggleMember(memberId)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                        >
                          {member.name}
                          <X className="h-3 w-3" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Member search */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                {/* Member list */}
                <div className="max-h-[200px] overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {filteredMembers.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      No members found
                    </div>
                  ) : (
                    filteredMembers.map((member) => {
                      const isSelected = selectedMemberIds.has(member.id);
                      return (
                        <button
                          key={member.id}
                          onClick={() => toggleMember(member.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? "bg-primary/10"
                              : "hover:bg-accent"
                          }`}
                        >
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-gradient-to-br from-violet-400 to-indigo-500 text-white"
                          }`}>
                            {isSelected ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              member.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{member.name}</p>
                            <p className="text-[10px] text-muted-foreground">{member.role}</p>
                          </div>
                          {member.isOnline && (
                            <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newChannelName.trim()}>
              Create Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
