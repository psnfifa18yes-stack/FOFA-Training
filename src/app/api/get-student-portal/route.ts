import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const student_id = String(body.student_id || '').trim();

    if (!student_id) {
      return NextResponse.json(
        {
          success: false,
          status: 'NO_STUDENT_ID',
          message: 'student_id is required'
        },
        { status: 400 }
      );
    }

    const cacheKey = `portal:${student_id}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log(`🚀 Cache Hit for ${student_id}`);
      const parsedCache = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
      return NextResponse.json(parsedCache);
    }

    console.log(`💾 Cache Miss for ${student_id}. Fetching from Supabase...`);
    const supabase = await createClient();

    const [{ data: student, error: studentError }, { data: application, error: applicationError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase
        .from('students')
        .select('student_id, student_name, faculty_name')
        .eq('student_id', student_id)
        .single(),
      supabase
        .from('applications')
        .select('status, applied_at')
        .eq('student_id', student_id)
        .single(),
      supabase
        .from('system_settings')
        .select('submission_status')
        .eq('id', 1)
        .single(),
    ]);

    if (studentError && studentError.code !== 'PGRST116') {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to load student information',
          error: studentError.message
        },
        { status: 500 }
      );
    }

    const submissionOpen = settings?.submission_status !== 'CLOSED';
    const hasApplied = Boolean(application && application.status === 'APPLIED');

    const { data: grades, error: gradesError } = await supabase
      .from('grades')
      .select(
        'academic_term, cumulative_gpa, design_grade, urban_design_grade, computer_apps_grade, workshop_drawings_grade, technical_installation_grade'
      )
      .eq('student_id', student_id)
      .order('academic_term', { ascending: false })
      .limit(1)
      .single();

    if (gradesError && gradesError.code !== 'PGRST116') {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to load grades',
          error: gradesError.message
        },
        { status: 500 }
      );
    }

    const academicTerm = grades?.academic_term ?? null;

    // Fetch qualifications (scoped to a single student, unlikely >1000 but we keep as is)
    const { data: qualifications, error: qualificationsError } = await supabase
      .from('qualified_trainings')
      .select('training_name, level')
      .eq('student_id', student_id)
      .eq('academic_term', academicTerm);

    if (qualificationsError && qualificationsError.code !== 'PGRST116') {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to load qualification records',
          error: qualificationsError.message
        },
        { status: 500 }
      );
    }

    // Fetch selection (limited to 1)
    const { data: selection, error: selectionError } = await supabase
      .from('selections')
      .select('training_1, training_2, academic_term, updated_at')
      .eq('student_id', student_id)
      .order('academic_term', { ascending: false })
      .limit(1)
      .single();

    if (selectionError && selectionError.code !== 'PGRST116') {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to load training selections',
          error: selectionError.message
        },
        { status: 500 }
      );
    }

    // ---- MODIFIED: Fetch ALL active training rules (bypass 1000 cap) ----
    let allTrainingRules: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data: rulesPage, error: rulesError } = await supabase
        .from('training_rules')
        .select('training_name')
        .eq('active', true)
        .order('training_name', { ascending: true })
        .range(from, to);

      if (rulesError) {
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to load training options',
            error: rulesError.message
          },
          { status: 500 }
        );
      }

      if (!rulesPage || rulesPage.length === 0) {
        hasMore = false;
      } else {
        allTrainingRules = [...allTrainingRules, ...rulesPage];
        if (rulesPage.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }
    // ----------------------------------------------------------------

    // Allocation (limited to 1)
    const { data: allocationRows, error: allocationError } = await supabase
      .from('allocations')
      .select('firm_id, opportunity_id, assigned_at')
      .eq('student_id', student_id)
      .order('assigned_at', { ascending: false })
      .limit(1);

    if (allocationError && allocationError.code !== 'PGRST116') {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to load assignment data',
          error: allocationError.message
        },
        { status: 500 }
      );
    }

    const allocation = Array.isArray(allocationRows) ? allocationRows[0] : allocationRows;
    let assignment = null;
    if (allocation) {
      const [{ data: firm, error: firmError }, { data: opportunity, error: opportunityError }] = await Promise.all([
        supabase
          .from('firms')
          .select('name, city')
          .eq('id', allocation.firm_id)
          .single(),
        allocation.opportunity_id
          ? supabase
              .from('firm_opportunities')
              .select('training_type')
              .eq('id', allocation.opportunity_id)
              .single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!firmError && firm) {
        assignment = {
          firm_name: firm.name,
          firm_city: firm.city,
          training_type: opportunity?.training_type ?? null,
          assigned_at: allocation.assigned_at,
        };
      }
    }

    const qualifiedTrainings = Array.isArray(qualifications)
      ? qualifications.map((q: any) => ({ training_name: q.training_name, level: q.level }))
      : [];

    const trainingOptions = Array.isArray(allTrainingRules)
      ? allTrainingRules.map((rule: any) => rule.training_name).filter(Boolean)
      : [];

    let status = 'NOT_APPLIED';
    if (hasApplied) {
      status = grades ? (qualifiedTrainings.length > 0 ? 'QUALIFIED' : 'NOT_QUALIFIED') : 'NO_GRADES';
    }

    const result = {
      success: true,
      status,
      student: student || null,
      application: application || { status: 'NOT_APPLIED' },
      grades: grades || null,
      academic_term: academicTerm,
      qualified_trainings: qualifiedTrainings,
      trainings: qualifiedTrainings.map((q) => `${q.training_name} (Level ${q.level})`),
      selection: selection || null,
      assignment,
      submission_open: submissionOpen,
      training_options: trainingOptions,
    };

    await redis.set(cacheKey, JSON.stringify(result), { ex: 300 });
    return NextResponse.json(result);

  } catch (err: any) {
    const formattedError =
      typeof err === 'string'
        ? err
        : err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));

    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
        error: formattedError,
      },
      { status: 500 }
    );
  }
}