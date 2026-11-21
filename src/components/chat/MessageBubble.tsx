"use client";

import { Message, Participant } from "@/lib/types";
import { format } from "date-fns";
import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  sender?: Participant;
}

export function MessageBubble({ message, isSelf, sender }: MessageBubbleProps) {
  const formattedTime = (() => {
    try {
      return format(new Date(message.created_at), "HH:mm");
    } catch {
      return "";
    }
  })();

  return (
    <div
      className={cn(
        "flex w-full my-1 px-3 sm:px-6 animate-fade-in",
        isSelf ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[85%] sm:max-w-[70%] md:max-w-[60%] px-3.5 py-2 shadow-sm text-sm transition-all",
          isSelf
            ? "bg-emerald-100 text-emerald-950 dark:bg-[#005c4b] dark:text-[#e9edef] rounded-2xl rounded-tr-sm border border-emerald-200/50 dark:border-emerald-700/30"
            : "bg-white text-zinc-900 dark:bg-[#202c33] dark:text-[#e9edef] rounded-2xl rounded-tl-sm border border-zinc-200/60 dark:border-zinc-700/40"
        )}
      >
        {/* Sender Name (only shown for peer messages) */}
        {!isSelf && (
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
            {sender?.display_name || "Peer"}
          </div>
        )}

        {/* Message Content */}
        <div className="break-words whitespace-pre-wrap leading-relaxed pr-12 pb-1">
          {message.content}
        </div>

        {/* Timestamp and Checkmark */}
        <div
          className={cn(
            "absolute bottom-1.5 right-2 flex items-center gap-1 text-[10px] select-none",
            isSelf
              ? "text-emerald-700/80 dark:text-[#8696a0]"
              : "text-zinc-400 dark:text-[#8696a0]"
          )}
        >
          <span>{formattedTime}</span>
          {isSelf && (
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-[#53bdeb] stroke-[2.2]" />
          )}
        </div>
      </div>
    </div>
  );
}
