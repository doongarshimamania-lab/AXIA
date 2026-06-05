import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Reply,
  Pin,
  Trash2,
  Edit3,
  SmilePlus,
  Check,
  MessagesSquare,
  Link2,
  Clock,
} from "lucide-react";

export interface MessageInfo {
  _id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorImage?: string;
  authorEmail?: string;
  body: string;
  messageType: "text" | "system" | "file" | "link";
  isEdited: boolean;
  isPinned: boolean;
  editedAt?: number;
  createdAt: number;
  reactions: { emoji: string; count: number; hasUser: boolean }[];
  threadReplyCount: number;
  lastReplyAt?: number;
  attachments?: { name: string; type: string; size: number; url?: string }[];
}

interface MessageListProps {
  messages: MessageInfo[];
  currentUserId?: string;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onEdit: (messageId: string, newBody: string) => void;
  onOpenThread: (messageId: string) => void;
  onPin: (messageId: string) => void;
  className?: string;
}

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "🎉", "🤔", "👀", "🔥", "✅"];

function formatMessageTime(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;

  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" }) + ` ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function formatDateDivider(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;

  if (diff < 86400000 && date.getDate() === now.getDate()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function groupMessagesByDate(messages: MessageInfo[]): { date: string; timestamp: number; messages: MessageInfo[] }[] {
  const groups: { date: string; timestamp: number; messages: MessageInfo[] }[] = [];
  for (const msg of messages) {
    const dateStr = formatDateDivider(msg.createdAt);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({ date: dateStr, timestamp: msg.createdAt, messages: [msg] });
    }
  }
  return groups;
}

export function MessageList({
  messages,
  currentUserId,
  onReact,
  onDelete,
  onEdit,
  onOpenThread,
  onPin,
  className,
}: MessageListProps) {
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => groupMessagesByDate(messages), [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages.length]);

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessageId]);

  const startEdit = (msg: MessageInfo) => {
    setEditingMessageId(msg._id);
    setEditText(msg.body);
  };

  const saveEdit = () => {
    if (editingMessageId && editText.trim()) {
      onEdit(editingMessageId, editText.trim());
      setEditingMessageId(null);
      setEditText("");
    }
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  return (
    <ScrollArea className={cn("flex-1", className)} ref={scrollRef}>
      <div className="p-4 space-y-1">
        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date Divider */}
            <div className="flex items-center gap-4 py-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {group.date}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Messages */}
            {group.messages.map((msg) => {
              if (msg.messageType === "system") {
                return (
                  <div key={msg._id} className="py-1 px-4">
                    <p className="text-xs text-muted-foreground italic">
                      <span className="font-medium not-italic">{msg.authorName}</span>{" "}
                      {msg.body}
                    </p>
                  </div>
                );
              }

              const isOwn = msg.authorId === currentUserId;

              return (
                <div
                  key={msg._id}
                  className={cn(
                    "group relative flex gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors",
                    hoveredMessageId === msg._id && "bg-muted/30"
                  )}
                  onMouseEnter={() => setHoveredMessageId(msg._id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  {/* Avatar */}
                  <Avatar className="h-9 w-9 mt-0.5 shrink-0">
                    <AvatarImage src={msg.authorImage} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary/30 to-primary/50 text-primary-foreground">
                      {getInitials(msg.authorName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-sm font-semibold", isOwn ? "text-primary" : "text-foreground")}>
                        {msg.authorName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                      {msg.isEdited && (
                        <span className="text-[10px] text-muted-foreground">(edited)</span>
                      )}
                      {msg.isPinned && (
                        <Pin className="h-3 w-3 text-amber-500" />
                      )}
                    </div>

                    {/* Body */}
                    {editingMessageId === msg._id ? (
                      <div className="mt-1 flex gap-2">
                        <input
                          ref={editInputRef}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="flex-1 bg-background border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <Button size="sm" variant="ghost" onClick={saveEdit}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                        {msg.body}
                      </div>
                    )}

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((att, i) => (
                          <div
                            key={i}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 border rounded-md text-xs"
                          >
                            <Link2 className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium truncate max-w-[200px]">{att.name}</span>
                            <span className="text-muted-foreground">{formatFileSize(att.size)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reactions */}
                    {msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {msg.reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            onClick={() => onReact(msg._id, reaction.emoji)}
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                              reaction.hasUser
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-muted/50 border-border hover:bg-muted"
                            )}
                          >
                            <span>{reaction.emoji}</span>
                            <span className="font-medium">{reaction.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Thread Reply Indicator */}
                    {msg.threadReplyCount > 0 && (
                      <button
                        onClick={() => onOpenThread(msg._id)}
                        className="mt-1.5 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        <MessagesSquare className="h-3 w-3" />
                        {msg.threadReplyCount} {msg.threadReplyCount === 1 ? "reply" : "replies"}
                        {msg.lastReplyAt && (
                          <span className="text-muted-foreground">
                            · Last reply {formatMessageTime(msg.lastReplyAt)}
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Action Bar (on hover) */}
                  {hoveredMessageId === msg._id && editingMessageId !== msg._id && (
                    <div className="absolute -top-3 right-2 flex items-center gap-0.5 bg-background border rounded-md shadow-sm px-0.5 py-0.5 z-10">
                      <TooltipProvider delayDuration={100}>
                        {/* Quick reactions */}
                        {EMOJI_REACTIONS.slice(0, 4).map((emoji) => (
                          <Tooltip key={emoji}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => onReact(msg._id, emoji)}
                                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-sm"
                              >
                                {emoji}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              React {emoji}
                            </TooltipContent>
                          </Tooltip>
                        ))}

                        <div className="h-4 w-px bg-border mx-0.5" />

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onOpenThread(msg._id)}
                              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
                            >
                              <Reply className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Reply in thread
                          </TooltipContent>
                        </Tooltip>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {EMOJI_REACTIONS.slice(4).map((emoji) => (
                              <DropdownMenuItem
                                key={emoji}
                                onClick={() => onReact(msg._id, emoji)}
                              >
                                <span className="mr-2">{emoji}</span>
                                React
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onPin(msg._id)}>
                              <Pin className="h-4 w-4 mr-2" />
                              {msg.isPinned ? "Unpin" : "Pin"} message
                            </DropdownMenuItem>
                            {isOwn && (
                              <DropdownMenuItem onClick={() => startEdit(msg)}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit message
                              </DropdownMenuItem>
                            )}
                            {(isOwn || true) && (
                              <DropdownMenuItem
                                onClick={() => onDelete(msg._id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete message
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground">No messages yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start the conversation by sending a message below
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

import { MessageSquare } from "lucide-react";
