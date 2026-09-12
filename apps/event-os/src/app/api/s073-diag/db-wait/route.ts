import { Pool } from "pg";
import { databaseUrl } from "../../../../server/config";
import { diagnosticGate, diagnosticHeaderToken, diagnosticUnavailableResponse } from "../../../../server/event-os-diagnostic";
import { readPoolSnapshot } from "../../../../server/runtime";

export const runtime = "nodejs";

type ActivityRow = {
  xact_age_ms: string | number | null;
  idle_in_tx_ms: string | number | null;
  wait_event_type: string | null;
  wait_event: string | null;
  state: string | null;
};

function numberOrZero(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(request: Request): Promise<Response> {
  const gate = diagnosticGate(diagnosticHeaderToken(request));
  if (gate !== "OK") return diagnosticUnavailableResponse();
  const url = databaseUrl();
  const pool = readPoolSnapshot();
  if (!url) {
    return Response.json({
      ok: true,
      persistence: "MEMORY",
      maxActiveTxMs: 0,
      maxIdleInTxMs: 0,
      waitEvents: [],
      pool,
    });
  }
  const observe = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    const result = await observe.query<ActivityRow>(
      `SELECT
         CASE WHEN state <> 'idle' AND xact_start IS NOT NULL
           THEN FLOOR(EXTRACT(EPOCH FROM (now() - xact_start)) * 1000)
           ELSE 0 END AS xact_age_ms,
         CASE WHEN state = 'idle in transaction' AND state_change IS NOT NULL
           THEN FLOOR(EXTRACT(EPOCH FROM (now() - state_change)) * 1000)
           ELSE 0 END AS idle_in_tx_ms,
         wait_event_type,
         wait_event,
         state
       FROM pg_stat_activity
       WHERE datname = current_database()
         AND pid <> pg_backend_pid()`,
    );
    const rows = result.rows;
    return Response.json({
      ok: true,
      persistence: "POSTGRES",
      maxActiveTxMs: Math.max(0, ...rows.map((row) => numberOrZero(row.xact_age_ms))),
      maxIdleInTxMs: Math.max(0, ...rows.map((row) => numberOrZero(row.idle_in_tx_ms))),
      waitEvents: rows
        .filter((row) => row.wait_event_type || row.wait_event)
        .map((row) => ({
          state: row.state,
          waitEventType: row.wait_event_type,
          waitEvent: row.wait_event,
        })),
      pool,
    });
  } finally {
    await observe.end();
  }
}
