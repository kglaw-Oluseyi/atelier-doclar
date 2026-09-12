import { createHmac } from "node:crypto";
import { canonicalJson, exactHash } from "./eec-hash.js";
import {
  SEATING_V2_SOLVER_VERSION,
  SeatingV2CompiledRequestSchema,
  type SeatingV2CompiledRequest,
  type SeatingV2RuleContent,
  type SeatingV2Subject,
  type SeatingV2Target,
} from "./seating-v2-schemas.js";

export function sortByTypeAndId<T extends { type: string; id?: string; idOrCode?: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const typeOrder = left.type.localeCompare(right.type);
    if (typeOrder !== 0) return typeOrder;
    return String(left.id ?? left.idOrCode ?? "").localeCompare(String(right.id ?? right.idOrCode ?? ""));
  });
}

export function seatingV2RuleContentHash(content: SeatingV2RuleContent): string {
  return exactHash({
    kind: content.kind,
    hardness: content.hardness,
    weight: content.hardness === "SOFT" ? content.weight : null,
    scope: content.scope,
    specialistDomain: content.specialistDomain,
    subjects: sortByTypeAndId(content.subjects).map((item) => ({ type: item.type, id: item.id })),
    targets: sortByTypeAndId(content.targets).map((item) => ({ type: item.type, idOrCode: item.idOrCode })),
    source: {
      type: content.source.type,
      recordId: content.source.recordId ?? null,
      editionId: content.source.editionId ?? null,
      contentHash: content.source.contentHash ?? null,
    },
  });
}

export function seatingV2ReservationContentHash(input: {
  min: number | null;
  max: number | null;
  exact: number | null;
  eligibleMemberIds: readonly string[];
  targets: readonly SeatingV2Target[];
  source?: { type: string; recordId?: string; editionId?: string; contentHash?: string };
}): string {
  return exactHash({
    min: input.min,
    max: input.max,
    exact: input.exact,
    eligibleMemberIds: [...input.eligibleMemberIds].sort((left, right) => left.localeCompare(right)),
    targets: sortByTypeAndId(input.targets).map((item) => ({ type: item.type, idOrCode: item.idOrCode })),
    source: {
      type: input.source?.type ?? "MANUAL",
      recordId: input.source?.recordId ?? null,
      editionId: input.source?.editionId ?? null,
      contentHash: input.source?.contentHash ?? null,
    },
  });
}

export function seatingV2SemanticHash(input: {
  cohortHash: string;
  rsvpSnapshotHash: string;
  layoutPublicationId: string;
  layoutContentHash: string;
  eventBriefContentHash: string | null;
  protectionSnapshotHash: string | null;
  ruleEditions: readonly { id: string; contentHash: string }[];
  reservationEditions: readonly { id: string; contentHash: string }[];
  lockSetHash: string;
  solverVersion?: string;
  solverConfigHash: string;
  deterministicSeed: string;
}): string {
  return exactHash({
    cohortHash: input.cohortHash,
    rsvpSnapshotHash: input.rsvpSnapshotHash,
    layoutPublicationId: input.layoutPublicationId,
    layoutContentHash: input.layoutContentHash,
    eventBriefContentHash: input.eventBriefContentHash,
    protectionSnapshotHash: input.protectionSnapshotHash,
    ruleEditions: [...input.ruleEditions]
      .map((item) => ({ id: item.id, contentHash: item.contentHash }))
      .sort((left, right) => `${left.id}:${left.contentHash}`.localeCompare(`${right.id}:${right.contentHash}`)),
    reservationEditions: [...input.reservationEditions]
      .map((item) => ({ id: item.id, contentHash: item.contentHash }))
      .sort((left, right) => `${left.id}:${left.contentHash}`.localeCompare(`${right.id}:${right.contentHash}`)),
    lockSetHash: input.lockSetHash,
    solverVersion: input.solverVersion ?? SEATING_V2_SOLVER_VERSION,
    solverConfigHash: input.solverConfigHash,
    deterministicSeed: input.deterministicSeed,
  });
}

export function seatingV2SolverToken(
  pepper: string,
  organisationId: string,
  eventId: string,
  semanticHash: string,
  eventGuestId: string,
): string {
  return createHmac("sha256", pepper)
    .update(`seating-v2:${organisationId}:${eventId}:${semanticHash}:${eventGuestId}`)
    .digest("hex");
}

export function seatingV2CompiledRequestHash(request: SeatingV2CompiledRequest): string {
  return exactHash(SeatingV2CompiledRequestSchema.parse(request));
}

export function seatingV2PackageContentHash(semanticHash: string, compiledRequestHash: string): string {
  return exactHash({ semanticHash, compiledRequestHash });
}

export function seatingV2AssignmentsHash(
  assignments: readonly { guestToken: string; state: string; positionToken: string | null; typedReasonCodes?: readonly string[] }[],
): string {
  return exactHash(
    [...assignments]
      .map((item) => ({
        guestToken: item.guestToken,
        state: item.state,
        positionToken: item.positionToken,
        typedReasonCodes: [...(item.typedReasonCodes ?? [])].sort((left, right) => left.localeCompare(right)),
      }))
      .sort((left, right) => left.guestToken.localeCompare(right.guestToken)),
  );
}

export function seatingV2PlanContentHash(input: {
  packageContentHash: string;
  assignmentsHash: string;
  validatorVersion: string;
  validationReportHash: string;
  manualDecisionLogHash: string;
}): string {
  return exactHash({
    packageContentHash: input.packageContentHash,
    assignmentsHash: input.assignmentsHash,
    validatorVersion: input.validatorVersion,
    validationReportHash: input.validationReportHash,
    manualDecisionLogHash: input.manualDecisionLogHash,
  });
}

export function seatingV2LockSetHash(locks: readonly { guestId: string; positionId: string }[]): string {
  return exactHash(
    [...locks]
      .map((item) => ({ guestId: item.guestId, positionId: item.positionId }))
      .sort((left, right) => `${left.guestId}:${left.positionId}`.localeCompare(`${right.guestId}:${right.positionId}`)),
  );
}

export function seatingV2CanonicalJson(value: unknown): string {
  return canonicalJson(value);
}

export function seatingV2SubjectKey(subject: SeatingV2Subject): string {
  return `${subject.type}:${subject.id}`;
}
