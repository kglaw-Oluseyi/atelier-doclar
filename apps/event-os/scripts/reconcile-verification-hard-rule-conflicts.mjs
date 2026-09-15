/**
 * Production maintenance helper for EOS-S06 HARD-rule conflict reconciliation.
 * Withdraws newer ACTIVE HARD KEEP_APART editions that contradict an earlier
 * ACTIVE HARD KEEP_TOGETHER for the same guest pair + scope (verification residue).
 *
 * Usage (inside event-os container / railway run):
 *   node scripts/reconcile-verification-hard-rule-conflicts.mjs --dry-run
 *   node scripts/reconcile-verification-hard-rule-conflicts.mjs --execute
 *   node scripts/reconcile-verification-hard-rule-conflicts.mjs --event-id <uuid> --dry-run
 *   node scripts/reconcile-verification-hard-rule-conflicts.mjs --event-id <uuid> --execute
 *
 * Without --event-id, scans all events that have ACTIVE HARD KEEP_TOGETHER/KEEP_APART pairs.
 */
import pg from "pg";
import { randomUUID } from "node:crypto";

const DEFAULT_EVENT_ID = "00000000-0000-4000-8000-000000000021";
const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ACTOR = "00000000-0000-4000-8000-000000000043";
const REASON = "VERIFICATION_CONFLICT_RECONCILIATION_AFTER_HARD_RULE_GUARD";
const execute = process.argv.includes("--execute");
const eventIdFlag = process.argv.indexOf("--event-id");
const eventIdArg = eventIdFlag >= 0 ? process.argv[eventIdFlag + 1] : undefined;
const scanAll = process.argv.includes("--all-events");
const targetEventId = eventIdArg?.trim() || (scanAll ? undefined : DEFAULT_EVENT_ID);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

async function planForEvent(eventId) {
  const { rows: actives } = await client.query(
    `SELECT id, kind, scope, lifecycle, created_at, activated_at, left(content_hash, 12) AS hash_prefix
     FROM seating_v2_rule_editions
     WHERE event_id = $1 AND lifecycle = 'ACTIVE' AND hardness = 'HARD'
       AND kind IN ('KEEP_TOGETHER', 'KEEP_APART')
     ORDER BY COALESCE(activated_at, created_at), id`,
    [eventId],
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
  const seenWithdraw = new Set();

  for (const keep of together) {
    const key = subjectsByEdition.get(keep.id);
    if (!key) continue;
    for (const conflict of apart) {
      if (conflict.scope !== keep.scope) continue;
      if (subjectsByEdition.get(conflict.id) !== key) continue;
      if (seenWithdraw.has(conflict.id)) continue;
      const keepAt = new Date(keep.activated_at ?? keep.created_at).getTime();
      const conflictAt = new Date(conflict.activated_at ?? conflict.created_at).getTime();
      // Preserve the earlier legitimate rule; withdraw the later conflicting one.
      const preserve = keepAt <= conflictAt ? keep : conflict;
      const withdraw = keepAt <= conflictAt ? conflict : keep;
      if (seenWithdraw.has(withdraw.id)) continue;
      seenWithdraw.add(withdraw.id);
      plans.push({
        eventId,
        preserveEditionId: preserve.id,
        preserveKind: preserve.kind,
        preserveHashPrefix: preserve.hash_prefix,
        withdrawEditionId: withdraw.id,
        withdrawKind: withdraw.kind,
        withdrawHashPrefix: withdraw.hash_prefix,
        subjectKey: key,
        scope: keep.scope,
        reason: REASON,
      });
    }
  }
  return { eventId, actives, plans };
}

const eventIds = targetEventId
  ? [targetEventId]
  : (
      await client.query(
        `SELECT DISTINCT event_id
         FROM seating_v2_rule_editions
         WHERE lifecycle = 'ACTIVE' AND hardness = 'HARD'
           AND kind IN ('KEEP_TOGETHER', 'KEEP_APART')
         ORDER BY event_id`,
      )
    ).rows.map((row) => row.event_id);

const scanned = [];
const allPlans = [];
for (const eventId of eventIds) {
  const result = await planForEvent(eventId);
  scanned.push({ eventId, activeCount: result.actives.length, planCount: result.plans.length });
  allPlans.push(...result.plans);
}

console.log(JSON.stringify({ dryRun: !execute, scanned, planCount: allPlans.length, plans: allPlans }, null, 2));

if (!execute) {
  await client.end();
  process.exit(0);
}

if (allPlans.length === 0) {
  console.log(JSON.stringify({ withdrawn: [], remainingOk: true }));
  await client.end();
  process.exit(0);
}

const now = new Date().toISOString();
const withdrawn = [];
await client.query("BEGIN");
try {
  for (const plan of allPlans) {
    const updated = await client.query(
      `UPDATE seating_v2_rule_editions
       SET lifecycle = 'WITHDRAWN',
           withdrawn_by_person_id = $2,
           withdrawn_at = $3,
           withdrawal_reason = $4
       WHERE id = $1 AND event_id = $5 AND lifecycle = 'ACTIVE'
       RETURNING id, lifecycle, left(content_hash, 12) AS hash_prefix`,
      [plan.withdrawEditionId, ACTOR, now, REASON, plan.eventId],
    );
    if (updated.rows[0]) withdrawn.push(updated.rows[0]);
    const auditId = randomUUID();
    await client.query(
      `INSERT INTO platform_audit (id, occurred_at, organisation_id, client_id, event_id, action, outcome, body)
       VALUES ($1,$2,$3,NULL,$4,$5,$6,$7)`,
      [
        auditId,
        now,
        ORG_ID,
        plan.eventId,
        "seatingV2.reconcileVerificationHardRuleConflicts",
        "SUCCESS",
        JSON.stringify({
          id: auditId,
          action: "seatingV2.reconcileVerificationHardRuleConflicts",
          eventId: plan.eventId,
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

const verifyEvents = [...new Set(allPlans.map((plan) => plan.eventId))];
const contradictoryRemaining = [];
const remainingActive = [];
for (const eventId of verifyEvents) {
  const verify = await client.query(
    `SELECT e.id, e.kind, e.lifecycle, left(e.content_hash, 12) AS hash_prefix,
            string_agg(s.subject_id, '|' ORDER BY s.subject_id) AS subject_key
     FROM seating_v2_rule_editions e
     JOIN seating_v2_rule_subjects s ON s.rule_edition_id = e.id AND s.subject_type = 'EVENT_GUEST'
     WHERE e.event_id = $1 AND e.lifecycle = 'ACTIVE' AND e.hardness = 'HARD'
       AND e.kind IN ('KEEP_TOGETHER', 'KEEP_APART')
     GROUP BY e.id, e.kind, e.lifecycle, e.content_hash`,
    [eventId],
  );
  remainingActive.push(...verify.rows.map((row) => ({ ...row, eventId })));
  const byKey = new Map();
  for (const row of verify.rows) {
    const list = byKey.get(row.subject_key) ?? [];
    list.push(row);
    byKey.set(row.subject_key, list);
  }
  for (const list of byKey.values()) {
    const kinds = new Set(list.map((item) => item.kind));
    if (kinds.has("KEEP_TOGETHER") && kinds.has("KEEP_APART")) {
      contradictoryRemaining.push({ eventId, list });
    }
  }
}

const history = await client.query(
  `SELECT id, lifecycle, withdrawal_reason, left(content_hash, 12) AS hash_prefix
   FROM seating_v2_rule_editions
   WHERE id = ANY($1::uuid[])`,
  [withdrawn.map((row) => row.id)],
);

console.log(
  JSON.stringify(
    {
      withdrawn,
      remainingActive,
      contradictoryRemaining,
      withdrawnVisibleInHistory: history.rows,
      ok: contradictoryRemaining.length === 0,
    },
    null,
    2,
  ),
);
await client.end();
