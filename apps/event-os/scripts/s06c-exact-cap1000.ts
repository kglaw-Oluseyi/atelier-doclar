/**
 * EOS-S06C exact CAP1000 fixture (product path only).
 * Relabels mixed 1050 event; creates fresh exact-1000 event; runs S06C-1000-TYPICAL only; replays.
 *
 * Expected: ≤4 minutes. Hard stop: 8 minutes.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import {
  FIXTURE_IDS,
  PostgresPlatformStore,
  applySyntheticSeedIfNeeded,
  type PgQueryable,
} from "@maison-doclar/shared-platform";

const MIXED_EVENT_ID = "af4a6b7e-0424-46d5-b9e5-d0a26845173e";
const CAP600_ID = "053fa686-124e-49b3-b8a8-d0497c0a1668";
const OLD_CAP1000_ID = "3d212906-529e-4bd8-b13f-b0c2a24e5fba";
const CORPUS = "S06C-1000-TYPICAL";
const CORPUS_SEED = "eos-s06c-1000-typical-v1";

const EVIDENCE_CANDIDATES = [
  join(process.cwd(), "docs/control/evidence/eos-s06c-high-volume-intake"),
  join(process.cwd(), "../../docs/control/evidence/eos-s06c-high-volume-intake"),
  "/app/docs/control/evidence/eos-s06c-high-volume-intake",
];

function evidenceDir(): string {
  for (const candidate of EVIDENCE_CANDIDATES) {
    try {
      readFileSync(join(candidate, `corpora/${CORPUS}.csv`));
      return candidate;
    } catch {
      /* next */
    }
  }
  throw new Error("corpora not found");
}

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

function actor(personId: string) {
  return { personId, correlationId: `s06c-exact-cap1000-${personId.slice(0, 8)}-${Date.now()}` };
}

function progress(msg: string, started: number) {
  console.log(`[S06C-EXACT +${Math.round(performance.now() - started)}ms] ${msg}`);
}

if (!process.argv.includes("--confirm-synthetic-qualification")) {
  throw new Error("Missing --confirm-synthetic-qualification");
}
if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL required");

async function main() {
const started = performance.now();
const estimateMs = 4 * 60_000;
console.log(`[S06C-EXACT] expected ≤${estimateMs / 1000}s (hard stop ${(estimateMs * 2) / 1000}s)`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 12_000 });
try {
  const client = adapt(pool);
  const store = await PostgresPlatformStore.open(client);
  const seeded = await applySyntheticSeedIfNeeded(store, client, {});
  await store.flush();
  const service = seeded.service;
  const org = FIXTURE_IDS.orgMaison;
  const ceo = actor(FIXTURE_IDS.personCeo);
  const admin = actor(FIXTURE_IDS.personAdmin);
  const maker = actor(FIXTURE_IDS.personPlanner);
  const checker = actor(FIXTURE_IDS.personDirector);

  const snap0 = store.snapshot();
  const mixed = snap0.events.find((e) => e.id === MIXED_EVENT_ID);
  if (!mixed) throw new Error("mixed event missing");
  const mixedGuests = snap0.operationalGuests.filter((g) => g.eventId === MIXED_EVENT_ID).length;
  progress(`mixed event guests=${mixedGuests} name=${mixed.name}`, started);

  const relabelled = service.updateEvent(ceo, {
    organisationId: org,
    eventId: MIXED_EVENT_ID,
    expectedVersion: mixed.version,
    name: "[SYNTHETIC QUALIFICATION] EOS-S06C MIXED INTAKE 50+1000 — NOT EXACT CAP1000",
    reason: "Truthful relabel: mixed 50+1000 intake event is not an exact CAP1000 fixture",
  });
  await store.flush();
  progress(`relabelled mixed event → ${relabelled.name}`, started);

  const eventName = `[SYNTHETIC QUALIFICATION] EOS-S06C Exact CAP1000 ${new Date().toISOString().slice(0, 10)}`;
  const eventCode = `S06C1K${Date.now().toString(36).toUpperCase()}`.slice(0, 12);
  const event = service.createEvent(ceo, {
    organisationId: org,
    clientId: FIXTURE_IDS.clientAlpha,
    code: eventCode,
    name: eventName,
    startsAt: "2026-12-23T09:00:00.000Z",
    endsAt: "2026-12-23T22:00:00.000Z",
    timezone: "Africa/Lagos",
  });
  await store.flush();
  progress(`created exact CAP1000 event ${event.id} code=${event.code}`, started);

  for (const [personId, roleKey] of [
    [FIXTURE_IDS.personPlanner, "PLANNER"],
    [FIXTURE_IDS.personDirector, "EVENT_DIRECTOR"],
    [FIXTURE_IDS.personCeo, "CEO"],
    [FIXTURE_IDS.personAuditor, "READ_ONLY_AUDITOR"],
  ] as const) {
    service.grantAssignment(admin, {
      organisationId: org,
      personId,
      roleKey,
      clientId: FIXTURE_IDS.clientAlpha,
      eventId: event.id,
      reason: "EOS-S06C exact CAP1000 synthetic grant",
      idempotencyKey: `s06c-exact-cap1000-grant-${roleKey}-${event.id}`,
    });
  }
  await store.flush();

  const evidence = evidenceDir();
  const csv = readFileSync(join(evidence, `corpora/${CORPUS}.csv`));
  const guestBefore = service.listGuests(checker, { organisationId: org, eventId: event.id }).length;
  if (guestBefore !== 0) throw new Error(`expected empty event, got ${guestBefore}`);

  let job = service.createGuestIntakeJob(maker, {
    organisationId: org,
    eventId: event.id,
    name: "S06C-1000-TYPICAL-EXACT-CAP1000",
    reason: "Exact CAP1000 fixture via governed product intake",
    clientSourceRef: "S06C-EXACT-CAP1000",
    expectedScale: 1000,
  });
  await store.flush();

  const uploaded = service.uploadGuestIntakeSource(maker, {
    organisationId: org,
    eventId: event.id,
    jobId: job.id,
    filename: `${CORPUS}.csv`,
    contentType: "text/csv",
    contentBase64: csv.toString("base64"),
    expectedVersion: job.version,
  });
  job = uploaded.job;
  await store.flush();
  progress(`uploaded sourceHash=${uploaded.source.sha256}`, started);

  job = service.validateGuestIntake(maker, {
    organisationId: org,
    eventId: event.id,
    jobId: job.id,
    expectedVersion: job.version,
  });
  await store.flush();
  if (job.status === "NEEDS_REVIEW") {
    const bundle = service.getGuestIntakeJob(maker, org, event.id, job.id);
    const decisions = bundle.candidates
      .filter((item) => ["WARNING", "DUPLICATE_REVIEW", "INVALID"].includes(item.status))
      .map((item) => ({
        candidateId: item.id,
        decision: (item.status === "INVALID" ? "EXCLUDE" : "CREATE") as "CREATE" | "EXCLUDE",
      }));
    if (decisions.length) {
      job = service.applyGuestIntakeDecisions(maker, {
        organisationId: org,
        eventId: event.id,
        jobId: job.id,
        expectedVersion: job.version,
        decisions,
      });
      await store.flush();
    }
  }

  job = service.submitGuestIntake(maker, {
    organisationId: org,
    eventId: event.id,
    jobId: job.id,
    expectedVersion: job.version,
    reason: "Submit exact CAP1000 intake",
  });
  await store.flush();

  let selfApproveBlocked = false;
  try {
    service.approveGuestIntake(maker, {
      organisationId: org,
      eventId: event.id,
      jobId: job.id,
      expectedVersion: job.version,
      reason: "self approve must fail",
    });
  } catch {
    selfApproveBlocked = true;
  }

  job = service.approveGuestIntake(checker, {
    organisationId: org,
    eventId: event.id,
    jobId: job.id,
    expectedVersion: job.version,
    reason: "Approve exact CAP1000 promotion",
  });
  await store.flush();

  let receipt;
  for (let i = 0; i < 20; i += 1) {
    if (performance.now() - started > estimateMs * 2) throw new Error("hard stop");
    const advanced = service.advanceGuestIntakePromotion(checker, {
      organisationId: org,
      eventId: event.id,
      jobId: job.id,
      expectedVersion: job.version,
      maxChunks: 8,
    });
    job = advanced.job;
    receipt = advanced.receipt;
    await store.flush();
    progress(`promote ${job.status} promoted=${job.progress.rowsPromoted}/${job.progress.rowsTotal}`, started);
    if (job.status === "COMPLETED" || job.status === "COMPLETED_WITH_EXCEPTIONS") break;
  }

  const guestAfter = service.listGuests(checker, { organisationId: org, eventId: event.id }).length;
  const replay = service.advanceGuestIntakePromotion(checker, {
    organisationId: org,
    eventId: event.id,
    jobId: job.id,
    expectedVersion: job.version,
  });
  await store.flush();
  const guestReplay = service.listGuests(checker, { organisationId: org, eventId: event.id }).length;

  const snap = store.snapshot();
  const mixedAfter = snap.events.find((e) => e.id === MIXED_EVENT_ID);
  const exactGuests = snap.operationalGuests.filter((g) => g.eventId === event.id);
  const emails = exactGuests.map((g) => g.email?.value ?? "").filter(Boolean).sort();
  const familyTypical = exactGuests.filter((g) => (g.familyName?.value ?? "").includes("Guest1000TYPICAL")).length;

  const manifest = {
    createdAt: new Date().toISOString(),
    applicationShaHint: process.env.EVENT_OS_GIT_SHA ?? null,
    mixedIntakeEvent: {
      eventId: MIXED_EVENT_ID,
      priorName: mixed.name,
      relabelledName: mixedAfter?.name,
      code: (mixed as { code?: string }).code,
      guestCount: mixedGuests,
      disposition: "MIXED_INTAKE_QUALIFICATION — 50+1000 on same event — NOT exact CAP1000",
      jobs: [
        { jobId: "a8c6a24d-bb7f-4f93-8689-7d48a673e549", corpus: "S06C-050-CLEAN", created: 50 },
        { jobId: "d39e9bde-9cdd-415c-b8eb-f586f6623bdc", corpus: "S06C-1000-TYPICAL", created: 1000 },
      ],
    },
    exactCap1000: {
      eventId: event.id,
      eventName,
      eventCode: event.code,
      jobId: job.id,
      jobName: job.name,
      edition: job.edition,
      status: job.status,
      corpus: CORPUS,
      corpusSeed: CORPUS_SEED,
      sourceHash: uploaded.source.sha256,
      actors: {
        maker: "planner@maison-doclar.test / PLANNER",
        checker: "director@maison-doclar.test / EVENT_DIRECTOR",
        selfApproveBlocked,
      },
      reconciliation: {
        guestTotalBefore: guestBefore,
        sourceRows: receipt?.totals.sourceRows,
        createdGuests: receipt?.totals.createdGuests,
        updatedGuests: receipt?.totals.updatedGuests,
        unchangedGuests: receipt?.totals.unchangedGuests,
        rejectedRows: receipt?.totals.rejectedRows,
        excludedRows: receipt?.totals.excludedRows,
        failedRows: receipt?.totals.failedRows,
        guestTotalAfter: guestAfter,
        duplicatesInReceipt: receipt?.totals.unchangedGuests ?? 0,
        missingGuests: 1000 - (receipt?.totals.createdGuests ?? 0),
        chunksCommitted: receipt?.totals.chunksCommitted,
      },
      receipt,
      replay: {
        jobStatus: replay.job.status,
        guestCount: guestReplay,
        mutation: guestReplay !== guestAfter,
      },
      guestFamilyTypicalCount: familyTypical,
      emailSample: { first: emails[0], mid: emails[Math.floor(emails.length / 2)], last: emails[emails.length - 1] },
      machineMs: receipt?.timings.machineMs,
      wallMs: Math.round(performance.now() - started),
      qualification: "AWAITING_INDEPENDENT_VERIFICATION",
    },
    cap600: {
      eventId: CAP600_ID,
      guestCount: snap.operationalGuests.filter((g) => g.eventId === CAP600_ID).length,
      name: snap.events.find((e) => e.id === CAP600_ID)?.name,
    },
    oldPartialCap1000: {
      eventId: OLD_CAP1000_ID,
      guestCount: snap.operationalGuests.filter((g) => g.eventId === OLD_CAP1000_ID).length,
      name: snap.events.find((e) => e.id === OLD_CAP1000_ID)?.name,
      disposition: "QUARANTINED — not mutated",
    },
  };

  if (
    guestAfter !== 1000 ||
    receipt?.totals.createdGuests !== 1000 ||
    receipt?.totals.sourceRows !== 1000 ||
    receipt?.totals.guestTotalBefore !== 0 ||
    receipt?.totals.guestTotalAfter !== 1000 ||
    guestReplay !== 1000 ||
    !selfApproveBlocked ||
    job.status !== "COMPLETED"
  ) {
    throw new Error(`exact CAP1000 reconciliation failed: ${JSON.stringify(manifest.exactCap1000.reconciliation)}`);
  }

  for (const outDir of [evidence, "/tmp"]) {
    try {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "EXACT_CAP1000_FIXTURE.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    } catch {
      /* ignore read-only */
    }
  }
  console.log(JSON.stringify(manifest, null, 2));
  progress("exact CAP1000 fixture ready", started);
  await store.flush();
} finally {
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
}
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
