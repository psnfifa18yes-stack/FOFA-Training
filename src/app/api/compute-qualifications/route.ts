import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const student_id = String(body.student_id || "").trim();

    if (!student_id) {
      return NextResponse.json(
        { success: false, message: "student_id is required" },
        { status: 400 }
      );
    }

    // 1) Check if the student has actually applied
    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("status")
      .eq("student_id", student_id)
      .single();

    if (applicationError || !application || application.status !== "APPLIED") {
      return NextResponse.json(
        { success: false, message: "Student has not applied" },
        { status: 400 }
      );
    }

    // 2) Get latest grades row
    const { data: grades, error: gradesError } = await supabase
      .from("grades")
      .select("*, extra_grades")
      .eq("student_id", student_id)
      .order("academic_term", { ascending: false })
      .limit(1)
      .single();

    if (gradesError || !grades) {
      return NextResponse.json(
        { success: false, message: "No grades found for student" },
        { status: 400 }
      );
    }

    // 3) Get ALL active training rules (bypass 1000 cap)
    let allRules: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data: rulesPage, error: rulesError } = await supabase
        .from("training_rules")
        .select("*")
        .eq("active", true)
        .range(from, to);

      if (rulesError) {
        return NextResponse.json(
          { success: false, message: "Failed to load rules", error: rulesError.message },
          { status: 500 }
        );
      }

      if (!rulesPage || rulesPage.length === 0) {
        hasMore = false;
      } else {
        allRules = [...allRules, ...rulesPage];
        if (rulesPage.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    // 4) Build subject map
    const extraGrades: Record<string, number> = grades.extra_grades || {};
    const subjectMap: Record<string, number | null> = {
      "Design Grades": grades.design_grade,
      "Urban Design Grades": grades.urban_design_grade,
      "Computer Applications Grades": grades.computer_apps_grade,
      "Workshop Drawings Grades": grades.workshop_drawings_grade,
      "Technical Installation Grades": grades.technical_installation_grade,
      ...extraGrades,
    };

    // 5) Match rules (using allRules instead of rules)
    const matchedTrainings: any[] = [];
    for (const rule of allRules) {
      const studentGrade = subjectMap[rule.subject];
      if (studentGrade === undefined || studentGrade === null) continue;

      const termOk = grades.academic_term >= rule.term_min && grades.academic_term <= rule.term_max;
      const gradeOk = Number(studentGrade) >= Number(rule.grade_min) && Number(studentGrade) <= Number(rule.grade_max);
      const gpaOk = Number(grades.cumulative_gpa) >= Number(rule.gpa_min);

      if (termOk && gradeOk && gpaOk) {
        matchedTrainings.push({
          student_id,
          academic_term: grades.academic_term,
          training_name: rule.training_name,
          level: rule.level,
        });
      }
    }

    // 6) Clear previous qualifications
    await supabase
      .from("qualified_trainings")
      .delete()
      .eq("student_id", student_id)
      .eq("academic_term", grades.academic_term);

    // 7) Insert new qualifications
    if (matchedTrainings.length > 0) {
      const { error: insertError } = await supabase
        .from("qualified_trainings")
        .insert(matchedTrainings);

      if (insertError) {
        return NextResponse.json(
          { success: false, message: "Failed to insert qualifications", error: insertError.message },
          { status: 500 }
        );
      }
    }

    // 8) Bust the cache
    const cacheKey = `portal:${student_id}`;
    await redis.del(cacheKey);
    console.log(`♻️ Cache cleared for student: ${student_id}`);

    return NextResponse.json({
      success: true,
      message: "Qualifications computed and cache refreshed",
      academic_term: grades.academic_term,
      count: matchedTrainings.length,
      trainings: matchedTrainings,
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}