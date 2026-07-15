import { Badge } from "@/components/ui/badge";

interface TierHeaderProps {
  tier: string;
  description: string;
}

export function TierHeader({ tier, description }: TierHeaderProps) {
  const tierColors = {
    free: "bg-blue-100 text-blue-800 border-blue-200",
    starter: "bg-teal-100 text-teal-800 border-teal-200",
    pro: "bg-indigo-100 text-indigo-800 border-indigo-200",
    expert: "bg-slate-100 text-slate-800 border-slate-200",
  };

  const colorClass = tierColors[tier.toLowerCase() as keyof typeof tierColors] || tierColors.free;

  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <h3 className="font-bold text-xl text-[#0A192F] dark:text-gray-100 tracking-tight">
          Adaptive Evidence Timeline
        </h3>
        <p className="text-sm text-[#475569] dark:text-gray-400 mt-1">
          {description}
        </p>
      </div>
      <Badge variant="outline" className={`${colorClass} capitalize px-3 py-1`}>
        {tier} Tier
      </Badge>
    </div>
  );
}
