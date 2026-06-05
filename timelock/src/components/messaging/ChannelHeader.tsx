import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Hash,
  Lock,
  Pin,
  Users,
  Settings,
  Bell,
  BellOff,
  Search,
  X,
  UserPlus,
  Info,
} from "lucide-react";

interface ChannelHeaderProps {
  channelName: string;
  channelType: "general" | "project" | "direct" | "private";
  description?: string;
  memberCount: number;
  pinnedCount?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onToggleMembers?: () => void;
  onToggleSearch?: () => void;
  onTogglePinned?: () => void;
  showMembers?: boolean;
  className?: string;
}

export function ChannelHeader({
  channelName,
  channelType,
  description,
  memberCount,
  pinnedCount = 0,
  isMuted,
  onToggleMute,
  onToggleMembers,
  onToggleSearch,
  onTogglePinned,
  showMembers,
  className,
}: ChannelHeaderProps) {
  const getIcon = () => {
    switch (channelType) {
      case "general":
        return <Hash className="h-4 w-4 text-muted-foreground" />;
      case "project":
        return <Hash className="h-4 w-4 text-blue-400" />;
      case "private":
        return <Lock className="h-4 w-4 text-amber-400" />;
      case "direct":
        return <Users className="h-4 w-4 text-green-400" />;
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-2.5 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {getIcon()}
        <h2 className="font-semibold text-sm truncate">{channelName}</h2>
        {description && (
          <span className="text-xs text-muted-foreground truncate hidden md:block">
            — {description}
          </span>
        )}
        {pinnedCount > 0 && (
          <Badge variant="secondary" className="h-5 text-[10px] px-1.5 shrink-0">
            <Pin className="h-2.5 w-2.5 mr-0.5" /> {pinnedCount}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleMute}
          title={isMuted ? "Unmute channel" : "Mute channel"}
        >
          {isMuted ? (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleMembers}
          title="Toggle member list"
        >
          <Users className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleSearch}
          title="Search messages"
        >
          <Search className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onTogglePinned}>
              <Pin className="h-4 w-4 mr-2" />
              Pinned messages
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlus className="h-4 w-4 mr-2" />
              Add member
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Info className="h-4 w-4 mr-2" />
              Channel info
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
