import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Clock, Monitor, MousePointer, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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

// ─── Color tokens ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<ComplianceStatus, { bg: string; text: string; border: string; dot: string }> = {
  compliant: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-800 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800", dot: "bg-blue-500" },
  at_risk:    { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  rejected:   { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-800 dark:text-red-300", border: "border-red-200 dark:border-red-800", dot: "bg-red-500" },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Main Component ──────────────────────────────────────────────────────────

export function TimelinePopup({ isOpen, onClose, initialDate = new Date(), initialView = "day" }: TimelinePopupProps) {
  const [currentView, setCurrentView] = useState<TimeView>(initialView);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Mock timeline data
  const timelineData = useMemo(() => {
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
    return blocks;
  }, [currentDate]);

  const complianceScore = calculateComplianceScore(timelineData);
  const atRiskHours = calculateAtRiskHours(timelineData);

  const navigatePrevious = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (currentView === "day") d.setDate(d.getDate() - 1);
      else if (currentView === "week") d.setDate(d.getDate() - 7);
      else if (currentView === "month") d.setMonth(d.getMonth() - 1);
      else d.setFullYear(d.getFullYear() - 1);
      return d;
    });
  };

  const navigateNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (currentView === "day") d.setDate(d.getDate() + 1);
      else if (currentView === "week") d.setDate(d.getDate() + 7);
      else if (currentView === "month") d.setMonth(d.getMonth() + 1);
      else d.setFullYear(d.getFullYear() + 1);
      return d;
    });
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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[1200px] h-[88vh] bg-white dark:bg-card rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
              <h2 className="font-semibold text-lg text-foreground tracking-tight">Work Timeline</h2>

              {/* View Tabs */}
              <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
                {(["day", "week", "month", "year"] as TimeView[]).map((view) => (
                  <button
                    key={view}
                    onClick={() => setCurrentView(view)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      currentView === view
                        ? "bg-white dark:bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>

              <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors" aria-label="Close">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* ─── Date Navigator + Score ─── */}
            <div className="flex items-center justify-between px-6 py-2 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={navigatePrevious} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors" aria-label="Previous">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-medium text-base text-foreground min-w-[180px] text-center">
                  {formatPeriodLabel(currentDate, currentView)}
                </span>
                <button onClick={navigateNext} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors" aria-label="Next">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="ml-1 text-xs font-medium px-2.5 py-1 rounded-md border border-border hover:bg-muted transition-colors"
                >
                  Today
                </button>
              </div>
              <ComplianceScoreDisplay score={complianceScore} atRiskHours={atRiskHours} />
            </div>

            {/* ─── Content ─── */}
            <div className="flex-1 overflow-hidden min-h-0">
              {currentView === "day" && (
                <DayView data={timelineData} onBlockClick={(block: TimeBlock) => { setSelectedBlock(block); setShowDetailModal(true); }} />
              )}
              {currentView === "week" && (
                <WeekView
                  data={timelineData}
                  currentDate={currentDate}
                  onDayClick={(date: Date) => { setCurrentDate(date); setCurrentView("day"); }}
                />
              )}
              {currentView === "month" && (
                <MonthView
                  data={timelineData}
                  currentDate={currentDate}
                  onDayClick={(date: Date) => { setCurrentDate(date); setCurrentView("day"); }}
                />
              )}
              {currentView === "year" && (
                <YearView
                  data={timelineData}
                  currentDate={currentDate}
                  onMonthClick={(date: Date) => { setCurrentDate(date); setCurrentView("month"); }}
                />
              )}
            </div>

            {/* ─── Legend ─── */}
            <div className="flex justify-center gap-6 px-6 py-2 border-t border-border flex-shrink-0">
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
          />
        </>
      )}
    </AnimatePresence>
  );
}

// ─── DayView — Google Calendar style, no scroll ──────────────────────────────

function DayView({ data, onBlockClick }: { data: TimeBlock[]; onBlockClick: (b: TimeBlock) => void }) {
  // 8 AM – 8 PM = 13 hours displayed in a fixed grid
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  return (
    <div className="h-full flex flex-col">
      {/* All-day events bar */}
      <div className="flex border-b border-border flex-shrink-0">
        <div className="w-14 flex-shrink-0 border-r border-border" />
        <div className="flex-1 py-1 px-2 text-[11px] text-muted-foreground">No all-day events</div>
      </div>

      {/* Time grid — fills remaining space, no scroll */}
      <div className="flex-1 min-h-0 relative">
        {/* Time gutter */}
        <div className="absolute left-0 top-0 bottom-0 w-14 border-r border-border">
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium leading-none"
              style={{ top: `${((hour - 8) / 13) * 100}%` }}
            >
              {formatHourShort(hour)}
            </div>
          ))}
        </div>

        {/* Grid area */}
        <div className="absolute left-14 top-0 bottom-0 right-0">
          {/* Hour divider lines */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-border"
              style={{ top: `${((hour - 8) / 13) * 100}%` }}
            />
          ))}
          {/* Half-hour dashed lines */}
          {hours.map((hour) => (
            <div
              key={`half-${hour}`}
              className="absolute left-0 right-0 border-t border-dashed border-border/40"
              style={{ top: `${((hour - 8 + 0.5) / 13) * 100}%` }}
            />
          ))}

          {/* Current time indicator */}
          {(() => {
            const now = new Date();
            const nowHour = now.getHours() + now.getMinutes() / 60;
            if (nowHour >= 8 && nowHour <= 21) {
              const topPct = ((nowHour - 8) / 13) * 100;
              return (
                <div className="absolute left-0 right-0 z-10 flex items-center" style={{ top: `${topPct}%` }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
                  <div className="flex-1 h-[2px] bg-red-500" />
                </div>
              );
            }
            return null;
          })()}

          {/* Time blocks */}
          {data.map((block) => {
            const colors = STATUS_COLORS[block.complianceStatus];
            const startHour = new Date(block.startTime).getHours() + new Date(block.startTime).getMinutes() / 60;
            const endHour = new Date(block.endTime).getHours() + new Date(block.endTime).getMinutes() / 60;
            const topPct = Math.max(0, ((startHour - 8) / 13) * 100);
            const heightPct = Math.max(3, ((endHour - startHour) / 13) * 100);

            return (
              <button
                key={block._id}
                onClick={() => onBlockClick(block)}
                className={`absolute left-1 right-2 rounded-md border ${colors.border} ${colors.bg} ${colors.text} px-2 py-0.5 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 overflow-hidden`}
                style={{ top: `${topPct}%`, height: `${heightPct}%` }}
              >
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
                  <span className="text-[11px] font-semibold truncate">{block.activity}</span>
                </div>
                <div className="text-[9px] opacity-70 truncate mt-px">
                  {formatHour(startHour)} – {formatHour(endHour)} &middot; {block.website}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── WeekView ─────────────────────────────────────────────────────────────────

function WeekView({ data, currentDate, onDayClick }: { data: TimeBlock[]; currentDate: Date; onDayClick: (d: Date) => void }) {
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const getDaySummary = (date: Date) => {
    const dayBlocks = data.filter((b) => new Date(b.startTime).toDateString() === date.toDateString());
    const compliant = dayBlocks.filter((b) => b.complianceStatus === "compliant").length;
    const atRisk = dayBlocks.filter((b) => b.complianceStatus === "at_risk").length;
    const rejected = dayBlocks.filter((b) => b.complianceStatus === "rejected").length;
    const totalHours = dayBlocks.length;
    const earnings = totalHours * 25;
    return { compliant, atRisk, rejected, totalHours, earnings };
  };

  const today = new Date();

  return (
    <div className="h-full p-3 flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1.5 flex-shrink-0">
        {days.map((day, i) => {
          const isToday = day.toDateString() === today.toDateString();
          return (
            <div key={i} className="text-center py-1">
              <div className="text-[10px] text-muted-foreground font-medium">{DAY_NAMES[day.getDay()]}</div>
              <div className={`text-sm font-semibold mt-0.5 w-6 h-6 rounded-full flex items-center justify-center mx-auto ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
        {days.map((day, i) => {
          const summary = getDaySummary(day);
          const hasData = summary.totalHours > 0;
          const isToday = day.toDateString() === today.toDateString();

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={`rounded-lg border transition-all hover:shadow-md flex flex-col items-center justify-center p-1.5 min-h-0 ${
                isToday ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              {hasData ? (
                <>
                  <div className={`text-sm font-bold ${summary.rejected > 0 ? "text-red-600" : summary.atRisk > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    +${summary.earnings}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{summary.totalHours}h</div>
                  <div className="flex gap-0.5 mt-1">
                    {summary.compliant > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    {summary.atRisk > 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    {summary.rejected > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">$0</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MonthView ────────────────────────────────────────────────────────────────

function MonthView({ data, currentDate, onDayClick }: { data: TimeBlock[]; currentDate: Date; onDayClick: (d: Date) => void }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const getDaySummary = (date: Date | null) => {
    if (!date) return { totalHours: 0, earnings: 0, rejected: 0, atRisk: 0 };
    const dayBlocks = data.filter((b) => new Date(b.startTime).toDateString() === date.toDateString());
    return {
      totalHours: dayBlocks.length,
      earnings: dayBlocks.length * 25,
      rejected: dayBlocks.filter((b) => b.complianceStatus === "rejected").length,
      atRisk: dayBlocks.filter((b) => b.complianceStatus === "at_risk").length,
    };
  };

  return (
    <div className="h-full p-3 flex flex-col">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1 flex-shrink-0">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">{name}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 flex-1 min-h-0 auto-rows-fr">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const summary = getDaySummary(day);
          const isToday = day.toDateString() === today.toDateString();
          const hasData = summary.totalHours > 0;

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={`rounded border text-left px-1 py-0.5 transition-all hover:shadow-sm min-h-0 flex flex-col justify-start ${
                isToday ? "border-primary/50 bg-primary/5" : "border-border/50 hover:bg-muted/50"
              }`}
            >
              <div className={`text-[10px] font-medium leading-none ${isToday ? "text-primary" : "text-foreground"}`}>
                {day.getDate()}
              </div>
              {hasData && (
                <div className={`text-[9px] font-semibold mt-px ${summary.rejected > 0 ? "text-red-600" : summary.atRisk > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  ${summary.earnings}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── YearView — 4×3 grid that fits without scrolling ─────────────────────────

function YearView({ data, currentDate, onMonthClick }: { data: TimeBlock[]; currentDate: Date; onMonthClick: (d: Date) => void }) {
  const year = currentDate.getFullYear();
  const today = new Date();

  const getMonthSummary = (monthIdx: number) => {
    const monthBlocks = data.filter((b) => {
      const bd = new Date(b.startTime);
      return bd.getFullYear() === year && bd.getMonth() === monthIdx;
    });
    const compliant = monthBlocks.filter((b) => b.complianceStatus === "compliant").length;
    const atRisk = monthBlocks.filter((b) => b.complianceStatus === "at_risk").length;
    const rejected = monthBlocks.filter((b) => b.complianceStatus === "rejected").length;
    const totalHours = monthBlocks.length;
    const earnings = totalHours * 25;
    const compliancePct = monthBlocks.length > 0 ? Math.round((compliant / monthBlocks.length) * 100) : 0;
    return { compliant, atRisk, rejected, totalHours, earnings, compliancePct };
  };

  return (
    <div className="h-full p-3">
      <div className="grid grid-cols-4 grid-rows-3 gap-1.5 h-full">
        {MONTH_SHORT.map((month, idx) => {
          const summary = getMonthSummary(idx);
          const hasData = summary.totalHours > 0;
          const isCurrentMonth = idx === today.getMonth() && year === today.getFullYear();
          const barColor = summary.rejected > 0 ? "bg-red-500" : summary.atRisk > 0 ? "bg-amber-500" : "bg-emerald-500";

          return (
            <button
              key={idx}
              onClick={() => onMonthClick(new Date(year, idx, 1))}
              className={`rounded-lg border flex flex-col items-center justify-center transition-all hover:shadow-md min-h-0 overflow-hidden ${
                isCurrentMonth ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <div className={`text-[11px] font-semibold leading-tight ${isCurrentMonth ? "text-primary" : "text-foreground"}`}>
                {month}
              </div>
              {hasData ? (
                <>
                  <div className={`text-base font-bold leading-tight mt-0.5 ${
                    summary.rejected > 0 ? "text-red-600" : summary.atRisk > 0 ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    ${summary.earnings}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-px">{summary.totalHours}h</div>
                  <div className="w-3/4 h-1 bg-muted rounded-full overflow-hidden mt-1">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${summary.compliancePct}%` }} />
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground mt-0.5">&mdash;</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ComplianceScoreDisplay({ score, atRiskHours }: { score: number; atRiskHours: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
      <span>{score}/100</span>
      <span className="text-xs font-medium opacity-80">– {atRiskHours}h at risk</span>
    </div>
  );
}

function LegendItem({ status, label }: { status: ComplianceStatus; label: string }) {
  const colors = STATUS_COLORS[status];
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded ${colors.dot}`} />
      <span className="text-xs text-foreground">{label}</span>
    </div>
  );
}

function HourDetailModal({ isOpen, onClose, block }: { isOpen: boolean; onClose: () => void; block: TimeBlock | null }) {
  if (!block) return null;
  const colors = STATUS_COLORS[block.complianceStatus];
  const statusLabel = block.complianceStatus === "compliant" ? "Full Protection" : block.complianceStatus === "at_risk" ? "At Risk" : "Rejected";

  const startHour = new Date(block.startTime).getHours() + new Date(block.startTime).getMinutes() / 60;
  const endHour = new Date(block.endTime).getHours() + new Date(block.endTime).getMinutes() / 60;
  const duration = endHour - startHour;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
            Time Block Details
          </DialogTitle>
          <DialogDescription>View details and compliance status for this time block.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Time & Duration */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatHour(startHour)} – {formatHour(endHour)}</span>
            <span className="text-xs border border-border rounded px-1.5 py-0.5">{duration}h</span>
          </div>

          {/* Activity */}
          <div>
            <div className="font-medium text-foreground break-words">{block.activity}</div>
            <div className="text-sm text-muted-foreground break-all">{block.website}</div>
            {block.platform && <div className="text-xs text-muted-foreground mt-0.5">Platform: {block.platform}</div>}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-muted/50 text-center">
              <Monitor className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-[10px] text-muted-foreground">Screenshots</div>
              <div className="text-sm font-semibold">{block.screenshotCount}</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 text-center">
              <MousePointer className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-[10px] text-muted-foreground">Mouse</div>
              <div className="text-sm font-semibold">{block.mouseActivity ? "Active" : "None"}</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 text-center">
              <Keyboard className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-[10px] text-muted-foreground">Keyboard</div>
              <div className="text-sm font-semibold">{block.keyboardActivity ? "Active" : "None"}</div>
            </div>
          </div>

          {/* Status */}
          <div className={`p-2.5 rounded-lg border ${colors.border} ${colors.bg}`}>
            <div className={`font-semibold text-sm ${colors.text}`}>{statusLabel}</div>
            <div className="text-xs opacity-75 mt-0.5">
              {block.complianceStatus === "compliant"
                ? "This time block meets all platform requirements. Payment protection is secured."
                : "This time block may be rejected. Consider generating a dispute report."}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHourShort(hour: number): string {
  if (hour === 12) return "12 PM";
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

function formatHour(h: number): string {
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return min > 0 ? `${display}:${min.toString().padStart(2, "0")} ${suffix}` : `${display} ${suffix}`;
}

function formatPeriodLabel(date: Date, view: TimeView): string {
  switch (view) {
    case "day":
      return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    case "week": {
      const ws = new Date(date);
      ws.setDate(date.getDate() - date.getDay());
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      return `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    case "month":
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    case "year":
      return String(date.getFullYear());
  }
}

function calculateComplianceScore(data: TimeBlock[]): number {
  if (!data.length) return 100;
  return Math.round((data.filter((b) => b.complianceStatus === "compliant").length / data.length) * 100);
}

function calculateAtRiskHours(data: TimeBlock[]): number {
  return Math.round((data.filter((b) => b.complianceStatus !== "compliant").length * 5) / 60 * 10) / 10;
}
