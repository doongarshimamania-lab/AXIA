import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export interface Member {
  id: string;
  name: string;
  avatar?: string;
  role: "admin" | "member" | "viewer";
  isOnline: boolean;
}

interface MemberListProps {
  members: Member[];
}

export function MemberList({ members }: MemberListProps) {
  const onlineMembers = members.filter((m) => m.isOnline);
  const offlineMembers = members.filter((m) => !m.isOnline);

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default" as const;
      case "member":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="w-60 border-l border-border bg-muted/30 flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Members</h3>
          <Badge variant="outline" className="text-[10px] h-5 ml-auto">
            {members.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Online */}
          {onlineMembers.length > 0 && (
            <div className="mb-3">
              <div className="px-2 py-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Online — {onlineMembers.length}
                </span>
              </div>
              {onlineMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="text-[9px] bg-gradient-to-br from-slate-400 to-slate-600 text-white">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
                  </div>
                  <span className="text-xs font-medium truncate flex-1">
                    {member.name}
                  </span>
                  {member.role === "admin" && (
                    <Badge
                      variant={roleBadgeVariant(member.role)}
                      className="text-[8px] h-4 px-1"
                    >
                      Admin
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Offline */}
          {offlineMembers.length > 0 && (
            <div>
              <div className="px-2 py-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Offline — {offlineMembers.length}
                </span>
              </div>
              {offlineMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors opacity-60"
                >
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-background" />
                  </div>
                  <span className="text-xs font-medium truncate flex-1">
                    {member.name}
                  </span>
                  {member.role === "admin" && (
                    <Badge
                      variant={roleBadgeVariant(member.role)}
                      className="text-[8px] h-4 px-1"
                    >
                      Admin
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
