import type { PermissionKey } from "./schemas.js";
import type { PlatformSnapshot } from "./store.js";
import { readAttendanceProjection, type AttendanceProjectionRead } from "./venue-attendance.js";
import { FROZEN_COORDINATE_SYSTEM } from "./venue-geometry.js";
import { currentReusableFacts } from "./venue-operations.js";
import type { EventVenueFact, Layout, Venue, VenueEvidenceAsset, VenueFact } from "./venue-schemas.js";

export type VenueCapabilities = {
  canViewRegistry: boolean;
  canCreateVenue: boolean;
  canUpdateVenue: boolean;
  canRecordFact: boolean;
  canVerifyFact: boolean;
  canAdoptVenue: boolean;
  canOverrideFact: boolean;
  canViewLayout: boolean;
  canCreateLayout: boolean;
  canUpdateLayout: boolean;
  canAcquireLease: boolean;
};

export function venuePermissionAllowed(keys: readonly PermissionKey[]): VenueCapabilities {
  return {
    canViewRegistry: keys.includes("venue.registry.view"),
    canCreateVenue: keys.includes("venue.record.create"),
    canUpdateVenue: keys.includes("venue.record.update"),
    canRecordFact: keys.includes("venue.fact.record"),
    canVerifyFact: keys.includes("venue.fact.verify"),
    canAdoptVenue: keys.includes("venue.adopt"),
    canOverrideFact: keys.includes("venue.event.override"),
    canViewLayout: keys.includes("layout.view"),
    canCreateLayout: keys.includes("layout.create"),
    canUpdateLayout: keys.includes("layout.update"),
    canAcquireLease: keys.includes("layout.lease.acquire"),
  };
}

export type VenueRegistryItem = {
  id: string;
  displayName: string;
  locality?: string;
  status: Venue["status"];
  factCount: number;
  unverifiedCount: number;
  version: number;
};

export type VenueFactView = {
  id: string;
  factType: VenueFact["factType"];
  subtype: VenueFact["subtype"];
  valueLabel: string;
  unit: VenueFact["unit"];
  sourceKind: VenueFact["sourceKind"];
  sourceLabel: string;
  verificationState: VenueFact["verificationState"];
  applicability: VenueFact["applicability"];
  mayBecomeLockedSafetyConstraint: boolean;
  superseded: boolean;
  evidence?: {
    id: string;
    fileName?: string;
    storageState: VenueEvidenceAsset["storageState"];
    uploadAvailable: false;
    notes: string;
  };
  version: number;
};

export type VenueDetailWorkspace = {
  venue: VenueRegistryItem & {
    countryCode?: string;
    notes?: string;
    visibilityPolicy: Venue["visibilityPolicy"];
    crossClientReuse: Venue["crossClientReuse"];
  };
  facts: VenueFactView[];
  binaryUploadAvailable: false;
  assetGap: string;
  capabilities: VenueCapabilities;
};

export type EventVenueFactView = VenueFactView & {
  origin: EventVenueFact["origin"];
  inherited: boolean;
};

export type EventVenueWorkspace = {
  eventId: string;
  eventName: string;
  adopted?: {
    id: string;
    venueId: string;
    venueName: string;
    sourceVenueVersion: number;
    sourceVenueHash: string;
    adoptedAt: string;
  };
  availableVenues: VenueRegistryItem[];
  inheritedFacts: EventVenueFactView[];
  overrideFacts: EventVenueFactView[];
  layouts: Array<{ id: string; name: string; status: Layout["status"]; contentHash: string; version: number }>;
  attendanceProjection: AttendanceProjectionRead;
  coordinateConvention: typeof FROZEN_COORDINATE_SYSTEM;
  capabilities: VenueCapabilities;
};

export type LayoutSetupWorkspace = {
  layout: {
    id: string;
    name: string;
    eventVenueId: string;
    widthMm: number;
    heightMm: number;
    displayLengthUnit: Layout["displayLengthUnit"];
    currentRevisionNumber: number;
    contentHash: string;
    version: number;
    editorHolderPersonId?: string;
    editorExclusive: true;
  };
  coordinateSystem: typeof FROZEN_COORDINATE_SYSTEM;
  pendingPixelPersistence: false;
  capabilities: VenueCapabilities;
};

function factValueLabel(fact: Pick<VenueFact, "unit" | "valueText" | "valueIntegerMm" | "valueInteger">): string {
  if (fact.unit === "MILLIMETRE" && fact.valueIntegerMm !== undefined) return `${fact.valueIntegerMm} mm`;
  if (fact.unit === "COUNT" && fact.valueInteger !== undefined) return String(fact.valueInteger);
  return fact.valueText ?? "Unknown";
}

function projectFact(fact: VenueFact, assets: readonly VenueEvidenceAsset[]): VenueFactView {
  const evidence = fact.evidenceAssetId ? assets.find((item) => item.id === fact.evidenceAssetId) : undefined;
  return {
    id: fact.id,
    factType: fact.factType,
    subtype: fact.subtype,
    valueLabel: factValueLabel(fact),
    unit: fact.unit,
    sourceKind: fact.sourceKind,
    sourceLabel: fact.sourceLabel,
    verificationState: fact.verificationState,
    applicability: fact.applicability,
    mayBecomeLockedSafetyConstraint: fact.mayBecomeLockedSafetyConstraint,
    superseded: Boolean(fact.supersededByFactId),
    evidence: evidence
      ? {
          id: evidence.id,
          fileName: evidence.fileName,
          storageState: evidence.storageState,
          uploadAvailable: false,
          notes: evidence.notes,
        }
      : undefined,
    version: fact.version,
  };
}

export function buildVenueRegistry(snap: PlatformSnapshot, organisationId: string): VenueRegistryItem[] {
  return snap.venues
    .filter((item) => item.organisationId === organisationId)
    .map((venue) => {
      const facts = currentReusableFacts(snap, venue.id);
      return {
        id: venue.id,
        displayName: venue.displayName,
        locality: venue.locality,
        status: venue.status,
        factCount: facts.length,
        unverifiedCount: facts.filter((item) => item.verificationState !== "VERIFIED").length,
        version: venue.version,
      };
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export function buildVenueDetailWorkspace(
  snap: PlatformSnapshot,
  organisationId: string,
  venueId: string,
  capabilities: VenueCapabilities,
): VenueDetailWorkspace | undefined {
  const venue = snap.venues.find((item) => item.id === venueId && item.organisationId === organisationId);
  if (!venue) return undefined;
  const registry = buildVenueRegistry(snap, organisationId).find((item) => item.id === venue.id);
  if (!registry) return undefined;
  return {
    venue: {
      ...registry,
      countryCode: venue.countryCode,
      notes: venue.notes,
      visibilityPolicy: venue.visibilityPolicy,
      crossClientReuse: venue.crossClientReuse,
    },
    facts: snap.venueFacts
      .filter((item) => item.venueId === venue.id)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((item) => projectFact(item, snap.venueEvidenceAssets)),
    binaryUploadAvailable: false,
    assetGap:
      "No approved object-storage, malware-scanning or safe-derivative pipeline exists. Evidence is metadata-only until Milestone 2 or 3.",
    capabilities,
  };
}

export function buildEventVenueWorkspace(
  snap: PlatformSnapshot,
  eventId: string,
  capabilities: VenueCapabilities,
): EventVenueWorkspace | undefined {
  const event = snap.events.find((item) => item.id === eventId);
  if (!event) return undefined;
  const adopted = snap.eventVenues.find((item) => item.eventId === eventId && item.status === "ACTIVE");
  const venue = adopted ? snap.venues.find((item) => item.id === adopted.venueId) : undefined;
  const facts = adopted
    ? snap.eventVenueFacts.filter((item) => item.eventVenueId === adopted.id)
    : [];
  return {
    eventId: event.id,
    eventName: event.name,
    adopted: adopted && venue
      ? {
          id: adopted.id,
          venueId: venue.id,
          venueName: venue.displayName,
          sourceVenueVersion: adopted.sourceVenueVersion,
          sourceVenueHash: adopted.sourceVenueHash,
          adoptedAt: adopted.adoptedAt,
        }
      : undefined,
    availableVenues: buildVenueRegistry(snap, event.organisationId).filter((item) => item.status === "ACTIVE"),
    inheritedFacts: facts
      .filter((item) => item.origin === "INHERITED")
      .map((item) => ({ ...projectEventFact(item), origin: item.origin, inherited: true })),
    overrideFacts: facts
      .filter((item) => item.origin === "EVENT_OVERRIDE")
      .map((item) => ({ ...projectEventFact(item), origin: item.origin, inherited: false })),
    layouts: snap.layouts
      .filter((item) => item.eventId === eventId)
      .map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        contentHash: item.contentHash,
        version: item.version,
      })),
    attendanceProjection: readAttendanceProjection(snap, eventId),
    coordinateConvention: FROZEN_COORDINATE_SYSTEM,
    capabilities,
  };
}

function projectEventFact(fact: EventVenueFact): VenueFactView {
  return {
    id: fact.id,
    factType: fact.factType,
    subtype: fact.subtype,
    valueLabel: factValueLabel(fact),
    unit: fact.unit,
    sourceKind: fact.sourceKind,
    sourceLabel: fact.sourceLabel,
    verificationState: fact.verificationState,
    applicability: fact.applicability,
    mayBecomeLockedSafetyConstraint: fact.mayBecomeLockedSafetyConstraint,
    superseded: false,
    version: fact.version,
  };
}

export function buildLayoutSetupWorkspace(
  snap: PlatformSnapshot,
  eventId: string,
  layoutId: string,
  capabilities: VenueCapabilities,
): LayoutSetupWorkspace | undefined {
  const layout = snap.layouts.find((item) => item.id === layoutId && item.eventId === eventId);
  if (!layout) return undefined;
  const lease = layout.editorLeaseId
    ? snap.layoutEditorLeases.find((item) => item.id === layout.editorLeaseId && item.status === "ACTIVE")
    : undefined;
  return {
    layout: {
      id: layout.id,
      name: layout.name,
      eventVenueId: layout.eventVenueId,
      widthMm: layout.bounds.widthMm,
      heightMm: layout.bounds.heightMm,
      displayLengthUnit: layout.displayLengthUnit,
      currentRevisionNumber: layout.currentRevisionNumber,
      contentHash: layout.contentHash,
      version: layout.version,
      editorHolderPersonId: lease?.holderPersonId,
      editorExclusive: true,
    },
    coordinateSystem: FROZEN_COORDINATE_SYSTEM,
    pendingPixelPersistence: false,
    capabilities,
  };
}
