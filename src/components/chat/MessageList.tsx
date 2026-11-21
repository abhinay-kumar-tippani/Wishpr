"use client";

import { useEffect, useRef, useState } from "react";
import { Message, Participant, Room } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { WaitingPeerCard } from "./WaitingPeerCard";
import { ChevronDown, MessageSquareLock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageListProps {
  room: Room;
  messages: Message[];
  currentUserId: string;
  participants: Participant[];
  isPeerTyping: boolean;
}

export function MessageList({
  room,
  messages,
  currentUserId,
  participants,
  isPeerTyping,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const peerParticipant = participants.find((p) => p.user_id !== currentUserId);

  const scrollToBottom = (smooth = true) => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  useEffect(() => {
    // Initial scroll or scroll on new message
    scrollToBottom(false);
  }, [messages.length, isPeerTyping]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isUp);
  };

  if (room.status === "waiting" && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-muted/20 chat-pattern overflow-y-auto">
        <WaitingPeerCard roomCode={room.room_code} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-2 sm:p-4 bg-muted/20 chat-pattern relative flex flex-col"
    >
      {/* Privacy Notice Banner at start of chat */}
      <div className="my-4 mx-auto max-w-sm text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 text-[11px] text-muted-foreground shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Messages are temporary and auto-delete 1h after chat ends</span>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground my-auto">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
            <MessageSquareLock className="w-6 h-6" />
          </div>
          <h4 className="font-semibold text-foreground text-sm">
            Private Channel Active
          </h4>
          <p className="text-xs max-w-xs mt-1">
            Say hello! Your messages are delivered in real time directly to your peer.
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {messages.map((msg) => {
            const isSelf = msg.sender_id === currentUserId;
            const sender = participants.find((p) => p.user_id === msg.sender_id);
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isSelf={isSelf}
                sender={sender}
              />
            );
          })}
        </div>
      )}

      {isPeerTyping && <TypingIndicator peerName={peerParticipant?.display_name} />}

      <div ref={bottomRef} className="h-1" />

      {/* Floating Scroll to bottom button */}
      {showScrollBottom && (
        <Button
          variant="secondary"
          size="icon"
          onClick={() => scrollToBottom(true)}
          className="fixed bottom-20 right-6 sm:right-10 rounded-full shadow-lg border border-border/80 w-10 h-10 bg-background/95 backdrop-blur-sm z-30 transition-transform active:scale-95"
          title="Scroll to latest messages"
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
