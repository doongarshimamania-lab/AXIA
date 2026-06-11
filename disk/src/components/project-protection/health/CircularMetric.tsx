import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CircularMetricProps {
  value: number;
  label: string;
  unit?: string;
  size?: "sm" | "md" | "lg";
  color?: string;
  tooltip?: string;
  onClick?: () => void;
}

export function CircularMetric({ 
  value, 
  label, 
  unit = "%", 
  size = "md", 
  color = "#00C9B7",
  tooltip,
  onClick 
}: CircularMetricProps) {
  const sizeMap = {
    sm: { width: 80, stroke: 6, fontSize: "text-lg" },
    md: { width: 100, stroke: 8, fontSize: "text-2xl" },
    lg: { width: 120, stroke: 10, fontSize: "text-3xl" },
  };
  
  const { width, stroke, fontSize } = sizeMap[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const content = (
    <motion.div
      className={`flex flex-col items-center ${onClick ? "cursor-pointer" : ""}`}
      whileHover={onClick ? { scale: 1.05 } : {}}
      onClick={onClick}
    >
      <svg width={width} height={width} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <motion.circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {/* Value text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          className={`${fontSize} font-bold fill-current`}
          transform={`rotate(90 ${width / 2} ${width / 2})`}
        >
          {value}{unit}
        </text>
      </svg>
      <p className="text-sm text-slate-600 mt-2 text-center max-w-[120px]">{label}</p>
    </motion.div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
