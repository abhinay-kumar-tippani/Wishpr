import { Clock, UserCheck, Flame } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border/40 py-8 bg-muted/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>Strict 2-Person Limit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span>1-Hour Auto Self-Destruction</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-emerald-500" />
            <span>Zero Permanent Logs</span>
          </div>
        </div>

        <p className="text-center md:text-right">
          Whispr — Built with Next.js 14, Supabase Realtime & PostgreSQL RLS.
        </p>
      </div>
    </footer>
  );
}
