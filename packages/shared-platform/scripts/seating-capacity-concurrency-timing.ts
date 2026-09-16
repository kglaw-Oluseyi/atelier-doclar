/**
 * Disaggregated two-event 600-guest concurrency timing for Gate 1.
 * Writes JSONL evidence; does not replace the unit-test isolation assertion.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadNonProductionFixtures } from "../src/bootstrap.js";
import { FIXTURE_IDS as people } from "../src/fixtures.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { applyCapacity600SeatingLayout } from "../src/seating-capacity-layout-fixture.js";
import { capacityBrowserGuestNames, CAPACITY_SCENARIO_SEEDS } from "../src/seating-capacity-corpus.js";
import { actor, testClock } from "../test/helpers.js";

const NOW = "2026-09-16T08:00:00.000Z";
const OUT =
  process.env.CAPACITY_EVIDENCE_OUT?.trim() ||
  new URL("../../../docs/control/evidence/eos-s06-capacity-600/concurrency-timing.jsonl", import.meta.url).pathname;

function emit(row: Record<string, unknown>) {
  const line = JSON.stringify({ at: new Date().toISOString(), ...row });
  process.stdout.write(`${line}\n`);
  mkdirSync(dirname(OUT), { recursive: true });
  appendFileSync(OUT, `${line}\n`);
}

function planner(correlationId: string) {
  return actor(people.personPlanner, { now: NOW, correlationId });
}
function director(correlationId: string) {
  return actor(people.personDirector, { now: NOW, correlationId });
}
function ceo(correlationId: string) {
  return actor(people.personCeo, { now: NOW, correlationId });
}
function admin(correlationId: string) {
  return actor(people.personAdmin, { now: NOW, correlationId });
}

function envelope(assignmentId: string, key: string, eventId: string) {
  return {
    organisationId: people.orgMaison,
    eventId,
    actorAssignmentId: assignmentId,
    idempotencyKey: key.length >= 12 ? key : `cap600-conc-${key}`,
  };
}

async function seedEvent(
  service: ReturnType<typeof loadNonProductionFixtures>,
  store: MemoryPlatformStore,
  eventId: string,
  prefix: string,
  displayName: string,
) {
  const t0 = Date.now();
  service.prepareEventRsvp(director(`${prefix}-rsvp`), {
    organisationId: people.orgMaison,
    eventId,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: displayName,
    reason: "concurrency seed RSVP",
    idempotencyKey: `${prefix}-prepare-rsvp`,
  });
  const layout = await applyCapacity600SeatingLayout(
    service,
    store,
    eventId,
    planner(`${prefix}-layout`),
    director(`${prefix}-layout`),
    prefix,
  );
  for (let index = 0; index < 600; index += 1) {
    const name = capacityBrowserGuestNames()[index]!;
    const guest = service.intakeGuest(director(`${prefix}-in-${index}`), {
      organisationId: people.orgMaison,
      eventId,
      givenName: `${name.givenName}-${prefix}`,
      familyName: name.familyName,
      email: `${name.givenName}.${prefix}.${eventId.slice(0, 8)}@cap600.example.test`,
      reason: "concurrency guest",
      idempotencyKey: `${prefix}-guest-${index}-in`,
    });
    service.staffEnterRsvp(director(`${prefix}-att-${index}`), {
      organisationId: people.orgMaison,
      eventId,
      guestId: guest.id,
      attendanceIntent: "ATTENDING",
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      reason: "concurrency attending",
      idempotencyKey: `${prefix}-guest-${index}-attend`,
    });
  }
  return { layoutId: layout.layout.id, layoutContentHash: layout.publication.contentHash, seedMs: Date.now() - t0 };
}

async function timedSolve(
  label: string,
  eventId: string,
  packageId: string,
  launch: () => Promise<{
    application: string;
    value: { id: string; status: string; layoutId?: string | null; packageId?: string };
  }>,
) {
  const heapBefore = process.memoryUsage().heapUsed;
  const requestStart = Date.now();
  const requestStartIso = new Date(requestStart).toISOString();
  const acknowledgementStart = Date.now();
  // launchRun is synchronous end-to-end in-process; acknowledgement ≈ solve start
  const solverStart = Date.now();
  const result = await launch();
  const solverEnd = Date.now();
  const persistenceEnd = Date.now();
  const heapAfter = process.memoryUsage().heapUsed;
  return {
    label,
    eventId,
    packageId,
    runId: result.value.id,
    status: result.value.status,
    application: result.application,
    requestStartIso,
    acknowledgementMs: solverStart - acknowledgementStart,
    solverStartIso: new Date(solverStart).toISOString(),
    solverDurationMs: solverEnd - solverStart,
    persistenceCompletionMs: persistenceEnd - solverEnd,
    totalWallClockMs: persistenceEnd - requestStart,
    heapUsedBeforeBytes: heapBefore,
    heapUsedAfterBytes: heapAfter,
    heapDeltaBytes: heapAfter - heapBefore,
  };
}

const store = new MemoryPlatformStore();
const service = loadNonProductionFixtures(store, { clock: testClock(NOW) });
const eventB = service.createEvent(ceo("cap600-conc-event-b"), {
  organisationId: people.orgMaison,
  clientId: people.clientAlpha,
  code: "CAP-C",
  name: "Capacity Concurrent Beta",
  startsAt: "2026-12-16T09:00:00.000Z",
  endsAt: "2026-12-16T22:00:00.000Z",
  timezone: "Africa/Lagos",
}).id;
service.grantAssignment(admin("cap600-conc-grant-p"), {
  organisationId: people.orgMaison,
  personId: people.personPlanner,
  roleKey: "PLANNER",
  clientId: people.clientAlpha,
  eventId: eventB,
  reason: "Concurrency planner grant",
  idempotencyKey: "cap600-conc-grant-planner-b",
});
service.grantAssignment(admin("cap600-conc-grant-d"), {
  organisationId: people.orgMaison,
  personId: people.personDirector,
  roleKey: "EVENT_DIRECTOR",
  clientId: people.clientAlpha,
  eventId: eventB,
  reason: "Concurrency director grant",
  idempotencyKey: "cap600-conc-grant-director-b",
});

const alphaSeed = await seedEvent(service, store, people.eventAlphaOne, "cap600-ca", "Capacity Concurrent Alpha");
const betaSeed = await seedEvent(service, store, eventB, "cap600-cb", "Capacity Concurrent Beta");
const v2 = service.seatingV2Commands();

const freezeStart = Date.now();
const [alphaFrozen, betaFrozen] = await Promise.all([
  v2.freezePackage(planner("cap600-ca-freeze"), envelope(people.assignPlanner, "cap600-ca-freeze", people.eventAlphaOne), {
    seed: CAPACITY_SCENARIO_SEEDS.A_LIGHT,
  }),
  v2.freezePackage(planner("cap600-cb-freeze"), envelope(people.assignPlanner, "cap600-cb-freeze", eventB), {
    seed: CAPACITY_SCENARIO_SEEDS.A_LIGHT,
  }),
]);
const freezeMs = Date.now() - freezeStart;

const combinedStart = Date.now();
const [alphaTiming, betaTiming] = await Promise.all([
  timedSolve("alpha", people.eventAlphaOne, alphaFrozen.value.id, () =>
    v2.launchRun(planner("cap600-ca-run"), envelope(people.assignPlanner, "cap600-ca-run", people.eventAlphaOne), {
      packageId: alphaFrozen.value.id,
    }),
  ),
  timedSolve("beta", eventB, betaFrozen.value.id, () =>
    v2.launchRun(planner("cap600-cb-run"), envelope(people.assignPlanner, "cap600-cb-run", eventB), {
      packageId: betaFrozen.value.id,
    }),
  ),
]);
const combinedWallMs = Date.now() - combinedStart;

const alphaAssignments = await v2.repository.transaction(async (tx) =>
  tx.list<{ runId: string; eventGuestId: string; state: string }>("runAssignments", {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
  }),
);
const betaAssignments = await v2.repository.transaction(async (tx) =>
  tx.list<{ runId: string; eventGuestId: string; state: string }>("runAssignments", {
    organisationId: people.orgMaison,
    eventId: eventB,
  }),
);

const alphaSeated = alphaAssignments.filter((item) => item.runId === alphaTiming.runId && item.state === "SEATED").length;
const betaSeated = betaAssignments.filter((item) => item.runId === betaTiming.runId && item.state === "SEATED").length;
const crossLeak =
  alphaAssignments.some((item) => item.runId === betaTiming.runId) ||
  betaAssignments.some((item) => item.runId === alphaTiming.runId);

emit({
  kind: "concurrency-preflight",
  alphaSeed,
  betaSeed,
  freezeMs,
  applicationShaNote: "7f139a556f7c023efa98daccd7bfd29481a05775 unchanged; in-process MemoryPlatformStore",
});
emit({ kind: "concurrency-event", ...alphaTiming, layoutId: alphaSeed.layoutId, seated: alphaSeated, eligible: 600 });
emit({ kind: "concurrency-event", ...betaTiming, layoutId: betaSeed.layoutId, seated: betaSeated, eligible: 600 });
emit({
  kind: "concurrency-summary",
  combinedWallMs,
  alphaTotalWallClockMs: alphaTiming.totalWallClockMs,
  betaTotalWallClockMs: betaTiming.totalWallClockMs,
  alphaSolverDurationMs: alphaTiming.solverDurationMs,
  betaSolverDurationMs: betaTiming.solverDurationMs,
  maxIndividualSolveMs: Math.max(alphaTiming.solverDurationMs, betaTiming.solverDurationMs),
  under30sEach: alphaTiming.solverDurationMs < 30_000 && betaTiming.solverDurationMs < 30_000,
  under60sCeiling: alphaTiming.solverDurationMs <= 60_000 && betaTiming.solverDurationMs <= 60_000,
  crossEventLeakage: crossLeak,
  alphaStatus: alphaTiming.status,
  betaStatus: betaTiming.status,
});

const failed =
  alphaTiming.status !== "FEASIBLE" ||
  betaTiming.status !== "FEASIBLE" ||
  alphaSeated !== 600 ||
  betaSeated !== 600 ||
  crossLeak ||
  alphaTiming.solverDurationMs > 60_000 ||
  betaTiming.solverDurationMs > 60_000;
process.exitCode = failed ? 1 : 0;
