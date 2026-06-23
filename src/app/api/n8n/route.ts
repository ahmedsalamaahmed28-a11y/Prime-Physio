import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

// You should set this in your Vercel Environment Variables
const N8N_SECURE_TOKEN = process.env.N8N_SECURE_TOKEN || "prime_physio_n8n_secret_123";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${N8N_SECURE_TOKEN}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, clinicId, data } = body;

    if (!clinicId) {
      return NextResponse.json({ error: "clinicId is required" }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();

    switch (action) {
      case 'get_patients':
        const { data: patients, error: pError } = await supabaseAdmin
          .from('patients')
          .select('*')
          .eq('clinic_id', clinicId);
        
        if (pError) throw pError;
        return NextResponse.json({ success: true, data: patients });

      case 'get_schedule':
        const { date: sDate } = data || {};
        const { data: sessions, error: sError } = await supabaseAdmin
          .from('appointments')
          .select('*')
          .eq('clinic_id', clinicId)
          .gte('start_time', `${sDate || new Date().toISOString().split('T')[0]}T00:00:00.000Z`)
          .lte('start_time', `${sDate || new Date().toISOString().split('T')[0]}T23:59:59.999Z`);
        
        if (sError) throw sError;
        return NextResponse.json({ success: true, data: sessions });

      case 'get_available_slots': {
        const { date } = data || {};
        if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });
        
        // Fetch clinic settings for working hours
        let startHour = 10; // default 10 AM
        let endHour = 22; // default 10 PM
        
        const { data: settings } = await supabaseAdmin
          .from('clinic_settings')
          .select('working_hours')
          .eq('clinic_id', clinicId)
          .limit(1)
          .single();
          
        if (settings && settings.working_hours) {
          // parse string like "09:00 AM - 09:00 PM"
          const match = settings.working_hours.match(/(\d+):(\d+)\s*(AM|PM)?\s*-\s*(\d+):(\d+)\s*(AM|PM)?/i);
          if (match) {
            let sH = parseInt(match[1]);
            if (match[3]?.toUpperCase() === 'PM' && sH < 12) sH += 12;
            if (match[3]?.toUpperCase() === 'AM' && sH === 12) sH = 0;
            let eH = parseInt(match[4]);
            if (match[6]?.toUpperCase() === 'PM' && eH < 12) eH += 12;
            if (match[6]?.toUpperCase() === 'AM' && eH === 12) eH = 0;
            startHour = sH;
            endHour = eH;
          }
        }

        // Fetch existing appointments
        const { data: appts } = await supabaseAdmin
          .from('appointments')
          .select('start_time, end_time')
          .eq('clinic_id', clinicId)
          .gte('start_time', `${date}T00:00:00.000Z`)
          .lte('start_time', `${date}T23:59:59.999Z`);

        const availableSlots = [];
        for (let h = startHour; h < endHour; h++) {
          for (let m of [0, 30]) {
            const slotStart = new Date(`${date}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00.000Z`);
            const slotEnd = new Date(slotStart.getTime() + 30 * 60000);
            
            // Check if slot overlaps with any appointment
            let isFree = true;
            if (appts) {
              for (const a of appts) {
                const aStart = new Date(a.start_time);
                const aEnd = new Date(a.end_time);
                if (slotStart < aEnd && slotEnd > aStart) {
                  isFree = false;
                  break;
                }
              }
            }
            if (isFree) {
              availableSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            }
          }
        }
        
        return NextResponse.json({ success: true, working_hours: `${startHour}:00 to ${endHour}:00`, available_slots: availableSlots });
      }

      case 'book_appointment': {
        const { name, phone, date, time } = data || {};
        if (!name || !phone || !date || !time) {
          return NextResponse.json({ error: "name, phone, date, and time are required" }, { status: 400 });
        }

        // Find or create patient
        let patientId;
        const { data: existingPatients } = await supabaseAdmin
          .from('patients')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('phone', phone)
          .limit(1);

        if (existingPatients && existingPatients.length > 0) {
          patientId = existingPatients[0].id;
        } else {
          // Create new patient
          patientId = `P-${Date.now()}`;
          const { error: insertError } = await supabaseAdmin.from('patients').insert({
            id: patientId,
            clinic_id: clinicId,
            nameAr: name,
            phone: phone,
            status: "نشط",
            sessionsUsed: 0
          });
          if (insertError) throw insertError;
        }

        // Create appointment
        const start = new Date(`${date}T${time}:00.000Z`);
        const end = new Date(start.getTime() + 30 * 60000); // 30 min duration
        const apptId = `E-${Date.now()}`;

        const { error: apptError } = await supabaseAdmin.from('appointments').insert({
          id: apptId,
          clinic_id: clinicId,
          patient_id: patientId,
          patient_name: name,
          appointment_type: "كشف أول",
          status: "مؤكد",
          start_time: start.toISOString(),
          end_time: end.toISOString()
        });

        if (apptError) throw apptError;

        return NextResponse.json({ success: true, message: "Appointment booked successfully", patientId, appointmentId: apptId });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("n8n API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
