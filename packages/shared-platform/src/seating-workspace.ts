import { operationalDisplayName } from "./guest-matching.js";
import type { PlatformSnapshot } from "./store.js";
import type { SeatingState } from "./seating-schemas.js";
import type { SeatingWorkspaceProjection } from "./seating-repository.js";
import { snapshotBriefAdapter, snapshotGuestCohortAdapter, snapshotLayoutAdapter, snapshotProtectionAdapter } from "./seating-adapters.js";
import { PlatformError } from "./errors.js";

export type SeatingDisclosure = "PLANNER" | "DIRECTOR" | "CEO" | "AUDITOR" | "ADMIN";

export type SeatingWorkspaceView = SeatingWorkspaceProjection & {
  eventName: string;
  inputFreshness: "MISSING" | "CURRENT" | "STALE";
  freshnessCopy?: string;
  guests: Array<{ id: string; label: string; eligible: boolean; eligibilityCode: string; seated: boolean; tableLabel?: string }>;
  tables: Array<{
    id: string;
    label: string;
    capacity: number;
    seated: number;
    positionSource?: "PHYSICAL" | "DECLARED_SYNTHETIC";
    declaredCapacity?: number;
    physicalPositionCount?: number;
    mismatch?: boolean;
  }>;
  constraints: Array<{
    id: string;
    kind: string;
    predicateType: string;
    status: string;
    preview: string;
    reviewDomain?: string;
    contentHash?: string;
    editionNo?: number;
    /** AUTHORITATIVE governing rule, REDUNDANT_HISTORICAL ACTIVE duplicate, or draft blocked by ACTIVE peer. */
    duplicateRole?: "AUTHORITATIVE" | "REDUNDANT_HISTORICAL" | "ALREADY_ACTIVE_DRAFT";
    authoritativeEditionId?: string;
    redundantActiveCount?: number;
    /** ACTIVE HARD rule that logically contradicts this HARD draft (activation blocked). */
    hardConflictEditionId?: string;
    hardConflictKind?: string;
    /** Content-hash prefix of the conflicting ACTIVE edition (distinct from edition ID). */
    hardConflictContentHashPrefix?: string;
  }>;
  implicatedReviewDomains: Array<"PROTOCOL" | "ACCESSIBILITY" | "SECURITY">;
  reviewRequirementCopy: string;
  reservations: Array<{
    id: string;
    setCode: string;
    releaseState: string;
    min?: number;
    max?: number;
    exact?: number;
    preview?: string;
    reservationId?: string;
    contentHash?: string;
    editionNo?: number;
    subjects?: string;
    target?: string;
    authority?: string;
  }>;
  currentRunId?: string;
  runs: Array<{
    id: string;
    status: string;
    seed: string;
    resultHash?: string;
    seated?: number;
    unseated?: number;
    stale: boolean;
    current?: boolean;
    validatorVerdict?: string;
    validatorVersion?: string;
    violatedSummary?: string;
    /** ISO timestamp for operator display (started/created). */
    startedAt?: string;
    /** Explicit when the durable run record does not retain an initiating actor. */
    initiatingActorLabel?: string;
  }>;
  reviews: Array<{ id: string; domain: string; decision: string; reviewerLabel: string; reason: string; createdAt: string }>;
  approvals: Array<{ id: string; decision: string; createdAt: string }>;
  publications: Array<{ id: string; status: string; publicationNumber: number; editionHash: string; publishedAt: string }>;
  exports: Array<{ id: string; format: string; status: string; projectionClass: string }>;
  decisions: Array<{ id: string; command: string; createdAt: string; reasonCode: string }>;
  workingAssignments: Array<{ guestId: string; guestLabel: string; positionId?: string; tableId?: string; state: string; lockState: string }>;
  positions: Array<{ id: string; positionToken: string; tableToken: string }>;
  capacityLedger: { total: number; reservedMin: number; reservedMax: number; generallyAvailable: number; overbooked: boolean };
  attention: Array<{ kind: "blocker" | "stale" | "review" | "warning"; message: string; href: string }>;
  nextAction: string;
  evaluation?: { caseCount: number; status?: string; corpusEdition?: string };
  seatingLayoutBinding?: {
    status: "BOUND" | "ABSENT" | "AMBIGUOUS" | "STALE" | "MISMATCH";
    layoutLabel?: string;
    publicationNumber?: number;
    tableCount?: number;
    physicalCapacity?: number;
    declaredCapacity?: number;
    contentHashPrefix?: string;
    freezeDisabled?: boolean;
    draftId?: string;
    draftLayoutLabel?: string;
    draftPublicationId?: string;
    draftPublicationNumber?: number;
    draftContentHash?: string;
    draftContentHashPrefix?: string;
    draftVersion?: number;
    draftProposedByLabel?: string;
    draftProposedAt?: string;
    draftStatus?: "DRAFT";
    activeId?: string;
    activeVersion?: number;
    activeLayoutLabel?: string;
    activeContentHashPrefix?: string;
  };
  seatingLayoutBindingCandidates?: Array<{
    layoutLabel: string;
    publicationNumber: number;
    tableCount: number;
    physicalCapacity: number;
    declaredCapacity: number;
    layoutId: string;
    publicationId: string;
    contentHash: string;
  }>;
  seatingLayoutBindingHistory?: Array<{
    state: string;
    publicationNumber?: number;
    contentHashPrefix?: string;
  }>;
  inputPackageHistory?: Array<{
    contentHash: string;
    layoutContentHash: string;
    current: boolean;
  }>;
};

export function implicatedSeatingReviewDomains(
  state: Pick<SeatingState, "constraints">,
  eventId: string,
): Array<"PROTOCOL" | "ACCESSIBILITY" | "SECURITY"> {
  const named = new Set<"PROTOCOL" | "ACCESSIBILITY" | "SECURITY">();
  for (const item of state.constraints) {
    if (item.eventId !== eventId || item.status === "REJECTED" || !item.reviewDomain) continue;
    named.add(item.reviewDomain);
  }
  return (["PROTOCOL", "ACCESSIBILITY", "SECURITY"] as const).filter((domain) => named.has(domain));
}

function personLabel(snap: PlatformSnapshot, personId: string, disclosure: SeatingDisclosure): string {
  if (disclosure === "AUDITOR") return "Permission-safe reviewer";
  const person = snap.persons.find((item) => item.id === personId);
  return person?.displayName ?? "Authorised staff";
}

export function buildSeatingWorkspace(
  snap: PlatformSnapshot,
  state: SeatingState,
  eventId: string,
  disclosure: SeatingDisclosure,
): SeatingWorkspaceView {
  const event = snap.events.find((item) => item.id === eventId);
  const organisationId = event?.organisationId ?? "";
  const publication = state.publications.find((item) => item.eventId === eventId && item.status === "CURRENT");
  const working = state.planEditions.find((item) => item.eventId === eventId && item.currentWorking);
  const input = state.inputEditions.find((item) => item.eventId === eventId && item.current);
  const assignments = working ? state.planAssignments.filter((item) => item.editionId === working.id) : [];
  const cohort = snapshotGuestCohortAdapter(snap, eventId);
  let layout: ReturnType<typeof snapshotLayoutAdapter> | undefined;
  try {
    layout = snapshotLayoutAdapter(snap, organisationId, eventId);
  } catch (error) {
    if (!(error instanceof PlatformError)) throw error;
  }
  const brief = snapshotBriefAdapter(snap, eventId);
  const protection = snapshotProtectionAdapter(snap, eventId);
  const upstreamChanged =
    Boolean(input) &&
    (input!.guestCohortHash !== cohort.cohortHash ||
      input!.rsvpTruthHash !== cohort.rsvpTruthHash ||
      (layout && input!.layoutContentHash !== layout.contentHash) ||
      (brief.contentHash && input!.eventBriefContentHash !== brief.contentHash) ||
      (protection.snapshotHash && input!.protectionSnapshotHash !== protection.snapshotHash));
  const inputFreshness: SeatingWorkspaceView["inputFreshness"] = !layout ? "MISSING" : !input ? "MISSING" : upstreamChanged ? "STALE" : "CURRENT";
  const guests = cohort.guests.map((guest) => {
    const record = snap.operationalGuests.find((item) => item.id === guest.eventGuestId);
    const seated = assignments.find((item) => item.eventGuestId === guest.eventGuestId);
    return {
      id: guest.eventGuestId,
      label: disclosure === "AUDITOR" ? "Guest" : record ? operationalDisplayName(record) : "Guest",
      eligible: guest.eligible,
      eligibilityCode: guest.eligibilityCode,
      seated: seated?.state === "SEATED",
      tableLabel: seated?.tableId,
    };
  });
  const tables = (layout?.tables ?? []).map((table) => ({
    id: table.objectId,
    label: `Table ${table.objectId.slice(0, 8)}`,
    capacity: table.capacity,
    seated: assignments.filter((item) => item.tableId === table.objectId && item.state === "SEATED").length,
    positionSource: table.positionSource,
    declaredCapacity: table.declaredCapacity,
    physicalPositionCount: table.physicalPositionCount,
    mismatch: table.mismatch,
  }));
  const reservedMin = state.reservationBlocks
    .filter((item) => item.eventId === eventId && item.releaseState === "ACTIVE")
    .reduce((sum, item) => sum + (item.exactCount ?? item.minCount ?? 0), 0);
  const reservedMax = state.reservationBlocks
    .filter((item) => item.eventId === eventId && item.releaseState === "ACTIVE")
    .reduce((sum, item) => sum + (item.exactCount ?? item.maxCount ?? item.minCount ?? 0), 0);
  const total = tables.reduce((sum, item) => sum + item.capacity, 0);
  const overbooked = reservedMin > total && total > 0;
  const blockers = state.findings
    .filter((item) => item.eventId === eventId && item.severity === "BLOCKER" && item.state === "OPEN")
    .map((item) => ({ code: item.code, message: item.code === "INFEASIBLE" ? "No safe seating plan satisfies every hard rule." : item.code }));
  const attention: SeatingWorkspaceView["attention"] = [];
  if (!layout) attention.push({ kind: "blocker", message: "No venue layout tables are available for seating. Bind a current layout publication before freeze.", href: "#inputs" });
  if (overbooked) attention.push({ kind: "blocker", message: "Reserved minima exceed published capacity.", href: "#reservations" });
  if (tables.some((item) => item.mismatch)) {
    attention.push({
      kind: "blocker",
      message: "Physical seat count and declared capacity disagree. Correct the layout before freezing a seating package.",
      href: "#inputs",
    });
  }
  if (inputFreshness === "STALE") attention.push({ kind: "stale", message: "Upstream event information changed. Review and run again.", href: "#inputs" });
  const implicatedReviewDomains = implicatedSeatingReviewDomains(state, eventId);
  const outstandingReviews = working
    ? implicatedReviewDomains.filter(
        (domain) => !state.reviews.some((item) => item.editionId === working.id && item.domain === domain && item.decision === "APPROVED"),
      )
    : [];
  const reviewRequirementCopy = implicatedReviewDomains.length
    ? `This plan requires specialist review for ${implicatedReviewDomains.join(", ")} because coded constraints name those domains.`
    : "This plan has no specialist review domain. Event Director approval may proceed.";
  if (working?.status === "SUBMITTED" && outstandingReviews.length) {
    attention.push({ kind: "review", message: `Outstanding specialist reviews: ${outstandingReviews.join(", ")}.`, href: "#review" });
  }
  if (guests.some((item) => item.eligible && !item.seated && working)) {
    attention.push({ kind: "warning", message: "This guest remains unseated; the system did not invent a placement.", href: "#studio" });
  }
  const nextAction = !layout
    ? "Publish a current venue layout before seating can freeze inputs."
    : !input
      ? "Freeze a new input edition from current guest, RSVP and layout truth."
      : inputFreshness === "STALE"
        ? "Review changed upstream information and freeze a successor input edition."
        : !state.runs.some((item) => item.eventId === eventId)
          ? "Launch a seating run from the frozen input."
          : !working
            ? "Adopt a feasible run into a working draft."
            : working.status === "DRAFT"
              ? "Edit in Studio or submit the working edition."
            : working.status === "SUBMITTED"
              ? outstandingReviews.length
                ? `Complete ${outstandingReviews.join(", ")} specialist review, then Event Director approval.`
                : "Complete Event Director approval."
              : working.status === "APPROVED"
                  ? "Publish the approved edition. This does not send messages or change check-in."
                  : "Inspect the current publication.";
  return {
    eventId,
    organisationId,
    eventName: event?.name ?? "Event",
    currentPublication: publication,
    workingEdition: working,
    inputEdition: input,
    currentRunId: working?.sourceRunId && state.runs.some((item) => item.id === working.sourceRunId) ? working.sourceRunId : undefined,
    blockers,
    counts: {
      eligibleGuests: guests.filter((item) => item.eligible).length,
      seated: assignments.filter((item) => item.state === "SEATED").length,
      unseated: assignments.filter((item) => item.state === "UNSEATED").length,
      hardBlockers: blockers.length + (overbooked ? 1 : 0) + (!layout ? 1 : 0),
    },
    inputFreshness,
    freshnessCopy:
      inputFreshness === "STALE"
        ? "Upstream event information changed. Review and run again."
        : inputFreshness === "MISSING"
          ? "No frozen seating input exists yet."
          : "Frozen input matches current upstream hashes.",
    guests,
    tables,
    constraints: state.constraints
      .filter((item) => item.eventId === eventId)
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        predicateType: item.predicateType,
        status: item.status,
        preview: `${item.kind === "HARD" ? "Must" : item.kind === "WEIGHTED" ? "Prefer" : "Note"} ${item.predicateType.replaceAll("_", " ").toLowerCase()}`,
        reviewDomain: item.reviewDomain,
      })),
    reservations: state.reservationBlocks
      .filter((item) => item.eventId === eventId)
      .map((item) => ({
        id: item.id,
        setCode: item.eligibleSetCode,
        releaseState: item.releaseState,
        min: item.minCount,
        max: item.maxCount,
        exact: item.exactCount,
      })),
    runs: state.runs
      .filter((item) => item.eventId === eventId)
      .map((item) => ({
        id: item.id,
        status: item.status,
        seed: item.seed,
        resultHash: item.resultHash,
        seated: state.runAssignments.filter((assignment) => assignment.runId === item.id && assignment.state === "SEATED").length,
        unseated: state.runAssignments.filter((assignment) => assignment.runId === item.id && assignment.state === "UNSEATED").length,
        stale: Boolean(input && item.inputHash !== input.contentHash),
        current: Boolean(working?.sourceRunId && item.id === working.sourceRunId),
        startedAt: item.createdAt,
        initiatingActorLabel: item.createdBy ? personLabel(snap, item.createdBy, disclosure) : undefined,
      })),
    reviews: state.reviews
      .filter((item) => item.eventId === eventId)
      .map((item) => ({
        id: item.id,
        domain: item.domain,
        decision: item.decision,
        reviewerLabel: personLabel(snap, item.reviewerPersonId, disclosure),
        reason: disclosure === "AUDITOR" ? "Redacted evidence" : item.reason,
        createdAt: item.createdAt,
      })),
    approvals: state.approvals.filter((item) => item.eventId === eventId).map((item) => ({ id: item.id, decision: item.decision, createdAt: item.createdAt })),
    publications: state.publications
      .filter((item) => item.eventId === eventId)
      .map((item) => ({
        id: item.id,
        status: item.status,
        publicationNumber: item.publicationNumber,
        editionHash: item.editionHash,
        publishedAt: item.publishedAt,
      })),
    exports: state.exportJobs
      .filter((item) => item.eventId === eventId)
      .map((item) => ({ id: item.id, format: item.format, status: item.status, projectionClass: item.projectionClass })),
    decisions: state.manualDecisions
      .filter((item) => item.eventId === eventId)
      .map((item) => ({ id: item.id, command: item.command, createdAt: item.createdAt, reasonCode: item.reasonCode })),
    positions: state.positions
      .filter((item) => item.eventId === eventId)
      .map((item) => ({ id: item.id, positionToken: item.positionToken, tableToken: item.tableToken })),
    workingAssignments: assignments.map((item) => ({
      guestId: item.eventGuestId,
      guestLabel: guests.find((guest) => guest.id === item.eventGuestId)?.label ?? "Guest",
      positionId: item.positionId,
      tableId: item.tableId,
      state: item.state,
      lockState: item.lockState,
    })),
    capacityLedger: {
      total,
      reservedMin,
      reservedMax,
      generallyAvailable: Math.max(0, total - reservedMin),
      overbooked,
    },
    implicatedReviewDomains,
    reviewRequirementCopy,
    attention,
    nextAction,
    evaluation: state.evaluationRuns.at(-1)
      ? {
          caseCount: state.evaluationRuns.at(-1)!.caseCount,
          status: state.evaluationRuns.at(-1)!.status,
          corpusEdition: state.evaluationRuns.at(-1)!.corpusEdition,
        }
      : undefined,
  };
}

export function seatingDisclosureForRole(roleKey: string | undefined): SeatingDisclosure {
  if (roleKey === "READ_ONLY_AUDITOR") return "AUDITOR";
  if (roleKey === "EVENT_DIRECTOR") return "DIRECTOR";
  if (roleKey === "CEO") return "CEO";
  if (roleKey === "SYSTEM_ADMINISTRATOR") return "ADMIN";
  return "PLANNER";
}
