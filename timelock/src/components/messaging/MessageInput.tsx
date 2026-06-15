import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Code,
  List,
  Link2,
  AtSign,
  Hash,
  Paperclip,
  Send,
  Smile,
} from "lucide-react";
import { toast } from "sonner";

interface MessageInputProps {
  onSend: (content: string) => void;
  channelName: string;
}

const EMOJI_LIST = [
  "👍", "👎", "❤️", "😂", "🎉", "🔥", "✅", "❌",
  "👀", "🤔", "💯", "🚀", "⭐", "💡", "🎯", "💪",
  "🙌", "👏", "🤝", "😊", "😄", "🥳", "🫡", "💬",
];

export function MessageInput({ onSend, channelName }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    if (content.trim()) {
      onSend(content.trim());
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
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
    const selected = content.substring(start, end);
    const newContent =
      content.substring(0, start) + prefix + selected + suffix + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const newContent = content.substring(0, start) + emoji + content.substring(start);
    setContent(newContent);
    setShowEmojiPicker(false);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + emoji.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Prevent focus loss when clicking toolbar buttons
  const preventFocusLoss = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex-shrink-0 border-t border-border bg-background p-3 relative">
      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full right-4 mb-2 bg-popover border border-border rounded-lg shadow-lg p-2 z-50"
        >
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-base transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className={`rounded-lg border transition-colors ${
          isFocused ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
        }`}
      >
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border/50">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={preventFocusLoss}
            onClick={() => insertFormatting("**", "**")}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={preventFocusLoss}
            onClick={() => insertFormatting("_", "_")}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={preventFocusLoss}
            onClick={() => insertFormatting("`", "`")}
            title="Code"
          >
            <Code className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={preventFocusLoss}
            onClick={() => insertFormatting("- ")}
            title="List"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={preventFocusLoss}
            onClick={() => insertFormatting("[", "](url)")}
            title="Link"
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={preventFocusLoss}
            onClick={() => insertFormatting("@")}
            title="Mention"
          >
            <AtSign className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={preventFocusLoss}
            onClick={() => insertFormatting("#")}
            title="Channel reference"
          >
            <Hash className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Text Input */}
        <div className="flex items-end gap-2 p-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={`Message #${channelName}`}
            className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-h-[24px] max-h-[200px]"
            rows={1}
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Attach file"
              onMouseDown={preventFocusLoss}
              onClick={() => toast.info("File attachments coming soon")}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Emoji"
              onMouseDown={preventFocusLoss}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              className="h-7 w-7"
              onClick={handleSubmit}
              disabled={!content.trim()}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
