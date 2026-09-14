import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { MemorySeatingV2Repository } from "../src/memory-seating-v2-store.js";
import { applyS06SeatingLayoutIfMissing, ensureS06SeatingLayoutBinding } from "../src/seating-fixtures.js";
import type { SeatingV2RuleContent } from "../src/seating-v2-schemas.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-12T19:00:00.000Z";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "s072-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "s072-director" });
}
function ceo() {
  return actor(people.personCeo, { now: NOW, correlationId: "s072-ceo" });
}

function envelope(assignmentId: string, key: string) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: assignmentId,
    idempotencyKey: key,
  };
}

function cas(
  assignmentId: string,
  key: string,
  row: { contentHash: string; editionNo?: number; version?: number },
) {
  const expectedVersion = row.version ?? row.editionNo;
  assert.ok(typeof expectedVersion === "number" && expectedVersion >= 1);
  return {
    ...envelope(assignmentId, key),
    expectedVersion,
    expectedContentHash: row.contentHash,
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

async function prepareSurface(service: ReturnType<typeof fixtureService>["service"], store: ReturnType<typeof fixtureService>["store"]) {
  applyS06SeatingLayoutIfMissing(store, service);
  await ensureS06SeatingLayoutBinding(store, service);
  service.prepareEventRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: "Alpha One",
    reason: "prepare RSVP for S072",
    idempotencyKey: "s072-prepare-rsvp-01",
  });
}

function attendingGuest(service: ReturnType<typeof fixtureService>["service"], givenName: string, key: string) {
  const guest = service.intakeGuest(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName,
    familyName: "Seated",
    email: `${givenName.toLowerCase()}.seated@example.test`,
    reason: "S072 attending guest",
    idempotencyKey: `${key}-intake`,
  });
  service.staffEnterRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    guestId: guest.id,
    attendanceIntent: "ATTENDING",
    answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
    reason: "mark attending for S072",
    idempotencyKey: `${key}-rsvp`,
  });
  return guest;
}

describe("EOS-S06 V2 command path", () => {
  it("HARD KEEP_APART: create → independent activate → freeze → solve → validate → adopt → submit → approve → CEO publish", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Ada", "s072-ka-a");
    const guestB = attendingGuest(service, "Bisi", "s072-ka-b");
    const v2 = service.seatingV2Commands();

    const created = await v2.createRule(planner(), envelope(people.assignPlanner, "s072-ka-create-01"), keepApart(guestA.id, guestB.id));
    assert.equal(created.application, "APPLIED");
    assert.equal(created.value.lifecycle, "DRAFT");

    await assert.rejects(
      () => v2.activateRule(planner(), envelope(people.assignPlanner, "s072-ka-self-act-01"), { editionId: created.value.id }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );

    const activated = await v2.activateRule(director(), cas(people.assignDirector, "s072-ka-activate-01", created.value), {
      editionId: created.value.id,
    });
    assert.equal(activated.value.lifecycle, "ACTIVE");
    assert.equal(activated.value.id, created.value.id);
    assert.equal(activated.value.contentHash, created.value.contentHash);

    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s072-ka-freeze-01"), { seed: "seed-keep-apart" });
    assert.equal(frozen.application, "APPLIED");
    const refrozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s072-ka-freeze-02"), { seed: "seed-keep-apart" });
    assert.equal(refrozen.application, "REPLAYED");
    assert.equal(refrozen.value.id, frozen.value.id);

    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "s072-ka-run-01"), { packageId: frozen.value.id });
    assert.equal(run.value.status, "FEASIBLE");
    assert.ok(run.value.solverClaim);
    const replay = await v2.launchRun(planner(), envelope(people.assignPlanner, "s072-ka-run-02"), { packageId: frozen.value.id });
    assert.equal(replay.application, "REPLAYED");
    assert.equal(replay.value.id, run.value.id);
    assert.equal(replay.didDataChange, false);

    const adopted = await v2.adoptRun(planner(), envelope(people.assignPlanner, "s072-ka-adopt-01"), { runId: run.value.id });
    assert.equal(adopted.value.status, "WORKING");
    const assignments = await v2.repository.transaction(async (tx) =>
      (await tx.list<{ planEditionId: string; eventGuestId: string; state: string; layoutTableId?: string | null }>("planAssignments", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      })).filter((item) => item.planEditionId === adopted.value.id),
    );
    const seatedA = assignments.find((item) => item.eventGuestId === guestA.id);
    const seatedB = assignments.find((item) => item.eventGuestId === guestB.id);
    assert.equal(seatedA?.state, "SEATED");
    assert.equal(seatedB?.state, "SEATED");
    assert.ok(seatedA?.layoutTableId);
    assert.ok(seatedB?.layoutTableId);
    assert.notEqual(seatedA?.layoutTableId, seatedB?.layoutTableId);

    const submitted = await v2.submitPlan(planner(), cas(people.assignPlanner, "s072-ka-submit-01", adopted.value), { editionId: adopted.value.id });
    assert.equal(submitted.value.status, "SUBMITTED");

    const approved = await v2.approvePlan(director(), cas(people.assignDirector, "s072-ka-approve-01", submitted.value), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
      decision: "APPROVED",
      reason: "KEEP_APART satisfied",
    });
    assert.equal(approved.value.decision, "APPROVED");

    const approvedEdition = {
      contentHash: submitted.value.contentHash,
      version: submitted.value.version + 1,
    };

    await assert.rejects(
      () =>
        v2.publishPlan(director(), cas(people.assignDirector, "s072-ka-dir-pub-01", approvedEdition), {
          editionId: submitted.value.id,
          editionHash: submitted.value.contentHash,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );

    const published = await v2.publishPlan(ceo(), cas(people.assignCeo, "s072-ka-pub-01", approvedEdition), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
    });
    assert.equal(published.application, "APPLIED");
    assert.equal(published.value.status, "CURRENT");
    const republished = await v2.publishPlan(ceo(), cas(people.assignCeo, "s072-ka-pub-02", approvedEdition), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
    });
    assert.equal(republished.application, "REPLAYED");
    assert.equal(republished.value.id, published.value.id);
    assert.equal(republished.value.publishedAt, published.value.publishedAt);
  });

  it("rejects HARD self-activation, DRAFT governance, stale replay after rule change, and violating assign", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Chioma", "s072-neg-a");
    const guestB = attendingGuest(service, "Dami", "s072-neg-b");
    const guestC = attendingGuest(service, "ChiomaC", "s072-neg-c");
    const v2 = service.seatingV2Commands();

    const draft = await v2.createRule(planner(), envelope(people.assignPlanner, "s072-neg-create-01"), keepApart(guestA.id, guestB.id));
    const frozenDraft = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s072-neg-freeze-draft"), { seed: "seed-neg" });
    const firstRules = await v2.repository.transaction(async (tx) =>
      (await tx.list<{ packageId: string }>("packageRules", { organisationId: people.orgMaison, eventId: people.eventAlphaOne })).filter(
        (item) => item.packageId === frozenDraft.value.id,
      ),
    );
    assert.equal(firstRules.length, 0);

    const activated = await v2.activateRule(director(), cas(people.assignDirector, "s072-neg-act-01", draft.value), { editionId: draft.value.id });
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s072-neg-freeze-01"), { seed: "seed-neg" });
    assert.notEqual(frozen.value.contentHash, frozenDraft.value.contentHash);
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "s072-neg-run-01"), { packageId: frozen.value.id });
    assert.equal(run.value.status, "FEASIBLE");

    await v2.withdrawRule(planner(), cas(people.assignPlanner, "s072-neg-withdraw-01", activated.value), {
      editionId: activated.value.id,
      reason: "replace KEEP_APART",
    });
    const successor = await v2.createRule(
      planner(),
      envelope(people.assignPlanner, "s072-neg-create-02"),
      keepApart(guestA.id, guestB.id, "SECURITY"),
    );
    await v2.activateRule(director(), cas(people.assignDirector, "s072-neg-act-02", successor.value), { editionId: successor.value.id });
    const frozen2 = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s072-neg-freeze-02"), { seed: "seed-neg" });
    assert.notEqual(frozen2.value.contentHash, frozen.value.contentHash);
    const run2 = await v2.launchRun(planner(), envelope(people.assignPlanner, "s072-neg-run-02"), { packageId: frozen2.value.id });
    assert.notEqual(run2.value.id, run.value.id);
    const staleReplay = await v2.launchRun(planner(), envelope(people.assignPlanner, "s072-neg-run-03"), { packageId: frozen.value.id });
    assert.equal(staleReplay.value.id, run.value.id);

    const adopted = await v2.adoptRun(planner(), envelope(people.assignPlanner, "s072-neg-adopt-01"), { runId: run2.value.id });
    const assignments = await v2.repository.transaction(async (tx) =>
      (await tx.list<{
        planEditionId: string;
        eventGuestId: string;
        logicalPositionId?: string | null;
        layoutTableId?: string | null;
        state: string;
      }>("planAssignments", { organisationId: people.orgMaison, eventId: people.eventAlphaOne })).filter(
        (item) => item.planEditionId === adopted.value.id,
      ),
    );
    const seatedA = assignments.find((item) => item.eventGuestId === guestA.id);
    const seatedB = assignments.find((item) => item.eventGuestId === guestB.id);
    assert.ok(seatedA?.logicalPositionId);
    assert.ok(seatedB?.layoutTableId);
    await assert.rejects(
      () =>
        v2.applyManual(planner(), cas(people.assignPlanner, "s072-neg-unseat-required", adopted.value), {
          planEditionId: adopted.value.id,
          command: { type: "UNSEAT", eventGuestId: guestA.id, reasonCode: "MANUAL_UNSEAT" },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "SEATING_VALIDATION_REJECTED",
    );
    const positions = await v2.repository.transaction(async (tx) =>
      tx.list<{ packageId: string; positionToken: string; layoutTableId: string }>("packagePositions", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    const used = new Set(assignments.map((item) => item.logicalPositionId).filter(Boolean));
    const sameTableFree = positions.find(
      (item) =>
        item.packageId === adopted.value.packageId &&
        item.layoutTableId === seatedB.layoutTableId &&
        !used.has(item.positionToken),
    );
    assert.ok(sameTableFree);
    await assert.rejects(
      () =>
        v2.applyManual(planner(), cas(people.assignPlanner, "s072-neg-bad-assign-01", adopted.value), {
          planEditionId: adopted.value.id,
          command: { type: "MOVE", eventGuestId: guestA.id, positionToken: sameTableFree.positionToken },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "SEATING_VALIDATION_REJECTED",
    );
    const excepted = await v2.applyManual(planner(), cas(people.assignPlanner, "s072-neg-unseat-c", adopted.value), {
      planEditionId: adopted.value.id,
      command: { type: "UNSEAT", eventGuestId: guestC.id, reasonCode: "GOVERNED_UNSEATED" },
    });
    const after = await v2.repository.transaction(async (tx) =>
      (await tx.list<{ planEditionId: string; logicalPositionId?: string | null }>("planAssignments", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      })).filter((item) => item.planEditionId === excepted.value.id),
    );
    const usedAfter = new Set(after.map((item) => item.logicalPositionId));
    const freeSeat = positions.find((item) => item.packageId === adopted.value.packageId && !usedAfter.has(item.positionToken));
    assert.ok(freeSeat);
    const assigned = await v2.assignUnseated(planner(), cas(people.assignPlanner, "s072-neg-assign-01", excepted.value), {
      planEditionId: excepted.value.id,
      eventGuestId: guestC.id,
      positionToken: freeSeat.positionToken,
    });
    assert.equal(assigned.application, "APPLIED");
  });

  it("blocks CEO maker/checker bypass and serves permission-safe export to Auditor", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Efe", "s072-sep-a");
    const guestB = attendingGuest(service, "Fola", "s072-sep-b");
    const v2 = service.seatingV2Commands();
    const created = await v2.createRule(ceo(), envelope(people.assignCeo, "s072-sep-create-01"), keepApart(guestA.id, guestB.id));
    await v2.activateRule(director(), cas(people.assignDirector, "s072-sep-act-01", created.value), { editionId: created.value.id });
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s072-sep-freeze-01"), { seed: "seed-sep" });
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "s072-sep-run-01"), { packageId: frozen.value.id });
    const adopted = await v2.adoptRun(ceo(), envelope(people.assignCeo, "s072-sep-adopt-01"), { runId: run.value.id });
    const submitted = await v2.submitPlan(planner(), cas(people.assignPlanner, "s072-sep-submit-01", adopted.value), { editionId: adopted.value.id });
    await assert.rejects(
      () =>
        v2.approvePlan(ceo(), cas(people.assignCeo, "s072-sep-ceo-approve-01", submitted.value), {
          editionId: submitted.value.id,
          editionHash: submitted.value.contentHash,
          decision: "APPROVED",
          reason: "author cannot approve",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const approved = await v2.approvePlan(director(), cas(people.assignDirector, "s072-sep-approve-01", submitted.value), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
      decision: "APPROVED",
      reason: "director approval",
    });
    await assert.rejects(
      () =>
        v2.publishPlan(ceo(), cas(people.assignCeo, "s072-sep-ceo-pub-01", {
          contentHash: submitted.value.contentHash,
          version: submitted.value.version + 1,
        }), {
          editionId: submitted.value.id,
          editionHash: submitted.value.contentHash,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const job = await v2.requestExport(ceo(), envelope(people.assignCeo, "s072-sep-export-01"), {
      sourceType: "EDITION",
      sourceId: submitted.value.id,
      format: "JSON",
      projectionClass: "FULL",
    });
    const auditorView = await v2.retrieveExport(actor(people.personAuditor, { now: NOW }), envelope(people.assignAuditor, "s072-sep-export-read"), {
      jobId: job.value.id,
    });
    assert.equal(auditorView.projectionClass, "PERMISSION_SAFE");
    assert.equal(
      auditorView.assignments.every((item) => item.eventGuestId === undefined),
      true,
    );
    void approved;
  });

  it("rejects equivalent ACTIVE KEEP_APART activation as idempotent ALREADY_ACTIVE replay", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Chi", "s072-dup-a");
    const guestB = attendingGuest(service, "Dee", "s072-dup-b");
    const v2 = service.seatingV2Commands();
    const first = await v2.createRule(planner(), envelope(people.assignPlanner, "s072-dup-create-01"), keepApart(guestA.id, guestB.id));
    const second = await v2.createRule(planner(), envelope(people.assignPlanner, "s072-dup-create-02"), keepApart(guestA.id, guestB.id));
    const activated = await v2.activateRule(director(), cas(people.assignDirector, "s072-dup-act-01", first.value), { editionId: first.value.id });
    assert.equal(activated.application, "APPLIED");
    assert.equal(activated.didDataChange, true);
    const duplicate = await v2.activateRule(director(), cas(people.assignDirector, "s072-dup-act-02", second.value), { editionId: second.value.id });
    assert.equal(duplicate.application, "REPLAYED");
    assert.equal(duplicate.didDataChange, false);
    assert.equal(duplicate.value.id, first.value.id);
    const editions = await v2.repository.transaction(async (tx) =>
      tx.list<{ id: string; lifecycle: string; contentHash: string }>("ruleEditions", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    const active = editions.filter((item) => item.lifecycle === "ACTIVE" && item.contentHash === first.value.contentHash);
    assert.equal(active.length, 1);
    assert.equal(active[0]?.id, first.value.id);
    const stillDraft = editions.find((item) => item.id === second.value.id);
    assert.equal(stillDraft?.lifecycle, "DRAFT");
  });

  it("treats concurrent activation of equivalent drafts as a single ACTIVE outcome", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Eve", "s072-conc-a");
    const guestB = attendingGuest(service, "Fay", "s072-conc-b");
    const v2 = service.seatingV2Commands();
    const first = await v2.createRule(planner(), envelope(people.assignPlanner, "s072-conc-create-01"), keepApart(guestA.id, guestB.id));
    const second = await v2.createRule(planner(), envelope(people.assignPlanner, "s072-conc-create-02"), keepApart(guestA.id, guestB.id));
    const settled = await Promise.allSettled([
      v2.activateRule(director(), cas(people.assignDirector, "s072-conc-act-01", first.value), { editionId: first.value.id }),
      v2.activateRule(director(), cas(people.assignDirector, "s072-conc-act-02", second.value), { editionId: second.value.id }),
    ]);
    assert.equal(settled.filter((item) => item.status === "fulfilled").length, 2);
    const applications = settled
      .filter((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof v2.activateRule>>> => item.status === "fulfilled")
      .map((item) => item.value.application)
      .sort();
    assert.deepEqual(applications, ["APPLIED", "REPLAYED"]);
    const editions = await v2.repository.transaction(async (tx) =>
      tx.list<{ id: string; lifecycle: string; contentHash: string }>("ruleEditions", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    const active = editions.filter((item) => item.lifecycle === "ACTIVE" && item.contentHash === first.value.contentHash);
    assert.equal(active.length, 1);
    assert.ok(v2.repository instanceof MemorySeatingV2Repository);
    const audits = v2.repository.backingStore.audit.filter((item) => item.action === "seatingV2.activateRule");
    assert.ok(audits.some((item) => item.metadata && (item.metadata as { reason?: string }).reason === "ALREADY_ACTIVE"));
  });

  it("allows materially different ACTIVE rules in the same event scope", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Gus", "s072-diff-a");
    const guestB = attendingGuest(service, "Hal", "s072-diff-b");
    const guestC = attendingGuest(service, "Ida", "s072-diff-c");
    const v2 = service.seatingV2Commands();
    const left = await v2.createRule(planner(), envelope(people.assignPlanner, "s072-diff-create-01"), keepApart(guestA.id, guestB.id));
    const right = await v2.createRule(planner(), envelope(people.assignPlanner, "s072-diff-create-02"), keepApart(guestA.id, guestC.id));
    const activatedLeft = await v2.activateRule(director(), cas(people.assignDirector, "s072-diff-act-01", left.value), { editionId: left.value.id });
    const activatedRight = await v2.activateRule(director(), cas(people.assignDirector, "s072-diff-act-02", right.value), { editionId: right.value.id });
    assert.equal(activatedLeft.application, "APPLIED");
    assert.equal(activatedRight.application, "APPLIED");
    assert.notEqual(left.value.contentHash, right.value.contentHash);
    const editions = await v2.repository.transaction(async (tx) =>
      tx.list<{ id: string; lifecycle: string }>("ruleEditions", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    assert.equal(editions.filter((item) => item.lifecycle === "ACTIVE").length, 2);
  });

  it("stores one validation outcome per package rule for a single ACTIVE KEEP_APART edition", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Chi", "s072-dup-a2");
    const guestB = attendingGuest(service, "Dee", "s072-dup-b2");
    const v2 = service.seatingV2Commands();
    const first = await v2.createRule(planner(), envelope(people.assignPlanner, "s072-dup-create-11"), keepApart(guestA.id, guestB.id));
    await v2.activateRule(director(), cas(people.assignDirector, "s072-dup-act-11", first.value), { editionId: first.value.id });
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s072-dup-freeze-01"), { seed: "seed-dup" });
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "s072-dup-run-01"), { packageId: frozen.value.id });
    assert.ok(run.value.status === "FEASIBLE" || run.value.status === "INFEASIBLE");
    const outcomes = await v2.repository.transaction(async (tx) =>
      tx.list<{ reportId: string; ruleEditionId: string; ruleContentHash: string }>("validationRuleOutcomes", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    const editionIds = new Set(outcomes.map((item) => item.ruleEditionId));
    assert.equal(editionIds.size, outcomes.length);
    assert.ok(editionIds.has(first.value.id));
  });

  it("exposes the latest frozen package for launch after a working edition exists", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Eve", "s072-latest-a");
    const guestB = attendingGuest(service, "Fay", "s072-latest-b");
    const v2 = service.seatingV2Commands();
    const draft = await v2.createRule(planner(), envelope(people.assignPlanner, "s072-latest-create-01"), keepApart(guestA.id, guestB.id));
    await v2.activateRule(director(), cas(people.assignDirector, "s072-latest-act-01", draft.value), { editionId: draft.value.id });
    const first = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s072-latest-freeze-01"), { seed: "seed-latest-1" });
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "s072-latest-run-01"), { packageId: first.value.id });
    let adopted = false;
    if (run.value.status === "FEASIBLE") {
      await v2.adoptRun(planner(), envelope(people.assignPlanner, "s072-latest-adopt-01"), { runId: run.value.id });
      adopted = true;
    }
    const next = await v2.createRule(planner(), envelope(people.assignPlanner, "s072-latest-create-02"), keepApart(guestA.id, guestB.id, "PROTOCOL"));
    await v2.activateRule(director(), cas(people.assignDirector, "s072-latest-act-02", next.value), { editionId: next.value.id });
    const second = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s072-latest-freeze-02"), { seed: "seed-latest-2" });
    assert.notEqual(second.value.id, first.value.id);
    const workspace = await v2.projectWorkspace(planner(), people.eventAlphaOne);
    assert.equal(workspace.inputEdition?.id, second.value.id);
    assert.equal(workspace.inputEdition?.contentHash, second.value.contentHash);
    if (adopted) assert.equal(workspace.inputFreshness, "STALE");
  });

  it("withdrawn reservation leaves the next freeze and capacity ledger", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Gil", "s072-resv-a");
    const guestB = attendingGuest(service, "Han", "s072-resv-b");
    const v2 = service.seatingV2Commands();
    const baseline = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s072-resv-freeze-00"), { seed: "seed-resv" });
    const draft = await v2.createReservation(planner(), envelope(people.assignPlanner, "s072-resv-create-01"), {
      exact: 2,
      eligibleMemberIds: [guestA.id, guestB.id],
      targets: [],
    });
    await v2.activateReservation(director(), cas(people.assignDirector, "s072-resv-act-01", draft.value), { editionId: draft.value.id });
    const activeView = await v2.projectWorkspace(planner(), people.eventAlphaOne);
    assert.equal(activeView.capacityLedger.reservedMin, 2);
    const withReservation = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s072-resv-freeze-01"), { seed: "seed-resv" });
    assert.notEqual(withReservation.value.contentHash, baseline.value.contentHash);
    const frozenActive = await v2.projectWorkspace(planner(), people.eventAlphaOne);
    assert.equal(frozenActive.inputEdition?.contentHash, withReservation.value.contentHash);
    await v2.withdrawReservation(planner(), cas(people.assignPlanner, "s072-resv-wd-01", draft.value), {
      editionId: draft.value.id,
      reason: "Withdrawn from governing set",
    });
    const withdrawnView = await v2.projectWorkspace(planner(), people.eventAlphaOne);
    assert.equal(withdrawnView.capacityLedger.reservedMin, 0);
    const replayed = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s072-resv-freeze-02"), { seed: "seed-resv" });
    assert.equal(replayed.application, "REPLAYED");
    assert.equal(replayed.value.id, baseline.value.id);
    const after = await v2.projectWorkspace(planner(), people.eventAlphaOne);
    assert.equal(after.inputEdition?.id, baseline.value.id);
    assert.equal(after.inputEdition?.contentHash, baseline.value.contentHash);
    assert.notEqual(after.inputEdition?.contentHash, withReservation.value.contentHash);
  });

  it("rejects a stale applyManual against a superseded working edition as VERSION_CONFLICT", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Adaeze", "s075-cas-a");
    attendingGuest(service, "Bola", "s075-cas-b");
    attendingGuest(service, "Chioma", "s075-cas-c");
    attendingGuest(service, "Dami", "s075-cas-d");
    const v2 = service.seatingV2Commands();
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s075-cas-freeze-01"), { seed: "seed-cas" });
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "s075-cas-run-01"), { packageId: frozen.value.id });
    const adopted = await v2.adoptRun(planner(), envelope(people.assignPlanner, "s075-cas-adopt-01"), { runId: run.value.id });
    const scope = { organisationId: people.orgMaison, eventId: people.eventAlphaOne };
    const assignments = await v2.repository.transaction(async (tx) =>
      (await tx.list<{
        planEditionId: string;
        eventGuestId: string;
        logicalPositionId?: string | null;
        state: string;
      }>("planAssignments", scope)).filter((item) => item.planEditionId === adopted.value.id),
    );
    const positions = await v2.repository.transaction(async (tx) =>
      tx.list<{ packageId: string; positionToken: string }>("packagePositions", scope),
    );
    const used = new Set(
      assignments.map((item) => item.logicalPositionId).filter((token): token is string => typeof token === "string"),
    );
    const vacantA = positions.find((item) => item.packageId === adopted.value.packageId && !used.has(item.positionToken));
    assert.ok(vacantA);
    const first = await v2.applyManual(
      planner(),
      cas(people.assignPlanner, "s075-cas-move-a", adopted.value),
      {
        planEditionId: adopted.value.id,
        command: { type: "MOVE", eventGuestId: guestA.id, positionToken: vacantA.positionToken },
      },
    );
    assert.equal(first.application, "APPLIED");
    assert.notEqual(first.value.id, adopted.value.id);
    await assert.rejects(
      () =>
        v2.applyManual(planner(), envelope(people.assignPlanner, "s075-cas-missing"), {
          planEditionId: first.value.id,
          command: { type: "MOVE", eventGuestId: guestA.id, positionToken: vacantA.positionToken },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    await assert.rejects(
      () =>
        v2.applyManual(
          planner(),
          cas(people.assignPlanner, "s075-cas-move-stale", adopted.value),
          {
            planEditionId: adopted.value.id,
            command: { type: "MOVE", eventGuestId: guestA.id, positionToken: vacantA.positionToken },
          },
        ),
      (error: unknown) =>
        error instanceof PlatformError &&
        error.code === "VERSION_CONFLICT" &&
        /stale plan edition/i.test(error.message),
    );
    const afterFirst = await v2.repository.transaction(async (tx) =>
      (await tx.list<{ planEditionId: string; logicalPositionId?: string | null; eventGuestId: string; state: string }>(
        "planAssignments",
        scope,
      )).filter((item) => item.planEditionId === first.value.id),
    );
    const usedAfter = new Set(afterFirst.map((item) => item.logicalPositionId).filter((token): token is string => typeof token === "string"));
    const vacantB = positions.find((item) => item.packageId === adopted.value.packageId && !usedAfter.has(item.positionToken));
    assert.ok(vacantB);
    const refreshed = await v2.applyManual(
      planner(),
      cas(people.assignPlanner, "s075-cas-move-b", first.value),
      {
        planEditionId: first.value.id,
        command: { type: "MOVE", eventGuestId: guestA.id, positionToken: vacantB.positionToken },
      },
    );
    assert.equal(refreshed.application, "APPLIED");
    const occupied = afterFirst.find((item) => item.state === "SEATED" && item.eventGuestId !== guestA.id);
    const occupiedSeat = occupied?.logicalPositionId;
    if (typeof occupiedSeat !== "string" || occupiedSeat.length === 0) {
      throw new Error("expected an occupied seat token on the successor edition");
    }
    await assert.rejects(
      () =>
        v2.applyManual(
          planner(),
          cas(people.assignPlanner, "s075-cas-occupied", refreshed.value),
          {
            planEditionId: refreshed.value.id,
            command: { type: "MOVE", eventGuestId: guestA.id, positionToken: occupiedSeat },
          },
        ),
      (error: unknown) =>
        error instanceof PlatformError && error.code === "VALIDATION_FAILED" && /occupied/i.test(error.message),
    );
  });
});
