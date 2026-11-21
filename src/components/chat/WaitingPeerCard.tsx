"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Check, Share2, Users, Shield } from "lucide-react";
import { toast } from "sonner";

interface WaitingPeerCardProps {
  roomCode: string;
}

export function WaitingPeerCard({ roomCode }: WaitingPeerCardProps) {
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/join?code=${encodeURIComponent(roomCode)}`;
    }
    return "";
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      toast.success("Room code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my private Whispr chat",
          text: `Join my temporary private 1-to-1 chat on Whispr with code: ${roomCode}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Room invite link copied to clipboard!");
      } catch {
        toast.error("Failed to copy link");
      }
    }
  };

  return (
    <div className="max-w-md mx-auto my-auto px-4 py-8 animate-fade-in">
      <Card className="border-border/80 bg-background/90 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden">
        <div className="p-6 text-center space-y-4">
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
            <div className="relative w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Users className="w-7 h-7" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold tracking-tight">Waiting for peer to join</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Share this unique room code with the person you want to chat with. The chat unlocks the moment they enter.
            </p>
          </div>

          {/* Prominent Room Code Display */}
          <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col items-center justify-center gap-1">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Room Code
            </span>
            <div className="font-mono text-3xl font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400 select-all">
              {roomCode}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              onClick={handleCopyCode}
              variant="default"
              className="flex-1 rounded-xl h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Code Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleShare}
              variant="outline"
              className="flex-1 rounded-xl h-11 gap-2 border-border/80"
            >
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <span>Share Link</span>
            </Button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Strict 2-person limit: 3rd person cannot join</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
