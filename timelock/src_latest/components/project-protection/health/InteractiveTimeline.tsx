import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TimelineBlock {
  id: string;
  timestamp: number;
  duration: number;
  value: number;
  intensity: "low" | "medium" | "high";
  isWeekend: boolean;
  clientName: string;
  status: string;
}

interface InteractiveTimelineProps {
  blocks: TimelineBlock[];
  draggable?: boolean;
  clickable?: boolean;
  zoomEnabled?: boolean;
  heatmapView?: boolean;
}

export function InteractiveTimeline({ 
  blocks, 
  draggable = false, 
  clickable = false,
  zoomEnabled = false,
  heatmapView = false 
}: InteractiveTimelineProps) {
  const [selectedBlock, setSelectedBlock] = useState<TimelineBlock | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "heatmap">(heatmapView ? "heatmap" : "timeline");
  const [zoomLevel, setZoomLevel] = useState(1);

  const intensityColors = {
    low: "from-blue-400 to-blue-500",
    medium: "from-primary/40 to-primary/60",
    high: "from-emerald-500 to-emerald-700",
  };

  const getBlockWidth = (duration: number) => {
    const baseWidth = (duration / 480) * 100; // 480 min = 8 hours = 100%
    return Math.min(100, Math.max(10, baseWidth * zoomLevel));
  };

  return (
    <div className="space-y-4 w-full">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {blocks.length} work sessions
          </Badge>
          {heatmapView && (
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("timeline")}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  viewMode === "timeline" ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode("heatmap")}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  viewMode === "heatmap" ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"
                }`}
              >
                Heatmap
              </button>
            </div>
          )}
        </div>
        {zoomEnabled && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
              className="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200"
            >
              -
            </button>
            <span className="text-xs text-slate-600 whitespace-nowrap">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
              className="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <div className="relative w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 overflow-hidden">
          <div className="flex items-end gap-1 h-48 w-full flex-wrap justify-center">
            <AnimatePresence>
              {blocks.map((block, idx) => (
                <TooltipProvider key={block.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: idx * 0.05 }}
                        drag={false}
                        whileHover={{ scale: clickable ? 1.05 : 1, zIndex: 10 }}
                        onClick={() => clickable && setSelectedBlock(block)}
                        className={`relative rounded-lg bg-gradient-to-t ${intensityColors[block.intensity]} shadow-md ${
                          clickable ? "cursor-pointer" : ""
                        } ${block.isWeekend ? "opacity-70" : ""}`}
                        style={{
                          width: `${Math.max(20, Math.min(50, getBlockWidth(block.duration)))}px`,
                          height: `${Math.min(100, (block.duration / 480) * 100)}%`,
                          minHeight: "20px",
                          flex: "0 0 auto",
                        }}
                      >
                        {block.intensity === "high" && (
                          <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse" />
                        )}
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">{block.clientName}</p>
                        <p>{new Date(block.timestamp).toLocaleDateString()}</p>
                        <p>{Math.round(block.duration / 60)}h {block.duration % 60}m</p>
                        <p className="text-primary font-medium">${block.value}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Heatmap View */}
      {viewMode === "heatmap" && (
        <div className="w-full overflow-x-auto">
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))" }}>
            {blocks.slice(0, 28).map((block, idx) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.02 }}
                className={`aspect-square rounded-lg bg-gradient-to-br ${intensityColors[block.intensity]} flex items-center justify-center text-white text-xs font-medium shadow-sm`}
              >
                {Math.round(block.duration / 60)}h
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Block Details */}
      <AnimatePresence>
        {selectedBlock && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 bg-gradient-to-br from-muted/50 to-blue-50 border-border">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-900">{selectedBlock.clientName}</h4>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{Math.round(selectedBlock.duration / 60)}h {selectedBlock.duration % 60}m</span>
                    </div>
                    <div className="font-medium text-primary">${selectedBlock.value}</div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(selectedBlock.timestamp).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBlock(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
