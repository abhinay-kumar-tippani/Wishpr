"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SetupNotice } from "@/components/SetupNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  getSupabaseBrowserClient,
  ensureAnonymousSession,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  Lock,
  Copy,
  Check,
  Share2,
  ArrowRight,
  Shield,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export default function CreateRoomPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("Participant 1");
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<{
    roomId: string;
    roomCode: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;

    if (!isSupabaseConfigured()) {
      toast.error("Please configure Supabase credentials in .env.local first.");
      return;
    }

    setIsCreating(true);

    try {
      // 1. Ensure anonymous session is active
      const session = await ensureAnonymousSession();
      if (!session) {
        throw new Error("Unable to establish anonymous session. Please refresh.");
      }

      // 2. Call secure PostgreSQL RPC create_room
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("create_room", {
        p_display_name: displayName.trim() || "Participant 1",
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.room_id && data?.room_code) {
        setCreatedRoom({
          roomId: data.room_id,
          roomCode: data.room_code,
        });

        toast.success("Private room created successfully!");
        try {
          confetti({
            particleCount: 50,
            spread: 50,
            origin: { y: 0.7 },
          });
        } catch {}
      } else {
        throw new Error("Unexpected response from server.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create room.";
      console.error("Room creation error:", message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const getShareUrl = () => {
    if (typeof window !== "undefined" && createdRoom) {
      return `${window.location.origin}/join?code=${encodeURIComponent(
        createdRoom.roomCode
      )}`;
    }
    return "";
  };

  const handleCopyCode = async () => {
    if (!createdRoom) return;
    try {
      await navigator.clipboard.writeText(createdRoom.roomCode);
      setCopied(true);
      toast.success("Room code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();
    if (!createdRoom) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my private Whispr chat",
          text: `Join my temporary private 1-to-1 chat on Whispr with code: ${createdRoom.roomCode}`,
          url: shareUrl,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Room invite link copied to clipboard!");
      } catch {
        toast.error("Failed to copy invite link");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <SetupNotice />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {!createdRoom ? (
            <Card className="border-border/80 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                  <Lock className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Create Private Room
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Whispr will generate an 8-character unique room code and prepare an ephemeral 1-to-1 session.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Your Display Name
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Alice"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={30}
                      className="rounded-xl h-12 text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Shown only to the other person in this room.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="w-full rounded-xl h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                  >
                    {isCreating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating secure room...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>Generate Room Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>

                  <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground text-center">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>No permanent history. Auto-wiped in 1h after chat ends.</span>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/80 shadow-xl rounded-3xl overflow-hidden animate-fade-in">
              <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                  <Check className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Room Ready!
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Share this code with your peer. When they join, you both enter the chat room.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 pt-2">
                {/* Prominently displayed room code */}
                <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col items-center justify-center gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Your Room Code
                  </span>
                  <div className="font-mono text-3xl font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400 select-all">
                    {createdRoom.roomCode}
                  </div>
                </div>

                {/* Action buttons: Copy & Share */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleCopyCode}
                    variant="outline"
                    className="flex-1 rounded-xl h-11 text-xs gap-1.5 border-border/80"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Copied!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-muted-foreground" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleShare}
                    variant="outline"
                    className="flex-1 rounded-xl h-11 text-xs gap-1.5 border-border/80"
                  >
                    <Share2 className="w-4 h-4 text-muted-foreground" />
                    <span>Share Link</span>
                  </Button>
                </div>

                {/* Enter Chat Button */}
                <Button
                  type="button"
                  onClick={() => router.push(`/chat/${createdRoom.roomId}`)}
                  className="w-full rounded-xl h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Enter Chat Room</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>

                <p className="text-[11px] text-center text-muted-foreground">
                  The room currently has 1 participant (you) and is waiting for peer.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
