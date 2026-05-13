export const runtime = 'edge';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis'; // Import redis to flush student data

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1) Security Check: Ensure the user is an Admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 });
    }

    // 2) Trigger the Database Function (RPC)
    const { data, error } = await supabase.rpc('recompute_all_qualifications_db');

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // ── STEP 3: FLUSH THE PORTAL CACHE ──
    // Because the RPC just changed everyone's qualifications in the background,
    // we must delete all cached student portal results.
    try {
      const keys = await redis.keys('portal:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🧹 Nuclear Cache Clear: Flushed ${keys.length} student portals.`);
      }
    } catch (redisError) {
      console.error("Redis flush failed, but DB update succeeded:", redisError);
      // We don't stop the request here because the DB work is already done.
    }

    // 4) Return the statistics
    return NextResponse.json({
      success: true,
      ...data,
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}