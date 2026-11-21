"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Clock } from "lucide-react";

interface ClosedBannerProps {
  expiresAt: string | null;
}

export function ClosedBanner({ expiresAt }: ClosedBannerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({
    minutes: 60,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    if (!expiresAt) return;

    const targetTime = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ minutes, seconds, isExpired: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="w-full bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/30 px-4 py-2.5 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <strong>Conversation ended.</strong> Read-only mode. All chat data will be permanently wiped.
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono font-semibold px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-950 dark:text-amber-100 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>
            {timeLeft.isExpired
              ? "WIPED FROM DATABASE"
              : `Permanent Deletion in ${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`}
          </span>
        </div>
      </div>
    </div>
  );
}
