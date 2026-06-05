import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Hash,
  Lock,
  Plus,
  Search,
  MessageSquare,
  Users,
  ChevronDown,
  Volume2,
  VolumeX,
} from "lucide-react";

export interface ChannelInfo {
  _id: string;
  name: string;
  type: "general" | "project" | "direct" | "private";
  description?: string;
  icon?: string;
  isMember?: boolean;
  unreadCount: number;
  isMuted?: boolean;
  lastMessageAt?: number;
  // For DM channels
  otherUserName?: string;
  otherUserImage?: string;
  otherUserOnline?: boolean;
}

interface ChannelListProps {
  channels: ChannelInfo[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: (name: string, type: "general" | "project" | "private", description?: string) => void;
  onToggleMute?: (channelId: string) => void;
  className?: string;
}

export function ChannelList({
  channels,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
  onToggleMute,
  className,
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"general" | "project" | "private">("general");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.otherUserName?.toLowerCase().includes(q)
    );
  }, [channels, searchQuery]);

  const regularChannels = filteredChannels.filter((c) => c.type !== "direct");
  const dmChannels = filteredChannels.filter((c) => c.type === "direct");

  const handleCreate = () => {
    if (!newChannelName.trim()) return;
    onCreateChannel(
      newChannelName.trim().toLowerCase().replace(/\s+/g, "-"),
      newChannelType,
      newChannelDesc.trim() || undefined
    );
    setNewChannelName("");
    setNewChannelDesc("");
    setNewChannelType("general");
    setShowCreateDialog(false);
  };

  const totalUnread = channels.reduce((sum, c) => sum + c.unreadCount, 0);

  const getChannelIcon = (channel: ChannelInfo) => {
    switch (channel.type) {
      case "general":
        return <Hash className="h-4 w-4 text-muted-foreground" />;
      case "project":
        return <Hash className="h-4 w-4 text-blue-400" />;
      case "private":
        return <Lock className="h-4 w-4 text-amber-400" />;
      case "direct":
        return null;
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return "";
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  return (
    <div className={cn("flex flex-col h-full bg-background border-r", className)}>
      {/* Header */}
      <div className="px-3 py-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Messages</h2>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="h-5 min-w-[20px] text-[10px] px-1.5">
                {totalUnread}
              </Badge>
            )}
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Channel Type</label>
                  <div className="flex gap-2">
                    {(["general", "project", "private"] as const).map((type) => (
                      <Button
                        key={type}
                        variant={newChannelType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewChannelType(type)}
                        className="capitalize"
                      >
                        {type === "general" && <Hash className="h-3 w-3 mr-1" />}
                        {type === "project" && <Hash className="h-3 w-3 mr-1" />}
                        {type === "private" && <Lock className="h-3 w-3 mr-1" />}
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Name</label>
                  <Input
                    placeholder="e.g. project-alpha"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
                  <Input
                    placeholder="What's this channel about?"
                    value={newChannelDesc}
                    onChange={(e) => setNewChannelDesc(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!newChannelName.trim()}>
                  Create Channel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            className="h-8 pl-8 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Channel List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Channels Section */}
          <div className="mb-2">
            <button
              onClick={() => setChannelsExpanded(!channelsExpanded)}
              className="flex items-center gap-1 px-2 py-1 w-full hover:bg-muted/50 rounded text-xs font-medium text-muted-foreground"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  !channelsExpanded && "-rotate-90"
                )}
              />
              Channels
              <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
                {regularChannels.length}
              </Badge>
            </button>
            {channelsExpanded && (
              <div className="mt-0.5 space-y-0.5">
                {regularChannels.map((channel) => (
                  <button
                    key={channel._id}
                    onClick={() => onSelectChannel(channel._id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors group",
                      selectedChannelId === channel._id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50 text-foreground",
                      channel.isMuted && "opacity-60"
                    )}
                  >
                    {getChannelIcon(channel)}
                    <span className="truncate flex-1 text-left">
                      {channel.name}
                    </span>
                    {channel.unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="h-4 min-w-[16px] text-[9px] px-1"
                      >
                        {channel.unreadCount}
                      </Badge>
                    )}
                    {channel.isMuted && (
                      <VolumeX className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                ))}
                {regularChannels.length === 0 && (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    No channels yet
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Direct Messages Section */}
          <div>
            <button
              onClick={() => setDmsExpanded(!dmsExpanded)}
              className="flex items-center gap-1 px-2 py-1 w-full hover:bg-muted/50 rounded text-xs font-medium text-muted-foreground"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  !dmsExpanded && "-rotate-90"
                )}
              />
              Direct Messages
              <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
                {dmChannels.length}
              </Badge>
            </button>
            {dmsExpanded && (
              <div className="mt-0.5 space-y-0.5">
                {dmChannels.map((channel) => (
                  <button
                    key={channel._id}
                    onClick={() => onSelectChannel(channel._id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors group",
                      selectedChannelId === channel._id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-primary/40 to-primary/60 flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                        {channel.otherUserName?.charAt(0) || "?"}
                      </div>
                      {channel.otherUserOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <span className="truncate flex-1 text-left">
                      {channel.otherUserName || channel.name}
                    </span>
                    {channel.unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="h-4 min-w-[16px] text-[9px] px-1"
                      >
                        {channel.unreadCount}
                      </Badge>
                    )}
                  </button>
                ))}
                {dmChannels.length === 0 && (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    No direct messages
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-2 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{channels.length} channels</span>
        </div>
      </div>
    </div>
  );
}
