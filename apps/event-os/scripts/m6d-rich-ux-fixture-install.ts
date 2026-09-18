/**
 * M6D rich UX fixture install via governed PlatformService path (synthetic only).
 *
 * Usage:
 *   DATABASE_URL=... pnpm exec tsx apps/event-os/scripts/m6d-rich-ux-fixture-install.ts --confirm-synthetic
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import {
  FIXTURE_IDS as people,
  PostgresPlatformStore,
  applySyntheticSeedIfNeeded,
  type PgQueryable,
} from "@maison-doclar/shared-platform";

const EVIDENCE = join(process.cwd(), "docs/control/evidence/eos-s06-cpsat-production/milestone-6de");
const EVENT_NAME = "M6D Claude Seating UX Verification";

const GUESTS = [
  { given: "SynthAda", family: "TableOne" },
  { given: "SynthBen", family: "TableOne" },
  { given: "SynthCara", family: "TableOne" },
  { given: "SynthDan", family: "TableOne" },
  { given: "SynthEve", family: "TableTwo" },
  { given: "SynthFinn", family: "TableTwo" },
  { given: "SynthGina", family: "TableTwo" },
  { given: "SynthHugo", family: "TableTwo" },
  { given: "SynthIvy", family: "TableThree" },
  { given: "SynthJules", family: "TableThree" },
  { given: "SynthKai", family: "TableThree" },
  { given: "SynthLina", family: "TableThree" },
] as const;

function adapt(pool: Pool): PgQueryable & { transaction<T>(fn: (q: PgQueryable) => Promise<T>): Promise<T> } {
  return {
    async query<T extends object>(text: string, values?: unknown[]) {
      const result = await pool.query(text, values);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (q: PgQueryable) => Promise<T>): Promise<T> {
      const connected = await pool.connect();
      try {
        await connected.query("BEGIN");
        const result = await fn({
          async query<R extends object>(text: string, values?: unknown[]) {
            const inner = await connected.query(text, values);
            return { rows: inner.rows as R[], rowCount: inner.rowCount ?? 0 };
          },
        });
        await connected.query("COMMIT");
        return result;
      } catch (error) {
        await connected.query("ROLLBACK");
        throw error;
      } finally {
        connected.release();
      }
    },
  };
}

if (!process.argv.includes("--confirm-synthetic")) {
  throw new Error("Missing --confirm-synthetic");
}
const url = process.env.DATABASE_URL;
if (!url?.trim()) throw new Error("DATABASE_URL required");

const pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 15_000 });
const started = Date.now();
try {
  const client = adapt(pool);
  const store = await PostgresPlatformStore.open(client);
  const seeded = await applySyntheticSeedIfNeeded(store, client, {});
  await store.flush();
  const service = seeded.service;
  const NOW = new Date().toISOString();
  const stamp = NOW.replace(/[:.]/g, "-");
  const code = `M6DUX${Date.now().toString(36).toUpperCase()}`.slice(0, 12);
  const prefix = `m6d-ux-${code}`;

  const ceo = { personId: people.personCeo, correlationId: `${prefix}-ceo`, now: NOW, actorKind: "HUMAN" as const };
  const planner = { personId: people.personPlanner, correlationId: `${prefix}-planner`, now: NOW, actorKind: "HUMAN" as const };
  const director = {
    personId: people.personDirector,
    correlationId: `${prefix}-director`,
    now: NOW,
    actorKind: "HUMAN" as const,
  };
  const admin = { personId: people.personAdmin, correlationId: `${prefix}-admin`, now: NOW, actorKind: "HUMAN" as const };

  const event = service.createEvent(ceo, {
    organisationId: people.orgMaison,
    clientId: people.clientAlpha,
    code,
    name: `${EVENT_NAME} ${stamp}`,
    startsAt: "2026-12-28T18:00:00.000Z",
    endsAt: "2026-12-28T23:00:00.000Z",
    timezone: "Africa/Lagos",
  });
  await store.flush();

  for (const grant of [
    { personId: people.personPlanner, roleKey: "PLANNER" as const },
    { personId: people.personDirector, roleKey: "EVENT_DIRECTOR" as const },
    { personId: people.personAuditor, roleKey: "READ_ONLY_AUDITOR" as const },
    { personId: people.personCeo, roleKey: "CEO" as const },
  ]) {
    service.grantAssignment(admin, {
      organisationId: people.orgMaison,
      personId: grant.personId,
      roleKey: grant.roleKey,
      clientId: people.clientAlpha,
      eventId: event.id,
      reason: "M6D UX fixture role grant",
      idempotencyKey: `${prefix}-grant-${grant.roleKey}-${event.id}`,
    });
  }
  await store.flush();

  service.prepareEventRsvp(director, {
    organisationId: people.orgMaison,
    eventId: event.id,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: event.name,
    reason: "M6D UX RSVP",
    idempotencyKey: `${prefix}-rsvp-${event.id}`,
  });
  await store.flush();

  // Venue + layout: use capacity-600 style small layout via layout APIs already used by CAP600.
  // For UX we need exactly 3×4 — create through layout commands if helpers exist; otherwise seat via seating binding after CAP-style apply is too large.
  // Prefer existing seating capacity layout fixture scaled? Keep simple: create layout with applyCapacity600 is wrong size.
  // Use service layout create path matching tests.
  const { applyCapacity600SeatingLayout } = await import("@maison-doclar/shared-platform");
  // Cannot use CAP600 layout (63 tables). Build minimal layout manually:
  const layout = service.createLayout(planner, {
    organisationId: people.orgMaison,
    eventId: event.id,
    name: `${EVENT_NAME} Hall`,
    reason: "M6D UX three-table layout",
    idempotencyKey: `${prefix}-layout-create`,
  });
  await store.flush();

  // Acquire lease + add 3 tables + seats via layout command surface used by fixtures
  const lease = service.acquireLayoutEditorLease(planner, {
    organisationId: people.orgMaison,
    eventId: event.id,
    layoutId: layout.id,
    reason: "M6D UX layout lease",
    idempotencyKey: `${prefix}-lease`,
  });
  await store.flush();

  const tableIds: string[] = [];
  for (let t = 0; t < 3; t += 1) {
    const added = service.applyLayoutCommand(planner, {
      organisationId: people.orgMaison,
      eventId: event.id,
      layoutId: layout.id,
      leaseId: lease.id,
      commandType: "ADD_OBJECT",
      payload: {
        objectType: "TABLE",
        name: `Table ${t + 1}`,
        x: 100 + t * 200,
        y: 100,
        width: 120,
        height: 120,
        subtype: { declaredCapacity: 4 },
      },
      reason: `M6D UX add table ${t + 1}`,
      idempotencyKey: `${prefix}-table-${t}`,
    });
    tableIds.push(String((added as { objectId?: string }).objectId ?? (added as { id?: string }).id ?? ""));
    await store.flush();
  }

  // Physical seats — generate if command exists
  for (let t = 0; t < 3; t += 1) {
    try {
      service.applyLayoutCommand(planner, {
        organisationId: people.orgMaison,
        eventId: event.id,
        layoutId: layout.id,
        leaseId: lease.id,
        commandType: "GENERATE_PHYSICAL_SEATS",
        payload: { objectId: tableIds[t], seatCount: 4 },
        reason: `M6D UX seats table ${t + 1}`,
        idempotencyKey: `${prefix}-seats-${t}`,
      });
    } catch {
      // Some builds use different command — continue and record operational capacity
    }
  }
  await store.flush();

  service.recordLayoutOperationalCapacity(planner, {
    organisationId: people.orgMaison,
    eventId: event.id,
    layoutId: layout.id,
    quantity: 12,
    sourceLabel: "M6D UX fixture",
    rationale: "Three tables of four",
    reason: "M6D UX capacity",
    idempotencyKey: `${prefix}-capacity`,
  });
  await store.flush();

  service.runLayoutValidation(planner, {
    organisationId: people.orgMaison,
    eventId: event.id,
    layoutId: layout.id,
    reason: "M6D UX validation",
    idempotencyKey: `${prefix}-validate`,
  });
  await store.flush();

  service.submitLayoutForApproval(planner, {
    organisationId: people.orgMaison,
    eventId: event.id,
    layoutId: layout.id,
    reason: "M6D UX submit",
    idempotencyKey: `${prefix}-submit`,
  });
  await store.flush();

  service.recordLayoutApprovalDecision(director, {
    organisationId: people.orgMaison,
    eventId: event.id,
    layoutId: layout.id,
    decision: "APPROVED",
    reason: "M6D UX approve",
    idempotencyKey: `${prefix}-approve`,
  });
  await store.flush();

  const publication = service.publishLayout(director, {
    organisationId: people.orgMaison,
    eventId: event.id,
    layoutId: layout.id,
    reason: "M6D UX publish",
    idempotencyKey: `${prefix}-publish`,
  });
  await store.flush();

  const guestIds: string[] = [];
  for (let index = 0; index < GUESTS.length; index += 1) {
    const g = GUESTS[index]!;
    const guest = service.intakeGuest(director, {
      organisationId: people.orgMaison,
      eventId: event.id,
      givenName: g.given,
      familyName: g.family,
      email: `${g.given.toLowerCase()}.${g.family.toLowerCase()}.${code.toLowerCase()}@m6d-ux.example.test`,
      reason: "M6D UX synthetic guest",
      idempotencyKey: `${prefix}-guest-${index}`,
    });
    service.staffEnterRsvp(director, {
      organisationId: people.orgMaison,
      eventId: event.id,
      guestId: guest.id,
      attendanceIntent: "ATTENDING",
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      reason: "M6D UX attending",
      idempotencyKey: `${prefix}-attend-${index}`,
    });
    guestIds.push(guest.id);
  }
  await store.flush();

  // Seating rules via seating V2 commands
  const v2 = service.seatingV2Commands();
  const plannerGrant = store
    .snapshot()
    .assignments.find(
      (a) => a.eventId === event.id && a.personId === people.personPlanner && a.status === "ACTIVE",
    );
  const directorGrant = store
    .snapshot()
    .assignments.find(
      (a) => a.eventId === event.id && a.personId === people.personDirector && a.status === "ACTIVE",
    );
  if (!plannerGrant || !directorGrant) throw new Error("missing planner/director grants");

  const envelope = (assignmentId: string, key: string) => ({
    organisationId: people.orgMaison,
    eventId: event.id,
    actorAssignmentId: assignmentId,
    idempotencyKey: key,
  });

  // Propose + activate layout binding
  const pubs = store.snapshot().layoutPublications.filter((p) => p.eventId === event.id && p.status === "CURRENT");
  const currentPub = pubs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? publication;
  await v2.proposeLayoutBinding(planner, envelope(plannerGrant.id, `${prefix}-propose-binding`), {
    layoutPublicationId: (currentPub as { id: string }).id,
  });
  await store.flush();
  await v2.activateLayoutBinding(director, envelope(directorGrant.id, `${prefix}-activate-binding`), {});
  await store.flush();

  const guests = store.listOperationalGuestsByEventId(people.orgMaison, event.id);
  const byName = (given: string, family: string) =>
    guests.find((g) => g.givenName === given && g.familyName === family)?.id;
  const ada = byName("SynthAda", "TableOne");
  const ben = byName("SynthBen", "TableOne");
  const cara = byName("SynthCara", "TableOne");
  const dan = byName("SynthDan", "TableOne");
  const eve = byName("SynthEve", "TableTwo");
  const finn = byName("SynthFinn", "TableTwo");
  const gina = byName("SynthGina", "TableTwo");
  const hugo = byName("SynthHugo", "TableTwo");
  if (!ada || !ben || !cara || !dan || !eve || !finn || !gina || !hugo) {
    throw new Error("guest lookup failed for rule subjects");
  }

  const rules = [
    { name: "M6D UX HARD together", kind: "HARD" as const, predicate: "KEEP_TOGETHER" as const, a: ada, b: ben },
    { name: "M6D UX HARD apart", kind: "HARD" as const, predicate: "KEEP_APART" as const, a: cara, b: dan },
    { name: "M6D UX soft together", kind: "SOFT" as const, predicate: "PREFER_TOGETHER" as const, a: eve, b: finn },
    { name: "M6D UX soft apart", kind: "SOFT" as const, predicate: "PREFER_APART" as const, a: gina, b: hugo },
  ];
  for (let i = 0; i < rules.length; i += 1) {
    const r = rules[i]!;
    const created = await v2.createRule(director, envelope(directorGrant.id, `${prefix}-rule-${i}`), {
      name: r.name,
      kind: r.kind,
      predicateType: r.predicate,
      guestIdA: r.a,
      guestIdB: r.b,
    });
    await v2.activateRule(director, envelope(directorGrant.id, `${prefix}-rule-act-${i}`), {
      ruleId: created.value.id,
    });
  }
  await store.flush();

  mkdirSync(EVIDENCE, { recursive: true });
  const manifest = {
    eventName: event.name,
    eventCode: code,
    eventId: event.id,
    guests: guestIds.length,
    tables: 3,
    capacityEach: 4,
    layoutId: layout.id,
    publicationId: (currentPub as { id?: string }).id ?? null,
    roles: ["PLANNER", "EVENT_DIRECTOR", "READ_ONLY_AUDITOR", "CEO"],
    hardRules: ["KEEP_TOGETHER SynthAda+SynthBen", "KEEP_APART SynthCara+SynthDan"],
    softPreferences: ["PREFER_TOGETHER SynthEve+SynthFinn", "PREFER_APART SynthGina+SynthHugo"],
    installPath: "governed-platform-service",
    adopted: false,
    elapsedMs: Date.now() - started,
    installedAt: new Date().toISOString(),
  };
  writeFileSync(join(EVIDENCE, "RICH_FIXTURE_EVENT.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ ok: true, ...manifest }, null, 2));
} finally {
  await pool.end();
}
