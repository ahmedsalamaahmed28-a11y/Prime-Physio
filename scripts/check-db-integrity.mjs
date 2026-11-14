import { Client } from "pg";

const connectionString = process.env.SUPABASE_READONLY_DB_URL;
if (!connectionString) {
  console.log("SKIPPED: SUPABASE_READONLY_DB_URL is not configured.");
  console.log("Configure a dedicated read-only database role; do not use the postgres owner connection for scheduled monitoring.");
  process.exit(0);
}

const client = new Client({
  connectionString,
  application_name: "prime-physio-integrity-monitor",
  connectionTimeoutMillis: 10000,
  query_timeout: 20000,
  statement_timeout: 15000,
  ssl: { rejectUnauthorized: true },
});

const integritySql = `
  SELECT 'patients_missing_clinic_id' AS check_name, COUNT(*)::bigint AS issue_count
  FROM public.patients
  WHERE clinic_id IS NULL

  UNION ALL
  SELECT 'sessions_missing_clinic_id', COUNT(*)::bigint
  FROM public.sessions
  WHERE clinic_id IS NULL

  UNION ALL
  SELECT 'sessions_without_matching_patient_and_clinic', COUNT(*)::bigint
  FROM public.sessions s
  WHERE s.patient_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.id = s.patient_id
        AND p.clinic_id = s.clinic_id
    )

  UNION ALL
  SELECT 'evaluations_without_matching_patient_and_clinic', COUNT(*)::bigint
  FROM public.patient_evaluations e
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = e.patient_id
      AND p.clinic_id = e.clinic_id
  )

  UNION ALL
  SELECT 'programs_without_matching_patient_and_clinic', COUNT(*)::bigint
  FROM public.patient_programs pr
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = pr.patient_id
      AND p.clinic_id = pr.clinic_id
  )

  UNION ALL
  SELECT 'medical_records_without_matching_patient_and_clinic', COUNT(*)::bigint
  FROM public.patient_medical_records mr
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = mr.patient_id
      AND p.clinic_id = mr.clinic_id
  )

  UNION ALL
  SELECT 'attachments_without_matching_patient_and_clinic', COUNT(*)::bigint
  FROM public.patient_attachments a
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = a.patient_id
      AND p.clinic_id = a.clinic_id
  )
`;

let opened = false;
try {
  await client.connect();
  await client.query("BEGIN READ ONLY");
  opened = true;

  const result = await client.query(integritySql);
  await client.query("COMMIT");
  opened = false;

  const problems = result.rows.filter((row) => Number(row.issue_count) > 0);
  if (problems.length) {
    console.error("Database integrity audit found aggregate anomalies (no patient values were selected):");
    for (const problem of problems) {
      console.error(`- ${problem.check_name}: ${problem.issue_count}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Database integrity audit passed: no missing clinic links or cross-clinic patient references were found.");
  }
} catch (error) {
  if (opened) {
    try { await client.query("ROLLBACK"); } catch {}
  }
  console.error("Database integrity audit could not complete. Check the read-only role grants and schema compatibility.");
  console.error(error instanceof Error ? error.message : "Unknown database error");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
