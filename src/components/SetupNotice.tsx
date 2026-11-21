"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useState, useEffect } from "react";

export function SetupNotice() {
  const [configured, setConfigured] = useState<boolean>(true);

  useEffect(() => {
    setConfigured(isSupabaseConfigured());
  }, []);

  if (configured) return null;

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-3 text-xs sm:text-sm">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <strong>Supabase Setup Required:</strong> Please provide your{" "}
            <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            in <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono">.env.local</code> and run{" "}
            <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono">supabase/schema.sql</code>.
          </span>
        </div>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold underline hover:text-amber-600 dark:hover:text-amber-100 whitespace-nowrap"
        >
          Open Supabase Dashboard
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
