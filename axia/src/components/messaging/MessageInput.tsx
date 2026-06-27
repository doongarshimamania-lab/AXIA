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
  /** List of channel member names to suggest in @mention autocomplete. */
  members?: { id: string; name: string }[];
}

const EMOJI_LIST = [
  "👍", "👎", "❤️", "😂", "🎉", "🔥", "✅", "❌",
  "👀", "🤔", "💯", "🚀", "⭐", "💡", "🎯", "💪",
  "🙌", "👏", "🤝", "😊", "😄", "🥳", "🫡", "💬",
];

export function MessageInput({ onSend, channelName, members = [] }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<{ start: number; text: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Filtered member suggestions based on what user typed after @
  const filteredMembers = mentionQuery
    ? members
        .filter((m) => m.name.toLowerCase().includes(mentionQuery.text.toLowerCase()))
        .slice(0, 6)
    : [];

  const handleSubmit = () => {
    if (content.trim()) {
      onSend(content.trim());
      setContent("");
      setMentionQuery(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Mention autocomplete navigation
    if (mentionQuery && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Insert a selected member as @username at the current mention position
  const insertMention = (member: { id: string; name: string }) => {
    if (!mentionQuery || !textareaRef.current) return;
    const before = content.substring(0, mentionQuery.start - 1); // -1 to remove the @
    const after = content.substring(textareaRef.current.selectionStart);
    const mentionText = `@${member.name} `;
    const newContent = before + mentionText + after;
    setContent(newContent);
    setMentionQuery(null);
    setMentionIndex(0);
    setTimeout(() => {
      const pos = (before + mentionText).length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";

    // Detect @mention pattern at cursor position
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    // Match the last "@word" sequence (whitespace or punctuation ends it)
    const mentionMatch = textBeforeCursor.match(/@([A-Za-z][A-Za-z0-9_\- ]{0,40})$/);
    if (mentionMatch) {
      setMentionQuery({
        start: cursorPos - mentionMatch[0].length,
        text: mentionMatch[1],
      });
      setMentionIndex(0);
    } else {
      // Only clear if we had a query — avoids spurious re-renders
      if (mentionQuery) setMentionQuery(null);
    }
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
        className={`relative rounded-lg border transition-colors ${
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
            onClick={() => {
              // Trigger mention dropdown by inserting @ and focusing
              const textarea = textareaRef.current;
              if (!textarea) return;
              const start = textarea.selectionStart;
              const newContent = content.substring(0, start) + "@" + content.substring(start);
              setContent(newContent);
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 1, start + 1);
                setMentionQuery({ start: start, text: "" });
              }, 0);
            }}
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

        {/* @mention autocomplete dropdown */}
        {mentionQuery && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-2 mb-1 z-50 w-64 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
            <div className="px-2 py-1 text-[10px] font-medium uppercase text-muted-foreground border-b border-border">
              Members
            </div>
            {filteredMembers.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // keep textarea focus
                  insertMention(m);
                }}
                onMouseEnter={() => setMentionIndex(i)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                  i === mentionIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                }`}
              >
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white flex items-center justify-center text-[10px] font-semibold">
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <span className="truncate">{m.name}</span>
              </button>
            ))}
          </div>
        )}

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
