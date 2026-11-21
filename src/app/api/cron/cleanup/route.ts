import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Verify secret if CRON_SECRET is configured
    if (cronSecret && cronSecret !== "whispr-cron-secret") {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Supabase service role client not configured" },
        { status: 500 }
      );
    }

    // Call the database function delete_expired_rooms()
    const { data, error } = await admin.rpc("delete_expired_rooms");

    if (error) {
      console.error("Cleanup cron failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted_rooms_count: data || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cleanup error";
    console.error("Cleanup cron unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
