"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmojiPickerPopover } from "@/components/EmojiPickerPopover";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<boolean>;
  onTyping: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function MessageInput({
  onSendMessage,
  onTyping,
  disabled = false,
  disabledReason,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to 120px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [content]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting || disabled) return;

    setIsSubmitting(true);
    const success = await onSendMessage(trimmed);
    if (success) {
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    }
    setIsSubmitting(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent((prev) => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping();
  };

  if (disabled) {
    return (
      <div className="p-3 sm:p-4 bg-muted/40 border-t border-border/60 flex items-center justify-center text-xs sm:text-sm text-muted-foreground select-none">
        <Lock className="w-4 h-4 mr-2 text-muted-foreground/60" />
        <span>{disabledReason || "Message input is disabled."}</span>
      </div>
    );
  }

  return (
    <div className="p-2.5 sm:p-3 bg-background/95 backdrop-blur-md border-t border-border/60">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 flex items-end gap-1.5 bg-muted/50 dark:bg-[#202c33] rounded-2xl border border-border/60 px-2 py-1.5 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
          <EmojiPickerPopover
            onEmojiSelect={handleEmojiSelect}
            disabled={disabled || isSubmitting}
          />

          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message (Enter to send, Shift+Enter for new line)..."
            disabled={disabled || isSubmitting}
            className="flex-1 max-h-[120px] bg-transparent resize-none border-none outline-none text-sm placeholder:text-muted-foreground/60 py-1 px-1 focus:ring-0 leading-relaxed"
          />
        </div>

        <Button
          type="button"
          onClick={handleSend}
          disabled={!content.trim() || isSubmitting || disabled}
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 shrink-0 p-0"
          title="Send message"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
        </Button>
      </div>
    </div>
  );
}
