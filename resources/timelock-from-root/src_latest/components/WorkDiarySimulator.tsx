import { motion } from "framer-motion";
import { useState } from "react";

interface TimeBlock {
  id: string;
  startTime: Date;
  endTime: Date;
  activity: string;
  website: string;
  complianceStatus: "compliant" | "at_risk" | "rejected";
  screenshotCount: number;
  mouseActivity: boolean;
  keyboardActivity: boolean;
  platform: "upwork" | "fiverr" | "toptal" | "client";
}

interface WorkDiarySimulatorProps {
  timeBlocks: TimeBlock[];
  onBlockHover?: (block: TimeBlock | null) => void;
  selectedPlatform?: "all" | "upwork" | "fiverr" | "toptal";
}

export function WorkDiarySimulator({ timeBlocks, onBlockHover, selectedPlatform }: WorkDiarySimulatorProps) {
  const [hoveredBlock, setHoveredBlock] = useState<TimeBlock | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am to 8pm

  const getFillClasses = (platform: TimeBlock["platform"], status: TimeBlock["complianceStatus"]) => {
    if (status === "rejected") {
      return "bg-danger border border-danger rounded";
    }
    switch (platform) {
      case "upwork":
        return "bg-info rounded"; // blue
      case "fiverr":
        return "bg-success rounded"; // green
      case "toptal":
        return "bg-axia-teal-600 rounded"; // teal (V2 brand)
      case "client":
      default:
        return "bg-warning rounded"; // yellow
    }
  };

  const handleBlockHover = (block: TimeBlock | null, event?: React.MouseEvent) => {
    setHoveredBlock(block);
    if (event && block) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
    onBlockHover?.(block);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-[24px] font-bold text-foreground mb-6 tracking-tight">
        Work Diary Timeline
      </h3>
      
      {/* Hour markers */}
      <div className="grid grid-cols-13 gap-1 mb-4">
        <div></div> {/* Empty cell for time column */}
        {hours.map((hour) => (
          <div key={hour} className="text-[12px] text-muted-foreground text-center font-inter">
            {hour === 12 ? "12pm" : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
          </div>
        ))}
      </div>

      {/* Timeline grid */}
      <div className="grid grid-cols-13 gap-1">
        <div className="text-[12px] text-muted-foreground font-inter">Today</div>
        
        {hours.map((hour) => (
          <div key={hour} className="h-16 border border-border relative">
            {/* 5-minute blocks within each hour */}
            <div className="grid grid-cols-12 h-full">
              {Array.from({ length: 12 }).map((_, blockIndex) => {
                const block = timeBlocks.find(b =>
                  b.startTime.getHours() === hour &&
                  Math.floor(b.startTime.getMinutes() / 5) === blockIndex &&
                  ((typeof (undefined as any) !== "undefined") || true)
                );
                // Filter by selectedPlatform if provided
                const passesPlatform =
                  !block
                    ? true
                    : (!("selectedPlatform" in ({} as WorkDiarySimulatorProps)) ||
                      !block ? true :
                      true);

                // Adjust: explicit filter
                const shouldRender = block
                  ? (!("selectedPlatform" in ({} as WorkDiarySimulatorProps)) ||
                    !block ? true : true)
                  : true;

                // Replace with explicit logic using prop:
                // We cannot access props here, so we restructure below
                return (
                  <BlockCell
                    key={blockIndex}
                    block={block || null}
                    hour={hour}
                    blockIndex={blockIndex}
                    getFillClasses={getFillClasses}
                    selectedPlatform={selectedPlatform}
                    // New: pass internal hover handler to update tooltip
                    onInternalHover={(b, e) => {
                      setHoveredBlock(b);
                      if (e && b) {
                        setTooltipPosition({ x: e.clientX, y: e.clientY });
                      }
                      onBlockHover?.(b ?? null);
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredBlock && (
        <motion.div
          className="fixed z-50 bg-popover text-popover-foreground p-3 rounded text-[14px] font-inter pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div>
            {hoveredBlock.startTime.toLocaleTimeString()} - {hoveredBlock.activity} ({hoveredBlock.website})
          </div>
          <div>Platform: {hoveredBlock.platform}</div>
          <div>Status: {hoveredBlock.complianceStatus}</div>
          <div>Proof: {hoveredBlock.screenshotCount} screenshots</div>
        </motion.div>
      )}
    </div>
  );
}

// Add: small internal component to keep snippet minimal and readable
function BlockCell({
  block,
  hour,
  blockIndex,
  getFillClasses,
  selectedPlatform,
  onInternalHover,
}: {
  block: any;
  hour: number;
  blockIndex: number;
  getFillClasses: (platform: any, status: any) => string;
  selectedPlatform?: "all" | "upwork" | "fiverr" | "toptal";
  onInternalHover?: (block: any | null, e?: React.MouseEvent) => void;
}) {
  const hasBlock = !!block;
  const passes =
    !hasBlock ||
    !selectedPlatform ||
    selectedPlatform === "all" ||
    block.platform === selectedPlatform;

  if (!passes) {
    return <motion.div className="h-full border-r border-border last:border-r-0" />;
  }

  return (
    <motion.div
      className={`h-full border-r border-border last:border-r-0 cursor-pointer ${
        hasBlock ? getFillClasses(block.platform, block.complianceStatus) : ""
      }`}
      onMouseEnter={(e) => onInternalHover?.(hasBlock ? block : null, e)}
      onMouseLeave={() => onInternalHover?.(null)}
      whileHover={{ scale: hasBlock ? 1.1 : 1 }}
      transition={{ duration: 0.2 }}
    />
  );
}