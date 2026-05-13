export const runtime = 'edge';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1) Verify the User is logged in
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "Invalid user token" },
        { status: 401 }
      );
    }

    // 2) Check Admin Role in the 'profiles' table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    // 3) Parse the Grades from the request
    const body = await request.json();

    const student_id = String(body.student_id || "").trim();
    const academic_term = Number(body.academic_term);

    if (!student_id || !academic_term) {
      return NextResponse.json(
        { success: false, message: "student_id and academic_term are required" },
        { status: 400 }
      );
    }

    // 4) Make sure the Student exists in your 'students' table
    const { data: studentExists, error: studentCheckError } = await supabase
      .from("students")
      .select("student_id")
      .eq("student_id", student_id)
      .single();

    if (studentCheckError || !studentExists) {
      return NextResponse.json(
        { success: false, message: "Student does not exist in students table" },
        { status: 400 }
      );
    }

    // 5) Save (Upsert) the grades
    const { error: gradesError } = await supabase
      .from("grades")
      .upsert(
        [
          {
            student_id,
            academic_term,
            design_grade: body.design_grade ?? null,
            urban_design_grade: body.urban_design_grade ?? null,
            computer_apps_grade: body.computer_apps_grade ?? null,
            workshop_drawings_grade: body.workshop_drawings_grade ?? null,
            technical_installation_grade: body.technical_installation_grade ?? null,
            cumulative_gpa: body.cumulative_gpa ?? null,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "student_id,academic_term" }
      );

    if (gradesError) {
      return NextResponse.json(
        { success: false, message: "Failed to save grades", error: gradesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Grades saved successfully" });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}