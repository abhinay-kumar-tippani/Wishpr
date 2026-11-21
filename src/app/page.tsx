import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SetupNotice } from "@/components/SetupNotice";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Lock,
  Clock,
  Users,
  Flame,
  ArrowRight,
  KeyRound,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500/20">
      <Navbar />
      <SetupNotice />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10 space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Strict 2-Person Private Messenger</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Private conversations.{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent">
                No permanent history.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
              Whispr creates an ephemeral, peer-to-peer style temporary room for exactly two people.
              Exchange messages in real-time, then permanently self-destruct all data 1 hour after you leave.
            </p>

            {/* CTA Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto rounded-2xl h-13 px-8 text-base bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Link href="/create" className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  <span>Create Private Room</span>
                  <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto rounded-2xl h-13 px-8 text-base border-border/80 hover:bg-muted/60 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Link href="/join" className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-muted-foreground" />
                  <span>Join Private Room</span>
                </Link>
              </Button>
            </div>

            {/* Trust Micro-Bullets */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                No account required
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-500" />
                Maximum 2 participants
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-500" />
                Auto-wiped in 1 hour
              </span>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-24 border-y border-border/40 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                How Whispr Works
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                No passwords, no contact lists, no phone numbers. Just a secure temporary handshake.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3 relative">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/20">
                  01
                </div>
                <h3 className="font-semibold text-base">Generate Code</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Click Create Room. Whispr creates an atomic room and gives you an 8-character unique room code.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3 relative">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/20">
                  02
                </div>
                <h3 className="font-semibold text-base">Share with Peer</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Send the code or one-click invite link to the one person you want to talk to.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3 relative">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/20">
                  03
                </div>
                <h3 className="font-semibold text-base">Instant Realtime Chat</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The room activates. Exchange messages with instant delivery, typing indicators, and emoji support.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3 relative">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 font-bold flex items-center justify-center text-sm border border-red-500/20">
                  04
                </div>
                <h3 className="font-semibold text-base">End & Self-Destruct</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Either person ends the chat. Exactly 1 hour later, all messages and room data are wiped permanently.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy & Security Features Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Security by Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Strict Two-Person Privacy
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Built specifically to ensure zero snooping, no room enumeration, and impossible third-party eavesdropping.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-card border border-border/60 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-base">Strict 2-Person Ceiling</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enforced at the database level with PostgreSQL row locking and triggers. No third person can ever join an active room.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-base">Server-Side Deletion</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cleanup doesn’t rely on your browser staying open. Database-level automated routines destroy rooms and cascade messages on schedule.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-base">Row-Level Security (RLS)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Supabase RLS policies block unauthorized queries. Tampering with room IDs in URLs or inspecting API requests yields zero data.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
