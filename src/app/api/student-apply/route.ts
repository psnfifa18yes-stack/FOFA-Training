import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const student_id = body.student_id?.trim();
    const student_name = body.student_name?.trim();
    // Defaulting to the Faculty of Fine Arts at Capital University
    const faculty_name = body.faculty_name || "Faculty of Fine Arts – New Capital University (FOFA)";

    // ── 1) Basic Validation ──
    if (!student_id || !student_name) {
      return NextResponse.json(
        { success: false, message: "Student ID and name are required" },
        { status: 400 }
      );
    }

    // ── 2) Upsert Student Details ──
    // This ensures that if a student re-applies, their name/faculty is updated
    const { error: studentError } = await supabase
      .from("students")
      .upsert(
        [
          {
            student_id: student_id,
            student_name: student_name,
            faculty_name: faculty_name,
          }
        ],
        { onConflict: "student_id" }
      );

    if (studentError) {
      return NextResponse.json(
        { success: false, message: "Failed to save student", error: studentError.message },
        { status: 500 }
      );
    }

    // ── 3) Upsert Application Entry ──
    // Sets the status to 'APPLIED' and timestamps the submission
    const { error: appError } = await supabase
      .from("applications")
      .upsert(
        [
          {
            student_id: student_id,
            status: "APPLIED",
            applied_at: new Date().toISOString(),
          }
        ],
        { onConflict: "student_id" }
      );

    if (appError) {
      return NextResponse.json(
        { success: false, message: "Failed to create application", error: appError.message },
        { status: 500 }
      );
    }

    const cacheKey = `portal:${student_id}`;
    await redis.del(cacheKey);

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully"
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}