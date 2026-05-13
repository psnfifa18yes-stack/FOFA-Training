import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis'; // Import redis to clear the cache

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const student_id = String(body.student_id || "").trim();
    const selections = Array.isArray(body.selections) ? body.selections : [];

    // ── 1) Basic Validation ──
    if (!student_id) {
      return NextResponse.json(
        { success: false, status: "NOT_FOUND", message: "student_id is required" },
        { status: 400 }
      );
    }

    if (selections.length === 0) {
      return NextResponse.json({ success: false, message: "At least one selection is required" }, { status: 400 });
    }

    if (selections.length > 2) {
      return NextResponse.json({ success: false, message: "Maximum of two selections allowed" }, { status: 400 });
    }

    // ── 2) Check if Submissions are actually OPEN ──
    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("submission_status")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json({ success: false, message: "Failed to load system settings" }, { status: 500 });
    }

    if (settings.submission_status === "CLOSED") {
      return NextResponse.json({ success: true, status: "CLOSED" });
    }

    // ── 3) Get the student's current term (Architectural Year) ──
    const { data: grades, error: gradesError } = await supabase
      .from("grades")
      .select("academic_term")
      .eq("student_id", student_id)
      .order("academic_term", { ascending: false })
      .limit(1)
      .single();

    if (gradesError || !grades) {
      return NextResponse.json(
        { success: false, status: "NOT_FOUND", message: "Student grades not found" },
        { status: 400 }
      );
    }

    // ── 4) Save (Upsert) the selection ──
    const { error: saveError } = await supabase
      .from("selections")
      .upsert(
        [
          {
            student_id,
            academic_term: grades.academic_term,
            training_1: selections[0] || null,
            training_2: selections[1] || null,
            updated_at: new Date().toISOString()
          }
        ],
        { onConflict: "student_id,academic_term" }
      );

    if (saveError) {
      return NextResponse.json(
        { success: false, message: "Failed to save selection", error: saveError.message },
        { status: 500 }
      );
    }

    // ── STEP 5: BUST THE CACHE ──
    // Clear the student's portal cache so their new selection appears immediately.
    const cacheKey = `portal:${student_id}`;
    await redis.del(cacheKey);
    console.log(`♻️ Cache cleared for student selection: ${student_id}`);

    return NextResponse.json({ success: true, status: "SAVED" });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}