import { AlertCircle, Users, ShieldAlert, Award } from "lucide-react";

interface PsychologyBannerProps {
  psychology: any;
  tier: string;
}

export function PsychologyBanner({ psychology, tier }: PsychologyBannerProps) {
  if (!psychology) return null;

  return (
    <div className="space-y-3 mb-6">
      {/* Scarcity - Gold */}
      {psychology.scarcity?.active && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#0A192F] dark:text-amber-100">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium">{psychology.scarcity.message}</span>
        </div>
      )}

      {/* Loss Aversion - Red */}
      {psychology.lossAversion?.active && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100">
          <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium">
            {psychology.lossAversion.message}
            {psychology.lossAversion.value && (
              <span className="font-bold ml-1">
                (-${psychology.lossAversion.value})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Social Proof - Teal */}
      {psychology.socialProof?.active && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-100">
          <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span className="text-sm font-medium">{psychology.socialProof.message}</span>
        </div>
      )}

      {/* Authority - Slate/Gold (Expert) */}
      {psychology.authority?.active && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Award className="w-5 h-5 text-[#FFD700]" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {psychology.authority.message}
          </span>
        </div>
      )}
    </div>
  );
}
