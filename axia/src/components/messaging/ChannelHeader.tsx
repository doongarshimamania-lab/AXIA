import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Hash,
  Lock,
  Users,
  Pin,
  Search,
  MessageSquare,
  PanelRight,
  ArrowLeft,
} from "lucide-react";

interface ChannelHeaderProps {
  channelName: string;
  channelType: "channel" | "dm";
  isPrivate: boolean;
  memberCount: number;
  pinnedCount: number;
  showMemberList: boolean;
  onToggleMemberList: () => void;
  // ponytail: mobile back button — when rendered on a phone, the Messages page
  // shows EITHER the channel list OR the thread (not both). This button swaps
  // back to the list. Hidden on desktop (where both panes are visible).
  onBack?: () => void;
}

export function ChannelHeader({
  channelName,
  channelType,
  isPrivate,
  memberCount,
  pinnedCount,
  showMemberList,
  onToggleMemberList,
  onBack,
}: ChannelHeaderProps) {
  return (
    <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {/* ponytail: mobile back button — visible only on screens < md. */}
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden flex-shrink-0"
            onClick={onBack}
            aria-label="Back to channels"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        {channelType === "channel" ? (
          isPrivate ? (
            <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )
        ) : (
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0">
            {channelName.charAt(0).toUpperCase()}
          </div>
        )}
        <h3 className="font-semibold text-sm truncate">{channelName}</h3>
        <Separator orientation="vertical" className="h-4 mx-1 flex-shrink-0" />
        <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
          <Users className="h-3.5 w-3.5" />
          <span className="text-xs">{memberCount}</span>
        </div>
        {pinnedCount > 0 && (
          <>
            <Separator orientation="vertical" className="h-4 mx-1 flex-shrink-0" />
            <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
              <Pin className="h-3 w-3" />
              <span className="text-xs">{pinnedCount}</span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search messages</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pin className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pinned messages</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showMemberList ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={onToggleMemberList}
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showMemberList ? "Hide members" : "Show members"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
