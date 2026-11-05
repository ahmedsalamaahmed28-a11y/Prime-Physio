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
    if (!clinicId || typeof clinicId !== 'string') {
      return NextResponse.json({ error: "clinicId is required" }, { status: 400 });
    }
    const allowedClinicIds = (process.env.N8N_ALLOWED_CLINIC_IDS || '').split(',').map(v => v.trim()).filter(Boolean);
    if (allowedClinicIds.length === 0 || !allowedClinicIds.includes(clinicId)) {
      return NextResponse.json({ error: "Clinic is not enabled for this integration" }, { status: 403 });
    }

    const supabaseAdmin = getAdminClient();

    // The integration token can serve more than one allow-listed clinic.
    // Verify every referenced record belongs to the clinic in this request before any write.
    const scopedReferences: Array<{ table: string; id: unknown }> = [];
    const addReference = (table: string, id: unknown) => {
      if (id !== undefined && id !== null && id !== "") scopedReferences.push({ table, id });
    };

    switch (action) {
      case "add_to_waitlist":
      case "save_assessment":
      case "save_treatment_plan":
      case "save_soap_note":
      case "update_progress":
      case "flag_patient_risk":
      case "save_discharge":
      case "generate_invoice":
      case "log_outstanding_recovery":
      case "save_insurance_claim":
        addReference("patients", data?.patientId);
        break;
      case "track_referral":
        addReference("patients", data?.referrerId);
        addReference("patients", data?.referredPatientId);
        break;
      default:
        break;
    }

    if (action === "save_assessment" || action === "save_soap_note" || action === "generate_invoice") {
      addReference("appointments", data?.appointmentId);
    }
    if (action === "save_treatment_plan") addReference("assessments", data?.assessmentId);
    if (action === "save_discharge") addReference("treatment_plans", data?.treatmentPlanId);
    if (action === "log_outstanding_recovery" || action === "save_insurance_claim") {
      addReference("invoices", data?.invoiceId);
    }
    if (action === "save_hr_attendance" || action === "save_payroll_draft") {
      addReference("staff", data?.staffId);
    }

    for (const reference of scopedReferences) {
      if (typeof reference.id !== "string" && typeof reference.id !== "number") {
        return NextResponse.json({ error: "Invalid related record identifier" }, { status: 400 });
      }
      const { data: related, error: relatedError } = await (supabaseAdmin as any)
        .from(reference.table)
        .select("id")
        .eq("id", reference.id)
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (relatedError) {
        console.error("[n8n] Related-record scope check failed:", reference.table, relatedError.message);
        return NextResponse.json({ error: "Unable to verify related record" }, { status: 500 });
      }
      if (!related) return NextResponse.json({ error: "Related record does not belong to the authorized clinic" }, { status: 403 });
    }

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
          for (const m of [0, 30]) {
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

      case 'create_lead': {
        const { name, phone, source } = data || {};
        if (!name || !phone) return NextResponse.json({ error: "name and phone required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('leads').insert({
          clinic_id: clinicId,
          name: name,
          phone: phone,
          source: source || 'unknown',
          status: 'new',
          score: 0
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Lead created" });
      }

      case 'register_patient': {
        const { name, phone } = data || {};
        if (!name || !phone) return NextResponse.json({ error: "name and phone required" }, { status: 400 });
        const patientId = `P-${Date.now()}`;
        const mrn = `MRN-${Math.floor(Math.random() * 1000000)}`;
        
        const { error } = await supabaseAdmin.from('patients').insert({
          id: patientId,
          clinic_id: clinicId,
          nameAr: name,
          phone: phone,
          status: "نشط",
          sessionsUsed: 0,
          mrn: mrn
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Patient registered", patientId, mrn });
      }

      case 'add_to_waitlist': {
        const { patientId, requestedDate } = data || {};
        if (!patientId || !requestedDate) return NextResponse.json({ error: "patientId and requestedDate required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('waitlist').insert({
          clinic_id: clinicId,
          patient_id: patientId,
          requested_date: requestedDate,
          status: 'waiting'
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Added to waitlist" });
      }

      case 'get_waitlist': {
        const { data: waitlist, error } = await supabaseAdmin
          .from('waitlist')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('status', 'waiting');
        if (error) throw error;
        return NextResponse.json({ success: true, data: waitlist });
      }

      case 'check_in_patient': {
        const { appointmentId } = data || {};
        if (!appointmentId) return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('appointments')
          .update({ status: 'تم الحضور' })
          .eq('id', appointmentId)
          .eq('clinic_id', clinicId);
          
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Patient checked in" });
      }

      case 'save_assessment': {
        const { patientId, appointmentId, symptoms, rom, strength, specialTests, potentialDiagnoses, redFlags, clinicalSummary } = data || {};
        if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });
        
        const { error, data: inserted } = await supabaseAdmin.from('assessments').insert({
          clinic_id: clinicId,
          patient_id: patientId,
          appointment_id: appointmentId,
          symptoms, rom, strength, special_tests: specialTests,
          potential_diagnoses: potentialDiagnoses, red_flags: redFlags,
          clinical_summary: clinicalSummary
        }).select('id').single();
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Assessment saved", assessmentId: inserted.id });
      }

      case 'save_treatment_plan': {
        const { patientId, assessmentId, goals, sessionPlan, frequency, duration, homeProgram } = data || {};
        if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });
        
        const { error, data: inserted } = await supabaseAdmin.from('treatment_plans').insert({
          clinic_id: clinicId,
          patient_id: patientId,
          assessment_id: assessmentId,
          goals, session_plan: sessionPlan, frequency, duration, home_program: homeProgram
        }).select('id').single();
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Treatment plan saved", planId: inserted.id });
      }

      case 'save_soap_note': {
        const { patientId, appointmentId, subjective, objective, assessment, plan, sessionSummary } = data || {};
        if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('soap_notes').insert({
          clinic_id: clinicId,
          patient_id: patientId,
          appointment_id: appointmentId,
          subjective, objective, assessment, plan, session_summary: sessionSummary
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "SOAP note saved" });
      }

      case 'update_progress': {
        const { patientId, painLevel, romStatus, strengthStatus, recoveryScore, notes } = data || {};
        if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('progress_tracking').insert({
          clinic_id: clinicId,
          patient_id: patientId,
          pain_level: painLevel, rom_status: romStatus, strength_status: strengthStatus,
          recovery_score: recoveryScore, notes
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Progress updated" });
      }

      case 'flag_patient_risk': {
        const { patientId, riskType, severity, description } = data || {};
        if (!patientId || !riskType) return NextResponse.json({ error: "patientId and riskType required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('patient_risks').insert({
          clinic_id: clinicId,
          patient_id: patientId,
          risk_type: riskType, severity, description
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Patient risk flagged" });
      }

      case 'save_discharge': {
        const { patientId, treatmentPlanId, dischargeReport, exercisePackage, followUpSchedule } = data || {};
        if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('discharges').insert({
          clinic_id: clinicId,
          patient_id: patientId,
          treatment_plan_id: treatmentPlanId,
          discharge_report: dischargeReport,
          exercise_package: exercisePackage,
          follow_up_schedule: followUpSchedule
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Discharge record saved" });
      }

      case 'generate_invoice': {
        const { patientId, appointmentId, amount, status, paymentMethod, dueDate } = data || {};
        if (!patientId || amount === undefined) return NextResponse.json({ error: "patientId and amount required" }, { status: 400 });
        
        const { error, data: inserted } = await supabaseAdmin.from('invoices').insert({
          clinic_id: clinicId,
          patient_id: patientId,
          appointment_id: appointmentId,
          amount, status, payment_method: paymentMethod, due_date: dueDate
        }).select('id').single();
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Invoice generated", invoiceId: inserted.id });
      }

      case 'log_outstanding_recovery': {
        const { invoiceId, patientId, reminderType, escalationLevel, messageSent } = data || {};
        if (!invoiceId || !patientId) return NextResponse.json({ error: "invoiceId and patientId required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('recovery_logs').insert({
          clinic_id: clinicId,
          invoice_id: invoiceId,
          patient_id: patientId,
          reminder_type: reminderType,
          escalation_level: escalationLevel,
          message_sent: messageSent
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Recovery log saved" });
      }

      case 'save_insurance_claim': {
        const { patientId, invoiceId, provider, claimAmount, status, notes } = data || {};
        if (!patientId || !provider || claimAmount === undefined) return NextResponse.json({ error: "patientId, provider, and claimAmount required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('insurance_claims').insert({
          clinic_id: clinicId,
          patient_id: patientId,
          invoice_id: invoiceId,
          provider, claim_amount: claimAmount, status, notes
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Insurance claim saved" });
      }

      case 'save_marketing_campaign': {
        const { campaignName, campaignType, targetAudience, messageCopy } = data || {};
        if (!campaignName) return NextResponse.json({ error: "campaignName required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('marketing_campaigns').insert({
          clinic_id: clinicId,
          campaign_name: campaignName,
          campaign_type: campaignType,
          target_audience: targetAudience,
          message_copy: messageCopy
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Marketing campaign saved" });
      }

      case 'track_referral': {
        const { referrerId, referredPatientId, rewardType } = data || {};
        if (!referrerId) return NextResponse.json({ error: "referrerId required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('referrals').insert({
          clinic_id: clinicId,
          referrer_id: referrerId,
          referred_patient_id: referredPatientId,
          reward_type: rewardType
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Referral tracked" });
      }

      case 'save_hr_attendance': {
        const { staffId, date, clockIn, clockOut, overtimeHours, status } = data || {};
        if (!staffId) return NextResponse.json({ error: "staffId required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('hr_attendance').insert({
          clinic_id: clinicId,
          staff_id: staffId,
          date, clock_in: clockIn, clock_out: clockOut,
          overtime_hours: overtimeHours, status
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "HR attendance logged" });
      }

      case 'save_payroll_draft': {
        const { staffId, monthYear, baseSalary, commissions, bonuses, deductions } = data || {};
        if (!staffId || !monthYear) return NextResponse.json({ error: "staffId and monthYear required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('payroll_drafts').insert({
          clinic_id: clinicId,
          staff_id: staffId,
          month_year: monthYear,
          base_salary: baseSalary, commissions, bonuses, deductions
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Payroll draft saved" });
      }

      case 'save_daily_report': {
        const { reportDate, totalRevenue, attendanceCount, newPatients, missedVisits } = data || {};
        
        const { error } = await supabaseAdmin.from('daily_reports').insert({
          clinic_id: clinicId,
          report_date: reportDate,
          total_revenue: totalRevenue,
          attendance_count: attendanceCount,
          new_patients: newPatients,
          missed_visits: missedVisits
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Daily report saved" });
      }

      case 'save_executive_report': {
        const { reportMonth, revenueForecast, growthForecast, capacityForecast, aiConsultantNotes } = data || {};
        if (!reportMonth) return NextResponse.json({ error: "reportMonth required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('executive_reports').insert({
          clinic_id: clinicId,
          report_month: reportMonth,
          revenue_forecast: revenueForecast,
          growth_forecast: growthForecast,
          capacity_forecast: capacityForecast,
          ai_consultant_notes: aiConsultantNotes
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Executive report saved" });
      }

      case 'log_audit_event': {
        const { userEmail, actionEvent, resource, metadata, ipAddress } = data || {};
        if (!userEmail || !actionEvent || !resource) return NextResponse.json({ error: "userEmail, actionEvent, and resource required" }, { status: 400 });
        
        const { error } = await supabaseAdmin.from('audit_logs').insert({
          clinic_id: clinicId,
          user_email: userEmail,
          action: actionEvent,
          resource, metadata, ip_address: ipAddress
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Audit event logged" });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("n8n API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
