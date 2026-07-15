/**
 * NotificationCenter — Global notification bell + dropdown panel
 *
 * Features:
 * - Bell icon with unread badge count
 * - Dropdown panel showing notifications (rendered via portal to avoid sidebar overflow clipping)
 * - Unseen notifications highlighted with accent color + dot
 * - Click to mark as seen AND navigate to the relevant page
 * - "Mark all as read" action
 * - Connected to the global useNotifications hook
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, X, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
import { useNavigate } from "react-router";

function fmtRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAsSeen, markAllSeen } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  // Calculate panel position based on button position
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPanelPos({
      top: rect.bottom + 8,
      left: Math.max(8, Math.min(rect.left - 320 + rect.width, window.innerWidth - 376)),
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is inside the notification panel or on the bell button
      if (
        target.closest("[data-notification-panel]") ||
        target.closest("[data-notification-bell]")
      ) {
        return;
      }
      setIsOpen(false);
    };
    // Use timeout to avoid closing immediately on the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Auto-mark all as seen when opening the notification center
  // This ensures that once a user opens the panel, the badge clears
  // and won't re-appear on page navigation (unless new data arrives)
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      // Small delay so the user can see the notifications before they're marked
      const timer = setTimeout(() => {
        markAllSeen();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, unreadCount, markAllSeen]);

  const handleNotifClick = (notif: typeof notifications[0]) => {
    markAsSeen(notif.dedupKey);
    setIsOpen(false);
    navigate(notif.href);
  };

  const panel = isOpen && panelPos ? (
    <motion.div
      data-notification-panel
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="fixed w-[360px] max-w-[calc(100vw-16px)] max-h-[480px] overflow-y-auto bg-popover border border-border rounded-xl shadow-xl z-[10001]"
      style={{ top: panelPos.top, left: panelPos.left }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-popover border-b border-border px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                markAllSeen();
              }}
              className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleNotifClick(notif)}
              className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                !notif.seen ? "bg-primary/[0.08] border-l-2 border-l-primary" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notif.iconColor}`}
                >
                  <notif.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm ${
                        !notif.seen
                          ? "font-semibold text-foreground"
                          : "font-medium text-foreground/80"
                      }`}
                    >
                      {notif.title}
                    </p>
                    {!notif.seen && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {notif.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {fmtRelative(notif.timestamp)}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </motion.div>
  ) : null;

  return (
    <>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        data-notification-bell
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl hover:bg-accent transition-colors"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-6 w-6 text-foreground animate-pulse" />
        ) : (
          <Bell className="h-6 w-6 text-muted-foreground hover:text-foreground" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel via Portal */}
      {createPortal(
        <AnimatePresence>{panel}</AnimatePresence>,
        document.body
      )}
    </>
  );
}
