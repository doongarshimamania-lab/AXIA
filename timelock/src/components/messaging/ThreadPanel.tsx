import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import type { Message } from "./MessageList";

interface ThreadReply {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: number;
}

interface ThreadPanelProps {
  parentMessage: Message | null;
  replies: ThreadReply[];
  onClose: () => void;
  onSendReply: (parentId: string, content: string) => void;
}

export function ThreadPanel({
  parentMessage,
  replies,
  onClose,
  onSendReply,
}: ThreadPanelProps) {
  const [replyContent, setReplyContent] = useState("");

  if (!parentMessage) return null;

  const handleSend = () => {
    if (replyContent.trim()) {
      onSendReply(parentMessage.id, replyContent.trim());
      setReplyContent("");
    }
  };

  return (
    <div className="w-80 border-l border-border flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Thread</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Parent Message */}
          <div className="flex gap-3 pb-3 border-b border-border">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-xs bg-gradient-to-br from-violet-400 to-indigo-500 text-white">
                {parentMessage.authorName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="font-semibold text-sm">
                  {parentMessage.authorName}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {format(new Date(parentMessage.timestamp), "h:mm a")}
                </span>
              </div>
              <p className="text-sm leading-relaxed break-words">
                {parentMessage.content}
              </p>
            </div>
          </div>

          {/* Replies */}
          <div className="space-y-3">
            {replies.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No replies yet. Start the thread!
              </p>
            )}
            {replies.map((reply) => (
              <div key={reply.id} className="flex gap-3">
                <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="text-[9px] bg-gradient-to-br from-blue-400 to-cyan-500 text-white">
                    {reply.authorName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-semibold text-xs">
                      {reply.authorName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(reply.timestamp), "h:mm a")}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed break-words">
                    {reply.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Reply Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="text-xs h-8"
          />
          <Button
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleSend}
            disabled={!replyContent.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
