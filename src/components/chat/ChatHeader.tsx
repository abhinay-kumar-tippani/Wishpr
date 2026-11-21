"use client";

import { useState } from "react";
import { Room, Participant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Copy,
  Check,
  Share2,
  PhoneOff,
  Users,
  Circle,
} from "lucide-react";

interface ChatHeaderProps {
  room: Room;
  currentUserId: string;
  participants: Participant[];
  peerOnline: boolean;
  isPeerTyping: boolean;
  onEndChat: () => void;
  onShareRoom: () => void;
}

export function ChatHeader({
  room,
  currentUserId,
  participants,
  peerOnline,
  isPeerTyping,
  onEndChat,
  onShareRoom,
}: ChatHeaderProps) {
  const [copied, setCopied] = useState(false);

  const peerParticipant = participants.find((p) => p.user_id !== currentUserId);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const isClosed = room.status === "closed" || room.status === "expired";
  const isWaiting = room.status === "waiting";

  return (
    <div className="h-16 px-4 bg-background/95 backdrop-blur-md border-b border-border/60 flex items-center justify-between shrink-0 select-none">
      {/* Left: Peer info and Status */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative">
          <Avatar className="h-10 w-10 border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm">
            <AvatarFallback>
              {peerParticipant?.display_name
                ? peerParticipant.display_name.slice(0, 2).toUpperCase()
                : "2P"}
            </AvatarFallback>
          </Avatar>
          {room.status === "active" && (
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                peerOnline ? "bg-emerald-500" : "bg-zinc-400"
              }`}
              title={peerOnline ? "Peer is online" : "Peer is offline"}
            />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {isWaiting
                ? "Waiting for Peer..."
                : peerParticipant?.display_name || "Private Peer"}
            </span>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
              {room.room_code}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {isClosed ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Conversation Ended • Read-Only
              </span>
            ) : isWaiting ? (
              <span className="text-muted-foreground flex items-center gap-1 animate-pulse">
                <Users className="w-3 h-3" />
                Share code to connect (1/2)
              </span>
            ) : isPeerTyping ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                typing...
              </span>
            ) : peerOnline ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                Online
              </span>
            ) : (
              <span className="text-muted-foreground">
                Offline
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyCode}
          className="h-9 px-2.5 sm:px-3 text-xs gap-1.5 hidden sm:inline-flex border-border/80"
          title="Copy Room Code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Copy Code</span>
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onShareRoom}
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          title="Share Room"
        >
          <Share2 className="w-4 h-4" />
        </Button>

        {!isClosed && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onEndChat}
            className="h-9 px-3 text-xs font-semibold gap-1.5 bg-red-600 hover:bg-red-700 shadow-sm"
            title="End Conversation and Schedule Permanent Deletion"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End Chat</span>
          </Button>
        )}
      </div>
    </div>
  );
}
