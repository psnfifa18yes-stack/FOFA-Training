import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis'; // Import redis to clear the cache

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1) Verify caller identity
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ success: false, error: "Invalid user token" }, { status: 401 });
    }

    // 2) Confirm admin role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    // 3) Parse body
    const body = await request.json();
    const { student_id, firm_id, opportunity_id } = body;

    if (!student_id || !firm_id) {
      return NextResponse.json({ success: false, error: "Missing student_id or firm_id" }, { status: 400 });
    }

    // 4) Verify firm exists and is approved
    const { data: firm, error: firmError } = await supabase
      .from("firms")
      .select("status")
      .eq("id", firm_id)
      .single();

    if (firmError || !firm) return NextResponse.json({ success: false, error: "Firm not found" }, { status: 404 });
    if (firm.status !== "APPROVED") return NextResponse.json({ success: false, error: "Firm is not approved" }, { status: 400 });

    // 5) Verify student exists
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("student_id")
      .eq("student_id", student_id)
      .single();

    if (studentError || !student) return NextResponse.json({ success: false, error: "Student not found in database" }, { status: 404 });

    // 6) Handle Opportunity logic (Check slots)
    let oppRecord = null;
    if (opportunity_id) {
      const { data: opp, error: oppError } = await supabase
        .from("firm_opportunities")
        .select("id, available_slots, training_type")
        .eq("id", opportunity_id)
        .eq("firm_id", firm_id)
        .single();

      if (oppError || !opp) return NextResponse.json({ success: false, error: "Training type not found for this firm" }, { status: 404 });
      if (opp.available_slots <= 0) return NextResponse.json({ success: false, error: `No available slots for "${opp.training_type}"` }, { status: 400 });
      oppRecord = opp;
    }

    // 7) Check if student is already assigned
    const { count } = await supabase
      .from("allocations")
      .select("*", { count: "exact", head: true })
      .eq("firm_id", firm_id)
      .eq("student_id", student_id);

    if ((count ?? 0) > 0) {
      return NextResponse.json({ success: false, error: "Student is already assigned to this firm" }, { status: 400 });
    }

    // 8) Insert allocation
    const insertPayload: any = {
      student_id,
      firm_id,
      assigned_at: new Date().toISOString(),
    };
    if (opportunity_id) insertPayload.opportunity_id = opportunity_id;

    const { error: insertError } = await supabase
      .from("allocations")
      .insert(insertPayload);

    if (insertError) return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });

    // 9) Decrement opportunity slots
    if (oppRecord) {
      await supabase
        .from("firm_opportunities")
        .update({ available_slots: oppRecord.available_slots - 1 })
        .eq("id", oppRecord.id);
    }

    // ── STEP 10: BUST THE STUDENT PORTAL CACHE ──
    // Because the student is now assigned, we delete their cached view.
    // This forces the portal to show their new "Assigned" status immediately.
    const cacheKey = `portal:${student_id}`;
    await redis.del(cacheKey);
    console.log(`♻️ Cache cleared for assigned student: ${student_id}`);

    return NextResponse.json({ success: true, message: "Student assigned successfully" });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}