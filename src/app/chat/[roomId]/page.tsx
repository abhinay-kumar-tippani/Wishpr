"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getSupabaseBrowserClient,
  ensureAnonymousSession,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { Room, Participant, Message } from "@/lib/types";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ClosedBanner } from "@/components/chat/ClosedBanner";
import { EndChatDialog } from "@/components/chat/EndChatDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { SetupNotice } from "@/components/SetupNotice";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  Lock,
  AlertTriangle,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [peerOnline, setPeerOnline] = useState<boolean>(false);
  const [isPeerTyping, setIsPeerTyping] = useState<boolean>(false);
  const [, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const [showEndDialog, setShowEndDialog] = useState<boolean>(false);
  const [isEnding, setIsEnding] = useState<boolean>(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 1. Initial Authentication & Data Load
  const initChat = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setError("Supabase credentials not configured. Please check .env.local.");
      setLoading(false);
      return;
    }

    try {
      const session = await ensureAnonymousSession();
      if (!session) {
        setError("Unable to initialize anonymous session. Please reload.");
        setLoading(false);
        return;
      }

      setCurrentUserId(session.userId);
      const supabase = getSupabaseBrowserClient();

      // Fetch Room details (RLS ensures only registered participants can view)
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (roomError || !roomData) {
        setError(
          "Room not found or you are not an authorized participant in this room."
        );
        setLoading(false);
        return;
      }

      // Check if room is expired
      if (
        roomData.status === "expired" ||
        (roomData.expires_at &&
          new Date(roomData.expires_at).getTime() <= Date.now())
      ) {
        setError("This conversation has expired and been scheduled for permanent deletion.");
        setLoading(false);
        return;
      }

      setRoom(roomData as Room);

      // Fetch Participants
      const { data: participantsData } = await supabase
        .from("participants")
        .select("*")
        .eq("room_id", roomId);

      if (participantsData) {
        setParticipants(participantsData as Participant[]);
      }

      // Fetch Messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (!messagesError && messagesData) {
        setMessages(messagesData as Message[]);
      }

      setLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load chat room.";
      console.error("Error loading chat room:", message);
      setError(message);
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  // 2. Realtime Subscriptions (Messages, Room Updates, Participants, Presence, Typing)
  useEffect(() => {
    if (!room || !currentUserId || !isSupabaseConfigured()) return;

    const supabase = getSupabaseBrowserClient();
    const channelName = `whispr_room_${room.id}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channelRef.current = channel;

    // A. Listen to Postgres Changes on messages
    channel.on(
      "postgres_changes" as never,
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `room_id=eq.${room.id}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        const newMsg = payload.new as unknown as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    );

    // B. Listen to Postgres Changes on rooms (e.g. status transition to active or closed)
    channel.on(
      "postgres_changes" as never,
      {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${room.id}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        const updatedRoom = payload.new as unknown as Room;
        setRoom(updatedRoom);

        if (updatedRoom.status === "active" && room.status === "waiting") {
          toast.success("Peer joined! The private channel is now active.");
          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.8 },
            });
          } catch {}
        } else if (updatedRoom.status === "closed") {
          toast.info("Conversation has ended. All messages will be wiped in 1 hour.");
        }
      }
    );

    // C. Listen to Postgres Changes on participants (e.g. peer joins)
    channel.on(
      "postgres_changes" as never,
      {
        event: "INSERT",
        schema: "public",
        table: "participants",
        filter: `room_id=eq.${room.id}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        const newParticipant = payload.new as unknown as Participant;
        setParticipants((prev) => {
          if (prev.some((p) => p.user_id === newParticipant.user_id))
            return prev;
          return [...prev, newParticipant];
        });
      }
    );

    // D. Listen to Broadcast: Typing indicator
    channel.on("broadcast", { event: "typing" }, (payload: { payload?: { userId?: string } }) => {
      if (payload.payload?.userId !== currentUserId) {
        setIsPeerTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setIsPeerTyping(false);
        }, 2200);
      }
    });

    // E. Presence Tracking
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const userIds = Object.keys(state);
      const isOtherPresent = userIds.some((id) => id !== currentUserId);
      setPeerOnline(isOtherPresent);
    });

    channel.on("presence", { event: "join" }, ({ key }: { key: string }) => {
      if (key !== currentUserId) {
        setPeerOnline(true);
      }
    });

    channel.on("presence", { event: "leave" }, ({ key }: { key: string }) => {
      if (key !== currentUserId) {
        setPeerOnline(false);
      }
    });

    // Subscribe and track self presence
    channel.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        setConnectionStatus("connected");
        await channel.track({
          user_id: currentUserId,
          online_at: new Date().toISOString(),
        });
      } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
        setConnectionStatus("disconnected");
      }
    });

    // Heartbeat presence in database
    const heartbeatInterval = setInterval(() => {
      supabase.rpc("heartbeat_presence", { p_room_id: room.id }).then(() => {});
    }, 45000);

    return () => {
      clearInterval(heartbeatInterval);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.status, currentUserId]);

  // 3. Send Message Action
  const handleSendMessage = async (content: string): Promise<boolean> => {
    if (!room || !currentUserId || room.status !== "active") return false;

    const supabase = getSupabaseBrowserClient();
    try {
      const { error: insertError } = await supabase.from("messages").insert({
        room_id: room.id,
        sender_id: currentUserId,
        content: content,
      });

      if (insertError) {
        console.error("Failed to send message:", insertError);
        toast.error(`Send error: ${insertError.message}`);
        return false;
      }

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send message";
      console.error("Message send error:", message);
      toast.error(message);
      return false;
    }
  };

  // 4. Typing Broadcast
  const handleTyping = () => {
    if (channelRef.current && room?.status === "active") {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: currentUserId },
      });
    }
  };

  // 5. End Chat Action
  const handleConfirmEndChat = async () => {
    if (!room) return;
    setIsEnding(true);
    const supabase = getSupabaseBrowserClient();

    try {
      const { data, error: endError } = await supabase.rpc("end_chat", {
        p_room_id: room.id,
      });

      if (endError) {
        throw new Error(endError.message);
      }

      toast.success("Conversation ended. Retention timer started.");
      setShowEndDialog(false);

      if (data) {
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                status: "closed",
                closed_at: data.closed_at,
                expires_at: data.expires_at,
              }
            : null
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to end chat";
      console.error("Error ending chat:", message);
      toast.error(message);
    } finally {
      setIsEnding(false);
    }
  };

  // 6. Share Action
  const handleShareRoom = async () => {
    if (!room) return;
    const shareUrl = `${window.location.origin}/join?code=${encodeURIComponent(
      room.room_code
    )}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my private Whispr chat",
          text: `Join my temporary private 1-to-1 chat on Whispr with code: ${room.room_code}`,
          url: shareUrl,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Room invite link copied to clipboard!");
      } catch {
        toast.error("Failed to copy share link");
      }
    }
  };

  // Loading View
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <SetupNotice />
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
            <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-sm">Securing private session...</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Verifying participant credentials and room state
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error / Unauthorized View
  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <SetupNotice />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 text-center space-y-4 border-destructive/20 shadow-xl rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Access Restricted</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {error ||
                  "You are not authorized to view this room, or the room has expired."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="flex-1 rounded-xl text-xs"
              >
                Return to Home
              </Button>
              <Button
                variant="default"
                onClick={() => router.push("/join")}
                className="flex-1 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                Join Another Room
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const isClosed = room.status === "closed" || room.status === "expired";
  const isWaiting = room.status === "waiting";

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Top Bar / Chat Header */}
      <ChatHeader
        room={room}
        currentUserId={currentUserId || ""}
        participants={participants}
        peerOnline={peerOnline}
        isPeerTyping={isPeerTyping}
        onEndChat={() => setShowEndDialog(true)}
        onShareRoom={handleShareRoom}
      />

      {/* Closed State Banner with 1-Hour Countdown */}
      {isClosed && <ClosedBanner expiresAt={room.expires_at} />}

      {/* Chat Messages */}
      <MessageList
        room={room}
        messages={messages}
        currentUserId={currentUserId || ""}
        participants={participants}
        isPeerTyping={isPeerTyping}
      />

      {/* Message Input Footer */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        disabled={isClosed || isWaiting}
        disabledReason={
          isClosed
            ? "Conversation has ended. No new messages can be sent."
            : isWaiting
            ? "Waiting for peer to enter the room..."
            : undefined
        }
      />

      {/* End Chat Confirmation Modal */}
      <EndChatDialog
        open={showEndDialog}
        onOpenChange={setShowEndDialog}
        onConfirm={handleConfirmEndChat}
        isEnding={isEnding}
      />
    </div>
  );
}
