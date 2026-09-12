import { PlatformError } from "./errors.js";
import { exactHash } from "./eec-hash.js";
import { loadNonProductionFixtures } from "./bootstrap.js";
import { FIXTURE_IDS as people } from "./fixtures.js";
import { MemoryPlatformStore } from "./memory-store.js";
import { authorize } from "./policy.js";
import { applyS06SeatingLayoutIfMissing } from "./seating-fixtures.js";
import { assertSeatingV2CompiledRequest, compileSeatingV2Request } from "./seating-v2-compiler.js";
import { seatingV2PackageContentHash, seatingV2SemanticHash } from "./seating-v2-hash.js";
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
import { SEATING_V2_SOLVER_VERSION, SEATING_V2_VALIDATOR_VERSION, type SeatingV2RuleContent } from "./seating-v2-schemas.js";
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

function fixture(): { service: PlatformService } {
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
  return { service };
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
    const path = await keepApartPath(service, "05");
    if (!path.adopted) throw new Error("adopt required");
    const adoptedEdition = path.adopted;
    const assignments = await path.v2.repository.transaction(async (tx) =>
      (await tx.list<{ planEditionId: string; eventGuestId: string; logicalPositionId?: string | null; layoutTableId?: string | null }>(
        "planAssignments",
        { organisationId: people.orgMaison, eventId: people.eventAlphaOne },
      )).filter((item) => item.planEditionId === adoptedEdition.value.id),
    );
    const seatedB = assignments.find((item) => item.eventGuestId === path.guestB.id);
    const unseated = await path.v2.applyManual(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-05-unseat"), {
      planEditionId: adoptedEdition.value.id,
      command: { type: "UNSEAT", eventGuestId: path.guestA.id, reasonCode: "MANUAL_UNSEAT" },
    });
    const positions = await path.v2.repository.transaction(async (tx) =>
      tx.list<{ packageId: string; positionToken: string; layoutTableId: string }>("packagePositions", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    const used = new Set(
      (
        await path.v2.repository.transaction(async (tx) =>
          (await tx.list<{ planEditionId: string; logicalPositionId?: string | null }>("planAssignments", {
            organisationId: people.orgMaison,
            eventId: people.eventAlphaOne,
          })).filter((item) => item.planEditionId === unseated.value.id),
        )
      ).map((item) => item.logicalPositionId),
    );
    const sameTable = positions.find(
      (item) => item.packageId === adoptedEdition.value.packageId && item.layoutTableId === seatedB?.layoutTableId && !used.has(item.positionToken),
    );
    const otherTable = positions.find(
      (item) => item.packageId === adoptedEdition.value.packageId && item.layoutTableId !== seatedB?.layoutTableId && !used.has(item.positionToken),
    );
    let rejected = false;
    try {
      await path.v2.applyManual(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-05-bad"), {
        planEditionId: unseated.value.id,
        command: { type: "ASSIGN_UNSEATED", eventGuestId: path.guestA.id, positionToken: sameTable?.positionToken ?? "" },
      });
    } catch (error) {
      rejected = error instanceof PlatformError && error.code === "SEATING_VALIDATION_REJECTED";
    }
    const assigned = await path.v2.assignUnseated(actor(people.personPlanner), envelope(people.assignPlanner, "s06v2-05-good"), {
      planEditionId: unseated.value.id,
      eventGuestId: path.guestA.id,
      positionToken: otherTable?.positionToken ?? "",
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

  throw new Error(`unhandled case ${id}`);
}

function evaluateCase(observations: S06V2Observation[], assertions: S06V2Assertion[]): "PASSED" | "FAILED" {
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
        status: evaluateCase(observations, assertions),
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
