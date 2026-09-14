import { createHmac } from "node:crypto";
import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import type { LayoutDownstreamProjection } from "./layout-assurance-projections.js";
import { seatingV2TableCapacityTruth, type SeatingPositionSource } from "./seating-v2-capacity.js";
import type { PlatformSnapshot } from "./store.js";
import type { OperationalGuest } from "./guest-schemas.js";

export type GovernedGuestCohort = {
  guests: Array<{
    eventGuestId: string;
    eligible: boolean;
    eligibilityCode: string;
    statusCode: string;
    partyToken?: string;
    capabilityCodes: string[];
    protocolCodes: string[];
  }>;
  cohortHash: string;
  rsvpTruthHash: string;
};

export type PublishedSpatialLayout = {
  publicationId: string;
  contentHash: string;
  tables: Array<{
    objectId: string;
    tableToken: string;
    capacity: number;
    declaredCapacity: number;
    physicalPositionCount: number;
    positionSource: SeatingPositionSource;
    mismatch: boolean;
    zoneCodes: string[];
    capabilityCodes: string[];
    seatAnchors: Array<{ id: string; ordinal: number }>;
  }>;
};

export type EligibleBriefFacts = {
  editionId?: string;
  contentHash?: string;
};

export type ApplicableProtectionConstraints = {
  snapshotHash?: string;
};

export interface GuestCohortAdapter {
  loadEligibleEventGuests(eventId: string): Promise<GovernedGuestCohort>;
}

export interface LayoutPublicationAdapter {
  loadCurrentLayout(eventId: string): Promise<PublishedSpatialLayout>;
}

export interface EventBriefAdapter {
  loadCurrentBrief(eventId: string): Promise<EligibleBriefFacts>;
}

export interface ProtectionAdapter {
  loadCurrentProtection(eventId: string): Promise<ApplicableProtectionConstraints>;
}

export function seatingToken(pepper: string, eventId: string, subject: string): string {
  return createHmac("sha256", pepper).update(`s06:${eventId}:${subject}`).digest("hex").slice(0, 32);
}

export function guestCohortFromRecords(
  guests: OperationalGuest[],
  responses: Array<{ eventId: string; guestId: string; attendanceIntent?: string; status?: string }>,
  eventId: string,
): GovernedGuestCohort {
  const eventGuests = guests.filter((guest) => guest.eventId === eventId);
  const eventResponses = responses.filter((item) => item.eventId === eventId);
  const mapped = eventGuests.map((guest) => {
    const response = eventResponses.find((item) => item.guestId === guest.id);
    const attending = response?.attendanceIntent === "ATTENDING";
    const unknown = !response || response.attendanceIntent === "NOT_SUPPLIED";
    return {
      eventGuestId: guest.id,
      eligible: attending,
      eligibilityCode: attending ? "RSVP_ATTENDING" : unknown ? "RSVP_UNKNOWN" : "RSVP_NOT_ELIGIBLE",
      statusCode: response?.status ?? "NOT_STARTED",
      partyToken: undefined,
      capabilityCodes: [] as string[],
      protocolCodes: [] as string[],
    };
  });
  return {
    guests: mapped,
    cohortHash: exactHash(mapped.map((item) => item.eventGuestId).sort()),
    rsvpTruthHash: exactHash(
      eventResponses
        .map((item) => ({ guestId: item.guestId, intent: item.attendanceIntent, status: item.status }))
        .sort((left, right) => left.guestId.localeCompare(right.guestId)),
    ),
  };
}

export function snapshotGuestCohortAdapter(snap: PlatformSnapshot, eventId: string): GovernedGuestCohort {
  return guestCohortFromRecords(snap.operationalGuests ?? [], snap.rsvpResponses ?? [], eventId);
}

export function uniqueSeatAnchors(anchors: Array<{ id: string; ordinal: number }>): Array<{ id: string; ordinal: number }> {
  const used = new Set<number>();
  return [...anchors]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((seat) => {
      let ordinal = Number(seat.ordinal);
      if (!Number.isInteger(ordinal) || ordinal < 1 || used.has(ordinal)) {
        ordinal = 1;
        while (used.has(ordinal)) ordinal += 1;
      }
      used.add(ordinal);
      return { id: seat.id, ordinal };
    });
}

export function snapshotLayoutAdapter(snap: PlatformSnapshot, organisationId: string, eventId: string): PublishedSpatialLayout {
  const publication = snap.layoutPublications.find(
    (item) => item.eventId === eventId && item.organisationId === organisationId && item.status === "CURRENT",
  );
  if (!publication) {
    throw new PlatformError("DEPENDENCY_UNAVAILABLE", "no current layout blocks freeze", {
      publicMessage: "Upstream event information changed. Review and run again.",
    });
  }
  const revision = snap.layoutRevisions.find((item) => item.id === publication.revisionId);
  const objects = revision?.objects ?? [];
  const tables = objects
    .filter((item) => item.objectType === "TABLE" && !item.tombstoned)
    .map((table) => {
      const anchors = objects
        .filter((item) => item.objectType === "SEAT" && !item.tombstoned && (item.subtype as { tableId?: string } | undefined)?.tableId === table.id)
        .map((seat) => ({
          id: seat.id,
          ordinal: Number((seat.subtype as { sequence?: number } | undefined)?.sequence ?? 0),
        }))
        .sort((left, right) => left.ordinal - right.ordinal);
      const declaredCapacity = Number((table.subtype as { declaredCapacity?: number } | undefined)?.declaredCapacity ?? 0);
      const truth = seatingV2TableCapacityTruth({
        tableObjectId: table.id,
        declaredCapacity,
        physicalPositionCount: anchors.length,
      });
      return {
        objectId: table.id,
        tableToken: truth.tableToken,
        capacity: truth.effectiveCapacity,
        declaredCapacity: truth.declaredCapacity,
        physicalPositionCount: truth.physicalPositionCount,
        positionSource: truth.positionSource,
        mismatch: truth.mismatch,
        zoneCodes: table.groupId ? [table.groupId] : ["ZONE_GENERAL"],
        capabilityCodes: [],
        seatAnchors: anchors,
      };
    });
  return {
    publicationId: publication.id,
    contentHash: publication.contentHash,
    tables,
  };
}

export function briefFactsFromRecords(
  engagements: Array<{ convertedEventId?: string; opportunityId?: string; id: string }>,
  editions: Array<{ status?: string; current?: boolean; engagementId?: string; id: string; contentHash?: string }>,
  eventId: string,
): EligibleBriefFacts {
  const engagement = engagements.find((item) => item.convertedEventId === eventId || item.opportunityId === eventId);
  const published = editions.find(
    (item) => item.status === "PUBLISHED" && item.current && (!engagement || item.engagementId === engagement.id),
  );
  return published ? { editionId: published.id, contentHash: published.contentHash } : {};
}

export function snapshotBriefAdapter(snap: PlatformSnapshot, eventId: string): EligibleBriefFacts {
  return briefFactsFromRecords(snap.discoveryEngagements ?? [], snap.eventBriefEditions ?? [], eventId);
}

export function protectionFactsFromRecords(
  snapshots: Array<{ eventId: string; contentHash?: string }>,
  eventId: string,
): ApplicableProtectionConstraints {
  const latest = snapshots.filter((item) => item.eventId === eventId).at(-1);
  return latest?.contentHash ? { snapshotHash: latest.contentHash } : {};
}

export function snapshotProtectionAdapter(snap: PlatformSnapshot, eventId: string): ApplicableProtectionConstraints {
  return protectionFactsFromRecords(snap.riskApplicabilitySnapshots ?? [], eventId);
}

export function layoutDownstreamForbidden(_projection: LayoutDownstreamProjection): void {
  // Seating consumes CURRENT publication only; it never writes layout records.
}
