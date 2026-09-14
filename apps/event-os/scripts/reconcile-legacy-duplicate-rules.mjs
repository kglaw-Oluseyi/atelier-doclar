/**
 * Production maintenance helper for EOS-S06 remediation 2.
 * Applies the same survivor plan as seatingV2.reconcileLegacyDuplicateRules.
 * Usage (inside event-os container):
 *   node scripts/reconcile-legacy-duplicate-rules.mjs --dry-run
 *   node scripts/reconcile-legacy-duplicate-rules.mjs --execute
 */
import pg from "pg";
import { randomUUID } from "node:crypto";

const EVENT_ID = "00000000-0000-4000-8000-000000000021";
const HASH = "434a2ddc58fe7e7898fb577e94c9fc00382286040759124b9c6fa7b2e96a087b";
const REASON = "LEGACY_DUPLICATE_RECONCILIATION_AFTER_SEMANTIC_UNIQUENESS_ENFORCEMENT";
const ACTOR = "00000000-0000-4000-8000-000000000043"; // planner assignment authority for constraint.manage
const execute = process.argv.includes("--execute");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows } = await client.query(
  `SELECT id, lifecycle, content_hash, created_at, activated_at
   FROM seating_v2_rule_editions
   WHERE event_id = $1 AND content_hash = $2
   ORDER BY COALESCE(activated_at, created_at), id`,
  [EVENT_ID, HASH],
);

const actives = rows.filter((r) => r.lifecycle === "ACTIVE");
const drafts = rows.filter((r) => r.lifecycle === "DRAFT");
actives.sort(
  (a, b) =>
    String(a.activated_at ?? a.created_at).localeCompare(String(b.activated_at ?? b.created_at)) ||
    a.id.localeCompare(b.id),
);
const authoritative = actives[0];
const withdrawActive = actives.slice(1).map((r) => r.id);
const withdrawDraft = drafts.map((r) => r.id);

const plan = {
  contentHash: HASH,
  authoritativeId: authoritative?.id,
  withdrawActiveIds: withdrawActive,
  withdrawDraftIds: withdrawDraft,
  reason: REASON,
  dryRun: !execute,
};
console.log(JSON.stringify(plan, null, 2));

if (!execute) {
  await client.end();
  process.exit(0);
}

if (!authoritative) {
  console.error("NO_AUTHORITATIVE");
  process.exit(2);
}

const now = new Date().toISOString();
const withdrawn = [];
await client.query("BEGIN");
try {
  for (const id of [...withdrawActive, ...withdrawDraft]) {
    const updated = await client.query(
      `UPDATE seating_v2_rule_editions
       SET lifecycle = 'WITHDRAWN',
           withdrawn_by_person_id = $2,
           withdrawn_at = $3,
           withdrawal_reason = $4
       WHERE id = $1 AND event_id = $5 AND lifecycle IN ('ACTIVE','DRAFT')
       RETURNING id, lifecycle`,
      [id, ACTOR, now, REASON, EVENT_ID],
    );
    if (updated.rows[0]) withdrawn.push(updated.rows[0].id);
    const auditId = randomUUID();
    await client.query(
      `INSERT INTO platform_audit (id, occurred_at, organisation_id, client_id, event_id, action, outcome, body)
       VALUES ($1,$2,$3,NULL,$4,$5,$6,$7)`,
      [
        auditId,
        now,
        "00000000-0000-4000-8000-000000000001",
        EVENT_ID,
        "seatingV2.reconcileLegacyDuplicateRules",
        "SUCCESS",
        JSON.stringify({
          id: auditId,
          action: "seatingV2.reconcileLegacyDuplicateRules",
          eventId: EVENT_ID,
          outcome: "SUCCESS",
          service: "shared-platform",
          metadata: {
            reason: REASON,
            authoritativeId: authoritative.id,
            withdrawnId: id,
            contentHash: HASH,
          },
          actorType: "USER",
          occurredAt: now,
          resourceId: id,
          resourceType: "seating_v2",
          actorPersonId: ACTOR,
          correlationId: randomUUID(),
          schemaVersion: 1,
          organisationId: "00000000-0000-4000-8000-000000000001",
        }),
      ],
    );
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
}

const verify = await client.query(
  `SELECT id, lifecycle FROM seating_v2_rule_editions
   WHERE event_id = $1 AND content_hash = $2 AND lifecycle = 'ACTIVE'`,
  [EVENT_ID, HASH],
);
console.log(
  JSON.stringify(
    {
      withdrawn,
      remainingActive: verify.rows,
      ok: verify.rows.length === 1 && verify.rows[0].id === authoritative.id,
    },
    null,
    2,
  ),
);
await client.end();
