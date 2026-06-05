import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send,
  Paperclip,
  SmilePlus,
  AtSign,
  Hash,
  Bold,
  Italic,
  Code,
  List,
  ImagePlus,
} from "lucide-react";

interface MessageInputProps {
  onSend: (body: string) => void;
  channelName?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MessageInput({
  onSend,
  channelName,
  placeholder,
  disabled = false,
  className,
}: MessageInputProps) {
  const [body, setBody] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (!body.trim() || disabled) return;
    onSend(body.trim());
    setBody("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [body, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  };

  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);

    const newBody = body.substring(0, start) + prefix + selectedText + suffix + body.substring(end);
    setBody(newBody);

    // Restore cursor position
    requestAnimationFrame(() => {
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + selectedText.length;
      textarea.focus();
    });
  };

  return (
    <div className={cn("border-t bg-background", className)}>
      {/* Formatting toolbar */}
      {isFocused && (
        <div className="flex items-center gap-0.5 px-4 pt-2 pb-1 border-b bg-muted/20">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => insertFormatting("**", "**")}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                >
                  <Bold className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Bold</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => insertFormatting("_", "_")}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                >
                  <Italic className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Italic</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => insertFormatting("`", "`")}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                >
                  <Code className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Code</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => insertFormatting("- ")}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                >
                  <List className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">List</TooltipContent>
            </Tooltip>
            <div className="h-4 w-px bg-border mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => insertFormatting("@")}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                >
                  <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Mention</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => insertFormatting("#")}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                >
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Reference channel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder={placeholder || `Message #${channelName || "general"}`}
            className="min-h-[40px] max-h-[200px] resize-none pr-10 py-2.5 text-sm"
            value={body}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            rows={1}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 pb-0.5">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled}>
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Attach file</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled}>
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Add image</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={disabled}
                >
                  <SmilePlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Add emoji</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            size="icon"
            className="h-8 w-8 rounded-full"
            disabled={!body.trim() || disabled}
            onClick={handleSubmit}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
