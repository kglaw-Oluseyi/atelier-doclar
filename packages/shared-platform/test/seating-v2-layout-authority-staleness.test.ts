import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import {
  ensureEosS06SuccessorLayoutFixture,
  ensureSeatingLayoutBindingForLayout,
  isPackageOrRunStaleAgainstCurrentAuthority,
} from "../src/index.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-15T16:00:00.000Z";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "layout-auth-stale-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "layout-auth-stale-director" });
}
function ceo() {
  return actor(people.personCeo, { now: NOW, correlationId: "layout-auth-stale-ceo" });
}

function envelope(assignmentId: string, key: string) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: assignmentId,
    idempotencyKey: key.length >= 12 ? key : `layout-auth-${key}`,
  };
}

function cas(
  assignmentId: string,
  key: string,
  row: { contentHash: string; version?: number; editionNo?: number },
) {
  const expectedVersion = row.version ?? row.editionNo;
  assert.ok(typeof expectedVersion === "number" && expectedVersion >= 1);
  return {
    ...envelope(assignmentId, key),
    expectedVersion,
    expectedContentHash: row.contentHash,
  };
}

function attendingGuest(service: ReturnType<typeof fixtureService>["service"], givenName: string, key: string) {
  const guest = service.intakeGuest(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName,
    familyName: "Authority",
    email: `${givenName.toLowerCase()}.authority@example.test`,
    reason: "Layout authority guest",
    idempotencyKey: `layout-auth-guest-${key}`,
  });
  service.staffEnterRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    guestId: guest.id,
    attendanceIntent: "ATTENDING",
    answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
    reason: "mark attending for layout authority",
    idempotencyKey: `layout-auth-rsvp-${key}`,
  });
  return guest;
}

async function prepareSuccessorSurface(service: ReturnType<typeof fixtureService>["service"], store: ReturnType<typeof fixtureService>["store"]) {
  const fixture = ensureEosS06SuccessorLayoutFixture(store, service);
  service.prepareEventRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: "Alpha One",
    reason: "prepare RSVP for layout authority",
    idempotencyKey: "layout-auth-prepare-rsvp",
  });
  const bindingA = await ensureSeatingLayoutBindingForLayout(service, {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    layoutId: fixture.layoutAId,
    plannerAssignmentId: people.assignPlanner,
    directorAssignmentId: people.assignDirector,
    idempotencyPrefix: "layout-auth-bind-a",
  });
  return { fixture, bindingA };
}

describe("isPackageOrRunStaleAgainstCurrentAuthority", () => {
  it("is fresh when package identity and layout hash match", () => {
    assert.equal(
      isPackageOrRunStaleAgainstCurrentAuthority({
        packageId: "pkg-1",
        packageLayoutContentHash: "hash-a",
        activeLayoutContentHash: "hash-a",
        currentAuthorityPackageId: "pkg-1",
      }),
      false,
    );
  });

  it("is stale when active layout hash drifts", () => {
    assert.equal(
      isPackageOrRunStaleAgainstCurrentAuthority({
        packageId: "pkg-1",
        packageLayoutContentHash: "hash-a",
        activeLayoutContentHash: "hash-b",
        currentAuthorityPackageId: "pkg-1",
      }),
      true,
    );
  });

  it("is stale when package identity drifts under current authority", () => {
    assert.equal(
      isPackageOrRunStaleAgainstCurrentAuthority({
        packageId: "pkg-old",
        packageLayoutContentHash: "hash-b",
        activeLayoutContentHash: "hash-b",
        currentAuthorityPackageId: "pkg-new",
      }),
      true,
    );
  });
});

describe("EOS-S06 successor layout authority staleness", () => {
  it("A: same active layout hash keeps package/run Fresh and adoption available", async () => {
    const { service, store } = fixtureService();
    const { bindingA } = await prepareSuccessorSurface(service, store);
    for (const name of ["Ada", "Ben", "Cara", "Dan"] as const) {
      attendingGuest(service, name, name.toLowerCase());
    }
    const v2 = service.seatingV2Commands();
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "same-freeze"), { seed: "seed-same" });
    assert.equal(frozen.value.layoutContentHash, bindingA.layoutContentHash);
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "same-run"), { packageId: frozen.value.id });
    assert.equal(run.value.status, "FEASIBLE");
    const workspace = await v2.projectWorkspace(planner(), people.eventAlphaOne);
    assert.equal(workspace.inputFreshness, "CURRENT");
    const projected = workspace.runs.find((item) => item.id === run.value.id);
    assert.ok(projected);
    assert.equal(projected!.stale, false);
    const adopted = await v2.adoptRun(planner(), envelope(people.assignPlanner, "same-adopt"), { runId: run.value.id });
    assert.equal(adopted.value.status, "WORKING");
    assert.equal((await v2.projectWorkspace(planner(), people.eventAlphaOne)).workingEdition?.stale, false);
  });

  it("B: successor ACTIVE layout marks predecessor package/run/edition STALE and refuses transitions", async () => {
    const { service, store } = fixtureService();
    const { fixture, bindingA } = await prepareSuccessorSurface(service, store);
    for (const name of ["Eve", "Fay", "Gil", "Han"] as const) {
      attendingGuest(service, name, `b-${name.toLowerCase()}`);
    }
    const v2 = service.seatingV2Commands();
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "pred-freeze"), { seed: "seed-pred" });
    assert.equal(frozen.value.layoutContentHash, bindingA.layoutContentHash);
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "pred-run"), { packageId: frozen.value.id });
    assert.equal(run.value.status, "FEASIBLE");
    const adopted = await v2.adoptRun(planner(), envelope(people.assignPlanner, "pred-adopt"), { runId: run.value.id });
    assert.equal(adopted.value.status, "WORKING");

    const pubB = store.snapshot().layoutPublications.find((item) => item.layoutId === fixture.layoutBId && item.status === "CURRENT");
    assert.ok(pubB);
    assert.notEqual(pubB!.contentHash, bindingA.layoutContentHash);

    const bindingB = await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: fixture.layoutBId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "layout-auth-bind-b",
    });
    assert.equal(bindingB.state, "ACTIVE");
    assert.equal(bindingB.layoutContentHash, pubB!.contentHash);

    const workspace = await v2.projectWorkspace(planner(), people.eventAlphaOne);
    assert.equal(workspace.inputFreshness, "STALE");
    assert.equal(workspace.inputEdition?.layoutContentHash, frozen.value.layoutContentHash);
    assert.notEqual(workspace.inputEdition?.layoutContentHash, bindingB.layoutContentHash);
    const projectedRun = workspace.runs.find((item) => item.id === run.value.id);
    assert.ok(projectedRun);
    assert.equal(projectedRun!.stale, true);
    assert.equal(workspace.workingEdition?.stale, true);
    assert.match(workspace.nextAction, /Freeze a new input package/i);

    await assert.rejects(
      () => v2.adoptRun(planner(), envelope(people.assignPlanner, "pred-adopt-again"), { runId: run.value.id }),
      (error: unknown) =>
        error instanceof PlatformError &&
        error.code === "TRANSITION_INVALID" &&
        /governing inputs changed|stale against current seating authority/i.test(error.message),
    );

    await assert.rejects(
      () =>
        v2.submitPlan(planner(), cas(people.assignPlanner, "pred-submit", adopted.value), {
          editionId: adopted.value.id,
        }),
      (error: unknown) =>
        error instanceof PlatformError &&
        error.code === "TRANSITION_INVALID" &&
        /governing inputs changed/i.test(error.message),
    );

    const freshness = await v2.currentFreshness(envelope(people.assignPlanner, "pred-fresh"), frozen.value.id);
    assert.equal(freshness.fresh, false);
  });

  it("B2: approve and publish refuse editions derived from predecessor layout after successor ACTIVE", async () => {
    const { service, store } = fixtureService();
    const { fixture } = await prepareSuccessorSurface(service, store);
    for (const name of ["Quin", "Rae", "Sam", "Tess"] as const) {
      attendingGuest(service, name, `b2-${name.toLowerCase()}`);
    }
    const v2 = service.seatingV2Commands();
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "b2-freeze"), { seed: "seed-b2" });
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "b2-run"), { packageId: frozen.value.id });
    const adopted = await v2.adoptRun(planner(), envelope(people.assignPlanner, "b2-adopt"), { runId: run.value.id });
    const submitted = await v2.submitPlan(planner(), cas(people.assignPlanner, "b2-submit", adopted.value), {
      editionId: adopted.value.id,
    });

    await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: fixture.layoutBId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "layout-auth-bind-b2",
    });

    await assert.rejects(
      () =>
        v2.approvePlan(director(), cas(people.assignDirector, "b2-approve", submitted.value), {
          editionId: submitted.value.id,
          editionHash: submitted.value.contentHash,
          decision: "APPROVED",
          reason: "must refuse stale authority",
        }),
      (error: unknown) =>
        error instanceof PlatformError &&
        error.code === "TRANSITION_INVALID" &&
        /governing inputs changed/i.test(error.message),
    );
  });

  it("B3: publish refuses an APPROVED edition after successor ACTIVE layout", async () => {
    const { service, store } = fixtureService();
    const { fixture } = await prepareSuccessorSurface(service, store);
    for (const name of ["Uma", "Vic", "Wes", "Xan"] as const) {
      attendingGuest(service, name, `b3-${name.toLowerCase()}`);
    }
    const v2 = service.seatingV2Commands();
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "b3-freeze"), { seed: "seed-b3" });
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "b3-run"), { packageId: frozen.value.id });
    const adopted = await v2.adoptRun(planner(), envelope(people.assignPlanner, "b3-adopt"), { runId: run.value.id });
    const submitted = await v2.submitPlan(planner(), cas(people.assignPlanner, "b3-submit", adopted.value), {
      editionId: adopted.value.id,
    });
    const approved = await v2.approvePlan(director(), cas(people.assignDirector, "b3-approve", submitted.value), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
      decision: "APPROVED",
      reason: "approve while still on predecessor",
    });
    assert.equal(approved.value.decision, "APPROVED");
    const approvedEdition = {
      contentHash: submitted.value.contentHash,
      version: submitted.value.version + 1,
    };

    await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: fixture.layoutBId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "layout-auth-bind-b3",
    });

    await assert.rejects(
      () =>
        v2.publishPlan(ceo(), cas(people.assignCeo, "b3-publish", approvedEdition), {
          editionId: submitted.value.id,
          editionHash: submitted.value.contentHash,
        }),
      (error: unknown) =>
        error instanceof PlatformError &&
        error.code === "TRANSITION_INVALID" &&
        /governing inputs changed/i.test(error.message),
    );
  });

  it("C: current operational publication remains after successor binding with no automatic publication", async () => {
    const { service, store } = fixtureService();
    const { fixture } = await prepareSuccessorSurface(service, store);
    for (const name of ["Ivy", "Jon", "Kim", "Leo"] as const) {
      attendingGuest(service, name, `c-${name.toLowerCase()}`);
    }
    const v2 = service.seatingV2Commands();
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "pub-freeze"), { seed: "seed-pub" });
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "pub-run"), { packageId: frozen.value.id });
    const adopted = await v2.adoptRun(planner(), envelope(people.assignPlanner, "pub-adopt"), { runId: run.value.id });
    const submitted = await v2.submitPlan(planner(), cas(people.assignPlanner, "pub-submit", adopted.value), {
      editionId: adopted.value.id,
    });
    const approved = await v2.approvePlan(director(), cas(people.assignDirector, "pub-approve", submitted.value), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
      decision: "APPROVED",
      reason: "Operational approval before successor",
    });
    assert.equal(approved.value.decision, "APPROVED");
    const approvedEdition = {
      contentHash: submitted.value.contentHash,
      version: submitted.value.version + 1,
    };
    const published = await v2.publishPlan(ceo(), cas(people.assignCeo, "pub-publish", approvedEdition), {
      editionId: submitted.value.id,
      editionHash: submitted.value.contentHash,
    });
    assert.equal(published.value.status, "CURRENT");
    assert.equal(published.value.publicationNo, 1);

    await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: fixture.layoutBId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "layout-auth-bind-b-pub",
    });

    const workspace = await v2.projectWorkspace(planner(), people.eventAlphaOne);
    assert.equal(workspace.currentPublication?.publicationNumber, 1);
    assert.equal(workspace.currentPublication?.status, "CURRENT");
    assert.equal(workspace.publications.filter((item) => item.status === "CURRENT").length, 1);
    assert.equal(workspace.inputFreshness, "STALE");
    assert.ok(workspace.runs.every((item) => item.stale));
  });

  it("D: freeze/launch/adopt against successor yields Fresh run while predecessor remains Stale", async () => {
    const { service, store } = fixtureService();
    const { fixture, bindingA } = await prepareSuccessorSurface(service, store);
    for (const name of ["Mia", "Ned", "Ora", "Pat"] as const) {
      attendingGuest(service, name, `d-${name.toLowerCase()}`);
    }
    const v2 = service.seatingV2Commands();
    const predecessor = await v2.freezePackage(planner(), envelope(people.assignPlanner, "d-freeze-a"), { seed: "seed-d-a" });
    const predecessorRun = await v2.launchRun(planner(), envelope(people.assignPlanner, "d-run-a"), {
      packageId: predecessor.value.id,
    });
    assert.equal(predecessor.value.layoutContentHash, bindingA.layoutContentHash);

    const bindingB = await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: fixture.layoutBId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "layout-auth-bind-b-d",
    });

    const afterSuccessor = await v2.projectWorkspace(planner(), people.eventAlphaOne);
    assert.equal(afterSuccessor.runs.find((item) => item.id === predecessorRun.value.id)?.stale, true);

    const successorPkg = await v2.freezePackage(planner(), envelope(people.assignPlanner, "d-freeze-b"), { seed: "seed-d-b" });
    assert.equal(successorPkg.value.layoutContentHash, bindingB.layoutContentHash);
    assert.notEqual(successorPkg.value.id, predecessor.value.id);
    const successorRun = await v2.launchRun(planner(), envelope(people.assignPlanner, "d-run-b"), {
      packageId: successorPkg.value.id,
    });
    assert.equal(successorRun.value.status, "FEASIBLE");
    const adopted = await v2.adoptRun(planner(), envelope(people.assignPlanner, "d-adopt-b"), {
      runId: successorRun.value.id,
    });
    assert.equal(adopted.value.status, "WORKING");

    const workspace = await v2.projectWorkspace(planner(), people.eventAlphaOne);
    assert.equal(workspace.inputFreshness, "CURRENT");
    assert.equal(workspace.runs.find((item) => item.id === successorRun.value.id)?.stale, false);
    assert.equal(workspace.runs.find((item) => item.id === predecessorRun.value.id)?.stale, true);
    assert.equal(workspace.workingEdition?.stale, false);
  });
});
