import { exactHash } from "./eec-hash.js";
import {
  snapshotBriefAdapter,
  snapshotGuestCohortAdapter,
  snapshotLayoutAdapter,
  snapshotProtectionAdapter,
  uniqueSeatAnchors,
} from "./seating-adapters.js";
import { compileSeatingV2Request } from "./seating-v2-compiler.js";
import {
  seatingV2LockSetHash,
  seatingV2PackageContentHash,
  seatingV2SemanticHash,
  seatingV2SolverToken,
} from "./seating-v2-hash.js";
import type { SeatingV2Scope, SeatingV2Transaction } from "./seating-v2-repository.js";
import {
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

export const SEATING_V2_CONFIG_HASH = exactHash({
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

export async function buildSeatingV2Package(input: {
  tx: SeatingV2Transaction;
  scope: SeatingV2Scope;
  snapshot: PlatformSnapshot;
  pepper: string;
  seed?: string;
}): Promise<SeatingV2BuiltPackage> {
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
  const compiled = compileSeatingV2Request({
    organisationId: input.scope.organisationId,
    eventId: input.scope.eventId,
    semanticHash,
    pepper: input.pepper,
    configHash: SEATING_V2_CONFIG_HASH,
    seed,
    guests: cohort.guests.map((guest) => ({
      eventGuestId: guest.eventGuestId,
      eligible: guest.eligible,
      groupTokens: guest.partyToken ? [guest.partyToken] : [],
      capabilityCodes: guest.capabilityCodes,
    })),
    positions: layout.tables.flatMap((table) => {
      const anchors = uniqueSeatAnchors(
        table.seatAnchors.length
          ? table.seatAnchors
          : Array.from({ length: table.capacity }, (_, index) => ({ id: `${table.objectId}:${index + 1}`, ordinal: index + 1 })),
      );
      return anchors.map((seat) => ({
        positionToken: exactHash({ table: table.objectId, ordinal: seat.ordinal }).slice(0, 32),
        tableToken: exactHash({ table: table.objectId }).slice(0, 32),
        zoneCodes: table.zoneCodes,
        capabilityCodes: table.capabilityCodes,
      }));
    }),
    rules: editions.map((edition) => ({
      editionId: edition.id,
      contentHash: edition.contentHash,
      lifecycle: edition.lifecycle,
      content: {
        kind: edition.kind as SeatingV2RuleContent["kind"],
        hardness: edition.hardness as SeatingV2RuleContent["hardness"],
        weight: edition.weight,
        scope: edition.scope as SeatingV2RuleContent["scope"],
        specialistDomain: edition.specialistDomain as SeatingV2RuleContent["specialistDomain"],
        subjects: subjects
          .filter((item) => item.ruleEditionId === edition.id)
          .map((item) => ({ type: item.subjectType, id: item.subjectId })),
        targets: targets
          .filter((item) => item.ruleEditionId === edition.id)
          .map((item) => ({ type: item.targetType, idOrCode: item.targetIdOrCode })),
        source: { type: edition.sourceType as SeatingV2RuleContent["source"]["type"] },
      },
    })),
    reservations: reservations.map((edition) => ({
      editionId: edition.id,
      contentHash: edition.contentHash,
      lifecycle: edition.lifecycle,
      eligibleMemberIds: members.filter((item) => item.reservationEditionId === edition.id).map((item) => item.eventGuestId),
      targets: reservationTargets
        .filter((item) => item.reservationEditionId === edition.id)
        .map((item) => ({ type: item.targetType, idOrCode: item.targetIdOrCode })),
      min: edition.minCount ?? null,
      max: edition.maxCount ?? null,
      exact: edition.exactCount ?? null,
    })),
  });
  return {
    semanticHash,
    compiled,
    contentHash: seatingV2PackageContentHash(semanticHash, compiled.compiledRequestHash),
    cohort,
    layout,
    brief,
    protection,
    editions,
    reservations,
    lockSetHash,
    seed,
  };
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
