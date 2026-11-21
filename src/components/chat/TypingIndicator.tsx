"use client";

interface TypingIndicatorProps {
  peerName?: string;
}

export function TypingIndicator({ peerName }: TypingIndicatorProps) {
  return (
    <div className="flex w-full my-1 px-3 sm:px-6 justify-start animate-fade-in">
      <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm border border-zinc-200/60 dark:border-zinc-700/40 flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">
          {peerName || "Peer"} is typing
        </span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
