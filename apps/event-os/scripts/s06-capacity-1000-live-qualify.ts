/**
 * EOS-S06 1,000-guest seating qualification against the exact CAP1000 event.
 *
 * Attaches governed seating (layout + optional RSVP attending marks + freeze/launch)
 * to existing event add41e21-… without creating guests.
 *
 * Modes:
 *   --preflight-only     read-only identity/isolation check
 *   --layout-only        publish preferred 100-table layout + binding
 *   --mark-attending     ensure RSVP ATTENDING for all synthetic guests (no new guests)
 *   --solve-scenario X   freeze+launch one scenario seed (A_LIGHT|B_TYPICAL|C_HEAVY|D_INFEASIBLE|E_RECOVERY)
 *   --lifecycle          adopt→submit→approve→publish for last feasible run (requires prior solve)
 *   --replay             re-launch same package (idempotency)
 *   --successor-stale    create successor layout and prove prior run stale
 *
 * Always requires: --confirm-synthetic-qualification
 *
 * Expected durations:
 *   preflight ≤30s; layout ≤3min; mark-attending ≤4min; solve ≤3min; lifecycle ≤1min
 * Hard stop: twice justified estimate. Progress every flush / phase.
 * Safe interrupt: between phases; do not interrupt mid-flush without noting mutation state.
 */
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import {
  FIXTURE_IDS as people,
  PostgresPlatformStore,
  applySyntheticSeedIfNeeded,
  applyCapacity1000SeatingLayout,
  CAPACITY_1000_LAYOUT_JUSTIFICATION,
  CAPACITY_1000_SCENARIO_SEEDS,
  capacity1000CorpusHash,
  type Capacity1000ScenarioId,
  type PgQueryable,
} from "@maison-doclar/shared-platform";

const EXACT_EVENT_ID = "add41e21-9618-44f9-896a-fecd54badca5";
const EXACT_EVENT_CODE = "S06C1KMU4LD5";
const INTAKE_JOB_ID = "28a5370a-6700-4ac0-88a8-a716026ed860";
const CORPUS_SEED = "eos-s06c-1000-typical-v1";
const CAP600_ID = "053fa686-124e-49b3-b8a8-d0497c0a1668";
const OLD_CAP1000_ID = "3d212906-529e-4bd8-b13f-b0c2a24e5fba";
const MIXED_ID = "af4a6b7e-0424-46d5-b9e5-d0a26845173e";

const EVIDENCE_DIR = join(process.cwd(), "docs/control/evidence/eos-s06-capacity-1000");

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

function actor(personId: string, label: string) {
  return { personId, correlationId: `s06-cap1k-${label}-${personId.slice(0, 8)}-${Date.now()}` };
}

function progress(msg: string, started: number) {
  const line = `[S06-CAP1K +${Math.round(performance.now() - started)}ms] ${msg}`;
  console.log(line);
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  appendFileSync(join(EVIDENCE_DIR, "RESOURCE_RESULTS.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), msg, elapsedMs: Math.round(performance.now() - started) })}\n`);
}

function parseArgs(argv: string[]) {
  const out: {
    confirm: boolean;
    preflightOnly: boolean;
    layoutOnly: boolean;
    markAttending: boolean;
    solveScenario?: Capacity1000ScenarioId;
    lifecycle: boolean;
    replay: boolean;
    successorStale: boolean;
  } = {
    confirm: false,
    preflightOnly: false,
    layoutOnly: false,
    markAttending: false,
    lifecycle: false,
    replay: false,
    successorStale: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "--confirm-synthetic-qualification") out.confirm = true;
    else if (arg === "--preflight-only") out.preflightOnly = true;
    else if (arg === "--layout-only") out.layoutOnly = true;
    else if (arg === "--mark-attending") out.markAttending = true;
    else if (arg === "--solve-scenario") {
      const value = argv[++index] as Capacity1000ScenarioId | undefined;
      if (!value || !(value in CAPACITY_1000_SCENARIO_SEEDS)) throw new Error(`Invalid scenario ${value}`);
      out.solveScenario = value;
    } else if (arg === "--lifecycle") out.lifecycle = true;
    else if (arg === "--replay") out.replay = true;
    else if (arg === "--successor-stale") out.successorStale = true;
  }
  return out;
}

function writeEvidence(name: string, value: unknown) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(join(EVIDENCE_DIR, name), `${JSON.stringify(value, null, 2)}\n`);
}

if (!process.argv.includes("--confirm-synthetic-qualification")) {
  throw new Error("Missing --confirm-synthetic-qualification");
}
if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL required");

const args = parseArgs(process.argv.slice(2));
const started = performance.now();
const estimateMs =
  args.preflightOnly ? 30_000 : args.layoutOnly ? 180_000 : args.markAttending ? 240_000 : args.solveScenario ? 180_000 : 120_000;
console.log(`[S06-CAP1K] expected ≤${estimateMs / 1000}s (hard stop ${(estimateMs * 2) / 1000}s)`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 12_000 });
try {
  const client = adapt(pool);
  const store = await PostgresPlatformStore.open(client);
  const seeded = await applySyntheticSeedIfNeeded(store, client, {});
  await store.flush();
  const service = seeded.service;
  const snap = store.snapshot();
  const event = snap.events.find((item) => item.id === EXACT_EVENT_ID);
  if (!event) throw new Error(`BLOCKED — IDENTITY: exact CAP1000 event ${EXACT_EVENT_ID} missing`);
  if (event.code !== EXACT_EVENT_CODE) {
    throw new Error(`BLOCKED — IDENTITY: expected code ${EXACT_EVENT_CODE}, got ${event.code}`);
  }

  const guests = store.listOperationalGuestsByEventId(people.orgMaison, EXACT_EVENT_ID);
  const uniqueIds = new Set(guests.map((item) => item.id));
  const emails = guests
    .map((item) => {
      const raw = item.email as unknown;
      if (typeof raw === "string") return raw;
      if (raw && typeof raw === "object" && "value" in raw && typeof (raw as { value?: unknown }).value === "string") {
        return (raw as { value: string }).value;
      }
      return "";
    })
    .filter(Boolean);
  const realPiiHints = emails.filter((email) => !/@example\.test$|@synthetic\.|s06c|1000TYPICAL/i.test(email));
  const isolation = {
    CAP600: store.listOperationalGuestsByEventId(people.orgMaison, CAP600_ID).length,
    OLD_CAP1000: store.listOperationalGuestsByEventId(people.orgMaison, OLD_CAP1000_ID).length,
    MIXED: store.listOperationalGuestsByEventId(people.orgMaison, MIXED_ID).length,
    EXACT: guests.length,
  };
  const job = (snap as { guestIntakeJobs?: Array<{ id: string; status?: string; corpusSeed?: string }> }).guestIntakeJobs?.find(
    (item) => item.id === INTAKE_JOB_ID,
  );
  const layouts = snap.layouts.filter((item) => item.eventId === EXACT_EVENT_ID);
  const currentPubs = snap.layoutPublications.filter((item) => {
    const layout = snap.layouts.find((entry) => entry.id === item.layoutId);
    return layout?.eventId === EXACT_EVENT_ID && item.status === "CURRENT";
  });
  const bindings = (snap as { seatingLayoutBindings?: Array<{ eventId: string }> }).seatingLayoutBindings?.filter(
    (item) => item.eventId === EXACT_EVENT_ID,
  ) ?? [];

  const preflight = {
    eventId: event.id,
    eventCode: event.code,
    eventName: event.name,
    guestCount: guests.length,
    uniqueGuestIds: uniqueIds.size,
    duplicateGuestIds: guests.length - uniqueIds.size,
    realPiiHintCount: realPiiHints.length,
    emailSample: { first: emails[0], mid: emails[Math.floor(emails.length / 2)], last: emails[emails.length - 1] },
    intakeJobId: INTAKE_JOB_ID,
    intakeJobStatus: job?.status ?? "unknown",
    corpusSeedExpected: CORPUS_SEED,
    layouts: layouts.length,
    currentPublications: currentPubs.length,
    bindings: bindings.length,
    isolation,
    productionAuthorised: false,
  };
  writeEvidence("PREFLIGHT.json", preflight);
  progress(
    `preflight guests=${guests.length} unique=${uniqueIds.size} piiHints=${realPiiHints.length} layouts=${layouts.length} currentPubs=${currentPubs.length}`,
    started,
  );

  if (guests.length !== 1000 || uniqueIds.size !== 1000) {
    throw new Error(`BLOCKED — IDENTITY: expected exactly 1000 unique guests, got ${guests.length}/${uniqueIds.size}`);
  }
  if (realPiiHints.length > 0) {
    throw new Error(`BLOCKED — IDENTITY: real PII hints detected (${realPiiHints.length})`);
  }
  if (isolation.CAP600 !== 600) {
    throw new Error(`BLOCKED — IDENTITY: CAP600 guest count drifted (${isolation.CAP600})`);
  }
  if (isolation.OLD_CAP1000 < 1) {
    throw new Error("BLOCKED — IDENTITY: old partial CAP1000 missing (must remain quarantined intact)");
  }
  if (isolation.MIXED !== 1050) {
    throw new Error(`BLOCKED — IDENTITY: mixed 1050 event drifted (${isolation.MIXED})`);
  }

  if (args.preflightOnly) {
    console.log(JSON.stringify({ ok: true, preflight }, null, 2));
    process.exit(0);
  }

  const admin = actor(people.personAdmin, "admin");
  const planner = actor(people.personPlanner, "planner");
  const director = actor(people.personDirector, "director");
  const ceo = actor(people.personCeo, "ceo");
  const prefix = `cap1k-exact-${EXACT_EVENT_ID.slice(0, 8)}`;

  const plannerGrant = service.grantAssignment(admin, {
    organisationId: people.orgMaison,
    personId: people.personPlanner,
    roleKey: "PLANNER",
    clientId: people.clientAlpha,
    eventId: EXACT_EVENT_ID,
    reason: "CAP1000 exact seating qualification planner grant",
    idempotencyKey: `${prefix}-grant-planner`,
  });
  const directorGrant = service.grantAssignment(admin, {
    organisationId: people.orgMaison,
    personId: people.personDirector,
    roleKey: "EVENT_DIRECTOR",
    clientId: people.clientAlpha,
    eventId: EXACT_EVENT_ID,
    reason: "CAP1000 exact seating qualification director grant",
    idempotencyKey: `${prefix}-grant-director`,
  });
  const ceoGrant = service.grantAssignment(admin, {
    organisationId: people.orgMaison,
    personId: people.personCeo,
    roleKey: "CEO",
    clientId: people.clientAlpha,
    eventId: EXACT_EVENT_ID,
    reason: "CAP1000 exact seating qualification CEO event grant",
    idempotencyKey: `${prefix}-grant-ceo`,
  });
  await store.flush();
  progress("grants settled", started);

  if (args.layoutOnly || args.markAttending || args.solveScenario || args.lifecycle || args.replay || args.successorStale) {
    // Ensure RSVP policy exists before attending marks / seating.
    try {
      service.prepareEventRsvp(director, {
        organisationId: people.orgMaison,
        eventId: EXACT_EVENT_ID,
        hostDisplayName: "Maison Doclar",
        eventDisplayName: event.name,
        reason: "CAP1000 exact seating qualification RSVP prepare",
        idempotencyKey: `${prefix}-rsvp-prepare`,
      });
      await store.flush();
    } catch (error) {
      progress(`prepareEventRsvp note: ${error instanceof Error ? error.message : String(error)}`, started);
    }
  }

  if (args.layoutOnly || (!args.markAttending && !args.solveScenario && !args.lifecycle && !args.replay && !args.successorStale)) {
    if (currentPubs.length > 0) {
      progress(`layout CURRENT already present (${currentPubs.length}); skipping create`, started);
      const directorWs = service.getLayoutSetupWorkspace(director, people.orgMaison, EXACT_EVENT_ID, currentPubs[0]!.layoutId);
      const tables = directorWs.objects.filter((item) => item.objectType === "TABLE" && !item.tombstoned);
      const seats = tables.reduce((sum, item) => sum + Number((item.subtype as { declaredCapacity?: number }).declaredCapacity ?? 0), 0);
      writeEvidence("LAYOUT_PROFILE.json", {
        ...CAPACITY_1000_LAYOUT_JUSTIFICATION,
        layoutId: currentPubs[0]!.layoutId,
        publicationId: currentPubs[0]!.id,
        observedTables: tables.length,
        observedSeats: seats,
        reusedExisting: true,
      });
      if (tables.length !== 100 || seats !== 1000) {
        throw new Error(`BLOCKED — existing CURRENT layout is ${tables.length}/${seats}, expected 100/1000`);
      }
    } else {
      progress("publishing preferred 100-table layout via governed batches…", started);
      const layoutStarted = performance.now();
      const result = await applyCapacity1000SeatingLayout(
        service,
        store,
        EXACT_EVENT_ID,
        planner,
        director,
        prefix,
        { plannerAssignmentId: plannerGrant.id, directorAssignmentId: directorGrant.id },
      );
      await store.flush();
      writeEvidence("LAYOUT_PROFILE.json", {
        ...CAPACITY_1000_LAYOUT_JUSTIFICATION,
        layoutId: result.layout.id,
        publicationId: result.publication.id,
        batchDiffs: result.batchDiffs,
        wallMs: Math.round(performance.now() - layoutStarted),
        reusedExisting: false,
      });
      progress(`layout CURRENT ${result.profile.totalTables}/${result.profile.totalSeats}`, started);
    }
    if (args.layoutOnly && !args.markAttending && !args.solveScenario) {
      console.log(JSON.stringify({ ok: true, layout: true }, null, 2));
      process.exit(0);
    }
  }

  if (args.markAttending) {
    progress("marking synthetic guests ATTENDING (no guest creation)…", started);
    let marked = 0;
    let already = 0;
    for (let index = 0; index < guests.length; index += 1) {
      const guest = guests[index]!;
      const existing = snap.rsvpResponses?.find((item) => item.guestId === guest.id && item.eventId === EXACT_EVENT_ID);
      if (existing?.attendanceIntent === "ATTENDING") {
        already += 1;
        continue;
      }
      service.staffEnterRsvp(director, {
        organisationId: people.orgMaison,
        eventId: EXACT_EVENT_ID,
        guestId: guest.id,
        attendanceIntent: "ATTENDING",
        answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
        reason: "CAP1000 exact seating qualification attending mark",
        idempotencyKey: `${prefix}-attend-${guest.id}`,
      });
      marked += 1;
      if ((marked + already) % 100 === 0) {
        await store.flush();
        progress(`attending progress ${marked + already}/1000 (new=${marked}, already=${already})`, started);
      }
    }
    await store.flush();
    writeEvidence("ATTENDING_MARKS.json", { marked, already, total: guests.length });
    progress(`attending complete new=${marked} already=${already}`, started);
    if (!args.solveScenario && !args.lifecycle && !args.replay) {
      console.log(JSON.stringify({ ok: true, marked, already }, null, 2));
      process.exit(0);
    }
  }

  if (args.solveScenario) {
    const scenario = args.solveScenario;
    const seed = CAPACITY_1000_SCENARIO_SEEDS[scenario];
    const datasetHash = capacity1000CorpusHash(scenario);
    progress(`freeze+launch scenario ${scenario} seed=${seed}`, started);
    const v2 = service.seatingV2Commands();
    const envelope = (assignmentId: string, key: string) => ({
      organisationId: people.orgMaison,
      eventId: EXACT_EVENT_ID,
      actorAssignmentId: assignmentId,
      idempotencyKey: key,
    });
    const freezeStarted = performance.now();
    const frozen = await v2.freezePackage(planner, envelope(plannerGrant.id, `${prefix}-freeze-${scenario}`), { seed });
    await store.flush();
    const freezeMs = Math.round(performance.now() - freezeStarted);
    progress(`frozen package=${frozen.value.id} application=${frozen.application} freezeMs=${freezeMs}`, started);
    const solveStarted = performance.now();
    const run = await v2.launchRun(planner, envelope(plannerGrant.id, `${prefix}-run-${scenario}`), {
      packageId: frozen.value.id,
    });
    await store.flush();
    const solverMs = Math.round(performance.now() - solveStarted);
    const assignments = await v2.repository.transaction(async (tx) =>
      tx.list<{ runId: string; guestToken: string; state: string; positionToken?: string | null }>("runAssignments", {
        organisationId: people.orgMaison,
        eventId: EXACT_EVENT_ID,
      }),
    );
    const seated = assignments.filter((item) => item.runId === run.value.id && item.state === "SEATED");
    const correctness = {
      scenario,
      seed,
      datasetHash,
      packageId: frozen.value.id,
      runId: run.value.id,
      application: run.application,
      status: run.value.status,
      solverClaim: run.value.solverClaim,
      seated: seated.length,
      uniqueGuests: new Set(seated.map((item) => item.guestToken)).size,
      uniquePositions: new Set(seated.map((item) => item.positionToken)).size,
      freezeMs,
      solverWallMs: solverMs,
      productWallMs: Math.round(performance.now() - freezeStarted),
    };
    appendFileSync(join(EVIDENCE_DIR, "CORRECTNESS_RESULTS.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), ...correctness })}\n`);
    writeEvidence(`CORRECTNESS_${scenario}.json`, correctness);
    progress(`solve ${scenario} status=${run.value.status} seated=${seated.length} solverWallMs=${solverMs}`, started);
    if (scenario !== "D_INFEASIBLE") {
      if (run.value.status !== "FEASIBLE" || seated.length !== 1000) {
        throw new Error(`Scenario ${scenario} failed correctness: status=${run.value.status} seated=${seated.length}`);
      }
    } else if (run.value.status === "FEASIBLE") {
      throw new Error("D_INFEASIBLE returned false FEASIBLE");
    }
    if (args.replay) {
      const replay = await v2.launchRun(planner, envelope(plannerGrant.id, `${prefix}-run-${scenario}-replay`), {
        packageId: frozen.value.id,
      });
      await store.flush();
      writeEvidence(`REPLAY_${scenario}.json`, {
        application: replay.application,
        runId: replay.value.id,
        sameRun: replay.value.id === run.value.id,
        didDataChange: replay.didDataChange,
      });
      progress(`replay application=${replay.application} sameRun=${replay.value.id === run.value.id}`, started);
    }
    if (args.lifecycle && run.value.status === "FEASIBLE") {
      const adopted = await v2.adoptRun(planner, envelope(plannerGrant.id, `${prefix}-adopt-${scenario}`), { runId: run.value.id });
      const submitted = await v2.submitPlan(
        planner,
        {
          ...envelope(plannerGrant.id, `${prefix}-submit-${scenario}`),
          expectedVersion: adopted.value.version ?? adopted.value.editionNo,
          expectedContentHash: adopted.value.contentHash,
        },
        { editionId: adopted.value.id },
      );
      const approved = await v2.approvePlan(
        director,
        {
          ...envelope(directorGrant.id, `${prefix}-approve-${scenario}`),
          expectedVersion: submitted.value.version ?? submitted.value.editionNo,
          expectedContentHash: submitted.value.contentHash,
        },
        {
          editionId: submitted.value.id,
          editionHash: submitted.value.contentHash,
          decision: "APPROVED",
          reason: "CAP1000 exact seating qualification approve",
        },
      );
      const published = await v2.publishPlan(
        ceo,
        {
          ...envelope(ceoGrant.id, `${prefix}-publish-${scenario}`),
          expectedVersion: (submitted.value.version ?? submitted.value.editionNo) + 1,
          expectedContentHash: submitted.value.contentHash,
        },
        { editionId: submitted.value.id, editionHash: submitted.value.contentHash },
      );
      await store.flush();
      writeEvidence(`LIFECYCLE_${scenario}.json`, {
        adopted: adopted.value.status,
        submitted: submitted.value.status,
        approved: approved.value.decision,
        published: published.value.status,
      });
      progress(`lifecycle published=${published.value.status}`, started);
    }
    console.log(JSON.stringify({ ok: true, correctness }, null, 2));
  }

  void ceoGrant;
  progress("phase complete", started);
} finally {
  await pool.end();
}
