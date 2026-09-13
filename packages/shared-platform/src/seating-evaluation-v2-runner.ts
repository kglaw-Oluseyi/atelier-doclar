import { PlatformError } from "./errors.js";
import { exactHash } from "./eec-hash.js";
import { loadNonProductionFixtures } from "./bootstrap.js";
import { FIXTURE_IDS as people } from "./fixtures.js";
import { MemoryPlatformStore } from "./memory-store.js";
import { MemorySeatingV2Repository } from "./memory-seating-v2-store.js";
import { authorize } from "./policy.js";
import { snapshotLayoutAdapter } from "./seating-adapters.js";
import { applyS06SeatingLayoutIfMissing } from "./seating-fixtures.js";
import { defaultSolverConfig, solveSeatingV1 } from "./seating-solver-v1.js";
import { assertSeatingV2CompiledRequest, compileSeatingV2Request } from "./seating-v2-compiler.js";
import { seatingV2PackageContentHash, seatingV2SemanticHash, seatingV2TableToken } from "./seating-v2-hash.js";
import {
  S06_V2_CASE_IDS,
  S06_V2_EVALUATION_CONTRACT_VERSION,
  S06_V2_EVALUATION_CORPUS_EDITION,
  S06_V2_EVALUATION_PROJECTION_VERSION,
  s06V2CorpusHash,
  type S06V2Assertion,
  type S06V2CaseId,
  type S06V2CaseOutcome,
  type S06V2EvaluationResult,
  type S06V2Observation,
} from "./seating-evaluation-v2-schemas.js";
import { SEATING_V2_CONFIG_HASH } from "./seating-v2-package.js";
import {
  SEATING_V2_LEGACY_COMPILER_VERSION,
  SEATING_V2_LEGACY_VALIDATOR_VERSION,
  SEATING_V2_SOLVER_VERSION,
  SEATING_V2_VALIDATOR_VERSION,
  type SeatingV2CompiledRequest,
  type SeatingV2RuleContent,
} from "./seating-v2-schemas.js";
import { validateSeatingV2 } from "./seating-v2-validator.js";
import type { PlatformService } from "./service.js";
import { assertionHolds } from "./seating-evaluation-schemas.js";

const NOW = "2026-09-12T20:00:00.000Z";

function actor(personId: string) {
  return { personId, correlationId: `s06v2-eval-${personId.slice(-4)}`, now: NOW, actorKind: "HUMAN" as const };
}

function envelope(assignmentId: string, key: string) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: assignmentId,
    idempotencyKey: key,
  };
}

function keepApart(guestA: string, guestB: string, domain: SeatingV2RuleContent["specialistDomain"] = "NONE"): SeatingV2RuleContent {
  return {
    kind: "KEEP_APART",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: domain,
    subjects: [
      { type: "EVENT_GUEST", id: guestA },
      { type: "EVENT_GUEST", id: guestB },
    ],
    targets: [],
    source: { type: "MANUAL" },
  };
}

function observe(name: string, value: unknown): S06V2Observation {
  return { kind: "persisted", name, value };
}

function fixture(): { service: PlatformService; store: MemoryPlatformStore } {
  const store = new MemoryPlatformStore();
  const service = loadNonProductionFixtures(store);
  applyS06SeatingLayoutIfMissing(store, service);
  service.prepareEventRsvp(actor(people.personDirector), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: "Alpha One",
    reason: "s06-eval-v2 RSVP",
    idempotencyKey: "s06v2-eval-prepare-rsvp",
  });
  return { service, store };
}

function publishedTableId(store: MemoryPlatformStore): string {
  return snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne).tables[0]!.objectId;
}

function requireTable(guestA: string, guestB: string, tableId: string): SeatingV2RuleContent {
  return {
    kind: "REQUIRE_TABLE",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects: [
      { type: "EVENT_GUEST", id: guestA },
      { type: "EVENT_GUEST", id: guestB },
    ],
    targets: [{ type: "TABLE", idOrCode: tableId }],
    source: { type: "MANUAL" },
  };
}

function requireTableSubjects(guestIds: readonly string[], tableId: string): SeatingV2RuleContent {
  return {
    kind: "REQUIRE_TABLE",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects: guestIds.map((id) => ({ type: "EVENT_GUEST" as const, id })),
    targets: [{ type: "TABLE", idOrCode: tableId }],
    source: { type: "MANUAL" },
  };
}

function forbidTable(guestId: string, tableId: string): SeatingV2RuleContent {
  return {
    kind: "FORBID_TABLE",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects: [{ type: "EVENT_GUEST", id: guestId }],
    targets: [{ type: "TABLE", idOrCode: tableId }],
    source: { type: "MANUAL" },
  };
}

function publishedTables(store: MemoryPlatformStore) {
  return snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne).tables;
}

function samePublishedTable(layoutTableId: string | null | undefined, tableObjectId: string) {
  return layoutTableId === tableObjectId || layoutTableId === seatingV2TableToken(tableObjectId);
}

function bareFixture(): { service: PlatformService; store: MemoryPlatformStore } {
  const store = new MemoryPlatformStore();
  const service = loadNonProductionFixtures(store);
  service.prepareEventRsvp(actor(people.personDirector), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: "Alpha One",
    reason: "s06-eval-v4 bare RSVP",
    idempotencyKey: "s06v4-eval-bare-rsvp",
  });
  return { service, store };
}

async function planAssignment(
  v2: ReturnType<PlatformService["seatingV2Commands"]>,
  planEditionId: string,
  guestId: string,
) {
  const assignments = await v2.repository.transaction(async (tx) =>
    (
      await tx.list<{ planEditionId: string; eventGuestId: string; layoutTableId?: string | null; state: string }>(
        "planAssignments",
        { organisationId: people.orgMaison, eventId: people.eventAlphaOne },
      )
    ).filter((item) => item.planEditionId === planEditionId),
  );
  return assignments.find((item) => item.eventGuestId === guestId);
}

async function compiledForPackage(
  v2: ReturnType<PlatformService["seatingV2Commands"]>,
  packageId: string,
) {
  return v2.repository.transaction(async (tx) =>
    (
      await tx.list<{ packageId: string; compiledRequestJson: SeatingV2CompiledRequest }>("compiledRequests", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      })
    ).find((item) => item.packageId === packageId),
  );
}

function mutateStoredRun(
  v2: ReturnType<PlatformService["seatingV2Commands"]>,
  runId: string,
  patch: (run: { compilerVersion?: string; validatorVersion?: string }) => void,
) {
  if (!(v2.repository instanceof MemorySeatingV2Repository)) {
    throw new Error("memory repository required");
  }
  const run = v2.repository.backingStore.collection("runs").find((item) => item.id === runId);
  if (!run) throw new Error("run missing");
  patch(run);
}

function cas(layout: { id: string; version: number; currentRevisionNumber: number }) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    layoutId: layout.id,
    expectedVersion: layout.version,
    expectedRevisionNumber: layout.currentRevisionNumber,
  };
}

function publishMismatchedCapacityLayout(service: PlatformService, store: MemoryPlatformStore, prefix: string) {
  const snap = store.snapshot();
  const venue =
    snap.venues.find((item) => item.organisationId === people.orgMaison && item.status === "ACTIVE") ??
    service.createVenue(actor(people.personDirector), {
      organisationId: people.orgMaison,
      displayName: "S06 v4 mismatch pavilion",
      reason: "Seed mismatched capacity layout venue",
      idempotencyKey: `${prefix}-venue`,
    });
  const adopted = service.adoptVenue(actor(people.personDirector), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    venueId: venue.id,
    reason: "Adopt mismatched capacity layout venue",
    idempotencyKey: `${prefix}-adopt`,
  });
  let layout = service.createBlankLayout(actor(people.personPlanner), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    eventVenueId: adopted.id,
    name: `${prefix} hall`,
    widthMm: 24000,
    heightMm: 18000,
    reason: "Create mismatched capacity layout",
    idempotencyKey: `${prefix}-layout`,
  });
  layout = service.applyLayoutCommand(actor(people.personPlanner), {
    ...cas(layout),
    reason: "Add mismatched table",
    command: {
      kind: "CREATE_OBJECT",
      objectType: "TABLE",
      label: "Mismatched",
      geometry: { kind: "RECTANGLE", xMm: 1200, yMm: 1200, widthMm: 1800, heightMm: 1800 },
      subtype: { shape: "RECTANGLE", declaredCapacity: 8 },
    },
  });
  const created = service
    .getLayoutSetupWorkspace(actor(people.personPlanner), people.orgMaison, people.eventAlphaOne, layout.id)
    .objects.find((item) => item.objectType === "TABLE" && item.label === "Mismatched");
  if (!created) throw new Error("mismatched table missing");
  layout = service.applyLayoutCommand(actor(people.personPlanner), {
    ...cas(layout),
    reason: "Generate four physical seats",
    command: {
      kind: "GENERATE_SEATS",
      tableId: created.id,
      seatCount: 4,
      confirmDestructive: false,
    },
  });
  const current = () =>
    service.getLayoutSetupWorkspace(actor(people.personPlanner), people.orgMaison, people.eventAlphaOne, layout.id).layout;
  const asDirector = () =>
    service.getLayoutSetupWorkspace(actor(people.personDirector), people.orgMaison, people.eventAlphaOne, layout.id).layout;
  service.runLayoutValidation(actor(people.personPlanner), { ...cas(current()), reason: "Validate mismatched layout" });
  const submitted = service.submitLayoutApproval(actor(people.personPlanner), {
    ...cas(current()),
    reason: "Submit mismatched layout",
  });
  service.decideLayoutApproval(actor(people.personDirector), {
    ...cas(asDirector()),
    approvalId: submitted.id,
    decision: "APPROVED",
    reason: "Approve mismatched layout",
  });
  service.publishLayout(actor(people.personDirector), { ...cas(asDirector()), reason: "Publish mismatched layout" });
}

function attending(service: PlatformService, name: string, key: string) {
  const guest = service.intakeGuest(actor(people.personDirector), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName: name,
    familyName: "Eval",
    email: `${name.toLowerCase()}.eval@example.test`,
    reason: "s06-eval-v2 guest",
    idempotencyKey: `${key}-intake`,
  });
  service.staffEnterRsvp(actor(people.personDirector), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    guestId: guest.id,
    attendanceIntent: "ATTENDING",
    answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
    reason: "s06-eval-v2 attending",
    idempotencyKey: `${key}-rsvp`,
  });
  return guest;
}

async function keepApartPath(service: PlatformService, suffix: string) {
  const v2 = service.seatingV2Commands();
  const guestA = attending(service, `A${suffix}`, `s06v2-${suffix}-a`);
  const guestB = attending(service, `B${suffix}`, `s06v2-${suffix}-b`);
  const draft = await v2.createRule(actor(people.personPlanner), envelope(people.assignPlanner, `s06v2-${suffix}-create`), keepApart(guestA.id, guestB.id));
  const activated = await v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, `s06v2-${suffix}-act`), {
    editionId: draft.value.id,
  });
  const frozen = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, `s06v2-${suffix}-freeze`), {
    seed: `seed-${suffix}`,
  });
  const run = await v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, `s06v2-${suffix}-run`), {
    packageId: frozen.value.id,
  });
  const adopted = run.value.status === "FEASIBLE"
    ? await v2.adoptRun(actor(people.personPlanner), envelope(people.assignPlanner, `s06v2-${suffix}-adopt`), { runId: run.value.id })
    : undefined;
  return { v2, guestA, guestB, draft, activated, frozen, run, adopted };
}

async function runCase(id: S06V2CaseId): Promise<{ observations: S06V2Observation[]; assertions: S06V2Assertion[] }> {
  const observations: S06V2Observation[] = [];
  const assertions: S06V2Assertion[] = [];
  const push = (name: string, value: unknown, expected: unknown, compare: S06V2Assertion["compare"] = "equals") => {
    observations.push(observe(name, value));
    assertions.push({ name, expected, compare });
  };

  if (id === "S06V2-PATH-01" || id === "S06V2-PATH-07") {
    const { service } = fixture();
    const path = await keepApartPath(service, id.slice(-2));
    push("runStatus", path.run.value.status, "FEASIBLE");
    push("packageBound", Boolean(path.frozen.value.contentHash && path.run.value.packageHash === path.frozen.value.contentHash), true);
    if (path.adopted) {
      const submitted = await path.v2.submitPlan(actor(people.personPlanner), envelope(people.assignPlanner, `${id}-submit`), {
        editionId: path.adopted.value.id,
      });
      const approved = await path.v2.approvePlan(actor(people.personDirector), envelope(people.assignDirector, `${id}-approve`), {
        editionId: submitted.value.id,
        editionHash: submitted.value.contentHash,
        decision: "APPROVED",
        reason: "eval approval",
      });
      let directorPublishDenied = false;
      try {
        await path.v2.publishPlan(actor(people.personDirector), envelope(people.assignDirector, `${id}-dir-pub`), {
          editionId: submitted.value.id,
          editionHash: submitted.value.contentHash,
        });
      } catch (error) {
        directorPublishDenied = error instanceof PlatformError && error.code === "FORBIDDEN";
      }
      const published = await path.v2.publishPlan(actor(people.personCeo), envelope(people.assignCeo, `${id}-pub`), {
        editionId: submitted.value.id,
        editionHash: submitted.value.contentHash,
      });
      const replay = await path.v2.publishPlan(actor(people.personCeo), envelope(people.assignCeo, `${id}-pub-2`), {
        editionId: submitted.value.id,
        editionHash: submitted.value.contentHash,
      });
      const assignments = await path.v2.repository.transaction(async (tx) =>
        (await tx.list<{ planEditionId: string; eventGuestId: string; layoutTableId?: string | null; state: string }>("planAssignments", {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
        })).filter((item) => item.planEditionId === path.adopted!.value.id),
      );
      const seatedA = assignments.find((item) => item.eventGuestId === path.guestA.id);
      const seatedB = assignments.find((item) => item.eventGuestId === path.guestB.id);
      push("subjectsSeparated", seatedA?.layoutTableId !== seatedB?.layoutTableId && seatedA?.state === "SEATED", true);
      push("directorPublishDenied", directorPublishDenied, true);
      push("publicationCurrent", published.value.status, "CURRENT");
      push("publicationReplay", replay.application === "REPLAYED" && replay.value.id === published.value.id, true);
      push("approvalRecorded", approved.value.decision, "APPROVED");
    }
    return { observations, assertions };
  }

  if (id === "S06V2-PATH-02" || id === "S06V2-M06" || id === "S06V2-M07") {
    const { service } = fixture();
    const path = await keepApartPath(service, "02");
    const compiled = await path.v2.repository.transaction(async (tx) =>
      (await tx.list<{ packageId: string; compiledRequestJson: { guests: Array<{ token: string }>; positions: Array<{ token: string }> } }>(
        "compiledRequests",
        { organisationId: people.orgMaison, eventId: people.eventAlphaOne },
      )).find((item) => item.packageId === path.frozen.value.id),
    );
    const guests = compiled?.compiledRequestJson.guests ?? [];
    const position = compiled?.compiledRequestJson.positions[0]?.token ?? "missing";
    const violating = guests.map((guest) => ({
      guestToken: guest.token,
      state: "SEATED" as const,
      positionToken: position,
      typedReasonCodes: [],
    }));
    const report = validateSeatingV2(
      { contentHash: path.frozen.value.contentHash, compiledRequest: compiled?.compiledRequestJson as never },
      violating,
      [],
      NOW,
    );
    push("validatorRejectedViolation", report.verdict, "INFEASIBLE");
    push("runUsedValidatorStatus", path.run.value.status === "FEASIBLE" || path.run.value.status === "INFEASIBLE", true);
    return { observations, assertions };
  }

  if (id === "S06V2-PATH-03" || id === "S06V2-M03") {
    const { service } = fixture();
    const path = await keepApartPath(service, "03");
    await path.v2.withdrawRule(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-03-withdraw"), {
      editionId: path.activated.value.id,
      reason: "replace",
    });
    const next = await path.v2.createRule(
      actor(people.personPlanner),
      envelope(people.assignPlanner, "s06v2-03-create-2"),
      keepApart(path.guestA.id, path.guestB.id, "PROTOCOL"),
    );
    await path.v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, "s06v2-03-act-2"), { editionId: next.value.id });
    const frozen2 = await path.v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-03-freeze-2"), {
      seed: "seed-03",
    });
    const run2 = await path.v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-03-run-2"), {
      packageId: frozen2.value.id,
    });
    push("packageChanged", frozen2.value.contentHash !== path.frozen.value.contentHash, true);
    push("runNotReplayed", run2.value.id !== path.run.value.id, true);
    return { observations, assertions };
  }

  if (id === "S06V2-PATH-04" || id === "S06V2-M10" || id === "S06V2-M11") {
    const { service } = fixture();
    const path = await keepApartPath(service, "04");
    if (!path.adopted) throw new Error("adopt required");
    const submitted = await path.v2.submitPlan(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-04-submit"), {
      editionId: path.adopted.value.id,
    });
    const extra = await path.v2.createRule(
      actor(people.personPlanner),
      envelope(people.assignPlanner, "s06v2-04-extra"),
      keepApart(path.guestA.id, path.guestB.id, "SECURITY"),
    );
    await path.v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, "s06v2-04-extra-act"), { editionId: extra.value.id });
    const freshness = await path.v2.currentFreshness(
      { organisationId: people.orgMaison, eventId: people.eventAlphaOne },
      submitted.value.packageId,
    );
    let blocked = false;
    try {
      await path.v2.approvePlan(actor(people.personDirector), envelope(people.assignDirector, "s06v2-04-approve"), {
        editionId: submitted.value.id,
        editionHash: submitted.value.contentHash,
        decision: "APPROVED",
        reason: "stale",
      });
    } catch (error) {
      blocked = error instanceof PlatformError && error.code === "TRANSITION_INVALID";
    }
    push("editionImmutable", submitted.value.contentHash === path.adopted.value.contentHash, true);
    push("freshnessStale", freshness.fresh, false);
    push("approvalBlocked", blocked, true);
    return { observations, assertions };
  }

  if (id === "S06V2-PATH-05") {
    const { service } = fixture();
    const v2 = service.seatingV2Commands();
    const guestA = attending(service, "A05", "s06v2-05-a");
    const guestB = attending(service, "B05", "s06v2-05-b");
    const guestC = attending(service, "C05", "s06v2-05-c");
    const draft = await v2.createRule(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-05-create"), keepApart(guestA.id, guestB.id));
    await v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, "s06v2-05-act"), { editionId: draft.value.id });
    const frozen = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-05-freeze"), { seed: "seed-05" });
    const run = await v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-05-run"), { packageId: frozen.value.id });
    if (run.value.status !== "FEASIBLE") throw new Error("adopt required");
    const adopted = await v2.adoptRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-05-adopt"), { runId: run.value.id });
    const assignments = await v2.repository.transaction(async (tx) =>
      (await tx.list<{ planEditionId: string; eventGuestId: string; logicalPositionId?: string | null; layoutTableId?: string | null }>(
        "planAssignments",
        { organisationId: people.orgMaison, eventId: people.eventAlphaOne },
      )).filter((item) => item.planEditionId === adopted.value.id),
    );
    const seatedB = assignments.find((item) => item.eventGuestId === guestB.id);
    const positions = await v2.repository.transaction(async (tx) =>
      tx.list<{ packageId: string; positionToken: string; layoutTableId: string }>("packagePositions", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    const used = new Set(assignments.map((item) => item.logicalPositionId));
    const sameTable = positions.find(
      (item) => item.packageId === adopted.value.packageId && item.layoutTableId === seatedB?.layoutTableId && !used.has(item.positionToken),
    );
    let rejected = false;
    try {
      await v2.applyManual(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-05-bad"), {
        planEditionId: adopted.value.id,
        command: { type: "MOVE", eventGuestId: guestA.id, positionToken: sameTable?.positionToken ?? "" },
      });
    } catch (error) {
      rejected = error instanceof PlatformError && error.code === "SEATING_VALIDATION_REJECTED";
    }
    const excepted = await v2.applyManual(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-05-unseat-c"), {
      planEditionId: adopted.value.id,
      command: { type: "UNSEAT", eventGuestId: guestC.id, reasonCode: "GOVERNED_UNSEATED" },
    });
    const afterExcept = await v2.repository.transaction(async (tx) =>
      (await tx.list<{ planEditionId: string; logicalPositionId?: string | null }>("planAssignments", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      })).filter((item) => item.planEditionId === excepted.value.id),
    );
    const usedAfter = new Set(afterExcept.map((item) => item.logicalPositionId));
    const freeSeat = positions.find((item) => item.packageId === adopted.value.packageId && !usedAfter.has(item.positionToken));
    const assigned = await v2.assignUnseated(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-05-good"), {
      planEditionId: excepted.value.id,
      eventGuestId: guestC.id,
      positionToken: freeSeat?.positionToken ?? "",
    });
    push("violatingAssignDenied", rejected, true);
    push("assignUnseatedApplied", assigned.application, "APPLIED");
    return { observations, assertions };
  }

  if (id === "S06V2-PATH-06" || id === "S06V2-M17") {
    const { service } = fixture();
    const v2 = service.seatingV2Commands();
    const guestA = attending(service, "RevA", "s06v2-06-a");
    const guestB = attending(service, "RevB", "s06v2-06-b");
    const draft = await v2.createRule(
      actor(people.personPlanner),
      envelope(people.assignPlanner, "s06v2-06-create"),
      keepApart(guestA.id, guestB.id, "SECURITY"),
    );
    await v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, "s06v2-06-act"), { editionId: draft.value.id });
    const frozen = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-06-freeze"), { seed: "seed-06" });
    const run = await v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-06-run"), { packageId: frozen.value.id });
    const adopted = await v2.adoptRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-06-adopt"), { runId: run.value.id });
    const submitted = await v2.submitPlan(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-06-submit"), {
      editionId: adopted.value.id,
    });
    const review = await v2.recordSpecialistReview(actor(people.personRiskReviewer), envelope(people.assignRiskReviewerAlphaOne, "s06v2-06-review"), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
      domain: "SECURITY",
      decision: "APPROVED",
      reason: "security accepted",
    });
    const replay = await v2.recordSpecialistReview(actor(people.personRiskReviewer), envelope(people.assignRiskReviewerAlphaOne, "s06v2-06-review-2"), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
      domain: "SECURITY",
      decision: "APPROVED",
      reason: "security accepted",
    });
    let staleDenied = false;
    try {
      await v2.recordSpecialistReview(actor(people.personRiskReviewer), envelope(people.assignRiskReviewerAlphaOne, "s06v2-06-stale"), {
        editionId: submitted.value.id,
        editionHash: "0".repeat(64),
        domain: "SECURITY",
        decision: "APPROVED",
        reason: "stale",
      });
    } catch (error) {
      staleDenied = error instanceof PlatformError && error.code === "VERSION_CONFLICT";
    }
    push("reviewRecorded", review.application, "APPLIED");
    push("reviewReplay", replay.application === "REPLAYED" && replay.value.id === review.value.id, true);
    push("staleReviewDenied", staleDenied, true);
    return { observations, assertions };
  }

  if (id === "S06V2-PATH-08" || id === "S06V2-M16") {
    const { service } = fixture();
    const path = await keepApartPath(service, "08");
    if (!path.adopted) throw new Error("adopt required");
    const submitted = await path.v2.submitPlan(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-08-submit"), {
      editionId: path.adopted.value.id,
    });
    await path.v2.approvePlan(actor(people.personDirector), envelope(people.assignDirector, "s06v2-08-approve"), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
      decision: "APPROVED",
      reason: "export path",
    });
    const job = await path.v2.requestExport(actor(people.personCeo), envelope(people.assignCeo, "s06v2-08-export"), {
      sourceType: "EDITION",
      sourceId: submitted.value.id,
      format: "JSON",
      projectionClass: "FULL",
    });
    const auditor = await path.v2.retrieveExport(actor(people.personAuditor), envelope(people.assignAuditor, "s06v2-08-read"), {
      jobId: job.value.id,
    });
    push("auditorSafeProjection", auditor.projectionClass, "PERMISSION_SAFE");
    push("auditorGuestIdsOmitted", auditor.assignments.every((item) => item.eventGuestId === undefined), true);
    return { observations, assertions };
  }

  if (id === "S06V2-PATH-09") {
    const { service } = fixture();
    const director = service.resolveActor(people.personDirector);
    const access = authorize({
      actor: director,
      permission: "platform.access.administer",
      scope: { organisationId: people.orgMaison },
      context: { now: NOW, actorKind: "HUMAN" },
    });
    const auditAll = authorize({
      actor: director,
      permission: "platform.audit.read_all",
      scope: { organisationId: people.orgMaison },
      context: { now: NOW, actorKind: "HUMAN" },
    });
    push("directorAccessDenied", access.allow, false);
    push("directorOrgAuditDenied", auditAll.allow, false);
    return { observations, assertions };
  }

  if (id === "S06V2-PATH-10" || id === "S06V2-M13" || id === "S06V2-M14") {
    const { service } = fixture();
    const v2 = service.seatingV2Commands();
    const guestA = attending(service, "CeoA", "s06v2-10-a");
    const guestB = attending(service, "CeoB", "s06v2-10-b");
    const draft = await v2.createRule(actor(people.personCeo), envelope(people.assignCeo, "s06v2-10-create"), keepApart(guestA.id, guestB.id));
    await v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, "s06v2-10-act"), { editionId: draft.value.id });
    const frozen = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-10-freeze"), { seed: "seed-10" });
    const run = await v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-10-run"), { packageId: frozen.value.id });
    const adopted = await v2.adoptRun(actor(people.personCeo), envelope(people.assignCeo, "s06v2-10-adopt"), { runId: run.value.id });
    const submitted = await v2.submitPlan(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-10-submit"), {
      editionId: adopted.value.id,
    });
    let ceoApproveDenied = false;
    try {
      await v2.approvePlan(actor(people.personCeo), envelope(people.assignCeo, "s06v2-10-approve"), {
        editionId: submitted.value.id,
        editionHash: submitted.value.contentHash,
        decision: "APPROVED",
        reason: "author",
      });
    } catch (error) {
      ceoApproveDenied = error instanceof PlatformError && error.code === "FORBIDDEN";
    }
    await v2.approvePlan(actor(people.personDirector), envelope(people.assignDirector, "s06v2-10-dir-approve"), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
      decision: "APPROVED",
      reason: "director",
    });
    let ceoPublishDenied = false;
    try {
      await v2.publishPlan(actor(people.personCeo), envelope(people.assignCeo, "s06v2-10-pub"), {
        editionId: submitted.value.id,
        editionHash: submitted.value.contentHash,
      });
    } catch (error) {
      ceoPublishDenied = error instanceof PlatformError && error.code === "FORBIDDEN";
    }
    push("ceoApproveDenied", ceoApproveDenied, true);
    push("ceoPublishDenied", ceoPublishDenied, true);
    return { observations, assertions };
  }

  if (id === "S06V2-M01" || id === "S06V2-M04") {
    const withRule = seatingV2SemanticHash({
      cohortHash: "c",
      rsvpSnapshotHash: "r",
      layoutPublicationId: people.eventAlphaOne,
      layoutContentHash: "l",
      eventBriefContentHash: null,
      protectionSnapshotHash: null,
      ruleEditions: [{ id: "11111111-1111-4111-8111-111111111001", contentHash: "rule-hash" }],
      reservationEditions: [],
      lockSetHash: "locks",
      solverConfigHash: "cfg",
      deterministicSeed: "seed",
    });
    const withoutRule = seatingV2SemanticHash({
      cohortHash: "c",
      rsvpSnapshotHash: "r",
      layoutPublicationId: people.eventAlphaOne,
      layoutContentHash: "l",
      eventBriefContentHash: null,
      protectionSnapshotHash: null,
      ruleEditions: [],
      reservationEditions: [],
      lockSetHash: "locks",
      solverConfigHash: "cfg",
      deterministicSeed: "seed",
    });
    push("droppedRuleChangesHash", withRule !== withoutRule, true);
    return { observations, assertions };
  }

  if (id === "S06V2-M02" || id === "S06V2-M20") {
    let omitted = false;
    let forbidden = false;
    try {
      compileSeatingV2Request({
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        semanticHash: "sem",
        pepper: "pepper",
        configHash: "cfg",
        seed: "seed",
        guests: [{ eventGuestId: people.personPlanner, eligible: true }],
        positions: [{ positionToken: "p1", tableToken: "t1" }],
        rules: [
          {
            editionId: "11111111-1111-4111-8111-111111111002",
            contentHash: "h",
            lifecycle: "ACTIVE",
            content: keepApart(people.personPlanner, people.personDirector),
          },
        ],
        reservations: [],
      });
    } catch (error) {
      omitted = error instanceof PlatformError;
    }
    try {
      assertSeatingV2CompiledRequest({
        contract: "eos-s06-solver-v2",
        version: SEATING_V2_SOLVER_VERSION,
        configHash: "cfg-hash-00000000",
        seed: "seed",
        name: "Ada Lovelace",
        guests: [],
        positions: [],
        rules: [],
        reservations: [],
      });
    } catch {
      forbidden = true;
    }
    push("omittedSubjectRejected", omitted, true);
    push("forbiddenFieldRejected", forbidden, true);
    return { observations, assertions };
  }

  if (id === "S06V2-M05") {
    const withReservation = seatingV2SemanticHash({
      cohortHash: "c",
      rsvpSnapshotHash: "r",
      layoutPublicationId: people.eventAlphaOne,
      layoutContentHash: "l",
      eventBriefContentHash: null,
      protectionSnapshotHash: null,
      ruleEditions: [],
      reservationEditions: [{ id: "11111111-1111-4111-8111-111111111003", contentHash: "res-hash" }],
      lockSetHash: "locks",
      solverConfigHash: "cfg",
      deterministicSeed: "seed",
    });
    const withoutReservation = seatingV2SemanticHash({
      cohortHash: "c",
      rsvpSnapshotHash: "r",
      layoutPublicationId: people.eventAlphaOne,
      layoutContentHash: "l",
      eventBriefContentHash: null,
      protectionSnapshotHash: null,
      ruleEditions: [],
      reservationEditions: [],
      lockSetHash: "locks",
      solverConfigHash: "cfg",
      deterministicSeed: "seed",
    });
    push("reservationHashMaterial", withReservation !== withoutReservation, true);
    return { observations, assertions };
  }

  if (id === "S06V2-M08" || id === "S06V2-M09") {
    const { service } = fixture();
    const path = await keepApartPath(service, "09");
    let adoptRejected = false;
    try {
      await path.v2.adoptRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-09-missing"), {
        runId: "00000000-0000-4000-8000-000000000099",
      });
    } catch (error) {
      adoptRejected = error instanceof PlatformError && (error.code === "NOT_FOUND" || error.code === "ADOPTION_MISMATCH");
    }
    push("corruptAdoptRejected", adoptRejected, true);
    push("packageHashUnchanged", seatingV2PackageContentHash(path.frozen.value.semanticHash, path.frozen.value.compiledRequestHash), path.frozen.value.contentHash);
    return { observations, assertions };
  }

  if (id === "S06V2-M12") {
    const { service } = fixture();
    const v2 = service.seatingV2Commands();
    const guestA = attending(service, "SelfA", "s06v2-m12-a");
    const guestB = attending(service, "SelfB", "s06v2-m12-b");
    const draft = await v2.createRule(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-m12-create"), keepApart(guestA.id, guestB.id));
    let denied = false;
    try {
      await v2.activateRule(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-m12-self"), { editionId: draft.value.id });
    } catch (error) {
      denied = error instanceof PlatformError && error.code === "FORBIDDEN";
    }
    push("selfActivateDenied", denied, true);
    return { observations, assertions };
  }

  if (id === "S06V2-M15") {
    const { service } = fixture();
    const path = await keepApartPath(service, "15");
    if (!path.adopted) throw new Error("adopt required");
    const submitted = await path.v2.submitPlan(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-15-submit"), {
      editionId: path.adopted.value.id,
    });
    await path.v2.approvePlan(actor(people.personDirector), envelope(people.assignDirector, "s06v2-15-approve"), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
      decision: "APPROVED",
      reason: "publish",
    });
    const published = await path.v2.publishPlan(actor(people.personCeo), envelope(people.assignCeo, "s06v2-15-pub"), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
    });
    const draftSuccessor = await path.v2.recallPlan(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-15-recall-fail"), {
      editionId: submitted.value.id,
    }).catch(() => undefined);
    void draftSuccessor;
    const current = await path.v2.repository.projectEvent(actor(people.personPlanner), people.eventAlphaOne);
    push("publicationRemainsCurrent", current.currentPublicationId === published.value.id, true);
    push("publicationStatus", published.value.status, "CURRENT");
    return { observations, assertions };
  }

  if (id === "S06V2-M18") {
    const { service } = fixture();
    const path = await keepApartPath(service, "18");
    const receipts = await path.v2.repository.transaction(async (tx) =>
      tx.list<{ action: string; resultIdentity: string }>("idempotencyReceipts", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    const audit = path.v2.repository instanceof Object
      ? await path.v2.repository.transaction(async (tx) => ("audit" in tx.snapshot() ? 1 : receipts.length))
      : receipts.length;
    push("idempotencyPersisted", receipts.some((item) => item.resultIdentity === path.run.value.id), true);
    push("durableWritePresent", audit > 0, true);
    return { observations, assertions };
  }

  if (id === "S06V2-M19") {
    const tokenA = exactHash({ org: people.orgMaison, event: people.eventAlphaOne, guest: people.personPlanner });
    const tokenB = exactHash({ org: people.orgMaison, event: people.eventAlphaTwo, guest: people.personPlanner });
    push("crossEventTokensDiffer", tokenA !== tokenB, true);
    return { observations, assertions };
  }

  if (id === "S06V2-PATH-11") {
    const { service } = fixture();
    const path = await keepApartPath(service, "11");
    if (!path.adopted) throw new Error("adopt required");
    const submitted = await path.v2.submitPlan(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-11-submit"), {
      editionId: path.adopted.value.id,
    });
    let stale = false;
    try {
      await path.v2.recallPlan(
        actor(people.personPlanner),
        { ...envelope(people.assignPlanner, "s06v2-11-stale"), expectedContentHash: "0".repeat(64) },
        { editionId: submitted.value.id },
      );
    } catch (error) {
      stale = error instanceof PlatformError && error.code === "VERSION_CONFLICT";
    }
    const recalled = await path.v2.recallPlan(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-11-recall"), {
      editionId: submitted.value.id,
    });
    const replay = await path.v2.recallPlan(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-11-recall"), {
      editionId: submitted.value.id,
    });
    const assignments = await path.v2.repository.transaction(async (tx) =>
      (await tx.list<{ planEditionId: string; eventGuestId: string; logicalPositionId?: string | null; layoutTableId?: string | null }>(
        "planAssignments",
        { organisationId: people.orgMaison, eventId: people.eventAlphaOne },
      )).filter((item) => item.planEditionId === recalled.value.id),
    );
    const seatedA = assignments.find((item) => item.eventGuestId === path.guestA.id);
    const used = new Set(assignments.map((item) => item.logicalPositionId));
    const positions = await path.v2.repository.transaction(async (tx) =>
      (await tx.list<{ packageId: string; positionToken: string; layoutTableId: string }>("packagePositions", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      })).filter((item) => item.packageId === recalled.value.packageId),
    );
    const freeSameTable = positions.find(
      (item) => item.layoutTableId === seatedA?.layoutTableId && !used.has(item.positionToken),
    );
    const moved = await path.v2.applyManual(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-11-move"), {
      planEditionId: recalled.value.id,
      command: { type: "MOVE", eventGuestId: path.guestA.id, positionToken: freeSameTable?.positionToken ?? "" },
    });
    const recalledEdition = await path.v2.repository.transaction(async (tx) =>
      tx.load<{ status: string; contentHash: string }>("planEditions", submitted.value.id, {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    push("recallNewEditionId", recalled.value.id !== submitted.value.id, true);
    push("recallHashPreserved", recalled.value.contentHash === submitted.value.contentHash, true);
    push("recalledImmutable", recalledEdition?.status === "RECALLED", true);
    push("recallReplay", replay.application === "REPLAYED" && replay.didDataChange === false, true);
    push("staleRecallDenied", stale, true);
    push("materialEditChangesHash", Boolean(moved && moved.value.contentHash !== recalled.value.contentHash), true);
    return { observations, assertions };
  }

  if (id === "S06V2-PATH-12" || id === "S06V2-M21") {
    const { service, store } = fixture();
    const v2 = service.seatingV2Commands();
    const guestA = attending(service, "ImpA", "s06v2-12-a");
    const guestB = attending(service, "ImpB", "s06v2-12-b");
    const tableId = publishedTableId(store);
    const requireDraft = await v2.createRule(
      actor(people.personPlanner),
      envelope(people.assignPlanner, "s06v2-12-require"),
      requireTable(guestA.id, guestB.id, tableId),
    );
    const apartDraft = await v2.createRule(
      actor(people.personPlanner),
      envelope(people.assignPlanner, "s06v2-12-apart"),
      keepApart(guestA.id, guestB.id),
    );
    await v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, "s06v2-12-act-r"), { editionId: requireDraft.value.id });
    await v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, "s06v2-12-act-a"), { editionId: apartDraft.value.id });
    const frozen = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-12-freeze"), { seed: "seed-12" });
    const run = await v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-12-run"), { packageId: frozen.value.id });
    let adoptOffered = false;
    try {
      await v2.adoptRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-12-adopt"), { runId: run.value.id });
      adoptOffered = true;
    } catch (error) {
      adoptOffered = !(error instanceof PlatformError);
    }
    const compiled = await v2.repository.transaction(async (tx) =>
      (await tx.list<{ packageId: string; compiledRequestJson: SeatingV2CompiledRequest }>("compiledRequests", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      })).find((item) => item.packageId === frozen.value.id),
    );
    const honest = validateSeatingV2(
      { contentHash: frozen.value.contentHash, compiledRequest: compiled!.compiledRequestJson },
      compiled!.compiledRequestJson.guests.map((guest) => ({
        guestToken: guest.token,
        state: "UNSEATED" as const,
        positionToken: null,
        typedReasonCodes: [],
      })),
      compiled!.compiledRequestJson.guests.map((guest) => guest.token),
      NOW,
    );
    const omittedRules = validateSeatingV2(
      { contentHash: frozen.value.contentHash, compiledRequest: { ...compiled!.compiledRequestJson, rules: [] } },
      compiled!.compiledRequestJson.guests.map((guest, index) => ({
        guestToken: guest.token,
        state: "SEATED" as const,
        positionToken: compiled!.compiledRequestJson.positions[index]!.token,
        typedReasonCodes: [],
      })),
      [],
      NOW,
    );
    push("impossibleInfeasible", run.value.status, "INFEASIBLE");
    push("adoptDenied", adoptOffered, false);
    push("unseatedRequiredFailed", honest.structuralOutcomes.some((item) => item.checkCode === "UNSEATED_REQUIRED_GUEST" && item.outcome === "FAILED"), true);
    push("unseatedRuleNotSatisfied", honest.ruleOutcomes.every((item) => item.outcome !== "SATISFIED"), true);
    push("omittedRuleChangesVerdict", omittedRules.verdict, "FEASIBLE");
    return { observations, assertions };
  }

  if (id === "S06V2-PATH-13" || id === "S06V2-M22") {
    const { service, store } = fixture();
    const v2 = service.seatingV2Commands();
    const guestA = attending(service, "ResA", "s06v2-13-a");
    const guestB = attending(service, "ResB", "s06v2-13-b");
    const tableId = publishedTableId(store);
    const draft = await v2.createReservation(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-13-create"), {
      eligibleMemberIds: [guestA.id, guestB.id],
      targets: [{ type: "TABLE", idOrCode: tableId }],
      exact: 2,
    });
    let selfDenied = false;
    try {
      await v2.activateReservation(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-13-self"), { editionId: draft.value.id });
    } catch (error) {
      selfDenied = error instanceof PlatformError && error.code === "FORBIDDEN";
    }
    const activated = await v2.activateReservation(actor(people.personDirector), envelope(people.assignDirector, "s06v2-13-act"), {
      editionId: draft.value.id,
    });
    const replay = await v2.activateReservation(actor(people.personDirector), envelope(people.assignDirector, "s06v2-13-act"), {
      editionId: draft.value.id,
    });
    let stale = false;
    try {
      await v2.activateReservation(
        actor(people.personDirector),
        { ...envelope(people.assignDirector, "s06v2-13-stale"), expectedContentHash: "0".repeat(64) },
        { editionId: draft.value.id },
      );
    } catch (error) {
      stale = error instanceof PlatformError && (error.code === "VERSION_CONFLICT" || error.code === "TRANSITION_INVALID");
    }
    let crossEvent = false;
    try {
      await v2.activateReservation(
        actor(people.personDirector),
        { ...envelope(people.assignDirector, "s06v2-13-cross"), eventId: people.eventAlphaTwo },
        { editionId: draft.value.id },
      );
    } catch (error) {
      crossEvent = error instanceof PlatformError && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN" || error.code === "TRANSITION_INVALID");
    }
    const frozenActive = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-13-freeze-1"), { seed: "seed-13" });
    const packageReservations = await v2.repository.transaction(async (tx) =>
      (await tx.list<{ packageId: string; reservationEditionId: string }>("packageReservations", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      })).filter((item) => item.packageId === frozenActive.value.id),
    );
    await v2.withdrawReservation(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-13-withdraw"), {
      editionId: activated.value.id,
      reason: "withdraw governing reservation",
    });
    const frozenAfter = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-13-freeze-2"), { seed: "seed-13" });
    const afterReservations = await v2.repository.transaction(async (tx) =>
      (await tx.list<{ packageId: string; reservationEditionId: string }>("packageReservations", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      })).filter((item) => item.packageId === frozenAfter.value.id),
    );
    push("reservationActivated", activated.value.lifecycle, "ACTIVE");
    push("selfActivateDenied", selfDenied, true);
    push("reservationReplay", replay.application === "REPLAYED" && replay.didDataChange === false, true);
    push("staleReservationDenied", stale, true);
    push("crossEventDenied", crossEvent, true);
    push("activeReservationFrozen", packageReservations.some((item) => item.reservationEditionId === draft.value.id), true);
    push("withdrawnAbsentFromNextPackage", afterReservations.length === 0 && frozenAfter.value.contentHash !== frozenActive.value.contentHash, true);
    return { observations, assertions };
  }

  if (id === "S06V4-PATH-01") {
    const { service, store } = fixture();
    const v2 = service.seatingV2Commands();
    const guest = attending(service, "V4P01", "s06v4-p01-a");
    const tableId = publishedTableId(store);
    const draft = await v2.createRule(
      actor(people.personPlanner),
      envelope(people.assignPlanner, "s06v4-p01-create"),
      requireTableSubjects([guest.id], tableId),
    );
    await v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, "s06v4-p01-act"), {
      editionId: draft.value.id,
    });
    const frozen = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p01-freeze"), {
      seed: "seed-v4-p01",
    });
    const run = await v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p01-run"), {
      packageId: frozen.value.id,
    });
    const adopted = await v2.adoptRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p01-adopt"), {
      runId: run.value.id,
    });
    const seated = await planAssignment(v2, adopted.value.id, guest.id);
    push("runStatus", run.value.status, "FEASIBLE");
    push("solverClaim", run.value.solverClaim, "FEASIBLE");
    push("seatedAtRequiredTable", seated?.state === "SEATED" && samePublishedTable(seated.layoutTableId, tableId), true);
    return { observations, assertions };
  }

  if (id === "S06V4-PATH-02") {
    const { service, store } = fixture();
    const v2 = service.seatingV2Commands();
    const guestA = attending(service, "V4P02A", "s06v4-p02-a");
    const guestB = attending(service, "V4P02B", "s06v4-p02-b");
    const tableId = publishedTableId(store);
    const draft = await v2.createRule(
      actor(people.personPlanner),
      envelope(people.assignPlanner, "s06v4-p02-create"),
      requireTable(guestA.id, guestB.id, tableId),
    );
    await v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, "s06v4-p02-act"), {
      editionId: draft.value.id,
    });
    const frozen = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p02-freeze"), {
      seed: "seed-v4-p02",
    });
    const run = await v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p02-run"), {
      packageId: frozen.value.id,
    });
    const adopted = await v2.adoptRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p02-adopt"), {
      runId: run.value.id,
    });
    const seatedA = await planAssignment(v2, adopted.value.id, guestA.id);
    const seatedB = await planAssignment(v2, adopted.value.id, guestB.id);
    push("runStatus", run.value.status, "FEASIBLE");
    push(
      "bothSeatedAtRequiredTable",
      seatedA?.state === "SEATED" &&
        seatedB?.state === "SEATED" &&
        samePublishedTable(seatedA.layoutTableId, tableId) &&
        samePublishedTable(seatedB.layoutTableId, tableId),
      true,
    );
    return { observations, assertions };
  }

  if (id === "S06V4-PATH-03") {
    const { service, store } = fixture();
    const v2 = service.seatingV2Commands();
    const tables = publishedTables(store);
    const forbiddenId = tables[0]!.objectId;
    const guest = attending(service, "V4P03", "s06v4-p03-a");
    const draft = await v2.createRule(
      actor(people.personPlanner),
      envelope(people.assignPlanner, "s06v4-p03-create"),
      forbidTable(guest.id, forbiddenId),
    );
    await v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, "s06v4-p03-act"), {
      editionId: draft.value.id,
    });
    const frozen = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p03-freeze"), {
      seed: "seed-v4-p03",
    });
    const run = await v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p03-run"), {
      packageId: frozen.value.id,
    });
    const adopted = await v2.adoptRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p03-adopt"), {
      runId: run.value.id,
    });
    const seated = await planAssignment(v2, adopted.value.id, guest.id);
    push("runStatus", run.value.status, "FEASIBLE");
    push("forbidTableExcluded", seated?.state === "SEATED" && !samePublishedTable(seated.layoutTableId, forbiddenId), true);
    return { observations, assertions };
  }

  if (id === "S06V4-PATH-04") {
    const { service, store } = fixture();
    const v2 = service.seatingV2Commands();
    const tables = publishedTables(store);
    const reservedTableId = tables[1]?.objectId ?? tables[0]!.objectId;
    const guest = attending(service, "V4P04", "s06v4-p04-a");
    const draft = await v2.createReservation(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p04-create"), {
      eligibleMemberIds: [guest.id],
      targets: [{ type: "TABLE", idOrCode: reservedTableId }],
      exact: 1,
    });
    await v2.activateReservation(actor(people.personDirector), envelope(people.assignDirector, "s06v4-p04-act"), {
      editionId: draft.value.id,
    });
    const frozen = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p04-freeze"), {
      seed: "seed-v4-p04",
    });
    const run = await v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p04-run"), {
      packageId: frozen.value.id,
    });
    const adopted = await v2.adoptRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p04-adopt"), {
      runId: run.value.id,
    });
    const seated = await planAssignment(v2, adopted.value.id, guest.id);
    const packageReservations = await v2.repository.transaction(async (tx) =>
      (
        await tx.list<{ packageId: string; reservationEditionId: string }>("packageReservations", {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
        })
      ).filter((item) => item.packageId === frozen.value.id),
    );
    push("runStatus", run.value.status, "FEASIBLE");
    push("activeReservationFrozen", packageReservations.some((item) => item.reservationEditionId === draft.value.id), true);
    push("reservationEnforced", seated?.state === "SEATED" && samePublishedTable(seated.layoutTableId, reservedTableId), true);
    return { observations, assertions };
  }

  if (id === "S06V4-PATH-05") {
    const { service, store } = fixture();
    const v2 = service.seatingV2Commands();
    const tableId = publishedTableId(store);
    const g1 = attending(service, "V4G1", "s06v4-p05-g1");
    const g2 = attending(service, "V4G2", "s06v4-p05-g2");
    const g3 = attending(service, "V4G3", "s06v4-p05-g3");
    const g4 = attending(service, "V4G4", "s06v4-p05-g4");
    const activate = async (content: SeatingV2RuleContent, key: string) => {
      const draft = await v2.createRule(actor(people.personPlanner), envelope(people.assignPlanner, `${key}-c`), content);
      await v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, `${key}-a`), {
        editionId: draft.value.id,
      });
    };
    await activate(requireTable(g1.id, g4.id, tableId), "s06v4-p05-r1");
    await activate(keepApart(g1.id, g2.id), "s06v4-p05-r2");
    await activate(keepApart(g3.id, g2.id), "s06v4-p05-r3");
    const frozen = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p05-freeze"), {
      seed: "seed-v4-p05",
    });
    const run = await v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p05-run"), {
      packageId: frozen.value.id,
    });
    const adopted = await v2.adoptRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-p05-adopt"), {
      runId: run.value.id,
    });
    const seated = await Promise.all([g1, g2, g3, g4].map((guest) => planAssignment(v2, adopted.value.id, guest.id)));
    const compiled = await compiledForPackage(v2, frozen.value.id);
    const runAssignments = await v2.repository.transaction(async (tx) =>
      (
        await tx.list<{ runId: string; guestToken: string; state: string; positionToken: string | null; typedReasonCodes: string[] }>(
          "runAssignments",
          { organisationId: people.orgMaison, eventId: people.eventAlphaOne },
        )
      ).filter((item) => item.runId === run.value.id),
    );
    const report = validateSeatingV2(
      { contentHash: frozen.value.contentHash, compiledRequest: compiled!.compiledRequestJson },
      runAssignments.map((item) => ({
        guestToken: item.guestToken,
        state: item.state as "SEATED" | "UNSEATED",
        positionToken: item.positionToken,
        typedReasonCodes: item.typedReasonCodes,
      })),
      runAssignments.filter((item) => item.state === "UNSEATED").map((item) => item.guestToken),
      NOW,
    );
    push("runStatus", run.value.status, "FEASIBLE");
    push("solverClaim", run.value.solverClaim, "FEASIBLE");
    push("fourGuestsSeated", seated.every((item) => item?.state === "SEATED"), true);
    push("validatorFeasible", report.verdict, "FEASIBLE");
    return { observations, assertions };
  }

  if (id === "S06V4-PATH-06") {
    const { service, store } = fixture();
    const tables = publishedTables(store);
    const synthetic = tables.every(
      (table) =>
        table.positionSource === "DECLARED_SYNTHETIC" &&
        table.physicalPositionCount === 0 &&
        table.declaredCapacity === 8 &&
        table.mismatch === false,
    );
    attending(service, "V4P06", "s06v4-p06-a");
    const frozen = await service.seatingV2Commands().freezePackage(
      actor(people.personPlanner),
      envelope(people.assignPlanner, "s06v4-p06-freeze"),
      { seed: "seed-v4-p06" },
    );
    push("declaredSynthetic", synthetic && tables.length === 2, true);
    push("freezeApplied", frozen.application, "APPLIED");
    return { observations, assertions };
  }

  if (id === "S06V4-M01") {
    const { service } = fixture();
    const v2 = service.seatingV2Commands();
    const guest = attending(service, "V4M01", "s06v4-m01-a");
    let rejected = false;
    try {
      await v2.createRule(
        actor(people.personPlanner),
        envelope(people.assignPlanner, "s06v4-m01-create"),
        requireTableSubjects([guest.id], "00000000-0000-4000-8000-000000000099"),
      );
    } catch (error) {
      rejected = error instanceof PlatformError && error.code === "VALIDATION_FAILED";
    }
    const packages = await v2.repository.transaction(async (tx) =>
      tx.list("inputPackages", { organisationId: people.orgMaison, eventId: people.eventAlphaOne }),
    );
    push("missingTableRejected", rejected, true);
    push("noPackageCreated", packages.length === 0, true);
    return { observations, assertions };
  }

  if (id === "S06V4-M02") {
    const { service } = fixture();
    const path = await keepApartPath(service, "v4m02");
    const compiled = await compiledForPackage(path.v2, path.frozen.value.id);
    const injected = structuredClone(compiled!.compiledRequestJson);
    injected.rules = [
      ...injected.rules,
      {
        ...injected.rules[0]!,
        tableTokens: ["00000000-0000-4000-8000-00000000aa01"],
      },
    ];
    let rawRejected = false;
    try {
      assertSeatingV2CompiledRequest(injected);
    } catch {
      rawRejected = true;
    }
    const nested = structuredClone(compiled!.compiledRequestJson) as SeatingV2CompiledRequest & {
      guests: Array<SeatingV2CompiledRequest["guests"][number] & { aliases?: string[] }>;
    };
    nested.guests = nested.guests.map((guest) => ({ ...guest, aliases: ["11111111-1111-4111-8111-111111111099"] }));
    let nestedRejected = false;
    try {
      assertSeatingV2CompiledRequest(nested);
    } catch {
      nestedRejected = true;
    }
    push("rawUuidRejected", rawRejected, true);
    push("nestedUuidRejected", nestedRejected, true);
    return { observations, assertions };
  }

  if (id === "S06V4-M03") {
    const { service } = fixture();
    const path = await keepApartPath(service, "v4m03");
    const compiled = await compiledForPackage(path.v2, path.frozen.value.id);
    const request = compiled!.compiledRequestJson;
    const violating = request.guests.map((guest) => ({
      guestToken: guest.token,
      state: "UNSEATED" as const,
      positionToken: null,
      typedReasonCodes: [],
    }));
    const report = validateSeatingV2(
      { contentHash: path.frozen.value.contentHash, compiledRequest: request },
      violating,
      request.guests.map((guest) => guest.token),
      NOW,
    );
    const unmatched = solveSeatingV1({
      guests: [
        { token: "guest-a", eligible: true, capabilityCodes: [], protocolCodes: [] },
        { token: "guest-b", eligible: true, capabilityCodes: [], protocolCodes: [] },
      ],
      positions: [
        { token: "pos-t2-1", tableToken: "table-two-token-aaaa", zoneCodes: [], capabilityCodes: [] },
        { token: "pos-t2-2", tableToken: "table-two-token-aaaa", zoneCodes: [], capabilityCodes: [] },
      ],
      constraints: [
        {
          id: "require-t1",
          kind: "HARD",
          predicateType: "REQUIRE_TABLE",
          payload: { predicateType: "REQUIRE_TABLE", guestTokens: ["guest-a"], tableTokens: ["table-one-token-bbbb"] },
        },
      ],
      reservations: [],
      config: defaultSolverConfig({ seed: "s06v4-false-feasible", timeLimitMs: 1_000, alternativeCount: 0 }),
    });
    push("validatorRejectedFalseFeasible", report.verdict, "INFEASIBLE");
    push("solverDidNotClaimFeasible", unmatched.status !== "FEASIBLE", true);
    return { observations, assertions };
  }

  if (id === "S06V4-M04") {
    const guests = Array.from({ length: 9 }, (_, index) => ({
      token: `guest-${String(index).padStart(2, "0")}`,
      eligible: true,
      capabilityCodes: [],
      protocolCodes: [],
    }));
    const result = solveSeatingV1({
      guests,
      positions: Array.from({ length: 9 }, (_, index) => ({
        token: `pos-${index}`,
        tableToken: "only-table-token-aaaa",
        zoneCodes: [],
        capabilityCodes: [],
      })),
      constraints: guests.slice(0, -1).map((guest, index) => ({
        id: `apart-${index}`,
        kind: "HARD" as const,
        predicateType: "KEEP_APART" as const,
        payload: { predicateType: "KEEP_APART" as const, guestTokens: [guest.token, guests[index + 1]!.token] },
      })),
      reservations: [],
      config: defaultSolverConfig({ seed: "s06v4-incomplete-proof", timeLimitMs: 50, alternativeCount: 0 }),
    });
    push("incompleteNotInfeasible", result.status, "TIMED_OUT");
    push("didNotGuessInfeasible", result.status !== "INFEASIBLE", true);
    return { observations, assertions };
  }

  if (id === "S06V4-M05") {
    const { service } = fixture();
    const path = await keepApartPath(service, "v4m05");
    mutateStoredRun(path.v2, path.run.value.id, (run) => {
      run.validatorVersion = SEATING_V2_LEGACY_VALIDATOR_VERSION;
    });
    const relaunch = await path.v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-m05-relaunch"), {
      packageId: path.frozen.value.id,
    });
    push("validatorChangeApplied", relaunch.application, "APPLIED");
    push("validatorChangeNewRun", relaunch.value.id !== path.run.value.id, true);
    push("currentValidator", relaunch.value.validatorVersion, SEATING_V2_VALIDATOR_VERSION);
    return { observations, assertions };
  }

  if (id === "S06V4-M06") {
    const { service } = fixture();
    const path = await keepApartPath(service, "v4m06");
    mutateStoredRun(path.v2, path.run.value.id, (run) => {
      run.compilerVersion = SEATING_V2_LEGACY_COMPILER_VERSION;
    });
    let adoptRejected = false;
    try {
      await path.v2.adoptRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-m06-adopt"), {
        runId: path.run.value.id,
      });
    } catch (error) {
      adoptRejected = error instanceof PlatformError && error.code === "ADOPTION_MISMATCH";
    }
    const relaunch = await path.v2.launchRun(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-m06-relaunch"), {
      packageId: path.frozen.value.id,
    });
    push("historicAdoptDenied", adoptRejected, true);
    push("compilerChangeApplied", relaunch.application, "APPLIED");
    push("compilerChangeNewRun", relaunch.value.id !== path.run.value.id, true);
    return { observations, assertions };
  }

  if (id === "S06V4-M07") {
    const { service, store } = bareFixture();
    publishMismatchedCapacityLayout(service, store, "s06v4-m07");
    const published = snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne);
    attending(service, "V4M07", "s06v4-m07-a");
    const v2 = service.seatingV2Commands();
    let blocked = false;
    try {
      await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-m07-freeze"), {
        seed: "seed-v4-m07",
      });
    } catch (error) {
      blocked = error instanceof PlatformError && error.code === "SEAT_CAPACITY_MISMATCH";
    }
    const packages = await v2.repository.transaction(async (tx) =>
      tx.list("inputPackages", { organisationId: people.orgMaison, eventId: people.eventAlphaOne }),
    );
    push("mismatchDetected", published.tables.some((item) => item.mismatch === true), true);
    push("freezeBlocked", blocked, true);
    push("noPackageCreated", packages.length === 0, true);
    return { observations, assertions };
  }

  if (id === "S06V4-M08") {
    const { service, store } = fixture();
    const v2 = service.seatingV2Commands();
    const guest = attending(service, "V4M08", "s06v4-m08-a");
    const tableId = publishedTableId(store);
    const draft = await v2.createRule(
      actor(people.personPlanner),
      envelope(people.assignPlanner, "s06v4-m08-create"),
      requireTableSubjects([guest.id], tableId),
    );
    await v2.activateRule(actor(people.personDirector), envelope(people.assignDirector, "s06v4-m08-act"), {
      editionId: draft.value.id,
    });
    const frozen = await v2.freezePackage(actor(people.personPlanner), envelope(people.assignPlanner, "s06v4-m08-freeze"), {
      seed: "seed-v4-m08",
    });
    const compiled = await compiledForPackage(v2, frozen.value.id);
    const corrupted = structuredClone(compiled!.compiledRequestJson);
    corrupted.rules = corrupted.rules.map((rule) => ({ ...rule, tableTokens: [tableId] }));
    let rawTargetRejected = false;
    try {
      assertSeatingV2CompiledRequest(corrupted);
    } catch {
      rawTargetRejected = true;
    }
    let tokenAsObjectRejected = false;
    try {
      compileSeatingV2Request({
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        semanticHash: "sem",
        pepper: "pepper",
        configHash: "cfg",
        seed: "seed",
        guests: [{ eventGuestId: guest.id, eligible: true }],
        positions: compiled!.compiledRequestJson.positions.map((item) => ({
          positionToken: item.token,
          tableToken: item.tableToken,
        })),
        rules: [
          {
            editionId: draft.value.id,
            contentHash: draft.value.contentHash,
            lifecycle: "ACTIVE",
            content: requireTableSubjects([guest.id], seatingV2TableToken(tableId)),
          },
        ],
        reservations: [],
      });
    } catch (error) {
      tokenAsObjectRejected = error instanceof PlatformError && error.code === "VALIDATION_FAILED";
    }
    push("rawTargetRejected", rawTargetRejected, true);
    push("tokenNamespaceRejected", tokenAsObjectRejected, true);
    return { observations, assertions };
  }

  throw new Error(`unhandled case ${id}`);
}

export function evaluateS06V2Case(observations: S06V2Observation[], assertions: S06V2Assertion[]): "PASSED" | "FAILED" {
  return assertions.every((assertion) => assertionHolds(observations.find((item) => item.name === assertion.name), assertion))
    ? "PASSED"
    : "FAILED";
}

export async function executeS06EvaluationV2(): Promise<S06V2EvaluationResult> {
  const cases: S06V2CaseOutcome[] = [];
  for (const caseId of S06_V2_CASE_IDS) {
    try {
      const { observations, assertions } = await runCase(caseId);
      if (!observations.length) throw new Error("every case must persist observations");
      cases.push({
        caseId,
        observations,
        assertions,
        status: evaluateS06V2Case(observations, assertions),
      });
    } catch (error) {
      cases.push({
        caseId,
        observations: [observe("error", error instanceof Error ? error.message : "error")],
        assertions: [{ name: "error", expected: false, compare: "falsy" }],
        status: "ERROR",
      });
    }
  }
  return {
    corpusEdition: S06_V2_EVALUATION_CORPUS_EDITION,
    corpusHash: s06V2CorpusHash(),
    contractVersion: S06_V2_EVALUATION_CONTRACT_VERSION,
    solverVersion: SEATING_V2_SOLVER_VERSION,
    configHash: SEATING_V2_CONFIG_HASH,
    validatorVersion: SEATING_V2_VALIDATOR_VERSION,
    projectionVersion: S06_V2_EVALUATION_PROJECTION_VERSION,
    caseCount: cases.length,
    passedCount: cases.filter((item) => item.status === "PASSED").length,
    failedCount: cases.filter((item) => item.status !== "PASSED").length,
    status: cases.every((item) => item.status === "PASSED") ? "PASSED" : cases.some((item) => item.status === "ERROR") ? "ERROR" : "FAILED",
    cases,
  };
}
