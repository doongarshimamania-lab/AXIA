import { useRef, useEffect, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Smile,
  Reply,
  MoreHorizontal,
  Pin,
  Pencil,
  Trash2,
  Check,
  X,
  MessageSquare,
  CheckCheck,
} from "lucide-react";
import { format } from "date-fns";

export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: number;
  isEdited: boolean;
  isPinned: boolean;
  reactions: { emoji: string; count: number; hasReacted: boolean }[];
  threadReplyCount: number;
  lastThreadReplyTime?: number;
  threadParticipants?: string[];
  readBy?: string[];
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  onOpenThread: (messageId: string) => void;
}

function groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const msgDate = format(new Date(msg.timestamp), "MMMM d, yyyy");
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ date: msgDate, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

export function MessageList({
  messages,
  currentUserId,
  onReact,
  onReply,
  onPin,
  onEdit,
  onDelete,
  onOpenThread,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);

  // Auto-scroll to bottom when new messages arrive (only if user is already at bottom)
  useEffect(() => {
    if (isUserAtBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isUserAtBottom]);

  // Track whether user has scrolled up (away from bottom)
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setIsUserAtBottom(atBottom);
  }, []);

  // Initial scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, []);

  const grouped = groupMessagesByDate(messages);

  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = (messageId: string) => {
    if (editContent.trim()) {
      onEdit(messageId, editContent.trim());
    }
    setEditingMessageId(null);
    setEditContent("");
  };

  const formatTime = (ts: number) => {
    return format(new Date(ts), "h:mm a");
  };

  const isConsecutive = (msg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return false;
    return (
      msg.authorId === prevMsg.authorId &&
      msg.timestamp - prevMsg.timestamp < 300000 // 5 min
    );
  };

  // Read receipt logic: show check marks only on YOUR messages
  const getReadStatus = (msg: Message) => {
    if (msg.authorId !== currentUserId) return null;
    const readByOthers = (msg.readBy || []).filter((id) => id !== currentUserId);
    if (readByOthers.length > 0) return "seen"; // ✓✓ blue
    return "sent"; // ✓ gray
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto min-h-0"
    >
      <div className="p-4 space-y-0.5">
        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium text-muted-foreground">
                {group.date}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Messages */}
            {group.messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
              const consecutive = isConsecutive(msg, prevMsg);
              const readStatus = getReadStatus(msg);

              return (
                <div
                  key={msg.id}
                  className={`group relative flex gap-3 px-2 py-0.5 rounded-lg transition-colors ${
                    hoveredMessageId === msg.id ? "bg-accent/50" : ""
                  } ${consecutive ? "ml-11" : ""}`}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  {/* Avatar */}
                  {!consecutive && (
                    <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                      <AvatarImage src={msg.authorAvatar} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-violet-400 to-indigo-500 text-white">
                        {msg.authorName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    {!consecutive && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-semibold text-sm">
                          {msg.authorName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    )}

                    {editingMessageId === msg.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(msg.id);
                            if (e.key === "Escape") setEditingMessageId(null);
                          }}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleSaveEdit(msg.id)}
                        >
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setEditingMessageId(null)}
                        >
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-end gap-1.5">
                        <div className="text-sm leading-relaxed break-words">
                          {msg.content}
                          {msg.isEdited && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              (edited)
                            </span>
                          )}
                        </div>
                        {/* Read receipt indicator */}
                        {readStatus && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex-shrink-0 mb-0.5">
                                  {readStatus === "seen" ? (
                                    <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5 text-muted-foreground/60" />
                                  )}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {readStatus === "seen" ? "Seen" : "Sent"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}

                    {/* Reactions */}
                    {msg.reactions.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {msg.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => onReact(msg.id, r.emoji)}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                              r.hasReacted
                                ? "border-primary/50 bg-primary/10 text-primary"
                                : "border-border hover:border-primary/30 bg-background"
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[10px]">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Thread Indicator */}
                    {msg.threadReplyCount > 0 && (
                      <button
                        onClick={() => onOpenThread(msg.id)}
                        className="flex items-center gap-1.5 mt-1 text-xs text-primary hover:underline"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>
                          {msg.threadReplyCount}{" "}
                          {msg.threadReplyCount === 1 ? "reply" : "replies"}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Hover Actions */}
                  {hoveredMessageId === msg.id && editingMessageId !== msg.id && (
                    <div className="absolute -top-3 right-2 flex items-center bg-background border border-border rounded-md shadow-sm">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onReact(msg.id, "+1")}
                            >
                              <Smile className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>React</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onReply(msg.id)}
                            >
                              <Reply className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reply in thread</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onOpenThread(msg.id)}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Open thread</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onPin(msg.id)}
                            >
                              <Pin className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {msg.isPinned ? "Unpin" : "Pin"}
                          </TooltipContent>
                        </Tooltip>
                        {msg.authorId === currentUserId && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleStartEdit(msg)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => onDelete(msg.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {/* Invisible element to scroll to */}
        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom button when user has scrolled up */}
      {!isUserAtBottom && messages.length > 0 && (
        <div className="sticky bottom-2 flex justify-center pointer-events-none">
          <button
            onClick={() => {
              if (bottomRef.current) {
                bottomRef.current.scrollIntoView({ behavior: "smooth" });
                setIsUserAtBottom(true);
              }
            }}
            className="pointer-events-auto px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium shadow-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <span>↓</span> New messages
          </button>
        </div>
      )}
    </div>
  );
}
