import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const configuredToken = process.env.N8N_SECURE_TOKEN;
    if (!configuredToken || configuredToken.length < 32) {
      return NextResponse.json({ error: "Integration is not configured" }, { status: 503 });
    }
    const authHeader = req.headers.get('authorization') || '';
    const suppliedToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const expected = Buffer.from(configuredToken);
    const supplied = Buffer.from(suppliedToken);
    if (!suppliedToken || expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, clinicId, data } = body;
    if (!clinicId || typeof clinicId !== "string") return NextResponse.json({ error: "clinicId is required" }, { status: 400 });

    const allowedClinicIds = (process.env.N8N_ALLOWED_CLINIC_IDS || "").split(",").map(v => v.trim()).filter(Boolean);
    if (allowedClinicIds.length === 0 || !allowedClinicIds.includes(clinicId)) {
      return NextResponse.json({ error: "Clinic is not enabled for this integration" }, { status: 403 });
    }

    const supabaseAdmin = getAdminClient();

    switch (action) {
      case 'get_patients': {
        const { data: patients, error } = await supabaseAdmin.from('patients').select('*').eq('clinic_id', clinicId);
        if (error) throw error;
        return NextResponse.json({ success: true, data: patients });
      }
      case 'get_schedule': {
        const { date: sDate } = data || {};
        const day = sDate || new Date().toISOString().split('T')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
        const { data: sessions, error } = await supabaseAdmin.from('appointments').select('*')
          .eq('clinic_id', clinicId).gte('start_time', `${day}T00:00:00.000Z`).lte('start_time', `${day}T23:59:59.999Z`);
        if (error) throw error;
        return NextResponse.json({ success: true, data: sessions });
      }
      default:
        return NextResponse.json({ error: "Action disabled pending explicit per-action authorization review" }, { status: 403 });
    }
  } catch (error) {
    console.error("n8n API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
