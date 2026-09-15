#!/usr/bin/env node
/**
 * Supersede obsolete DRAFT seating layout bindings when a newer DRAFT exists
 * for the same event (canonical one-pending-draft policy cleanup).
 *
 * Usage:
 *   tsx scripts/reconcile-obsolete-layout-binding-drafts.ts --dry-run --event-id <uuid>
 *   tsx scripts/reconcile-obsolete-layout-binding-drafts.ts --execute --event-id <uuid>
 */
import pg from "pg";
import { randomUUID } from "node:crypto";

const execute = process.argv.includes("--execute");
const eventIdFlag = process.argv.indexOf("--event-id");
const eventId = eventIdFlag >= 0 ? process.argv[eventIdFlag + 1]?.trim() : undefined;
const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ACTOR = "00000000-0000-4000-8000-000000000043";
const REASON = "VERIFICATION_OBSOLETE_PENDING_DRAFT_SUPERSESSION_AFTER_MAKER_CHECKER_FIX";

if (!eventId) {
  console.error("--event-id is required");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: drafts } = await client.query(
  `SELECT id, layout_id, layout_publication_id, left(layout_content_hash,12) AS hash,
          version, proposed_at, created_at, state
   FROM seating_v2_layout_bindings
   WHERE event_id = $1 AND state = 'DRAFT'
   ORDER BY COALESCE(proposed_at, created_at) DESC, id DESC`,
  [eventId],
);

const keep = drafts[0] ?? null;
const obsolete = drafts.slice(1);
const plan = {
  dryRun: !execute,
  eventId,
  keep,
  obsolete,
  reason: REASON,
};

console.log(JSON.stringify(plan, null, 2));

if (!execute || obsolete.length === 0) {
  await client.end();
  process.exit(0);
}

const now = new Date().toISOString();
const superseded = [];
await client.query("BEGIN");
try {
  for (const row of obsolete) {
    const updated = await client.query(
      `UPDATE seating_v2_layout_bindings
       SET state = 'SUPERSEDED', version = version + 1, updated_at = $2
       WHERE id = $1 AND event_id = $3 AND state = 'DRAFT'
       RETURNING id, state, version, left(layout_content_hash,12) AS hash`,
      [row.id, now, eventId],
    );
    if (updated.rows[0]) superseded.push(updated.rows[0]);
    const auditId = randomUUID();
    await client.query(
      `INSERT INTO platform_audit (id, occurred_at, organisation_id, client_id, event_id, action, outcome, body)
       VALUES ($1,$2,$3,NULL,$4,$5,$6,$7)`,
      [
        auditId,
        now,
        ORG_ID,
        eventId,
        "seatingV2.reconcileObsoletePendingLayoutBindingDrafts",
        "SUCCESS",
        JSON.stringify({
          id: auditId,
          action: "seatingV2.reconcileObsoletePendingLayoutBindingDrafts",
          eventId,
          outcome: "SUCCESS",
          service: "shared-platform",
          metadata: { keepId: keep?.id, supersededId: row.id, reason: REASON },
          actorType: "USER",
          occurredAt: now,
          resourceId: row.id,
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

const remaining = await client.query(
  `SELECT id, state, left(layout_content_hash,12) AS hash, proposed_at
   FROM seating_v2_layout_bindings WHERE event_id = $1 AND state = 'DRAFT'
   ORDER BY proposed_at DESC`,
  [eventId],
);

console.log(JSON.stringify({ superseded, remainingDrafts: remaining.rows, ok: remaining.rows.length <= 1 }, null, 2));
await client.end();
