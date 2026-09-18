import { Pool } from "pg";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const eventId = "92909476-d3f9-43f1-a5f7-7e1a83c92fbd";
  const adoptionId = "3b771ad9-c4c9-401b-87df-0371f9eee840";
  const runId = "9ba506b1-dadc-478b-a857-051180307526";

  const evals = await pool.query(
    `SELECT id, organisation_id, event_id, status, case_count, passed_count, failed_count,
            readiness_result, correlation_id, evaluation_version, authority_input_hash,
            adoption_id, run_id, actor_person_id, actor_role_key, evaluated_at, safe_failure_codes
     FROM cpsat_seating_evaluations
     WHERE event_id = $1
     ORDER BY evaluated_at DESC
     LIMIT 5`,
    [eventId],
  );
  console.log("EVALS", JSON.stringify(evals.rows, null, 2));

  const latest = evals.rows[0];
  if (!latest) throw new Error("no durable evaluation found");

  const ledger = await pool.query(
    `SELECT id, occurred_at, action, outcome, organisation_id, event_id, resource_type, resource_id,
            correlation_id, idempotency_key, actor_person_id
     FROM audit_events
     WHERE correlation_id = $1 OR (event_id = $2 AND action = 'seatingV2.runEvaluation')
     ORDER BY occurred_at DESC
     LIMIT 10`,
    [latest.correlation_id, eventId],
  ).catch(async (e: Error) => {
    console.log("audit_events ERR", e.message.split("\n")[0]);
    const names = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND (table_name ILIKE '%audit%' OR table_name ILIKE '%ledger%')
       ORDER BY 1`,
    );
    console.log("AUDIT_TABLES", names.rows);
    return { rows: [] as Record<string, unknown>[] };
  });
  console.log("LEDGER", JSON.stringify(ledger.rows, null, 2));

  const adoption = await pool.query(
    `SELECT id, event_id, run_id, status, evidence_grade, product_result, is_current
     FROM cpsat_adoptions WHERE event_id = $1 ORDER BY created_at DESC LIMIT 5`,
    [eventId],
  ).catch(async (e: Error) => {
    console.log("cpsat_adoptions ERR", e.message.split("\n")[0]);
    const names = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND table_name ILIKE '%adopt%'
       ORDER BY 1`,
    );
    console.log("ADOPT_TABLES", names.rows);
    return { rows: [] as Record<string, unknown>[] };
  });
  console.log("ADOPTIONS", JSON.stringify(adoption.rows, null, 2));

  const cases = await pool.query(
    `SELECT case_id, status, safe_failure_code FROM cpsat_seating_evaluation_cases
     WHERE evaluation_id = $1 ORDER BY case_id`,
    [latest.id],
  );
  console.log("CASES", JSON.stringify(cases.rows, null, 2));

  console.log(
    "PROOF_SUMMARY",
    JSON.stringify(
      {
        evaluationId: latest.id,
        correlationId: latest.correlation_id,
        status: latest.status,
        ledgerMatchCount: ledger.rows.filter((r) => r.correlation_id === latest.correlation_id).length,
        expectedAdoptionId: adoptionId,
        expectedRunId: runId,
        adoptionRows: adoption.rows,
      },
      null,
      2,
    ),
  );

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
