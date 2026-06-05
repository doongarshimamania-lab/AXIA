import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Shield, UserCircle, MessageSquare } from "lucide-react";

interface MemberInfo {
  _id: string;
  userId: string;
  name: string;
  image?: string;
  email?: string;
  role: "admin" | "member";
  isOnline?: boolean;
  title?: string;
}

interface MemberListProps {
  members: MemberInfo[];
  onMemberClick?: (member: MemberInfo) => void;
  className?: string;
}

export function MemberList({ members, onMemberClick, className }: MemberListProps) {
  const online = members.filter((m) => m.isOnline);
  const offline = members.filter((m) => !m.isOnline);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-3 w-3 text-amber-500" />;
      default:
        return null;
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className={cn("w-64 border-l bg-background flex flex-col", className)}>
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Members</h3>
          <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-auto">
            {members.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Online */}
          {online.length > 0 && (
            <div className="mb-3">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Online — {online.length}
              </p>
              {online.map((member) => (
                <button
                  key={member._id}
                  onClick={() => onMemberClick?.(member)}
                  className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={member.image} />
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-green-400/30 to-green-500/40 text-green-700">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-sm truncate">{member.name}</span>
                      {getRoleIcon(member.role)}
                    </div>
                    {member.title && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {member.title}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Offline */}
          {offline.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Offline — {offline.length}
              </p>
              {offline.map((member) => (
                <button
                  key={member._id}
                  onClick={() => onMemberClick?.(member)}
                  className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors opacity-60"
                >
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={member.image} />
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-muted to-muted-foreground/20 text-muted-foreground">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-sm truncate">{member.name}</span>
                      {getRoleIcon(member.role)}
                    </div>
                    {member.title && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {member.title}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
