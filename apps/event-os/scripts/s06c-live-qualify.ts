/**
 * EOS-S06C live synthetic qualification via the governed intake product path.
 *
 * Expected duration: ≤3 minutes for S06C-050; ≤6 minutes if --also-1000.
 * Progress every ≤30s. Abort if no progress for 10 minutes or elapsed > 2× estimate.
 *
 * Usage (from repo root, Event OS linked):
 *   railway run --service event-os -- pnpm exec tsx apps/event-os/scripts/s06c-live-qualify.ts --confirm-synthetic-qualification
 *   railway run --service event-os -- pnpm exec tsx apps/event-os/scripts/s06c-live-qualify.ts --confirm-synthetic-qualification --also-1000
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
  type PlatformService,
} from "@maison-doclar/shared-platform";

const CAP600_ID = "053fa686-124e-49b3-b8a8-d0497c0a1668";
const OLD_CAP1000_ID = "3d212906-529e-4bd8-b13f-b0c2a24e5fba";
const EVIDENCE_DIR_CANDIDATES = [
  join(process.cwd(), "docs/control/evidence/eos-s06c-high-volume-intake"),
  join(process.cwd(), "../../docs/control/evidence/eos-s06c-high-volume-intake"),
  "/app/docs/control/evidence/eos-s06c-high-volume-intake",
];

function evidenceDir(): string {
  for (const candidate of EVIDENCE_DIR_CANDIDATES) {
    try {
      readFileSync(join(candidate, "corpora/S06C-050-CLEAN.csv"));
      return candidate;
    } catch {
      /* try next */
    }
  }
  throw new Error("EOS-S06C evidence corpora not found");
}

type Args = { confirm: boolean; also1000: boolean };

function parseArgs(argv: string[]): Args {
  const out: Args = { confirm: false, also1000: false };
  for (const arg of argv) {
    if (arg === "--confirm-synthetic-qualification") out.confirm = true;
    if (arg === "--also-1000") out.also1000 = true;
  }
  return out;
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
  return { personId, correlationId: `s06c-live-${personId.slice(0, 8)}-${Date.now()}` };
}

function progress(msg: string, started: number) {
  const elapsed = Math.round(performance.now() - started);
  console.log(`[S06C-LIVE +${elapsed}ms] ${msg}`);
}

async function flush(store: PostgresPlatformStore) {
  await store.flush();
}

async function promoteAll(
  service: PlatformService,
  store: PostgresPlatformStore,
  _maker: ReturnType<typeof actor>,
  checker: ReturnType<typeof actor>,
  organisationId: string,
  eventId: string,
  jobId: string,
  version: number,
  started: number,
  estimateMs: number,
) {
  let currentVersion = version;
  let receipt;
  const hardStop = estimateMs * 2;
  let lastProgress = performance.now();
  for (let i = 0; i < 40; i += 1) {
    if (performance.now() - started > hardStop) {
      throw new Error(`Stop-loss: exceeded 2× estimate (${hardStop}ms)`);
    }
    if (performance.now() - lastProgress > 10 * 60_000) {
      throw new Error("Stop-loss: no meaningful progress for 10 minutes");
    }
    const advanced = service.advanceGuestIntakePromotion(checker, {
      organisationId,
      eventId,
      jobId,
      expectedVersion: currentVersion,
      maxChunks: 8,
    });
    currentVersion = advanced.job.version;
    receipt = advanced.receipt;
    lastProgress = performance.now();
    progress(
      `promote phase=${advanced.job.progress.phase} promoted=${advanced.job.progress.rowsPromoted}/${advanced.job.progress.rowsTotal} status=${advanced.job.status}`,
      started,
    );
    await flush(store);
    if (advanced.job.status === "COMPLETED" || advanced.job.status === "COMPLETED_WITH_EXCEPTIONS") {
      return { job: advanced.job, receipt };
    }
  }
  throw new Error("Promotion did not reach a terminal completed state");
}

async function runIntake(input: {
  service: PlatformService;
  store: PostgresPlatformStore;
  organisationId: string;
  eventId: string;
  name: string;
  csvPath: string;
  started: number;
  estimateMs: number;
}) {
  const maker = actor(FIXTURE_IDS.personPlanner);
  const checker = actor(FIXTURE_IDS.personDirector);
  const csv = readFileSync(input.csvPath);
  progress(`create job ${input.name}`, input.started);
  let job = input.service.createGuestIntakeJob(maker, {
    organisationId: input.organisationId,
    eventId: input.eventId,
    name: input.name,
    reason: "EOS-S06C live synthetic qualification",
    clientSourceRef: "S06C-LIVE-SYNTHETIC",
    expectedScale: csv.toString("utf8").trim().split("\n").length - 1,
  });
  await flush(input.store);

  progress(`upload ${csv.byteLength} bytes`, input.started);
  const uploaded = input.service.uploadGuestIntakeSource(maker, {
    organisationId: input.organisationId,
    eventId: input.eventId,
    jobId: job.id,
    filename: `${input.name}.csv`,
    contentType: "text/csv",
    contentBase64: csv.toString("base64"),
    expectedVersion: job.version,
  });
  job = uploaded.job;
  await flush(input.store);

  progress(`validate status=${job.status}`, input.started);
  job = input.service.validateGuestIntake(maker, {
    organisationId: input.organisationId,
    eventId: input.eventId,
    jobId: job.id,
    expectedVersion: job.version,
  });
  await flush(input.store);

  if (job.status === "NEEDS_REVIEW") {
    const bundle = input.service.getGuestIntakeJob(maker, input.organisationId, input.eventId, job.id);
    const decisions = bundle.candidates
      .filter((item) => ["WARNING", "DUPLICATE_REVIEW", "INVALID"].includes(item.status))
      .map((item) => ({
        candidateId: item.id,
        decision: (item.status === "INVALID" ? "EXCLUDE" : "CREATE") as "CREATE" | "EXCLUDE",
      }));
    if (decisions.length) {
      progress(`apply ${decisions.length} decisions`, input.started);
      job = input.service.applyGuestIntakeDecisions(maker, {
        organisationId: input.organisationId,
        eventId: input.eventId,
        jobId: job.id,
        expectedVersion: job.version,
        decisions,
      });
      await flush(input.store);
    }
  }

  progress(`submit status=${job.status}`, input.started);
  job = input.service.submitGuestIntake(maker, {
    organisationId: input.organisationId,
    eventId: input.eventId,
    jobId: job.id,
    expectedVersion: job.version,
    reason: "Submit EOS-S06C live synthetic intake",
  });
  await flush(input.store);

  progress("approve as checker", input.started);
  job = input.service.approveGuestIntake(checker, {
    organisationId: input.organisationId,
    eventId: input.eventId,
    jobId: job.id,
    expectedVersion: job.version,
    reason: "Approve EOS-S06C live synthetic intake",
  });
  await flush(input.store);

  const guestBefore = input.service.listGuests(checker, {
    organisationId: input.organisationId,
    eventId: input.eventId,
  }).length;
  const result = await promoteAll(
    input.service,
    input.store,
    maker,
    checker,
    input.organisationId,
    input.eventId,
    job.id,
    job.version,
    input.started,
    input.estimateMs,
  );
  const guestAfter = input.service.listGuests(checker, {
    organisationId: input.organisationId,
    eventId: input.eventId,
  }).length;

  // Replay must not duplicate
  input.service.advanceGuestIntakePromotion(checker, {
    organisationId: input.organisationId,
    eventId: input.eventId,
    jobId: job.id,
    expectedVersion: result.job.version,
  });
  await flush(input.store);
  const guestReplay = input.service.listGuests(checker, {
    organisationId: input.organisationId,
    eventId: input.eventId,
  }).length;

  return {
    jobId: job.id,
    status: result.job.status,
    receipt: result.receipt,
    guestBefore,
    guestAfter,
    guestReplay,
    machineMs: result.receipt?.timings.machineMs,
    sourceHash: uploaded.source.sha256,
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.confirm) throw new Error("Missing --confirm-synthetic-qualification");
const url = process.env.DATABASE_URL;
if (!url?.trim()) throw new Error("DATABASE_URL is required");

const started = performance.now();
const estimateMs = args.also1000 ? 6 * 60_000 : 3 * 60_000;
console.log(`[S06C-LIVE] expected duration ≤${Math.round(estimateMs / 1000)}s (hard stop ${Math.round((estimateMs * 2) / 1000)}s)`);

const pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 12_000 });
try {
  const client = adapt(pool);
  const store = await PostgresPlatformStore.open(client);
  const seeded = await applySyntheticSeedIfNeeded(store, client, {});
  await store.flush();
  const service = seeded.service;
  const org = FIXTURE_IDS.orgMaison;
  const ceo = actor(FIXTURE_IDS.personCeo);
  const admin = actor(FIXTURE_IDS.personAdmin);

  const snap = store.snapshot();
  const cap600 = snap.events.find((item) => item.id === CAP600_ID);
  const oldCap1000 = snap.events.find((item) => item.id === OLD_CAP1000_ID);
  const cap600Guests = snap.operationalGuests.filter((item) => item.eventId === CAP600_ID).length;
  const oldCap1000Guests = snap.operationalGuests.filter((item) => item.eventId === OLD_CAP1000_ID).length;
  progress(
    `CAP600 present=${Boolean(cap600)} guests=${cap600Guests} name=${cap600?.name ?? "missing"}`,
    started,
  );
  progress(
    `old CAP1000 present=${Boolean(oldCap1000)} guests=${oldCap1000Guests} name=${oldCap1000?.name ?? "missing"}`,
    started,
  );
  if (!cap600) throw new Error("CAP600 event missing — aborting");

  const eventName = `[SYNTHETIC QUALIFICATION] EOS-S06C High-Volume Intake ${new Date().toISOString().slice(0, 10)}`;
  const event = service.createEvent(ceo, {
    organisationId: org,
    clientId: FIXTURE_IDS.clientAlpha,
    code: `S06C-${Date.now().toString(36).toUpperCase()}`,
    name: eventName,
    startsAt: "2026-12-22T09:00:00.000Z",
    endsAt: "2026-12-22T22:00:00.000Z",
    timezone: "Africa/Lagos",
  });
  await flush(store);
  progress(`created event ${event.id}`, started);

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
      reason: "EOS-S06C live synthetic qualification grant",
      idempotencyKey: `s06c-live-grant-${roleKey}-${event.id}`,
    });
  }
  await flush(store);

  const evidence = evidenceDir();

  const fifty = await runIntake({
    service,
    store,
    organisationId: org,
    eventId: event.id,
    name: "S06C-050-CLEAN-LIVE",
    csvPath: join(evidence, "corpora/S06C-050-CLEAN.csv"),
    started,
    estimateMs,
  });
  progress(`50-row done guests=${fifty.guestAfter} status=${fifty.status}`, started);

  let thousand: Awaited<ReturnType<typeof runIntake>> | undefined;
  if (args.also1000) {
    thousand = await runIntake({
      service,
      store,
      organisationId: org,
      eventId: event.id,
      name: "S06C-1000-TYPICAL-LIVE",
      csvPath: join(evidence, "corpora/S06C-1000-TYPICAL.csv"),
      started,
      estimateMs,
    });
    progress(`1000-row done guests=${thousand.guestAfter} status=${thousand.status}`, started);
  }

  // Sign-in smoke via fixture identity resolve (not HTTP); auditor must not mutate
  let auditorBlocked = false;
  try {
    service.createGuestIntakeJob(actor(FIXTURE_IDS.personAuditor), {
      organisationId: org,
      eventId: event.id,
      name: "auditor-denied",
      reason: "should fail",
    });
  } catch {
    auditorBlocked = true;
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    applicationShaHint: process.env.EVENT_OS_GIT_SHA ?? null,
    eventId: event.id,
    eventName,
    cap600: { eventId: CAP600_ID, present: Boolean(cap600), guestCount: cap600Guests, name: cap600?.name },
    oldCap1000: {
      eventId: OLD_CAP1000_ID,
      present: Boolean(oldCap1000),
      guestCount: oldCap1000Guests,
      name: oldCap1000?.name,
      disposition: "QUARANTINED — historical incomplete fixture; not mutated; not for verification",
    },
    intake050: fifty,
    intake1000: thousand ?? null,
    auditorBlocked,
    elapsedMs: Math.round(performance.now() - started),
    providersNote: "No communications or external providers invoked by this script",
  };

  for (const outDir of [evidence, "/tmp"]) {
    try {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "LIVE_FIXTURE_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    } catch {
      /* read-only image paths are fine; /tmp is required */
    }
  }
  console.log(JSON.stringify(manifest, null, 2));
  progress(`wrote LIVE_FIXTURE_MANIFEST.json auditorBlocked=${auditorBlocked}`, started);
  await flush(store);
} finally {
  try { await pool.end(); } catch { /* ignore */ }
}
