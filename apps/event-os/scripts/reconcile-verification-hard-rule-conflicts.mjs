/**
 * Production maintenance helper for EOS-S06 HARD-rule conflict reconciliation.
 * Withdraws newer ACTIVE HARD KEEP_APART editions that contradict an earlier
 * ACTIVE HARD KEEP_TOGETHER for the same guest pair + scope (verification residue).
 *
 * Usage (inside event-os container):
 *   node scripts/reconcile-verification-hard-rule-conflicts.mjs --dry-run
 *   node scripts/reconcile-verification-hard-rule-conflicts.mjs --execute
 */
import pg from "pg";
import { randomUUID } from "node:crypto";

const EVENT_ID = "00000000-0000-4000-8000-000000000021";
const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ACTOR = "00000000-0000-4000-8000-000000000043";
const REASON = "VERIFICATION_CONFLICT_RECONCILIATION_AFTER_HARD_RULE_GUARD";
const execute = process.argv.includes("--execute");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: actives } = await client.query(
  `SELECT id, kind, scope, lifecycle, created_at, activated_at
   FROM seating_v2_rule_editions
   WHERE event_id = $1 AND lifecycle = 'ACTIVE' AND hardness = 'HARD'
     AND kind IN ('KEEP_TOGETHER', 'KEEP_APART')
   ORDER BY COALESCE(activated_at, created_at), id`,
  [EVENT_ID],
);

const subjectsByEdition = new Map();
for (const row of actives) {
  const subjects = await client.query(
    `SELECT subject_id
     FROM seating_v2_rule_subjects
     WHERE rule_edition_id = $1 AND subject_type = 'EVENT_GUEST'
     ORDER BY subject_id`,
    [row.id],
  );
  subjectsByEdition.set(
    row.id,
    subjects.rows.map((item) => item.subject_id).join("|"),
  );
}

const plans = [];
const together = actives.filter((row) => row.kind === "KEEP_TOGETHER");
const apart = actives.filter((row) => row.kind === "KEEP_APART");

for (const keep of together) {
  const key = subjectsByEdition.get(keep.id);
  if (!key) continue;
  for (const conflict of apart) {
    if (conflict.scope !== keep.scope) continue;
    if (subjectsByEdition.get(conflict.id) !== key) continue;
    const keepStamp = String(keep.activated_at ?? keep.created_at);
    const conflictStamp = String(conflict.activated_at ?? conflict.created_at);
    // Preserve earlier KEEP_TOGETHER; withdraw the conflicting KEEP_APART.
    if (conflictStamp >= keepStamp || conflict.id > keep.id) {
      plans.push({
        preserveEditionId: keep.id,
        preserveKind: keep.kind,
        withdrawEditionId: conflict.id,
        withdrawKind: conflict.kind,
        subjectKey: key,
        scope: keep.scope,
        reason: REASON,
      });
    }
  }
}

console.log(JSON.stringify({ dryRun: !execute, planCount: plans.length, plans }, null, 2));

if (!execute) {
  await client.end();
  process.exit(0);
}

if (plans.length === 0) {
  console.log(JSON.stringify({ withdrawn: [], remainingOk: true }));
  await client.end();
  process.exit(0);
}

const now = new Date().toISOString();
const withdrawn = [];
await client.query("BEGIN");
try {
  for (const plan of plans) {
    const updated = await client.query(
      `UPDATE seating_v2_rule_editions
       SET lifecycle = 'WITHDRAWN',
           withdrawn_by_person_id = $2,
           withdrawn_at = $3,
           withdrawal_reason = $4
       WHERE id = $1 AND event_id = $5 AND lifecycle = 'ACTIVE'
       RETURNING id, lifecycle`,
      [plan.withdrawEditionId, ACTOR, now, REASON, EVENT_ID],
    );
    if (updated.rows[0]) withdrawn.push(updated.rows[0].id);
    const auditId = randomUUID();
    await client.query(
      `INSERT INTO platform_audit (id, occurred_at, organisation_id, client_id, event_id, action, outcome, body)
       VALUES ($1,$2,$3,NULL,$4,$5,$6,$7)`,
      [
        auditId,
        now,
        ORG_ID,
        EVENT_ID,
        "seatingV2.reconcileVerificationHardRuleConflicts",
        "SUCCESS",
        JSON.stringify({
          id: auditId,
          action: "seatingV2.reconcileVerificationHardRuleConflicts",
          eventId: EVENT_ID,
          outcome: "SUCCESS",
          service: "shared-platform",
          metadata: plan,
          actorType: "USER",
          occurredAt: now,
          resourceId: plan.withdrawEditionId,
          resourceType: "seating_v2",
          actorPersonId: ACTOR,
          correlationId: randomUUID(),
          schemaVersion: 1,
          organisationId: ORG_ID,
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
  `SELECT e.id, e.kind, e.lifecycle,
          string_agg(s.subject_id, '|' ORDER BY s.subject_id) AS subject_key
   FROM seating_v2_rule_editions e
   JOIN seating_v2_rule_subjects s ON s.rule_edition_id = e.id AND s.subject_type = 'EVENT_GUEST'
   WHERE e.event_id = $1 AND e.lifecycle = 'ACTIVE' AND e.hardness = 'HARD'
     AND e.kind IN ('KEEP_TOGETHER', 'KEEP_APART')
   GROUP BY e.id, e.kind, e.lifecycle`,
  [EVENT_ID],
);

const byKey = new Map();
for (const row of verify.rows) {
  const list = byKey.get(row.subject_key) ?? [];
  list.push(row);
  byKey.set(row.subject_key, list);
}
const contradictory = [...byKey.values()].filter((list) => {
  const kinds = new Set(list.map((item) => item.kind));
  return kinds.has("KEEP_TOGETHER") && kinds.has("KEEP_APART");
});

console.log(
  JSON.stringify(
    {
      withdrawn,
      remainingActive: verify.rows,
      contradictoryRemaining: contradictory,
      ok: contradictory.length === 0,
    },
    null,
    2,
  ),
);
await client.end();
