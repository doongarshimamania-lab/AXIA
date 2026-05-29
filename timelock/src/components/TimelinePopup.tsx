import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
/* removed convex/react heavy imports */
/* removed convex api import */
import { toast } from "sonner";

type TimeView = "day" | "week" | "month" | "year";
type ComplianceStatus = "compliant" | "at_risk" | "rejected";

interface TimeBlock {
  _id: string;
  startTime: number;
  endTime: number;
  activity: string;
  website: string;
  complianceStatus: ComplianceStatus;
  screenshotCount: number;
  mouseActivity: boolean;
  keyboardActivity: boolean;
  platform?: string;
}

interface TimelinePopupProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  initialView?: TimeView;
}

export function TimelinePopup({ isOpen, onClose, initialDate = new Date(), initialView = "day" }: TimelinePopupProps) {
  const [currentView, setCurrentView] = useState<TimeView>(initialView);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [hoveredBlock, setHoveredBlock] = useState<TimeBlock | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Local timeline data (mocked) to avoid heavy Convex types
  const [timelineData, setTimelineData] = useState<TimeBlock[]>([]);

  // Lightweight mock report generator
  const generateReport = async (args: { sessionId: string; rejectedHours: number; lostIncome: number }) => {
    return Promise.resolve({
      caseId: `SIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    });
  };

  // Populate mock timeline data for the selected date
  useEffect(() => {
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(8, 0, 0, 0);

    const blocks: TimeBlock[] = [];
    for (let i = 0; i < 12; i++) {
      const startTime = startOfDay.getTime() + i * 60 * 60 * 1000;
      const endTime = startTime + 60 * 60 * 1000;
      const status: ComplianceStatus = i % 5 === 0 ? "rejected" : i % 3 === 0 ? "at_risk" : "compliant";
      blocks.push({
        _id: `${startTime}`,
        startTime,
        endTime,
        activity: status === "compliant" ? "Focused work" : status === "at_risk" ? "Context switch" : "Off-platform",
        website: status === "rejected" ? "unknown" : "axia.app",
        complianceStatus: status,
        screenshotCount: status === "rejected" ? 0 : 2,
        mouseActivity: status !== "rejected",
        keyboardActivity: status === "compliant",
        platform: "Upwork",
      });
    }
    setTimelineData(blocks);
  }, [currentDate]);

  // Calculate compliance score
  const complianceScore = calculateComplianceScore(timelineData || []);
  const atRiskHours = calculateAtRiskHours(timelineData || []);

  const navigatePrevious = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (currentView) {
        case "day":
          newDate.setDate(newDate.getDate() - 1);
          break;
        case "week":
          newDate.setDate(newDate.getDate() - 7);
          break;
        case "month":
          newDate.setMonth(newDate.getMonth() - 1);
          break;
        case "year":
          newDate.setFullYear(newDate.getFullYear() - 1);
          break;
      }
      return newDate;
    });
  };

  const navigateNext = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (currentView) {
        case "day":
          newDate.setDate(newDate.getDate() + 1);
          break;
        case "week":
          newDate.setDate(newDate.getDate() + 7);
          break;
        case "month":
          newDate.setMonth(newDate.getMonth() + 1);
          break;
        case "year":
          newDate.setFullYear(newDate.getFullYear() + 1);
          break;
      }
      return newDate;
    });
  };

  const handleBlockClick = (block: TimeBlock) => {
    setSelectedBlock(block);
    setShowDetailModal(true);
  };

  const handleGenerateDispute = async () => {
    if (!selectedBlock) return;
    
    try {
      // Calculate hours and income from the block
      const blockDuration = (selectedBlock.endTime - selectedBlock.startTime) / (1000 * 60 * 60);
      const hourlyRate = 25; // Default rate, should come from user profile
      
      const result = await generateReport({
        sessionId: selectedBlock._id as any, // Use block ID as session reference
        rejectedHours: blockDuration,
        lostIncome: blockDuration * hourlyRate,
      });
      
      toast.success("Dispute report generated", {
        description: `Case ID: ${result.caseId}`,
      });
      setShowDetailModal(false);
    } catch (error) {
      toast.error("Failed to generate dispute report");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Timeline Popup */}
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[1200px] h-[85vh] bg-white dark:bg-card rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-border flex justify-between items-center">
              <h2 className="font-[Space_Grotesk] font-semibold text-2xl text-foreground">
                Work Compliance Timeline
              </h2>
              
              {/* Time View Selector */}
              <div className="flex gap-2 bg-muted rounded-xl p-1">
                {(["day", "week", "month", "year"] as TimeView[]).map((view) => (
                  <button
                    key={view}
                    onClick={() => setCurrentView(view)}
                    className={`px-4 py-2 rounded-lg font-inter font-medium text-sm transition-all ${
                      currentView === view
                        ? "bg-white dark:bg-background text-foreground shadow-sm"
                        : "bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close timeline"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Date Navigator */}
            <div className="px-8 py-4 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={navigatePrevious}
                  className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                  aria-label="Previous period"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <span className="font-inter font-medium text-base text-foreground min-w-[200px] text-center">
                  {formatPeriodLabel(currentDate, currentView)}
                </span>
                
                <button
                  onClick={navigateNext}
                  className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                  aria-label="Next period"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <ComplianceScoreDisplay score={complianceScore} atRiskHours={atRiskHours} />
            </div>

            {/* Timeline Content */}
            <div className="flex-1 overflow-hidden relative">
              {currentView === "day" && (
                <DayView
                  data={timelineData || []}
                  onBlockClick={handleBlockClick}
                  onBlockHover={(block: TimeBlock | null, e?: React.MouseEvent) => {
                    setHoveredBlock(block);
                    if (e) setTooltipPosition({ x: e.clientX, y: e.clientY });
                  }}
                />
              )}
              {currentView === "week" && (
                <WeekView
                  data={timelineData || []}
                  currentDate={currentDate}
                  onDayClick={(date: Date) => {
                    setCurrentDate(date);
                    setCurrentView("day");
                  }}
                />
              )}
              {currentView === "month" && (
                <MonthView
                  data={timelineData || []}
                  currentDate={currentDate}
                  onDayClick={(date: Date) => {
                    setCurrentDate(date);
                    setCurrentView("day");
                  }}
                />
              )}
              {currentView === "year" && (
                <YearView
                  data={timelineData || []}
                  currentDate={currentDate}
                  onMonthClick={(date: Date) => {
                    setCurrentDate(date);
                    setCurrentView("month");
                  }}
                />
              )}

              {/* Hover Tooltip */}
              {hoveredBlock && (
                <TimeBlockTooltip
                  block={hoveredBlock}
                  position={tooltipPosition}
                  onGenerateDispute={() => handleBlockClick(hoveredBlock)}
                />
              )}
            </div>

            {/* Compliance Legend */}
            <div className="px-8 py-4 border-t border-border flex justify-center gap-6">
              <LegendItem status="compliant" label="Full Protection" />
              <LegendItem status="at_risk" label="At Risk" />
              <LegendItem status="rejected" label="Rejection" />
            </div>
          </motion.div>

          {/* Hour Detail Modal */}
          <HourDetailModal
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            block={selectedBlock}
            onGenerateDispute={handleGenerateDispute}
          />
        </>
      )}
    </AnimatePresence>
  );
}

// ... keep existing code for helper components and functions
function ComplianceScoreDisplay({ score, atRiskHours }: { score: number; atRiskHours: number }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const increment = Math.ceil(score / 30);
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(current);
      }
    }, 83);

    return () => clearInterval(timer);
  }, [score]);

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 font-[Space_Grotesk] font-semibold text-lg text-primary">
      <span>{displayScore}/100</span>
      <span className="text-sm font-medium">
        - {atRiskHours} hour{atRiskHours !== 1 ? "s" : ""} at risk
      </span>
    </div>
  );
}

function DayView({ data, onBlockClick, onBlockHover }: any) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);
  // Generate 5-minute markers for the entire day (144 total: 12 hours × 12 five-minute intervals)
  const fiveMinuteMarkers = Array.from({ length: 144 }, (_, i) => {
    const hour = Math.floor(i / 12) + 8;
    const minute = (i % 12) * 5;
    return { hour, minute, index: i };
  });

  return (
    <div className="h-full flex flex-col">
      {/* 5-Minute Marker Header */}
      <div className="flex border-b border-border">
        <div className="w-[60px] flex-shrink-0 border-r border-border" />
        <div className="flex-1 relative h-[30px]">
          <div className="absolute inset-0 flex">
            {fiveMinuteMarkers.map((marker) => (
              <div
                key={marker.index}
                className="flex-1 border-r border-border/30 flex items-center justify-start pl-0.5"
                style={{ minWidth: `${100 / 144}%` }}
              >
                {marker.minute === 0 && (
                  <span className="font-inter text-[9px] text-muted-foreground font-medium">
                    {marker.hour === 12 ? "12" : marker.hour > 12 ? marker.hour - 12 : marker.hour}
                  </span>
                )}
                {marker.minute !== 0 && marker.minute % 15 === 0 && (
                  <span className="font-inter text-[8px] text-muted-foreground/60">
                    :{marker.minute.toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Timeline */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline Area (full width, no left time column) */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto relative">
          <div className="grid grid-cols-[repeat(144,1fr)] h-[calc(13*50px)] relative">
            {/* Hour dividers */}
            {Array.from({ length: 13 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-border"
                style={{ left: `${(i / 13) * 100}%` }}
              />
            ))}

            {/* 5-minute dividers (lighter) */}
            {fiveMinuteMarkers.map((marker) => (
              <div
                key={marker.index}
                className="absolute top-0 bottom-0 w-px bg-border/20"
                style={{ left: `${(marker.index / 144) * 100}%` }}
              />
            ))}

            {/* Time blocks */}
            {data.map((block: any, idx: number) => (
              <TimeBlockComponent
                key={idx}
                block={block}
                onClick={() => onBlockClick(block)}
                onHover={(e: any) => onBlockHover(block, e)}
                onLeave={() => onBlockHover(null)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeBlockComponent({ block, onClick, onHover, onLeave }: any) {
  const statusStyles = {
    compliant: "bg-[#BFDBFE] text-[#1E40AF]",
    at_risk: "bg-[#FEF3C7] text-[#92400E] animate-pulse-slow",
    rejected: "bg-[#FEE2E2] text-[#B91C1C] animate-shake",
  };

  // Calculate position based on time (8am = 0%, 8pm = 100%)
  const startHour = new Date(block.startTime).getHours();
  const startMinute = new Date(block.startTime).getMinutes();
  const startPercent = ((startHour - 8) * 60 + startMinute) / (12 * 60) * 100;
  
  const duration = block.endTime - block.startTime;
  const widthPercent = (duration / (1000 * 60 * 5)) * (100 / 144); // 5-min blocks out of 144 total

  return (
    <div
      className={`absolute h-[46px] rounded mx-0.5 my-0.5 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${
        statusStyles[block.complianceStatus as ComplianceStatus]
      }`}
      style={{
        left: `${Math.max(0, Math.min(100, startPercent))}%`,
        width: `${Math.max(0.5, widthPercent)}%`,
        top: `${Math.floor((startHour - 8) * 50)}px`,
      }}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="px-1 pt-0.5 font-inter text-xs font-medium truncate">
        {block.activity || "Work"}
      </div>
      <div className="px-1 font-inter text-[10px] text-current/80 truncate">
        {block.website || ""}
      </div>
    </div>
  );
}

function WeekView({ data, currentDate, onDayClick }: any) {
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });

  const getDayData = (date: Date) => {
    const dayBlocks = data.filter((block: any) => {
      const blockDate = new Date(block.startTime);
      return blockDate.toDateString() === date.toDateString();
    });
    
    const compliant = dayBlocks.filter((b: any) => b.complianceStatus === "compliant").length;
    const atRisk = dayBlocks.filter((b: any) => b.complianceStatus === "at_risk").length;
    const rejected = dayBlocks.filter((b: any) => b.complianceStatus === "rejected").length;
    const totalHours = (dayBlocks.length * 5) / 60;
    const rejectedHours = (rejected * 5) / 60;
    
    return { compliant, atRisk, rejected, totalHours, rejectedHours };
  };

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="grid grid-cols-7 gap-3">
        {/* Day headers */}
        {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
          <div key={idx} className="text-center font-[Space_Grotesk] font-semibold text-sm text-muted-foreground pb-2">
            {day}
          </div>
        ))}
        
        {/* Day cells */}
        {days.map((day, idx) => {
          const dayData = getDayData(day);
          const hasData = dayData.totalHours > 0;
          const earnings = dayData.totalHours * 25; // Mock hourly rate
          
          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className="aspect-square rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center p-3"
            >
              <div className="font-[Inter] text-xs text-muted-foreground mb-1">
                {day.getDate()}
              </div>
              {hasData ? (
                <>
                  <div className={`font-[Space_Grotesk] font-bold text-lg ${
                    dayData.rejected > 0 ? "text-[#DC2626]" :
                    dayData.atRisk > 0 ? "text-[#D97706]" :
                    "text-[#16A34A]"
                  }`}>
                    +${earnings.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {dayData.totalHours.toFixed(1)}h
                  </div>
                </>
              ) : (
                <div className="font-[Space_Grotesk] font-semibold text-base text-muted-foreground">
                  $0
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ data, currentDate, onDayClick }: any) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first day of month and calculate offset
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  // Create array of all days including offset
  const days = Array.from({ length: startOffset + daysInMonth }, (_, i) => {
    if (i < startOffset) return null;
    const day = new Date(year, month, i - startOffset + 1);
    return day;
  });

  const getDayData = (date: Date | null) => {
    if (!date) return { totalHours: 0, earnings: 0, rejected: 0, atRisk: 0 };
    
    const dayBlocks = data.filter((block: any) => {
      const blockDate = new Date(block.startTime);
      return blockDate.toDateString() === date.toDateString();
    });
    
    const rejected = dayBlocks.filter((b: any) => b.complianceStatus === "rejected").length;
    const atRisk = dayBlocks.filter((b: any) => b.complianceStatus === "at_risk").length;
    const totalHours = (dayBlocks.length * 5) / 60;
    const earnings = totalHours * 25;
    
    return { totalHours, earnings, rejected, atRisk };
  };

  return (
    <div className="h-full p-6 flex flex-col">
      <div className="grid grid-cols-7 gap-2 flex-1">
        {/* Day headers */}
        {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
          <div key={idx} className="text-center font-[Space_Grotesk] font-semibold text-sm text-muted-foreground pb-1">
            {day}
          </div>
        ))}
        
        {/* Day cells */}
        {days.map((day, idx) => {
          if (!day) {
            return <div key={idx} className="min-h-0" />;
          }
          
          const dayData = getDayData(day);
          const hasData = dayData.totalHours > 0;
          
          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className="min-h-0 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center p-1.5"
            >
              <div className="font-[Inter] text-xs text-muted-foreground mb-0.5">
                {day.getDate()}
              </div>
              {hasData ? (
                <>
                  <div className={`font-[Space_Grotesk] font-bold text-sm ${
                    dayData.rejected > 0 ? "text-[#DC2626]" :
                    dayData.atRisk > 0 ? "text-[#D97706]" :
                    "text-[#16A34A]"
                  }`}>
                    +${dayData.earnings.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {dayData.totalHours.toFixed(1)}h
                  </div>
                </>
              ) : (
                <div className="font-[Space_Grotesk] font-semibold text-xs text-muted-foreground">
                  $0
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({ data, currentDate, onMonthClick }: any) {
  const year = currentDate.getFullYear();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getMonthData = (monthIndex: number) => {
    const monthBlocks = data.filter((block: any) => {
      const blockDate = new Date(block.startTime);
      return blockDate.getFullYear() === year && blockDate.getMonth() === monthIndex;
    });
    
    const compliant = monthBlocks.filter((b: any) => b.complianceStatus === "compliant").length;
    const atRisk = monthBlocks.filter((b: any) => b.complianceStatus === "at_risk").length;
    const rejected = monthBlocks.filter((b: any) => b.complianceStatus === "rejected").length;
    const totalHours = (monthBlocks.length * 5) / 60;
    const earnings = totalHours * 25;
    
    return { compliant, atRisk, rejected, totalHours, earnings };
  };

  return (
    <div className="h-full p-6 flex flex-col">
      <div className="grid grid-cols-4 grid-rows-3 gap-3 flex-1">
        {months.map((month, idx) => {
          const monthData = getMonthData(idx);
          const hasData = monthData.totalHours > 0;
          
          return (
            <div
              key={idx}
              onClick={() => {
                const newDate = new Date(year, idx, 1);
                onMonthClick(newDate);
              }}
              className="min-h-0 rounded-xl border border-border bg-card hover:bg-muted/50 cursor-pointer transition-all hover:shadow-lg p-4 flex flex-col items-center justify-center"
            >
              <div className="font-[Space_Grotesk] font-semibold text-base text-foreground mb-2">
                {month}
              </div>
              {hasData ? (
                <>
                  <div className={`font-[Space_Grotesk] font-bold text-2xl mb-1 ${
                    monthData.rejected > 0 ? "text-[#DC2626]" :
                    monthData.atRisk > 0 ? "text-[#D97706]" :
                    "text-[#16A34A]"
                  }`}>
                    +${monthData.earnings.toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {monthData.totalHours.toFixed(0)}h worked
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#16A34A]"
                      style={{ width: `${(monthData.compliant / (monthData.compliant + monthData.atRisk + monthData.rejected)) * 100}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="font-[Space_Grotesk] font-semibold text-xl text-muted-foreground">
                  $0
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeBlockTooltip({ block, position, onGenerateDispute }: any) {
  return (
    <motion.div
      className="fixed z-[10000] w-[300px] bg-popover text-popover-foreground rounded-lg shadow-xl border border-border p-4 pointer-events-auto"
      style={{ left: position.x + 10, top: position.y - 100 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="font-[Space_Grotesk] font-semibold text-base mb-2">
        {new Date(block.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(block.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="font-inter text-sm text-muted-foreground mb-2">{block.activity}</div>
      <div className="font-inter text-xs text-muted-foreground mb-2">{block.website}</div>
      <div className="font-inter text-sm font-medium mb-2">
        Status: <span className={block.complianceStatus === "compliant" ? "text-green-600" : block.complianceStatus === "at_risk" ? "text-yellow-600" : "text-red-600"}>
          {block.complianceStatus === "compliant" ? "✅ Compliant" : block.complianceStatus === "at_risk" ? "⚠️ At Risk" : "❌ Rejected"}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        Screenshots: {block.screenshotCount} | Mouse: {block.mouseActivity ? "✓" : "✗"} | Keyboard: {block.keyboardActivity ? "✓" : "✗"}
      </div>
      {block.complianceStatus !== "compliant" && (
        <Button
          size="sm"
          className="w-full mt-3 bg-primary hover:bg-primary/90"
          onClick={onGenerateDispute}
        >
          Generate Dispute Report
        </Button>
      )}
    </motion.div>
  );
}

function LegendItem({ status, label }: { status: ComplianceStatus; label: string }) {
  const styles = {
    compliant: "bg-[#BFDBFE]",
    at_risk: "bg-[#FEF3C7]",
    rejected: "bg-[#FEE2E2]",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded ${styles[status]}`} />
      <span className="font-inter text-sm text-foreground">{label}</span>
    </div>
  );
}

function HourDetailModal({ isOpen, onClose, block, onGenerateDispute }: any) {
  if (!block) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Time Block Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="font-[Space_Grotesk] font-semibold text-lg">
            {new Date(block.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(block.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          
          <div>
            <div className="font-inter font-medium text-base mb-1">{block.activity}</div>
            <div className="font-inter text-sm text-muted-foreground">{block.website}</div>
            {block.platform && (
              <div className="font-inter text-xs text-muted-foreground mt-1">Platform: {block.platform}</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground">Screenshots</div>
              <div className="text-lg font-semibold">{block.screenshotCount}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground">Mouse Activity</div>
              <div className="text-lg font-semibold">{block.mouseActivity ? "✓" : "✗"}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground">Keyboard Activity</div>
              <div className="text-lg font-semibold">{block.keyboardActivity ? "✓" : "✗"}</div>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${
            block.complianceStatus === "compliant" ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800" :
            block.complianceStatus === "at_risk" ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800" :
            "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
          }`}>
            <div className="font-[Space_Grotesk] font-semibold text-base mb-2">
              {block.complianceStatus === "compliant" ? "✅ Full Protection" :
               block.complianceStatus === "at_risk" ? "⚠️ At Risk" :
               "❌ Rejected"}
            </div>
            <div className="font-inter text-sm">
              {block.complianceStatus === "compliant" 
                ? "This time block meets all platform requirements. Your payment protection is secured."
                : "This time block may be rejected. Generate a dispute report for protection."}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {block.complianceStatus !== "compliant" && (
            <Button onClick={onGenerateDispute} className="bg-primary">
              Generate Dispute Report
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function getStartDate(date: Date, view: TimeView): number {
  const d = new Date(date);
  switch (view) {
    case "day":
      d.setHours(0, 0, 0, 0);
      break;
    case "week":
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      break;
    case "month":
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      break;
    case "year":
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      break;
  }
  return d.getTime();
}

function getEndDate(date: Date, view: TimeView): number {
  const d = new Date(date);
  switch (view) {
    case "day":
      d.setHours(23, 59, 59, 999);
      break;
    case "week":
      d.setDate(d.getDate() - d.getDay() + 6);
      d.setHours(23, 59, 59, 999);
      break;
    case "month":
      d.setMonth(d.getMonth() + 1, 0);
      d.setHours(23, 59, 59, 999);
      break;
    case "year":
      d.setMonth(11, 31);
      d.setHours(23, 59, 59, 999);
      break;
  }
  return d.getTime();
}

function formatPeriodLabel(date: Date, view: TimeView): string {
  const options: Intl.DateTimeFormatOptions = {};
  switch (view) {
    case "day":
      return `Today, ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    case "week":
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    case "month":
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    case "year":
      return date.getFullYear().toString();
  }
}

function calculateComplianceScore(data: any[]): number {
  if (!data.length) return 100;
  const compliant = data.filter(b => b.complianceStatus === "compliant").length;
  return Math.round((compliant / data.length) * 100);
}

function calculateAtRiskHours(data: any[]): number {
  const atRisk = data.filter(b => b.complianceStatus === "at_risk" || b.complianceStatus === "rejected");
  return Math.round((atRisk.length * 5) / 60 * 10) / 10;
}