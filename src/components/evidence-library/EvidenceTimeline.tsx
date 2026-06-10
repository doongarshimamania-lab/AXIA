import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface TimelineHour {
  hour: number;
  status: string;
  eventCount: number;
  screenshotCount: number;
  memoCount: number;
}

interface EvidenceTimelineProps {
  timeline: TimelineHour[];
}

export function EvidenceTimeline({ timeline }: EvidenceTimelineProps) {
  return (
    <Card className="p-6 bg-platinum-800 border-border">
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-lg text-white">Evidence Timeline</h3>
          <p className="text-sm text-slate-400 mt-1">Visual evidence density and protection zones</p>
        </div>
        
        <div className="flex items-end gap-1 h-32">
          {timeline.map((hour) => {
            const isProtected = hour.status === "protected";
            const height = Math.min((hour.eventCount / 20) * 100, 100);
            
            return (
              <motion.div
                key={hour.hour}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: hour.hour * 0.02 }}
                className={`flex-1 rounded-t ${
                  isProtected ? 'bg-emerald-400' : 'bg-amber-500'
                } min-h-[8px]`}
                title={`${hour.hour}:00 - ${hour.eventCount} events`}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}