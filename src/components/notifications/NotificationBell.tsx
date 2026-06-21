import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  BellRing,
  CheckCheck,
  X,
  Clock,
  Send,
  FileText,
  Receipt,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Notification = {
  _id: Id<"notifications">;
  userId: Id<"users">;
  type: string;
  title: string;
  body: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  severity?: "info" | "success" | "warning" | "danger";
  read: boolean;
  readAt?: number;
  dismissed?: boolean;
  createdAt: number;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk}w ago`;
  return new Date(ts).toLocaleDateString();
}

function getIconAndColor(n: Notification): { icon: typeof Bell; color: string; bg: string } {
  switch (n.type) {
    case "send_reminder":
      return { icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950/60" };
    case "follow_up_due":
      return { icon: Send, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/60" };
    case "payment_reminder":
      return { icon: Receipt, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-950/60" };
    case "proposal_viewed":
      return { icon: Eye, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-950/60" };
    case "proposal_signed":
      return { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/60" };
    case "proposal_declined":
      return { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/60" };
    case "invoice_viewed":
      return { icon: Eye, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-950/60" };
    case "invoice_paid":
      return { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/60" };
    case "invoice_overdue":
      return { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/60" };
    default:
      return { icon: Info, color: "text-muted-foreground", bg: "bg-muted" };
  }
}

// ─────────────────────────────────────────────
// Notification item (used in the panel)
// ─────────────────────────────────────────────

function NotificationItem({
  n,
  onNavigate,
  onDismiss,
}: {
  n: Notification;
  onNavigate: (link?: string) => void;
  onDismiss: (id: Id<"notifications">) => void;
}) {
  const { icon: Icon, color, bg } = getIconAndColor(n);

  return (
    <div
      className={`relative group flex gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-accent/50 ${
        !n.read ? "bg-accent/30" : ""
      }`}
      onClick={() => onNavigate(n.link)}
    >
      {!n.read && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
      )}
      <div className={`mt-0.5 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[13px] font-semibold text-foreground line-clamp-1 ${!n.read ? "" : "opacity-80"}`}>
            {n.title}
          </p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {formatRelative(n.createdAt)}
          </span>
        </div>
        <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">
          {n.body}
        </p>
      </div>
      <button
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(n._id);
        }}
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main bell + panel
// ─────────────────────────────────────────────

export function NotificationBell({ isExpanded = true }: { isExpanded?: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const notifications = (useQuery(api.notifications.list, { limit: 25, includeRead: true }) ?? []) as Notification[];
  const unreadCount = (useQuery(api.notifications.unreadCount, {}) ?? 0) as number;

  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const dismiss = useMutation(api.notifications.dismiss);

  const visible = useMemo(
    () => notifications.filter((n) => !n.dismissed),
    [notifications]
  );

  const handleNavigate = (link?: string) => {
    setOpen(false);
    if (link) navigate(link);
  };

  const handleDismiss = async (id: Id<"notifications">) => {
    try {
      await dismiss({ notificationId: id });
    } catch (err: any) {
      toast.error("Failed to dismiss", { description: err.message });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead({});
    } catch (err: any) {
      toast.error("Failed to mark all as read", { description: err.message });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/60 text-sidebar-foreground transition-colors w-full"
          aria-label="Notifications"
        >
          <div className="relative">
            {unreadCount > 0 ? (
              <BellRing className="h-4 w-4 text-sidebar-foreground" />
            ) : (
              <Bell className="h-4 w-4 text-sidebar-foreground/70" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-3.5 min-w-3.5 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          {isExpanded && (
            <span className="text-[13px] text-sidebar-foreground/80">Notifications</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={isExpanded ? "center" : "start"}
        side="right"
        sideOffset={8}
        className="w-[380px] p-0"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-foreground" />
            <span className="text-[14px] font-semibold text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] gap-1"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-[13px] font-medium text-foreground">You're all caught up</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                New notifications about follow-ups, reminders, and client activity will appear here.
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <AnimatePresence>
                {visible.map((n) => (
                  <motion.div
                    key={n._id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.15 }}
                  >
                    <NotificationItem
                      n={n}
                      onNavigate={handleNavigate}
                      onDismiss={handleDismiss}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
