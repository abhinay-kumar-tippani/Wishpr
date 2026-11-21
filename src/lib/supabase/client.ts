import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = () => {
  return (
    !!supabaseUrl &&
    !!supabaseAnonKey &&
    !supabaseUrl.includes("placeholder") &&
    !supabaseAnonKey.includes("placeholder")
  );
};

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (clientInstance) return clientInstance;

  if (!isSupabaseConfigured()) {
    // Return a dummy/safe client when credentials are not configured yet
    clientInstance = createBrowserClient(
      supabaseUrl || "https://placeholder.supabase.co",
      supabaseAnonKey || "placeholder-anon-key"
    );
    return clientInstance;
  }

  clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return clientInstance;
}

/**
 * Ensures an active anonymous session exists.
 * If user does not have a session, creates one via signInAnonymously().
 */
export async function ensureAnonymousSession(): Promise<{ userId: string; isNew: boolean } | null> {
  const supabase = getSupabaseBrowserClient();
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      return { userId: session.user.id, isNew: false };
    }

    // Attempt anonymous sign in
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn("Supabase anonymous sign-in failed:", error.message);
      // Fallback: If anonymous sign-ins are not enabled in Supabase Dashboard,
      // create a lightweight ephemeral user using a unique anonymous email
      const ephemeralId = Math.random().toString(36).substring(2, 10);
      const tempEmail = `whispr_${ephemeralId}_${Date.now()}@whispr.internal`;
      const tempPassword = `Whispr_${Math.random().toString(36).substring(2, 12)}!9`;
      
      const signUpRes = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: { is_anonymous: true, ephemeral_id: ephemeralId },
        },
      });

      if (signUpRes.error) {
        throw new Error(`Authentication error: ${error.message}. Please enable Anonymous Sign-Ins in Supabase Dashboard -> Authentication -> Providers.`);
      }

      if (signUpRes.data.user) {
        return { userId: signUpRes.data.user.id, isNew: true };
      }
    }

    if (data?.user) {
      return { userId: data.user.id, isNew: true };
    }

    return null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication error";
    console.error("Error ensuring anonymous session:", message);
    throw err;
  }
}
