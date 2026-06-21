import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle2 } from "lucide-react";

interface TeamMember {
  initials: string;
  name: string;
  status: "validated" | "pending";
  bgColor: string;
  detail: string;
}

interface TeamValidationProps {
  hasAccess: boolean;
  teamData?: {
    validatedCount: number;
    totalMembers: number;
    boostPercentage: number;
    currentRate: number;
    potentialRate: number;
    members: TeamMember[];
  } | null;
}

export function TeamValidation({ hasAccess, teamData }: TeamValidationProps) {
  if (!teamData) {
    return (
      <Card className="p-6 bg-[#1E293B] border-[#334155]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-white" />
              <h3 className="font-bold text-lg text-white">Team Validation</h3>
            </div>
          </div>
          <p className="text-sm text-slate-400">No team validation data available</p>
        </div>
      </Card>
    );
  }

  const progressPercent =
    teamData.totalMembers > 0
      ? Math.round((teamData.validatedCount / teamData.totalMembers) * 100)
      : 0;

  return (
    <Card className="p-6 bg-[#1E293B] border-[#334155]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-white" />
            <h3 className="font-bold text-lg text-white">Team Validation</h3>
          </div>
        </div>
        
        <p className="text-sm text-slate-400">Collaborative evidence verification</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Validation Progress</span>
            <span className="font-semibold text-emerald-400">
              {teamData.validatedCount}/{teamData.totalMembers} members
            </span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-slate-700" />
        </div>

        <div className="bg-slate-800/50 border border-emerald-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white mb-1">
                Validation Boost
              </div>
              <div className="text-xs text-slate-400">
                Team validation increases success rate by {teamData.boostPercentage}% ({teamData.currentRate}% → {teamData.potentialRate}%)
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {teamData.members.map((member, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-2 bg-slate-800/50 rounded-lg ${
                member.status === "pending" ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full ${member.bgColor} flex items-center justify-center text-xs text-white font-semibold`}
                >
                  {member.initials}
                </div>
                <div>
                  <div className="text-sm text-white font-medium">{member.name}</div>
                  <div className="text-xs text-slate-400">{member.detail}</div>
                </div>
              </div>
              {member.status === "validated" && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
