import { exactHash } from "./eec-hash.js";
import {
  snapshotBriefAdapter,
  snapshotGuestCohortAdapter,
  snapshotLayoutAdapter,
  snapshotProtectionAdapter,
  uniqueSeatAnchors,
} from "./seating-adapters.js";
import { assertSeatingV2CapacityTruth, seatingV2TableCapacityTruth } from "./seating-v2-capacity.js";
import { compileSeatingV2Request } from "./seating-v2-compiler.js";
import {
  seatingV2LockSetHash,
  seatingV2PackageContentHash,
  seatingV2SemanticHash,
  seatingV2SolverToken,
} from "./seating-v2-hash.js";
import type { SeatingV2Scope, SeatingV2Transaction } from "./seating-v2-repository.js";
import {
  SEATING_V2_COMPILER_VERSION,
  SEATING_V2_PREVIOUS_SOLVER_VERSION,
  SEATING_V2_SOLVER_VERSION,
  type SeatingV2RuleContent,
} from "./seating-v2-schemas.js";
import type {
  SeatingV2InputPackage,
  SeatingV2ReservationEdition,
  SeatingV2RuleEdition,
} from "./seating-v2-state.js";
import type { PlatformSnapshot } from "./store.js";

export const SEATING_V2_DEFAULT_SEED = "s06-v2-default-seed";

export const SEATING_V2_PREVIOUS_CONFIG_HASH = exactHash({
  compilerVersion: SEATING_V2_COMPILER_VERSION,
  solverVersion: SEATING_V2_PREVIOUS_SOLVER_VERSION,
  timeLimitMs: 10_000,
  memoryLimitMb: 256,
});

export const SEATING_V2_CONFIG_HASH = exactHash({
  compilerVersion: SEATING_V2_COMPILER_VERSION,
  solverVersion: SEATING_V2_SOLVER_VERSION,
  timeLimitMs: 10_000,
  memoryLimitMb: 256,
});

export type SeatingV2BuiltPackage = {
  semanticHash: string;
  compiled: ReturnType<typeof compileSeatingV2Request>;
  contentHash: string;
  cohort: ReturnType<typeof snapshotGuestCohortAdapter>;
  layout: ReturnType<typeof snapshotLayoutAdapter>;
  brief: ReturnType<typeof snapshotBriefAdapter>;
  protection: ReturnType<typeof snapshotProtectionAdapter>;
  editions: SeatingV2RuleEdition[];
  reservations: SeatingV2ReservationEdition[];
  lockSetHash: string;
  seed: string;
};

export async function readSeatingV2PackageMaterials(input: {
  tx: SeatingV2Transaction;
  scope: SeatingV2Scope;
  snapshot: PlatformSnapshot;
  pepper: string;
  seed?: string;
}): Promise<Parameters<typeof finishSeatingV2Package>[0]> {
  const cohort = snapshotGuestCohortAdapter(input.snapshot, input.scope.eventId);
  const layout = snapshotLayoutAdapter(input.snapshot, input.scope.organisationId, input.scope.eventId);
  const brief = snapshotBriefAdapter(input.snapshot, input.scope.eventId);
  const protection = snapshotProtectionAdapter(input.snapshot, input.scope.eventId);
  const editions = (await input.tx.list<SeatingV2RuleEdition>("ruleEditions", input.scope)).filter(
    (item) => item.lifecycle === "ACTIVE",
  );
  const reservations = (await input.tx.list<SeatingV2ReservationEdition>("reservationEditions", input.scope)).filter(
    (item) => item.lifecycle === "ACTIVE",
  );
  const lockSetHash = seatingV2LockSetHash([]);
  const seed = input.seed ?? SEATING_V2_DEFAULT_SEED;
  const semanticHash = seatingV2SemanticHash({
    cohortHash: cohort.cohortHash,
    rsvpSnapshotHash: cohort.rsvpTruthHash,
    layoutPublicationId: layout.publicationId,
    layoutContentHash: layout.contentHash,
    eventBriefContentHash: brief.contentHash ?? null,
    protectionSnapshotHash: protection.snapshotHash ?? null,
    ruleEditions: editions.map((item) => ({ id: item.id, contentHash: item.contentHash })),
    reservationEditions: reservations.map((item) => ({ id: item.id, contentHash: item.contentHash })),
    lockSetHash,
    solverConfigHash: SEATING_V2_CONFIG_HASH,
    deterministicSeed: seed,
  });
  const subjects = await input.tx.list<{
    ruleEditionId: string;
    subjectType: "EVENT_GUEST" | "GOVERNED_GROUP";
    subjectId: string;
  }>("ruleSubjects", input.scope);
  const targets = await input.tx.list<{
    ruleEditionId: string;
    targetType: "TABLE" | "ZONE" | "POSITION_CAPABILITY";
    targetIdOrCode: string;
  }>("ruleTargets", input.scope);
  const members = await input.tx.list<{ reservationEditionId: string; eventGuestId: string }>(
    "reservationMembers",
    input.scope,
  );
  const reservationTargets = await input.tx.list<{
    reservationEditionId: string;
    targetType: "TABLE" | "ZONE" | "POSITION_CAPABILITY";
    targetIdOrCode: string;
  }>("reservationTargets", input.scope);
  return {
    scope: input.scope,
    pepper: input.pepper,
    semanticHash,
    cohort,
    layout,
    brief,
    protection,
    editions,
    reservations,
    subjects,
    targets,
    members,
    reservationTargets,
    lockSetHash,
    seed,
  };
}

export function finishSeatingV2Package(input: {
  scope: SeatingV2Scope;
  pepper: string;
  semanticHash: string;
  cohort: ReturnType<typeof snapshotGuestCohortAdapter>;
  layout: ReturnType<typeof snapshotLayoutAdapter>;
  brief: ReturnType<typeof snapshotBriefAdapter>;
  protection: ReturnType<typeof snapshotProtectionAdapter>;
  editions: SeatingV2RuleEdition[];
  reservations: SeatingV2ReservationEdition[];
  subjects: Array<{ ruleEditionId: string; subjectType: "EVENT_GUEST" | "GOVERNED_GROUP"; subjectId: string }>;
  targets: Array<{ ruleEditionId: string; targetType: "TABLE" | "ZONE" | "POSITION_CAPABILITY"; targetIdOrCode: string }>;
  members: Array<{ reservationEditionId: string; eventGuestId: string }>;
  reservationTargets: Array<{
    reservationEditionId: string;
    targetType: "TABLE" | "ZONE" | "POSITION_CAPABILITY";
    targetIdOrCode: string;
  }>;
  lockSetHash: string;
  seed: string;
}): SeatingV2BuiltPackage {
  const compiled = compileSeatingV2Request({
    organisationId: input.scope.organisationId,
    eventId: input.scope.eventId,
    semanticHash: input.semanticHash,
    pepper: input.pepper,
    configHash: SEATING_V2_CONFIG_HASH,
    seed: input.seed,
    guests: input.cohort.guests.map((guest) => ({
      eventGuestId: guest.eventGuestId,
      eligible: guest.eligible,
      groupTokens: guest.partyToken ? [guest.partyToken] : [],
      capabilityCodes: guest.capabilityCodes,
    })),
    positions: (() => {
      const truths = input.layout.tables.map((table) =>
        seatingV2TableCapacityTruth({
          tableObjectId: table.objectId,
          declaredCapacity: table.declaredCapacity ?? table.capacity,
          physicalPositionCount: table.physicalPositionCount ?? table.seatAnchors.length,
        }),
      );
      assertSeatingV2CapacityTruth(truths);
      return input.layout.tables.flatMap((table, index) => {
        const truth = truths[index]!;
        const anchors = uniqueSeatAnchors(
          truth.positionSource === "PHYSICAL"
            ? table.seatAnchors
            : Array.from({ length: truth.declaredCapacity }, (_, ordinal) => ({
                id: `${table.objectId}:${ordinal + 1}`,
                ordinal: ordinal + 1,
              })),
        );
        return anchors.map((seat) => ({
          positionToken: exactHash({ table: table.objectId, ordinal: seat.ordinal }).slice(0, 32),
          tableToken: truth.tableToken,
          zoneCodes: table.zoneCodes,
          capabilityCodes: table.capabilityCodes,
        }));
      });
    })(),
    rules: input.editions.map((edition) => ({
      editionId: edition.id,
      contentHash: edition.contentHash,
      lifecycle: edition.lifecycle,
      content: {
        kind: edition.kind as SeatingV2RuleContent["kind"],
        hardness: edition.hardness as SeatingV2RuleContent["hardness"],
        weight: edition.weight,
        scope: edition.scope as SeatingV2RuleContent["scope"],
        specialistDomain: edition.specialistDomain as SeatingV2RuleContent["specialistDomain"],
        subjects: input.subjects
          .filter((item) => item.ruleEditionId === edition.id)
          .map((item) => ({ type: item.subjectType, id: item.subjectId })),
        targets: input.targets
          .filter((item) => item.ruleEditionId === edition.id)
          .map((item) => ({ type: item.targetType, idOrCode: item.targetIdOrCode })),
        source: { type: edition.sourceType as SeatingV2RuleContent["source"]["type"] },
      },
    })),
    reservations: input.reservations.map((edition) => ({
      editionId: edition.id,
      contentHash: edition.contentHash,
      lifecycle: edition.lifecycle,
      eligibleMemberIds: input.members.filter((item) => item.reservationEditionId === edition.id).map((item) => item.eventGuestId),
      targets: input.reservationTargets
        .filter((item) => item.reservationEditionId === edition.id)
        .map((item) => ({ type: item.targetType, idOrCode: item.targetIdOrCode })),
      min: edition.minCount ?? null,
      max: edition.maxCount ?? null,
      exact: edition.exactCount ?? null,
    })),
  });
  return {
    semanticHash: input.semanticHash,
    compiled,
    contentHash: seatingV2PackageContentHash(input.semanticHash, compiled.compiledRequestHash),
    cohort: input.cohort,
    layout: input.layout,
    brief: input.brief,
    protection: input.protection,
    editions: input.editions,
    reservations: input.reservations,
    lockSetHash: input.lockSetHash,
    seed: input.seed,
  };
}

export async function buildSeatingV2Package(input: {
  tx: SeatingV2Transaction;
  scope: SeatingV2Scope;
  snapshot: PlatformSnapshot;
  pepper: string;
  seed?: string;
}): Promise<SeatingV2BuiltPackage> {
  return finishSeatingV2Package(await readSeatingV2PackageMaterials(input));
}

export function seatingV2GuestToken(
  pepper: string,
  organisationId: string,
  eventId: string,
  semanticHash: string,
  eventGuestId: string,
): string {
  return seatingV2SolverToken(pepper, organisationId, eventId, semanticHash, eventGuestId);
}

export function packageIsFresh(pkg: SeatingV2InputPackage, built: SeatingV2BuiltPackage): boolean {
  return pkg.semanticHash === built.semanticHash && pkg.contentHash === built.contentHash;
}
