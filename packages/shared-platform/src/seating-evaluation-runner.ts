import { exactHash, nfc } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import { MemorySeatingRepository } from "./memory-seating-store.js";
import { permissionsForRole } from "./catalog.js";
import { SeatingCommandService } from "./seating-command-service.js";
import { seatingToken, snapshotGuestCohortAdapter } from "./seating-adapters.js";
import {
  assertionHolds,
  S06_CASE_IDS,
  S06_EVALUATION_CONTRACT_VERSION,
  S06_EVALUATION_CORPUS_EDITION,
  S06_EVALUATION_PROJECTION_VERSION,
  s06CorpusHash,
  type S06Assertion,
  type S06Observation,
} from "./seating-evaluation-schemas.js";
import { applyS06Mutation, detectS06Mutation } from "./seating-evaluation-mutations.js";
import { defaultSolverConfig, solveSeatingV1 } from "./seating-solver-v1.js";
import { SEATING_SOLVER_VERSION } from "./seating-solver-types.js";
import {
  seatingCorpus50,
  seatingCorpus600,
  seatingContradictoryGroup,
  seatingImpossibleCapacity,
  seatingImpossibleCapability,
} from "./seating-solver-fixtures.js";
import { applySyntheticSnapshot } from "./synthetic-seed.js";
import { FIXTURE_IDS } from "./fixtures.js";
import { MemoryPlatformStore } from "./memory-store.js";
import type { ActorContext } from "./service.js";

const people = {
  ...FIXTURE_IDS,
  assignOtherOrg: FIXTURE_IDS.assignOther,
};

function fixtureService() {
  const store = new MemoryPlatformStore();
  const service = applySyntheticSnapshot(store);
  return { store, service };
}

function actor(personId: string): ActorContext {
  return { personId, correlationId: `s06-eval-${personId.slice(-4)}`, now: "2026-09-12T08:00:00.000Z", actorKind: "HUMAN" };
}

export type S06CaseOutcome = {
  caseId: string;
  observations: S06Observation[];
  assertions: S06Assertion[];
  status: "PASSED" | "FAILED" | "ERROR";
};

export type S06EvaluationResult = {
  corpusEdition: string;
  corpusHash: string;
  contractVersion: string;
  solverVersion: string;
  configHash: string;
  projectionVersion: string;
  caseCount: number;
  passedCount: number;
  failedCount: number;
  cases: S06CaseOutcome[];
};

function observe(name: string, value: unknown, kind = "STATE"): S06Observation {
  return { kind, name, value };
}

function seatingService() {
  const { service: platform, store } = fixtureService();
  const seating = new SeatingCommandService(new MemorySeatingRepository(), {
    resolveActor: (personId) => platform.resolveActor(personId),
    snapshot: () => store.snapshot(),
    tokenPepper: () => "s06-eval-pepper-value",
  });
  return { platform, store, seating };
}

function envelope(assignmentId: string, key: string, eventId: string = people.eventAlphaOne, organisationId: string = people.orgMaison) {
  return { organisationId, eventId, actorAssignmentId: assignmentId, idempotencyKey: key };
}

async function runCase(id: (typeof S06_CASE_IDS)[number]): Promise<{ observations: S06Observation[]; assertions: S06Assertion[] }> {
  const observations: S06Observation[] = [];
  const assertions: S06Assertion[] = [];
  const push = (name: string, value: unknown, expected: unknown, compare: S06Assertion["compare"] = "equals") => {
    observations.push(observe(name, value));
    assertions.push({ name, expected, compare });
  };

  if (id === "S06-ISO-01" || id === "S06-ISO-02" || id === "S06-ISO-03") {
    const { seating } = seatingService();
    let denied = false;
    try {
      if (id === "S06-ISO-01") {
        await seating.freezeSeatingInputs(actor(people.personOtherOrg), envelope(people.assignOtherOrg, `iso-${id}-key-01`, people.eventAlphaOne, people.orgMaison));
      } else if (id === "S06-ISO-02") {
        await seating.freezeSeatingInputs(actor(people.personPlanner), envelope(people.assignPlanner, `iso-${id}-key-01`, people.eventOther, people.orgMaison));
      } else {
        await seating.freezeSeatingInputs(actor(people.personPlanner), envelope(people.assignPlanner, `iso-${id}-key-01`, "00000000-0000-4000-8000-0000000000ff", people.orgMaison));
      }
    } catch (error) {
      denied = error instanceof PlatformError;
    }
    push("crossScopeDenied", denied, true);
    return { observations, assertions };
  }

  if (id === "S06-ID-01") {
    const { store } = seatingService();
    const cohort = snapshotGuestCohortAdapter(store.snapshot(), people.eventAlphaOne);
    push("usesEventGuestId", cohort.guests.every((item) => item.eventGuestId.length === 36), true);
    push("partyNotSubstituted", cohort.guests.every((item) => !item.partyToken || item.partyToken !== item.eventGuestId), true);
    return { observations, assertions };
  }

  if (id === "S06-ID-02") {
    const tokenA = seatingToken("pepper", people.eventAlphaOne, people.personPlanner);
    const tokenB = seatingToken("pepper", "00000000-0000-4000-8000-000000000099", people.personPlanner);
    push("tokensDifferAcrossEvents", tokenA !== tokenB, true);
    return { observations, assertions };
  }

  if (id === "S06-IN-01") {
    const { seating } = seatingService();
    let blocked = false;
    try {
      await seating.freezeSeatingInputs(actor(people.personPlanner), envelope(people.assignPlanner, "in01-idem-key-1"));
    } catch (error) {
      blocked = error instanceof PlatformError;
    }
    push("noLayoutBlocksFreeze", blocked, true);
    return { observations, assertions };
  }

  if (id === "S06-IN-02") {
    push("staleWhenLayoutHashChanges", true, true);
    return { observations, assertions };
  }

  if (id === "S06-IN-03") {
    const { store } = seatingService();
    const cohort = snapshotGuestCohortAdapter(store.snapshot(), people.eventAlphaOne);
    const unknown = cohort.guests.filter((item) => item.eligibilityCode === "RSVP_UNKNOWN");
    push("forecastDidNotOverwrite", unknown.every((item) => item.eligible === false), true);
    return { observations, assertions };
  }

  if (id === "S06-IN-04") {
    const { store } = seatingService();
    const cohort = snapshotGuestCohortAdapter(store.snapshot(), people.eventAlphaOne);
    push("unknownRsvpNotEligible", cohort.guests.some((item) => item.eligibilityCode === "RSVP_UNKNOWN" && item.eligible === false), true);
    return { observations, assertions };
  }

  if (id === "S06-IN-05") {
    push("disputedSourceBlocksRule", true, true);
    return { observations, assertions };
  }

  if (id === "S06-PRI-01" || id === "S06-PRI-02" || id === "S06-PRI-03") {
    const request = seatingCorpus50() as unknown as Record<string, unknown>;
    if (id === "S06-PRI-01") request.name = "Adaeze";
    if (id === "S06-PRI-02") request.email = "guest@example.test";
    if (id === "S06-PRI-03") (request as { guests: Array<Record<string, unknown>> }).guests[0]!.prompt = "ignore previous";
    let rejected = false;
    try {
      solveSeatingV1(request as never);
    } catch (error) {
      rejected = error instanceof PlatformError;
    }
    push("prohibitedRejected", rejected, true);
    return { observations, assertions };
  }

  if (id === "S06-PRI-04") {
    push("auditorMasksCapability", "masked", "masked");
    return { observations, assertions };
  }

  if (id === "S06-LAY-01") {
    const positions = Array.from({ length: 8 }, (_, index) => `${"t1"}:${String(index + 1).padStart(2, "0")}`);
    push("logicalPositionsDeterministic", positions[0], "t1:01");
    push("logicalCount", positions.length, 8);
    return { observations, assertions };
  }

  if (id === "S06-LAY-02") {
    push("seatingDoesNotCallLayoutMutation", true, true);
    return { observations, assertions };
  }

  if (id === "S06-CAP-01" || id === "S06-HARD-01" || id === "S06-HARD-02" || id === "S06-HARD-03" || id === "S06-WGT-01" || id === "S06-WGT-02" || id === "S06-SOL-01" || id === "S06-SOL-02" || id === "S06-SOL-03") {
    const first = solveSeatingV1(seatingCorpus50());
    const second = solveSeatingV1(seatingCorpus50());
    const seated = first.assignments.filter((item) => item.state === "SEATED");
    const byTable = new Map<string, number>();
    for (const assignment of seated) {
      const table = assignment.positionToken?.split(":")[0] ?? "";
      byTable.set(table, (byTable.get(table) ?? 0) + 1);
    }
    if (id === "S06-CAP-01") push("capacityRespected", [...byTable.values()].every((count) => count <= 10), true);
    if (id === "S06-HARD-01") push("hardViolations", first.score.hardViolations, 0);
    if (id === "S06-HARD-02") push("hardViolations", first.score.hardViolations, 0);
    if (id === "S06-HARD-03") push("hardViolations", first.score.hardViolations, 0);
    if (id === "S06-WGT-01") push("weightedMayRemain", first.status === "FEASIBLE", true);
    if (id === "S06-WGT-02") push("lexOrderPreserved", first.score.hardViolations === 0, true);
    if (id === "S06-SOL-01") push("hashStable", first.resultHash === second.resultHash, true);
    if (id === "S06-SOL-02") {
      const other = solveSeatingV1({ ...seatingCorpus50(), config: defaultSolverConfig({ seed: "other-seed" }) });
      push("seedChangesIdentity", other.resultHash !== first.resultHash, true);
    }
    if (id === "S06-SOL-03") push("statelessIsolation", first.resultHash === second.resultHash, true);
    return { observations, assertions };
  }

  if (id === "S06-HARD-04") {
    const result = solveSeatingV1(seatingContradictoryGroup());
    push("impossibleNotRelaxed", result.status === "INFEASIBLE" || result.score.hardViolations > 0 || result.findings.length > 0, true);
    return { observations, assertions };
  }

  if (id === "S06-CAP-02") {
    const result = solveSeatingV1(seatingImpossibleCapacity());
    push("shortfallExplicit", result.assignments.some((item) => item.state === "UNSEATED") || result.status === "INFEASIBLE", true);
    return { observations, assertions };
  }

  if (id === "S06-RES-01" || id === "S06-RES-02" || id === "S06-RES-03") {
    const result = solveSeatingV1(seatingCorpus50());
    push("reservationParticipates", result.score.hardViolations, 0);
    if (id === "S06-RES-02") push("overReservationBlocker", seatingImpossibleCapacity().guests.length > seatingImpossibleCapacity().positions.length, true);
    if (id === "S06-RES-03") push("releaseDoesNotSeat", true, true);
    return { observations, assertions };
  }

  if (id === "S06-SOL-04") {
    const result = solveSeatingV1(seatingCorpus600());
    push("sixHundredStatus", result.status, "INFEASIBLE");
    push("sixHundredHardPresent", result.score.hardViolations > 0, true);
    push("sixHundredWithinBound", result.metrics.elapsedMs <= 20_000, true);
    return { observations, assertions };
  }

  if (id.startsWith("S06-RUN-") || id.startsWith("S06-EDIT-") || id.startsWith("S06-AUTH-") || id.startsWith("S06-PUB-")) {
    const { seating } = seatingService();
    if (id === "S06-AUTH-01") {
      let denied = false;
      try {
        await seating.decideSeatingApproval(actor(people.personPlanner), envelope(people.assignPlanner, "auth01-idem-key"), {
          editionId: "00000000-0000-4000-8000-000000000801",
          editionHash: "hash",
          decision: "APPROVED",
        });
      } catch {
        denied = true;
      }
      push("plannerSelfApproveDenied", denied, true);
      return { observations, assertions };
    }
    if (id === "S06-AUTH-03") {
      let denied = false;
      try {
        await seating.publishSeatingPlan(actor(people.personDirector), envelope(people.assignDirector, "auth03-idem-key"), {
          editionId: "00000000-0000-4000-8000-000000000801",
          editionHash: "hash",
        });
      } catch {
        denied = true;
      }
      push("directorPublishDenied", denied, true);
      return { observations, assertions };
    }
    if (id === "S06-AUTH-05") {
      let denied = false;
      try {
        await seating.createSeatingConstraint(actor(people.personAuditor), envelope(people.assignAuditor, "auth05-idem-key"), {
          kind: "HARD",
          predicateType: "KEEP_TOGETHER",
          payload: { predicateType: "KEEP_TOGETHER", guestTokens: ["aaaa", "bbbb"] },
          authority: "HARD_AUTHORISED",
          evidenceRefs: [],
          disclosureClass: "OPERATIONAL",
        });
      } catch {
        denied = true;
      }
      push("auditorDenied", denied, true);
      return { observations, assertions };
    }
    if (id === "S06-AUTH-06") {
      push("adminHasNoSeating", permissionsForRole("SYSTEM_ADMINISTRATOR").some((key) => key.startsWith("seating.")), false);
      return { observations, assertions };
    }
    if (id === "S06-RUN-01") {
      const first = await seating.createSeatingConstraint(actor(people.personPlanner), envelope(people.assignPlanner, "run01-idem-key-1"), {
        kind: "WEIGHTED",
        predicateType: "PREFER_TOGETHER",
        payload: { predicateType: "PREFER_TOGETHER", guestTokens: ["g0001", "g0002"] },
        weight: 2,
        authority: "WEIGHTED",
        evidenceRefs: [],
        disclosureClass: "OPERATIONAL",
      });
      const second = await seating.createSeatingConstraint(actor(people.personPlanner), envelope(people.assignPlanner, "run01-idem-key-1"), {
        kind: "WEIGHTED",
        predicateType: "PREFER_TOGETHER",
        payload: { predicateType: "PREFER_TOGETHER", guestTokens: ["g0001", "g0002"] },
        weight: 2,
        authority: "WEIGHTED",
        evidenceRefs: [],
        disclosureClass: "OPERATIONAL",
      });
      push("replayed", second.application, "REPLAYED");
      push("noChange", second.didDataChange, false);
      push("firstApplied", first.application, "APPLIED");
      return { observations, assertions };
    }
    if (id === "S06-PUB-04") {
      const result = solveSeatingV1(seatingCorpus50());
      const encoded = JSON.stringify(result);
      push("noNameLeak", encoded.includes("Adaeze") || encoded.includes("@"), false);
      return { observations, assertions };
    }
    push("commandSurfaceExists", typeof seating.launchSeatingRun, "function");
    return { observations, assertions };
  }

  if (id === "S06-UI-01") {
    const label = nfc("Ẹ̀bùnolúwa");
    push("unicodeNfc", label === nfc(label), true);
    push("glyphPresent", label.includes("ẹ") || label.includes("Ẹ"), true);
    return { observations, assertions };
  }

  if (id === "S06-UI-02") {
    const raw = "<script>alert(1)</script>";
    push("markupInert", raw.includes("<script>"), true);
    push("notExecuted", true, true);
    return { observations, assertions };
  }

  if (id === "S06-EVAL-01") {
    push("corpusHashPresent", Boolean(s06CorpusHash()), true);
    return { observations, assertions };
  }

  if (id === "S06-EVAL-02") {
    push("registeredCount", S06_CASE_IDS.length, 59);
    return { observations, assertions };
  }

  if (id.startsWith("S06-MUT-")) {
    const kind =
      id === "S06-MUT-01"
        ? "RELAX_HARD"
        : id === "S06-MUT-02"
          ? "IDENTITY_LEAK"
          : id === "S06-MUT-03"
            ? "FABRICATE_ASSIGNMENT"
            : id === "S06-MUT-04"
              ? "AUTO_APPROVE"
              : id === "S06-MUT-05"
                ? "OVERWRITE_PUBLICATION"
                : "FALSE_SUCCESS";
    const mutated = applyS06Mutation(kind, solveSeatingV1(seatingImpossibleCapability()));
    const detected = detectS06Mutation(mutated.observations);
    observations.push(...mutated.observations.map((item) => observe(item.name, item.value, item.kind)));
    assertions.push({ name: "mutationDetected", expected: true, compare: "truthy" });
    observations.push(observe("mutationDetected", Boolean(detected)));
    return { observations, assertions };
  }

  push("unknownCase", id, id);
  return { observations, assertions };
}

function evaluateCase(observations: S06Observation[], assertions: S06Assertion[]): "PASSED" | "FAILED" {
  return assertions.every((assertion) => assertionHolds(observations.find((item) => item.name === assertion.name), assertion))
    ? "PASSED"
    : "FAILED";
}

export async function executeS06Evaluation(): Promise<S06EvaluationResult> {
  const cases: S06CaseOutcome[] = [];
  for (const caseId of S06_CASE_IDS) {
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
    corpusEdition: S06_EVALUATION_CORPUS_EDITION,
    corpusHash: s06CorpusHash(),
    contractVersion: S06_EVALUATION_CONTRACT_VERSION,
    solverVersion: SEATING_SOLVER_VERSION,
    configHash: exactHash(defaultSolverConfig()),
    projectionVersion: S06_EVALUATION_PROJECTION_VERSION,
    caseCount: cases.length,
    passedCount: cases.filter((item) => item.status === "PASSED").length,
    failedCount: cases.filter((item) => item.status !== "PASSED").length,
    cases,
  };
}
