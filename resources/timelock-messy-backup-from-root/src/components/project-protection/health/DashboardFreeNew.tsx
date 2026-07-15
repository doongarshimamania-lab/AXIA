import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, EyeOff, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

interface DashboardFreeNewProps {
  data: any;
  onUpgrade?: () => void;
}

export function DashboardFreeNew({ data, onUpgrade }: DashboardFreeNewProps) {
  const valueMetric = data.valueMetric || { amount: 0, label: "Protected", cadence: "week" };
  const pillars = data.pillars || [];

  return (
    <Card className="relative overflow-hidden bg-slate-50 border border-slate-200 shadow-sm">
      {/* Limited Header */}
      <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-slate-400" />
            Basic Health
          </h3>
          <p className="text-xs text-slate-500">Limited visibility mode</p>
        </div>
        <div className="text-right opacity-50 grayscale">
          <div className="text-2xl font-bold text-slate-700">${valueMetric.amount}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Protected</div>
        </div>
      </div>

      {/* Blurred Content Area */}
      <div className="relative p-6 min-h-[200px]">
        {/* Background Content (Blurred) */}
        <div className="filter blur-sm opacity-40 pointer-events-none select-none space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {pillars.map((p: any, i: number) => (
              <div key={i} className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="h-2 w-16 bg-slate-200 rounded mb-2" />
                <div className="h-6 w-8 bg-slate-300 rounded" />
              </div>
            ))}
          </div>
          <div className="h-32 bg-slate-100 rounded-lg border border-slate-200 w-full" />
        </div>

        {/* Lock Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-6 rounded-xl shadow-xl border border-slate-200 max-w-sm text-center"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-slate-500" />
            </div>
            <h4 className="font-bold text-slate-900 mb-2">Detailed Health Locked</h4>
            <p className="text-sm text-slate-500 mb-6">
              Upgrade to Starter to unlock detailed health metrics, work rhythm analysis, and interactive timelines.
            </p>
            <Button onClick={onUpgrade} className="w-full bg-slate-900 text-white hover:bg-slate-800">
              Unlock Dashboard
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Footer Teaser */}
      <div className="bg-slate-100 p-3 text-center border-t border-slate-200">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
          <EyeOff className="w-3 h-3" />
          You are missing critical health insights
        </p>
      </div>
    </Card>
  );
}