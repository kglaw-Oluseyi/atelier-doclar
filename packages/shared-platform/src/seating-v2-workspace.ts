import { operationalDisplayName } from "./guest-matching.js";
import { S06_V1_STALE_REASON, seatingV2EvalReadiness } from "./seating-evaluation-v2-schemas.js";
import { snapshotGuestCohortAdapter, snapshotLayoutAdapter } from "./seating-adapters.js";
import type { SeatingDisclosure, SeatingWorkspaceView } from "./seating-workspace.js";
import type { SeatingV2State } from "./seating-v2-state.js";
import type { PlatformSnapshot } from "./store.js";

export const LEGACY_S06_PUBLICATION_LABEL = "LEGACY S06 PUBLICATION — not V2 validated";

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
  const latestPkg = eventPackages.at(-1);
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
  const rules = state.ruleEditions.filter((item) => item.eventId === eventId);
  const runs = state.runs.filter((item) => item.eventId === eventId);
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
  const tables = (layout?.tables ?? []).map((table) => ({
    id: table.objectId,
    label: disclosure === "AUDITOR" ? "Published table" : table.objectId.slice(0, 8),
    capacity: table.capacity,
    seated: assignments.filter((item) => item.layoutTableId === table.objectId && item.state === "SEATED").length,
  }));
  const attention: SeatingWorkspaceView["attention"] = [];
  if (!pkg) attention.push({ kind: "blocker", message: "Freeze a V2 input package before solving.", href: "#inputs" });
  if (packageDrifted) {
    attention.push({ kind: "stale", message: "Upstream event information changed. Review and run again.", href: "#inputs" });
  }
  if (evalRun && seatingV2EvalReadiness(evalRun) !== "RELEASE_READY") {
    attention.push({ kind: "warning", message: "s06-eval-v2 is not release-ready.", href: "#overview" });
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
    guests,
    tables,
    constraints: rules.map((item) => ({
      id: item.id,
      kind: item.hardness,
      predicateType: item.kind,
      status: item.lifecycle,
      preview: `${item.kind.replaceAll("_", " ").toLowerCase()} · ${item.hardness} · ${item.lifecycle}`,
      reviewDomain: item.specialistDomain === "NONE" ? undefined : item.specialistDomain,
    })),
    implicatedReviewDomains: [...new Set(rules.filter((item) => item.lifecycle === "ACTIVE" && item.specialistDomain !== "NONE").map((item) => item.specialistDomain))] as SeatingWorkspaceView["implicatedReviewDomains"],
    reviewRequirementCopy: "Specialist review binds the exact submitted plan hash and implicated rule hashes.",
    reservations: state.reservationEditions.filter((item) => item.eventId === eventId).map((item) => ({
      id: item.id,
      setCode: item.contentHash.slice(0, 8),
      releaseState: item.lifecycle,
      min: item.minCount ?? undefined,
      max: item.maxCount ?? undefined,
      exact: item.exactCount ?? undefined,
    })),
    runs: runs.map((item) => {
      const report = item.assignmentsHash
        ? state.validationReports.find((row) => row.assignmentsHash === item.assignmentsHash && row.packageHash === item.packageHash)
        : undefined;
      return {
        id: item.id,
        status: item.status,
        seed: item.deterministicSeed,
        resultHash: item.assignmentsHash ?? undefined,
        seated: state.runAssignments.filter((row) => row.runId === item.id && row.state === "SEATED").length,
        unseated: state.runAssignments.filter((row) => row.runId === item.id && row.state === "UNSEATED").length,
        stale: Boolean(pkg && item.packageId !== pkg.id),
        validatorVerdict: report?.verdict,
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
      total: tables.reduce((sum, item) => sum + item.capacity, 0),
      reservedMin: 0,
      reservedMax: 0,
      generallyAvailable: tables.reduce((sum, item) => sum + item.capacity, 0) - assignments.filter((item) => item.state === "SEATED").length,
      overbooked: false,
    },
    attention,
    nextAction,
    evaluation: evalRun
      ? { caseCount: evalRun.caseCount, status: evalRun.status, corpusEdition: evalRun.corpusEdition }
      : { caseCount: 0, status: "STALE", corpusEdition: `s06-eval-v1 (${S06_V1_STALE_REASON})` },
    counts: {
      eligibleGuests: guests.filter((item) => item.eligible).length,
      seated: assignments.filter((item) => item.state === "SEATED").length,
      unseated: assignments.filter((item) => item.state === "UNSEATED").length,
      hardBlockers: runs.filter((item) => item.status === "INFEASIBLE").length,
    },
    blockers: [],
  };
}
