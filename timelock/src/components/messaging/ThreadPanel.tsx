import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Reply, Send } from "lucide-react";
import type { MessageInfo } from "./MessageList";

interface ThreadPanelProps {
  parentMessage: MessageInfo | null;
  replies: MessageInfo[];
  currentUserId?: string;
  onSendReply: (body: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onClose: () => void;
  className?: string;
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ThreadPanel({
  parentMessage,
  replies,
  currentUserId,
  onSendReply,
  onReact,
  onClose,
  className,
}: ThreadPanelProps) {
  const [replyText, setReplyText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [replies.length]);

  const handleSubmit = () => {
    if (!replyText.trim()) return;
    onSendReply(replyText.trim());
    setReplyText("");
  };

  if (!parentMessage) return null;

  return (
    <div className={cn("w-80 border-l bg-background flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Reply className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Thread</h3>
          <span className="text-xs text-muted-foreground">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {/* Parent message */}
          <div className="flex gap-3 pb-3 border-b">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-gradient-to-br from-primary/30 to-primary/50 text-primary-foreground">
                {getInitials(parentMessage.authorName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">{parentMessage.authorName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {formatTime(parentMessage.createdAt)}
                </span>
              </div>
              <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
                {parentMessage.body}
              </p>
              {parentMessage.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {parentMessage.reactions.map((r) => (
                    <button
                      key={r.emoji}
                      onClick={() => onReact(parentMessage._id, r.emoji)}
                      className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border",
                        r.hasUser
                          ? "bg-primary/10 border-primary/30"
                          : "bg-muted/50 border-border"
                      )}
                    >
                      {r.emoji} {r.count}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Replies */}
          {replies.map((reply) => (
            <div key={reply._id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/20 to-primary/40 text-primary-foreground">
                  {getInitials(reply.authorName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{reply.authorName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTime(reply.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
                  {reply.body}
                </p>
                {reply.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {reply.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        onClick={() => onReact(reply._id, r.emoji)}
                        className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border",
                          r.hasUser
                            ? "bg-primary/10 border-primary/30"
                            : "bg-muted/50 border-border"
                        )}
                      >
                        {r.emoji} {r.count}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {replies.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No replies yet. Start the thread!
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Reply input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Reply..."
            className="h-8 text-sm"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            disabled={!replyText.trim()}
            onClick={handleSubmit}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
