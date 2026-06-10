import { TrendingUp } from "lucide-react";
import { motion, useSpring, useTransform, useMotionValue, animate } from "framer-motion";
import { useEffect } from "react";

interface ValueMetricCardProps {
  label: string;
  amount: number;
  period: string;
  description: string;
  tier: string;
}

function Counter({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  
  useEffect(() => {
    const controls = animate(count, value, { duration: 2, ease: "easeOut" });
    return controls.stop;
  }, [value]);

  return <motion.span>{rounded}</motion.span>;
}

export function ValueMetricCard({ label, amount, period, description, tier }: ValueMetricCardProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);

  const isExpert = tier.toLowerCase() === 'expert';
  const bgClass = isExpert 
    ? "bg-gradient-to-r from-background to-[var(--platinum-800)] text-white" 
    : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800";

  const textClass = isExpert ? "text-white" : "text-foreground dark:text-white";
  const subTextClass = isExpert ? "text-slate-300" : "text-slate-500 dark:text-slate-400";
  const accentClass = isExpert ? "text-premium" : "text-primary";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`p-6 rounded-2xl mb-6 ${bgClass} relative overflow-hidden shadow-sm group`}
    >
      {isExpert && (
        <>
          <div className="absolute top-0 right-0 w-32 h-32 bg-premium opacity-5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:opacity-10 transition-opacity duration-700"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500 opacity-5 rounded-full -ml-10 -mb-10 blur-2xl group-hover:opacity-10 transition-opacity duration-700"></div>
        </>
      )}
      
      <div className="relative z-10">
        <div className={`text-sm font-medium mb-1 ${subTextClass} flex items-center gap-2`}>
          {label}
        </div>
        <div className={`text-4xl font-bold mb-2 tracking-tight ${textClass} flex items-baseline`}>
          {/* We render the currency symbol separately to animate the number */}
          <span>$</span>
          <Counter value={amount} />
          <span className="text-lg font-normal opacity-70 ml-1">/{period}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-full ${isExpert ? 'bg-premium/10' : 'bg-primary/10'}`}}>
            <TrendingUp className={`w-3 h-3 ${accentClass}`} />
          </div>
          <span className={`text-sm ${subTextClass}`}>
            {description}
          </span>
        </div>
      </div>
    </motion.div>
  );
}