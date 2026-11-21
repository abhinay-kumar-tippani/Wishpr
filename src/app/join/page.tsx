"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { formatRoomCode, cleanRoomCode } from "@/lib/utils";
import {
  KeyRound,
  ArrowRight,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

function JoinRoomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("Participant 2");
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-populate from URL query parameter e.g. /join?code=ABCD-1234
  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam) {
      setRoomCode(formatRoomCode(codeParam));
    }
  }, [searchParams]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setRoomCode(formatRoomCode(val));
    if (errorMessage) setErrorMessage(null);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleaned = cleanRoomCode(roomCode);
    if (!cleaned || cleaned.length < 6) {
      setErrorMessage("Please enter a valid 8-character room code.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMessage("Supabase credentials not configured in .env.local.");
      return;
    }

    setIsJoining(true);

    try {
      // 1. Ensure anonymous session
      const session = await ensureAnonymousSession();
      if (!session) {
        throw new Error("Unable to establish anonymous session. Please refresh.");
      }

      // 2. Call secure PostgreSQL RPC join_room (with row locking)
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("join_room", {
        p_room_code: cleaned,
        p_display_name: displayName.trim() || "Participant 2",
      });

      if (error) {
        // Map postgres exceptions to user-friendly messages
        const msg = error.message.toLowerCase();
        if (msg.includes("already full")) {
          setErrorMessage("This room is already full (maximum 2 participants).");
        } else if (msg.includes("closed")) {
          setErrorMessage("This room has been closed by a participant.");
        } else if (msg.includes("expired")) {
          setErrorMessage("This room has expired and can no longer be joined.");
        } else if (msg.includes("not found")) {
          setErrorMessage("Room not found. Please double-check the code.");
        } else if (msg.includes("invalid")) {
          setErrorMessage("Invalid room code format.");
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      if (data?.room_id) {
        toast.success("Joined room successfully!");
        router.push(`/chat/${data.room_id}`);
      } else {
        throw new Error("Unexpected response from server.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to join room.";
      console.error("Join room error:", message);
      setErrorMessage(message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Card className="border-border/80 shadow-xl rounded-3xl overflow-hidden">
      <CardHeader className="text-center pb-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
          <KeyRound className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Join Private Room
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          Enter the 8-character room code shared with you by your peer.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleJoin} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Room Code
            </label>
            <Input
              type="text"
              placeholder="e.g. ABCD-1234"
              value={roomCode}
              onChange={handleCodeChange}
              maxLength={9}
              className="rounded-xl h-13 text-center font-mono text-xl tracking-widest uppercase font-bold"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Your Display Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Bob"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              className="rounded-xl h-12 text-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={isJoining || cleanRoomCode(roomCode).length < 6}
            className="w-full rounded-xl h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 mt-2"
          >
            {isJoining ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating & Entering...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Enter Chat Room</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground text-center">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Strict 2-Person Verification • No account needed</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function JoinRoomPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <SetupNotice />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <Suspense
            fallback={
              <Card className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              </Card>
            }
          >
            <JoinRoomForm />
          </Suspense>

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
