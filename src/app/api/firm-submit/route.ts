import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // ── 1) Extract & Sanitize ──
    const name = String(body.name || "").trim();
    const contact_person = String(body.contact_person || "").trim();
    const contact_email = String(body.contact_email || "").trim();
    const contact_phone = String(body.contact_phone || "").trim();
    const address = String(body.address || "").trim();
    const city = String(body.city || "").trim();
    const industry = String(body.industry || "").trim();
    const training_description = String(body.training_description || "").trim();
    const available_slots = Number(body.available_slots);
    const duration_weeks = Number(body.duration_weeks);

    // ── 2) Validation Logic ──
    const missingFields = [];
    if (!name) missingFields.push("Firm Name");
    if (!contact_person) missingFields.push("Contact Person");
    if (!contact_email) missingFields.push("Contact Email");
    if (!contact_phone) missingFields.push("Contact Phone");
    if (!address) missingFields.push("Address");
    if (!city) missingFields.push("City");
    if (!industry) missingFields.push("Industry");
    if (!training_description) missingFields.push("Training Description");
    if (isNaN(available_slots) || available_slots < 1) missingFields.push("Available Slots");
    if (isNaN(duration_weeks) || duration_weeks < 1) missingFields.push("Duration in Weeks");

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Please fill in: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return NextResponse.json({ success: false, error: "Invalid email address." }, { status: 400 });
    }

    // ── 3) Duplicate Check (Case Insensitive) ──
    const { data: existing, error: dupError } = await supabase
      .from("firms")
      .select("id")
      .ilike("name", name)
      .limit(1);

    if (dupError) {
      return NextResponse.json({ success: false, error: "Database error during duplicate check." }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "A firm with this name has already been submitted." },
        { status: 409 }
      );
    }

    // ── 4) Insert with PENDING status ──
    const { data: inserted, error: insertError } = await supabase
      .from("firms")
      .insert([
        {
          name,
          contact_person,
          contact_email,
          contact_phone,
          address,
          city,
          industry,
          training_description,
          available_slots,
          duration_weeks,
          status: "PENDING",
          created_at: new Date().toISOString(),
        }
      ])
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: "Failed to submit application.", detail: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully! Pending admin review.",
      firm_id: inserted.id
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Server error. Please try again.", detail: err.message },
      { status: 500 }
    );
  }
}