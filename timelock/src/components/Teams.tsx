import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, MessageSquare, Calendar, CheckCircle, Lock, AlertCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TeamsProps {
  subscriptionTier?: "free" | "starter" | "pro" | "expert" | "client";
}

export function Teams({ subscriptionTier = "free" }: TeamsProps) {
  // 4-Pillar tier access control
  const getTierLevel = (tier: string) => {
    const levels: Record<string, number> = { free: 0, starter: 1, pro: 2, expert: 3, client: 0 };
    return levels[tier] || 0;
  };
  const hasTierAccess = (requiredTier: string) => getTierLevel(subscriptionTier) >= getTierLevel(requiredTier);
  const [theme, setTheme] = useState<"light" | "dark">(
    ((typeof localStorage !== "undefined" && localStorage.getItem("timelock_theme")) as "light" | "dark") || "light"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    const handleStorageChange = () => {
      const newTheme = localStorage.getItem("timelock_theme") as "light" | "dark" || "light";
      setTheme(newTheme);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Show team members for all tiers
  const teamMembers: any = [
    {
      _id: "member1",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      image: "",
      role: "Senior Developer"
    },
    {
      _id: "member2",
      name: "Michael Chen",
      email: "michael@example.com",
      image: "",
      role: "Designer"
    },
    {
      _id: "member3",
      name: "Emily Rodriguez",
      email: "emily@example.com",
      image: "",
      role: "Project Manager"
    }
  ];

  const handleInviteMember = () => {
    toast.success("Invite sent!");
  };

  return (
    <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Teams Workplace</h1>
              <p className="text-muted-foreground">
                Collaborate with your team and manage projects together
              </p>
            </div>
            <Button className="gap-2" onClick={handleInviteMember}>
              <UserPlus className="w-4 h-4" />
              Invite Team Member
            </Button>
          </div>

          {/* Tier-Based Feature Access Notice */}
          {!hasTierAccess("pro") && (
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Team Collaboration requires Pro tier (85% protection)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upgrade to unlock team validation, shared evidence, and collaborative protection
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Team Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Team Members</p>
                  <p className="text-2xl font-bold text-foreground">{teamMembers?.length || 0}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Messages</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Team Members List */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Team Members</h2>
            {!teamMembers || teamMembers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No team members yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Invite your colleagues to collaborate on projects
                </p>
                <Button onClick={handleInviteMember}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite First Member
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member: any) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.image} />
                        <AvatarFallback className="bg-primary/10">
                          {member.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-foreground">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{member.role || "Member"}</Badge>
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <Calendar className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Schedule Meeting
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Coordinate with your team on upcoming projects
              </p>
              <Button variant="outline" className="w-full" onClick={() => toast.success("Meeting scheduled!")}>
                Create Meeting
              </Button>
            </Card>

            <Card className="p-6">
              <MessageSquare className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Team Chat
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Communicate with your team in real-time
              </p>
              <Button variant="outline" className="w-full" onClick={() => toast.success("Opening team chat...")}>
                Open Chat
              </Button>
            </Card>
          </div>
        </div>
    </div>
  );
}