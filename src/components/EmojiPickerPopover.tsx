"use client";

import dynamic from "next/dynamic";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { Theme } from "emoji-picker-react";

// Dynamically import emoji picker to keep bundle light and avoid SSR hydration issues
const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="w-[300px] h-[350px] flex items-center justify-center text-xs text-muted-foreground">
      Loading emojis...
    </div>
  ),
});

interface EmojiPickerPopoverProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPickerPopover({
  onEmojiSelect,
  disabled = false,
}: EmojiPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? Theme.DARK : Theme.LIGHT);

    const observer = new MutationObserver(() => {
      const darkNow = document.documentElement.classList.contains("dark");
      setTheme(darkNow ? Theme.DARK : Theme.LIGHT);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors rounded-full w-9 h-9"
          title="Add Emoji"
        >
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-auto p-0 border-none bg-transparent shadow-2xl"
      >
        <EmojiPicker
          theme={theme}
          onEmojiClick={(emojiData) => {
            onEmojiSelect(emojiData.emoji);
            setOpen(false);
          }}
          lazyLoadEmojis
          searchPlaceHolder="Search emojis..."
          width={320}
          height={380}
        />
      </PopoverContent>
    </Popover>
  );
}
