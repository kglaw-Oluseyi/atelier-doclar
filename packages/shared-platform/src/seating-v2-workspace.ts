import { operationalDisplayName } from "./guest-matching.js";
import {
  S06_V1_STALE_REASON,
  S06_V2_EVALUATION_CORPUS_EDITION,
  S06_V2_PRIOR_CORPUS_STALE_REASON,
  seatingV2EvalReadiness,
} from "./seating-evaluation-v2-schemas.js";
import { snapshotGuestCohortAdapter, snapshotLayoutAdapter } from "./seating-adapters.js";
import { seatingV2RuleSemanticSentence } from "./seating-v2-authoring.js";
import { SEATING_V2_VALIDATOR_VERSION } from "./seating-v2-schemas.js";
import type { SeatingDisclosure, SeatingWorkspaceView } from "./seating-workspace.js";
import type { SeatingV2State } from "./seating-v2-state.js";
import type { PlatformSnapshot } from "./store.js";

export const LEGACY_S06_PUBLICATION_LABEL = "LEGACY S06 PUBLICATION — not V2 validated";

export function currentSeatingV2RunId(
  state: Pick<SeatingV2State, "eventCurrent" | "publications" | "planEditions" | "runs">,
  eventId: string,
): string | undefined {
  const currentPointer = state.eventCurrent.find((item) => item.eventId === eventId);
  const publication = currentPointer?.currentPublicationId
    ? state.publications.find((item) => item.id === currentPointer.currentPublicationId)
    : state.publications.find((item) => item.eventId === eventId && item.status === "CURRENT");
  const publishedEdition = publication
    ? state.planEditions.find((item) => item.id === publication.planEditionId)
    : undefined;
  const submitted = currentPointer?.submittedEditionId
    ? state.planEditions.find((item) => item.id === currentPointer.submittedEditionId)
    : undefined;
  const working = currentPointer?.workingEditionId
    ? state.planEditions.find((item) => item.id === currentPointer.workingEditionId)
    : undefined;
  const governing = publishedEdition ?? submitted ?? working;
  const runId = governing?.sourceRunId ?? undefined;
  if (!runId) return undefined;
  return state.runs.some((run) => run.eventId === eventId && run.id === runId) ? runId : undefined;
}

function sameIdSet(ids: string[], expected: Set<string>): boolean {
  if (ids.length !== expected.size) return false;
  return ids.every((id) => expected.has(id));
}

export function buildSeatingV2Workspace(
  snap: PlatformSnapshot,
  state: SeatingV2State,
  eventId: string,
  disclosure: SeatingDisclosure,
  legacyPublication?: { id: string; publicationNumber: number; editionHash: string; publishedAt: string },
): SeatingWorkspaceView {
  const event = snap.events.find((item) => item.id === eventId);
  const organisationId = event?.organisationId ?? "";
  const currentPointer = state.eventCurrent.find((item) => item.eventId === eventId);
  const publication = state.publications.find((item) => item.id === currentPointer?.currentPublicationId)
    ?? state.publications.find((item) => item.eventId === eventId && item.status === "CURRENT");
  const working = currentPointer
    ? state.planEditions.find((item) => item.id === currentPointer.workingEditionId)
    : state.planEditions.filter((item) => item.eventId === eventId && item.status === "WORKING").at(-1);
  const submitted = currentPointer
    ? state.planEditions.find((item) => item.id === currentPointer.submittedEditionId)
    : state.planEditions.filter((item) => item.eventId === eventId && item.status === "SUBMITTED").at(-1);
  const edition = submitted ?? working;
  const eventPackages = state.inputPackages
    .filter((item) => item.eventId === eventId)
    .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));
  const rules = state.ruleEditions.filter((item) => item.eventId === eventId);
  const activeRuleIds = new Set(rules.filter((item) => item.lifecycle === "ACTIVE").map((item) => item.id));
  const activeReservations = state.reservationEditions.filter((item) => item.eventId === eventId && item.lifecycle === "ACTIVE");
  const activeReservationIds = new Set(activeReservations.map((item) => item.id));
  const currentInputPackages = eventPackages.filter((item) => {
    const packagedRules = state.packageRules.filter((row) => row.packageId === item.id).map((row) => row.ruleEditionId);
    const packagedReservations = state.packageReservations
      .filter((row) => row.packageId === item.id)
      .map((row) => row.reservationEditionId);
    return sameIdSet(packagedRules, activeRuleIds) && sameIdSet(packagedReservations, activeReservationIds);
  });
  const latestPkg = currentInputPackages.at(-1) ?? eventPackages.at(-1);
  const editionPkg = edition ? state.inputPackages.find((item) => item.id === edition.packageId) : undefined;
  const packageDrifted = Boolean(edition && latestPkg && edition.packageId !== latestPkg.id);
  const pkg = latestPkg ?? editionPkg;
  const assignments = edition ? state.planAssignments.filter((item) => item.planEditionId === edition.id) : [];
  const cohort = snapshotGuestCohortAdapter(snap, eventId);
  let layout: ReturnType<typeof snapshotLayoutAdapter> | undefined;
  try {
    layout = snapshotLayoutAdapter(snap, organisationId, eventId);
  } catch {
    layout = undefined;
  }
  const runs = state.runs.filter((item) => item.eventId === eventId);
  const currentRunId = currentSeatingV2RunId(state, eventId);
  const evalRun = state.evaluationRuns.at(-1);
  const inputFreshness = !layout ? "MISSING" : !pkg ? "MISSING" : packageDrifted ? "STALE" : "CURRENT";
  const guests = cohort.guests.map((guest) => {
    const person = snap.operationalGuests.find((item) => item.id === guest.eventGuestId);
    const seated = assignments.find((item) => item.eventGuestId === guest.eventGuestId);
    return {
      id: guest.eventGuestId,
      label: disclosure === "AUDITOR" ? "Permission-safe guest" : person ? operationalDisplayName(person) : "Guest",
      eligible: guest.eligible,
      eligibilityCode: guest.eligibilityCode,
      seated: seated?.state === "SEATED",
      tableLabel: seated?.layoutTableId ?? undefined,
    };
  });
  const tables = (layout?.tables ?? []).map((table, index) => {
    const sourceWording = table.positionSource === "PHYSICAL" ? "physical seats" : "declared synthesised seats";
    return {
      id: disclosure === "AUDITOR" ? `published-table-${index + 1}` : table.objectId,
      label:
        disclosure === "AUDITOR"
          ? `Published table · ${table.capacity} ${sourceWording}`
          : `Table ${index + 1} · ${table.capacity} ${sourceWording}`,
      capacity: table.capacity,
      seated: assignments.filter(
        (item) =>
          item.state === "SEATED" &&
          (item.layoutTableId === table.objectId || item.layoutTableId === table.tableToken),
      ).length,
      positionSource: table.positionSource,
      declaredCapacity: table.declaredCapacity,
      physicalPositionCount: table.physicalPositionCount,
      mismatch: table.mismatch,
    };
  });
  const reservedMin = activeReservations.reduce((sum, item) => sum + (item.exactCount ?? item.minCount ?? 0), 0);
  const reservedMax = activeReservations.reduce((sum, item) => sum + (item.exactCount ?? item.maxCount ?? item.minCount ?? 0), 0);
  const total = tables.reduce((sum, item) => sum + item.capacity, 0);
  const overbooked = reservedMin > total && total > 0;
  const latestCurrentReport = [...state.validationReports]
    .filter((row) => row.eventId === eventId && row.validatorVersion === SEATING_V2_VALIDATOR_VERSION)
    .at(-1);
  const hardBlockers = latestCurrentReport
    ? state.validationRuleOutcomes.filter((row) => row.reportId === latestCurrentReport.id && row.outcome === "VIOLATED").length +
      state.validationStructuralOutcomes.filter((row) => row.reportId === latestCurrentReport.id && row.outcome === "FAILED").length
    : rules.filter((item) => item.lifecycle === "ACTIVE" && item.hardness === "HARD").length;
  const attention: SeatingWorkspaceView["attention"] = [];
  if (!pkg) attention.push({ kind: "blocker", message: "Freeze a V2 input package before solving.", href: "#inputs" });
  if (overbooked) attention.push({ kind: "blocker", message: "Reserved minima exceed published capacity.", href: "#reservations" });
  if (tables.some((item) => item.mismatch)) {
    attention.push({
      kind: "blocker",
      message: "Physical seat count and declared capacity disagree. Correct the layout before freezing a seating package.",
      href: "#inputs",
    });
  }
  if (packageDrifted) {
    attention.push({ kind: "stale", message: "Upstream event information changed. Review and run again.", href: "#inputs" });
  }
  if (evalRun && seatingV2EvalReadiness(evalRun) !== "RELEASE_READY") {
    attention.push({
      kind: "warning",
      message:
        evalRun.corpusEdition !== S06_V2_EVALUATION_CORPUS_EDITION
          ? `Prior evaluation ${evalRun.corpusEdition} is STALE. ${S06_V2_PRIOR_CORPUS_STALE_REASON}.`
          : `${S06_V2_EVALUATION_CORPUS_EDITION} is not release-ready.`,
      href: "#overview",
    });
  }
  const nextAction = !pkg
    ? "Freeze inputs"
    : packageDrifted || !edition
      ? "Launch and adopt a validator-FEASIBLE run"
      : edition.status === "WORKING"
        ? "Submit the working edition"
        : edition.status === "SUBMITTED"
          ? "Record required reviews and approve"
          : "Publish a distinct CEO decision";
  return {
    eventId,
    organisationId,
    eventName: event?.name ?? "Event",
    inputFreshness,
    freshnessCopy: pkg ? `V2 package ${pkg.contentHash.slice(0, 12)}` : "No V2 package is frozen.",
    currentPublication: publication
      ? { id: publication.id, publicationNumber: publication.publicationNo, editionHash: publication.planContentHash, status: publication.status }
      : legacyPublication
        ? { id: legacyPublication.id, publicationNumber: legacyPublication.publicationNumber, editionHash: legacyPublication.editionHash, status: "CURRENT" }
        : undefined,
    workingEdition: edition ? { id: edition.id, contentHash: edition.contentHash, status: edition.status, version: edition.version } : undefined,
    inputEdition: pkg ? { id: pkg.id, contentHash: pkg.contentHash } : undefined,
    currentRunId,
    guests,
    tables,
    constraints: rules.map((item) => {
      const subjectLabels = state.ruleSubjects
        .filter((subject) => subject.ruleEditionId === item.id)
        .map((subject) => guests.find((guest) => guest.id === subject.subjectId)?.label ?? "Guest");
      const targetLabels = state.ruleTargets
        .filter((target) => target.ruleEditionId === item.id)
        .map((target) => tables.find((table) => table.id === target.targetIdOrCode)?.label ?? target.targetIdOrCode);
      const subjectCopy = subjectLabels.length ? subjectLabels.join(" and ") : "named subjects";
      const targetCopy = targetLabels.length ? ` at ${targetLabels.join(", ")}` : "";
      const sentence = seatingV2RuleSemanticSentence({
        kind: item.kind,
        subjectLabels,
        tableLabels: targetLabels,
      });
      const authority = item.activatedByPersonId
        ? "Activated by an authorised checker"
        : item.createdByPersonId
          ? "Drafted by the planner"
          : "No author recorded";
      const decidedAt = item.activatedAt ?? item.createdAt;
      return {
        id: item.id,
        kind: item.hardness,
        predicateType: item.kind,
        status: item.lifecycle,
        preview: `${item.kind.replaceAll("_", " ")} · ${item.scope} · ${subjectCopy}${targetCopy} · ${item.hardness} · ${item.lifecycle} · ${authority} · ${decidedAt} · ${sentence} · ${item.contentHash.slice(0, 12)}`,
        reviewDomain: item.specialistDomain === "NONE" ? undefined : item.specialistDomain,
      };
    }),
    implicatedReviewDomains: [...new Set(rules.filter((item) => item.lifecycle === "ACTIVE" && item.specialistDomain !== "NONE").map((item) => item.specialistDomain))] as SeatingWorkspaceView["implicatedReviewDomains"],
    reviewRequirementCopy: "Specialist review binds the exact submitted plan hash and implicated rule hashes.",
    reservations: state.reservationEditions.filter((item) => item.eventId === eventId).map((item) => {
      const members = state.reservationMembers
        .filter((member) => member.reservationEditionId === item.id)
        .map((member) => guests.find((guest) => guest.id === member.eventGuestId)?.label ?? "Guest");
      const targets = state.reservationTargets
        .filter((target) => target.reservationEditionId === item.id)
        .map((target) =>
          target.targetType === "TABLE"
            ? tables.find((table) => table.id === target.targetIdOrCode)?.label ?? "published table"
            : `${target.targetType.toLowerCase()} ${target.targetIdOrCode}`,
        );
      const count =
        item.exactCount != null
          ? `exact ${item.exactCount}`
          : [item.minCount != null ? `min ${item.minCount}` : null, item.maxCount != null ? `max ${item.maxCount}` : null]
              .filter(Boolean)
              .join(" · ") || "capacity reserved";
      const authority = item.activatedByPersonId
        ? "Activated by an authorised checker"
        : item.createdByPersonId
          ? "Drafted by the planner"
          : "No activation recorded";
      const subjects = members.length ? members.join(", ") : "Eligible attending guests";
      const target = targets.length ? targets.join(", ") : "Any published table";
      return {
        id: item.id,
        setCode: `${item.lifecycle} reservation`,
        releaseState: item.lifecycle,
        min: item.minCount ?? undefined,
        max: item.maxCount ?? undefined,
        exact: item.exactCount ?? undefined,
        preview: `${subjects} · ${target} · ${count} · ${item.lifecycle} · ${authority}`,
        reservationId: item.reservationId,
        contentHash: item.contentHash,
        editionNo: item.editionNo,
        subjects,
        target,
        authority,
      };
    }),
    runs: runs.map((item) => {
      const report = item.assignmentsHash
        ? state.validationReports.find((row) => row.assignmentsHash === item.assignmentsHash && row.packageHash === item.packageHash)
        : undefined;
      const ruleOutcomes = report
        ? state.validationRuleOutcomes.filter((row) => row.reportId === report.id && row.outcome === "VIOLATED")
        : [];
      const structuralFailures = report
        ? state.validationStructuralOutcomes.filter((row) => row.reportId === report.id && row.outcome === "FAILED")
        : [];
      const violatedSummary = [...ruleOutcomes.map((row) => row.typedReasonCodes.join(" ")), ...structuralFailures.map((row) => row.checkCode)]
        .filter(Boolean)
        .join(" · ");
      return {
        id: item.id,
        status: item.status,
        seed: item.deterministicSeed,
        resultHash: item.assignmentsHash ?? undefined,
        seated: state.runAssignments.filter((row) => row.runId === item.id && row.state === "SEATED").length,
        unseated: state.runAssignments.filter((row) => row.runId === item.id && row.state === "UNSEATED").length,
        stale: Boolean(pkg && item.packageId !== pkg.id),
        current: item.id === currentRunId,
        validatorVerdict: report?.validatorVersion === SEATING_V2_VALIDATOR_VERSION ? report.verdict : undefined,
        validatorVersion: report?.validatorVersion,
        violatedSummary: violatedSummary || undefined,
      };
    }),
    reviews: state.specialistReviews.filter((item) => item.eventId === eventId).map((item) => ({
      id: item.id,
      domain: item.domain,
      decision: item.decision,
      reviewerLabel: disclosure === "AUDITOR" ? "Permission-safe reviewer" : "Specialist reviewer",
      reason: item.reason,
      createdAt: item.recordedAt,
    })),
    approvals: state.operationalApprovals.filter((item) => item.eventId === eventId).map((item) => ({
      id: item.id,
      decision: item.decision,
      createdAt: item.recordedAt,
    })),
    publications: [
      ...state.publications.filter((item) => item.eventId === eventId).map((item) => ({
        id: item.id,
        status: item.status,
        publicationNumber: item.publicationNo,
        editionHash: item.planContentHash,
        publishedAt: item.publishedAt,
      })),
      ...(legacyPublication && !publication
        ? [{ id: legacyPublication.id, status: "CURRENT", publicationNumber: legacyPublication.publicationNumber, editionHash: legacyPublication.editionHash, publishedAt: legacyPublication.publishedAt }]
        : []),
    ],
    exports: state.exportJobs.filter((item) => item.eventId === eventId).map((item) => ({
      id: item.id,
      format: item.format,
      status: item.status,
      projectionClass: item.projectionClass,
    })),
    decisions: state.manualDecisions.filter((item) => item.eventId === eventId).map((item) => ({
      id: item.id,
      command: item.commandType,
      createdAt: item.appliedAt,
      reasonCode: item.reasonCode,
    })),
    workingAssignments: assignments.map((item) => ({
      guestId: item.eventGuestId,
      guestLabel: guests.find((guest) => guest.id === item.eventGuestId)?.label ?? "Guest",
      positionId: item.logicalPositionId ?? undefined,
      tableId: item.layoutTableId ?? undefined,
      state: item.state,
      lockState: item.lockState,
    })),
    positions: state.packagePositions.filter((item) => item.packageId === pkg?.id).map((item) => ({
      id: item.id,
      positionToken: item.positionToken,
      tableToken: item.layoutTableId,
    })),
    capacityLedger: {
      total,
      reservedMin,
      reservedMax,
      generallyAvailable: Math.max(0, total - reservedMin),
      overbooked,
    },
    attention,
    nextAction,
    evaluation:
      evalRun && evalRun.corpusEdition === S06_V2_EVALUATION_CORPUS_EDITION
        ? { caseCount: evalRun.caseCount, status: evalRun.status, corpusEdition: evalRun.corpusEdition }
        : evalRun
          ? {
              caseCount: evalRun.caseCount,
              status: "STALE",
              corpusEdition: `${evalRun.corpusEdition} (${S06_V2_PRIOR_CORPUS_STALE_REASON})`,
            }
          : { caseCount: 0, status: "STALE", corpusEdition: `s06-eval-v1 (${S06_V1_STALE_REASON})` },
    counts: {
      eligibleGuests: guests.filter((item) => item.eligible).length,
      seated: assignments.filter((item) => item.state === "SEATED").length,
      unseated: assignments.filter((item) => item.state === "UNSEATED").length,
      hardBlockers,
    },
    blockers: [],
  };
}
