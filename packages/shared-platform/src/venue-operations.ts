import { randomUUID } from "node:crypto";
import {
  LAYOUT_EDITOR_LEASE_TTL_SECONDS,
  PROHIBITED_VENUE_GUEST_KEYS,
  SCHEMA_VERSION,
} from "./constants.js";
import { PlatformError } from "./errors.js";
import { requireScopedEvent } from "./programme-operations.js";
import { canonicalContentHash, FROZEN_COORDINATE_SYSTEM, layoutBoundsFromSize, layoutContentHash } from "./venue-geometry.js";
import type { PlatformSnapshot } from "./store.js";
import {
  EventVenueFactSchema,
  EventVenueSchema,
  LayoutEditorLeaseSchema,
  LayoutRevisionSchema,
  LayoutSchema,
  VenueEvidenceAssetSchema,
  VenueFactSchema,
  VenueSchema,
  type AcquireLayoutLeaseInput,
  type AdoptVenueInput,
  type CreateBlankLayoutInput,
  type CreateVenueInput,
  type EventVenue,
  type EventVenueFact,
  type Layout,
  type LayoutEditorLease,
  type RecordEventVenueOverrideInput,
  type RecordVenueFactInput,
  type UpdateLayoutSetupInput,
  type Venue,
  type VenueFact,
  type VerifyVenueFactInput,
} from "./venue-schemas.js";

function stamp(now: string) {
  return { schemaVersion: SCHEMA_VERSION, version: 1, createdAt: now, updatedAt: now } as const;
}

function assertVersion(current: number, expected?: number): void {
  if (expected !== undefined && current !== expected) {
    throw new PlatformError("VERSION_CONFLICT", "this venue or layout record changed while you were editing", {
      publicMessage: "This record changed while you were editing. Reload before saving.",
    });
  }
}

export function assertNoVenueGuestIdentity(raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  for (const key of Object.keys(raw as Record<string, unknown>)) {
    if ((PROHIBITED_VENUE_GUEST_KEYS as readonly string[]).some((item) => key === item || key.toLowerCase().includes(item.toLowerCase()))) {
      throw new PlatformError("VALIDATION_FAILED", "EOS-S05 must not store guest identity or placement", {
        field: key,
        publicMessage: "Venue and layout records cannot store guest identity. Seating is EOS-S06.",
      });
    }
  }
}

function requireOrganisation(snap: PlatformSnapshot, organisationId: string) {
  const organisation = snap.organisations.find((item) => item.id === organisationId);
  if (!organisation) throw new PlatformError("NOT_FOUND", "organisation was not found");
  return organisation;
}

function requireVenue(snap: PlatformSnapshot, organisationId: string, venueId: string): Venue {
  const venue = snap.venues.find((item) => item.id === venueId);
  if (!venue || venue.organisationId !== organisationId) {
    throw new PlatformError("NOT_FOUND", "venue was not found");
  }
  return venue;
}

function requireEventVenue(snap: PlatformSnapshot, organisationId: string, eventId: string, eventVenueId: string): EventVenue {
  const record = snap.eventVenues.find((item) => item.id === eventVenueId);
  if (!record || record.organisationId !== organisationId || record.eventId !== eventId) {
    throw new PlatformError("NOT_FOUND", "event venue was not found");
  }
  return record;
}

function requireLayout(snap: PlatformSnapshot, organisationId: string, eventId: string, layoutId: string): Layout {
  const layout = snap.layouts.find((item) => item.id === layoutId);
  if (!layout || layout.organisationId !== organisationId || layout.eventId !== eventId) {
    throw new PlatformError("NOT_FOUND", "layout was not found");
  }
  return layout;
}

function currentFacts(snap: PlatformSnapshot, venueId: string): VenueFact[] {
  return snap.venueFacts.filter((item) => item.venueId === venueId && !item.supersededByFactId);
}

function venueHash(venue: Venue, facts: readonly VenueFact[]): string {
  return canonicalContentHash({
    venue: {
      id: venue.id,
      displayName: venue.displayName,
      locality: venue.locality ?? "",
      countryCode: venue.countryCode ?? "",
      version: venue.version,
    },
    facts: [...facts]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((item) => ({
        id: item.id,
        factType: item.factType,
        subtype: item.subtype,
        valueText: item.valueText ?? "",
        valueIntegerMm: item.valueIntegerMm ?? null,
        valueInteger: item.valueInteger ?? null,
        verificationState: item.verificationState,
        version: item.version,
      })),
  });
}

function mayLockSafety(input: { sourceKind: string; factType: string }): boolean {
  return (input.sourceKind === "VENUE_SUPPLIED" || input.sourceKind === "QUALIFIED_AUTHORITY") && input.factType === "SAFETY_THRESHOLD";
}

function activeLease(snap: PlatformSnapshot, layoutId: string, now: string): LayoutEditorLease | undefined {
  return snap.layoutEditorLeases.find(
    (item) => item.layoutId === layoutId && item.status === "ACTIVE" && Date.parse(item.expiresAt) > Date.parse(now),
  );
}

function expireStaleLeases(snap: PlatformSnapshot, now: string): void {
  for (const lease of snap.layoutEditorLeases) {
    if (lease.status === "ACTIVE" && Date.parse(lease.expiresAt) <= Date.parse(now)) {
      lease.status = "EXPIRED";
      lease.updatedAt = now;
      lease.version += 1;
    }
  }
}

export function createVenueOnSnap(snap: PlatformSnapshot, input: CreateVenueInput, now: string, actorPersonId: string): Venue {
  requireOrganisation(snap, input.organisationId);
  const venue = VenueSchema.parse({
    id: randomUUID(),
    organisationId: input.organisationId,
    displayName: input.displayName,
    locality: input.locality,
    countryCode: input.countryCode,
    visibilityPolicy: input.visibilityPolicy,
    assignedClientIds: input.assignedClientIds,
    crossClientReuse: "DENIED",
    status: "ACTIVE",
    notes: input.notes,
    recordedByPersonId: actorPersonId,
    ...stamp(now),
  });
  snap.venues.push(venue);
  return venue;
}

export function recordVenueFactOnSnap(
  snap: PlatformSnapshot,
  input: RecordVenueFactInput,
  now: string,
  actorPersonId: string,
): VenueFact {
  const venue = requireVenue(snap, input.organisationId, input.venueId);
  assertVersion(venue.version, input.expectedVenueVersion);
  let evidenceAssetId: string | undefined;
  if (input.evidenceFileName || input.evidenceMimeType) {
    const asset = VenueEvidenceAssetSchema.parse({
      id: randomUUID(),
      organisationId: input.organisationId,
      venueId: venue.id,
      kind: "METADATA_ONLY",
      fileName: input.evidenceFileName,
      mimeType: input.evidenceMimeType,
      storageState: "UNAVAILABLE",
      uploadAvailable: false,
      notes: "Binary upload is unavailable until an approved object-storage, malware-scanning and safe-derivative pipeline exists.",
      recordedByPersonId: actorPersonId,
      ...stamp(now),
    });
    snap.venueEvidenceAssets.push(asset);
    evidenceAssetId = asset.id;
  }
  const fact = VenueFactSchema.parse({
    id: randomUUID(),
    organisationId: input.organisationId,
    venueId: venue.id,
    factType: input.factType,
    subtype: input.subtype,
    valueText: input.valueText,
    valueIntegerMm: input.valueIntegerMm,
    valueInteger: input.valueInteger,
    unit: input.unit,
    applicability: input.applicability,
    applicableFrom: input.applicableFrom,
    applicableTo: input.applicableTo,
    sourceKind: input.sourceKind,
    sourceLabel: input.sourceLabel,
    sourceReference: input.sourceReference,
    verificationState: input.verificationState,
    evidenceAssetId,
    mayBecomeLockedSafetyConstraint: mayLockSafety(input),
    recordedByPersonId: actorPersonId,
    ...stamp(now),
  });
  snap.venueFacts.push(fact);
  venue.updatedAt = now;
  venue.version += 1;
  return fact;
}

export function verifyVenueFactOnSnap(
  snap: PlatformSnapshot,
  input: VerifyVenueFactInput,
  now: string,
  actorPersonId: string,
): VenueFact {
  requireVenue(snap, input.organisationId, input.venueId);
  const fact = snap.venueFacts.find((item) => item.id === input.factId && item.venueId === input.venueId);
  if (!fact || fact.organisationId !== input.organisationId) {
    throw new PlatformError("NOT_FOUND", "venue fact was not found");
  }
  assertVersion(fact.version, input.expectedVersion);
  if (fact.supersededByFactId) {
    throw new PlatformError("VALIDATION_FAILED", "a superseded fact cannot be verified");
  }
  if (fact.verificationState === "CONFLICTING" || fact.verificationState === "STALE") {
    throw new PlatformError("VALIDATION_FAILED", "conflicting or stale facts remain explicitly unresolved", {
      publicMessage: "Conflicting and stale facts stay visible. Verification does not invent a resolved state.",
    });
  }
  if (fact.verificationState === "VERIFIED") return fact;
  fact.verificationState = "VERIFIED";
  fact.verifiedByPersonId = actorPersonId;
  fact.verifiedAt = now;
  fact.updatedAt = now;
  fact.version += 1;
  return VenueFactSchema.parse(fact);
}

export function adoptVenueOnSnap(snap: PlatformSnapshot, input: AdoptVenueInput, now: string, actorPersonId: string): EventVenue {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const venue = requireVenue(snap, input.organisationId, input.venueId);
  if (venue.status !== "ACTIVE") {
    throw new PlatformError("VALIDATION_FAILED", "archived venues cannot be adopted");
  }
  if (venue.visibilityPolicy === "ASSIGNED_CLIENTS" && !venue.assignedClientIds.includes(event.clientId)) {
    throw new PlatformError("FORBIDDEN", "this venue is not assigned to the event client");
  }
  const otherClientAdoption = snap.eventVenues.find(
    (item) => item.venueId === venue.id && item.status === "ACTIVE" && item.clientId !== event.clientId,
  );
  if (otherClientAdoption && venue.crossClientReuse !== "EXPLICITLY_AUTHORISED") {
    throw new PlatformError("FORBIDDEN", "cross-client venue reuse is denied by default", {
      publicMessage: "This venue is already adopted by another client. Cross-client reuse requires explicit authorisation.",
    });
  }
  const existing = snap.eventVenues.find(
    (item) => item.venueId === venue.id && item.eventId === event.id && item.status === "ACTIVE",
  );
  if (existing) return existing;
  const facts = currentFacts(snap, venue.id);
  const eventVenue = EventVenueSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    venueId: venue.id,
    adoptedAt: now,
    adoptedByPersonId: actorPersonId,
    sourceVenueVersion: venue.version,
    sourceVenueHash: venueHash(venue, facts),
    status: "ACTIVE",
    ...stamp(now),
  });
  snap.eventVenues.push(eventVenue);
  for (const fact of facts) {
    snap.eventVenueFacts.push(
      EventVenueFactSchema.parse({
        id: randomUUID(),
        organisationId: event.organisationId,
        clientId: event.clientId,
        eventId: event.id,
        eventVenueId: eventVenue.id,
        venueFactId: fact.id,
        origin: "INHERITED",
        factType: fact.factType,
        subtype: fact.subtype,
        valueText: fact.valueText,
        valueIntegerMm: fact.valueIntegerMm,
        valueInteger: fact.valueInteger,
        unit: fact.unit,
        applicability: fact.applicability,
        sourceKind: fact.sourceKind,
        sourceLabel: fact.sourceLabel,
        verificationState: fact.verificationState,
        mayBecomeLockedSafetyConstraint: fact.mayBecomeLockedSafetyConstraint,
        recordedByPersonId: actorPersonId,
        ...stamp(now),
      }),
    );
  }
  return eventVenue;
}

export function recordEventVenueOverrideOnSnap(
  snap: PlatformSnapshot,
  input: RecordEventVenueOverrideInput,
  now: string,
  actorPersonId: string,
): EventVenueFact {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const eventVenue = requireEventVenue(snap, event.organisationId, event.id, input.eventVenueId);
  if (input.overridesVenueFactId) {
    const source = snap.venueFacts.find((item) => item.id === input.overridesVenueFactId && item.venueId === eventVenue.venueId);
    if (!source) throw new PlatformError("NOT_FOUND", "the reusable fact to override was not found");
  }
  const override = EventVenueFactSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    eventVenueId: eventVenue.id,
    origin: "EVENT_OVERRIDE",
    factType: input.factType,
    subtype: input.subtype,
    valueText: input.valueText,
    valueIntegerMm: input.valueIntegerMm,
    valueInteger: input.valueInteger,
    unit: input.unit,
    applicability: "ALWAYS",
    sourceKind: input.sourceKind,
    sourceLabel: input.sourceLabel,
    verificationState: input.verificationState,
    mayBecomeLockedSafetyConstraint: mayLockSafety(input),
    overridesVenueFactId: input.overridesVenueFactId,
    recordedByPersonId: actorPersonId,
    ...stamp(now),
  });
  snap.eventVenueFacts.push(override);
  const reusable = input.overridesVenueFactId
    ? snap.venueFacts.find((item) => item.id === input.overridesVenueFactId)
    : undefined;
  if (reusable && (reusable.valueText !== override.valueText || reusable.valueIntegerMm !== override.valueIntegerMm)) {
    // Event override must not mutate the reusable source. The assertion is the unchanged reusable record.
  }
  return override;
}

function persistRevision(
  snap: PlatformSnapshot,
  layout: Layout,
  actorPersonId: string,
  now: string,
  revisionNumber: number,
): { revisionId: string; contentHash: string } {
  const current = snap.layoutRevisions.find((item) => item.id === layout.currentRevisionId);
  const objects = current?.objects ?? [];
  const contentHash = layoutContentHash({
    coordinateSystem: layout.coordinateSystem,
    bounds: layout.bounds,
    objects,
  });
  const revision = LayoutRevisionSchema.parse({
    id: randomUUID(),
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    revisionNumber,
    contentHash,
    coordinateSystem: layout.coordinateSystem,
    bounds: layout.bounds,
    objects,
    createdByPersonId: actorPersonId,
    immutable: true,
    ...stamp(now),
  });
  snap.layoutRevisions.push(revision);
  return { revisionId: revision.id, contentHash };
}

function ensureEditorLease(snap: PlatformSnapshot, layout: Layout, actorPersonId: string, now: string): LayoutEditorLease {
  expireStaleLeases(snap, now);
  const current = activeLease(snap, layout.id, now);
  if (current && current.holderPersonId !== actorPersonId) {
    throw new PlatformError("FORBIDDEN", "another editor holds the layout lease", {
      publicMessage: "Another staff member is editing this layout. One active editor holds the lease.",
    });
  }
  if (current) {
    current.expiresAt = new Date(Date.parse(now) + LAYOUT_EDITOR_LEASE_TTL_SECONDS * 1000).toISOString();
    current.updatedAt = now;
    current.version += 1;
    layout.editorLeaseId = current.id;
    return current;
  }
  const lease = LayoutEditorLeaseSchema.parse({
    id: randomUUID(),
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    holderPersonId: actorPersonId,
    acquiredAt: now,
    expiresAt: new Date(Date.parse(now) + LAYOUT_EDITOR_LEASE_TTL_SECONDS * 1000).toISOString(),
    status: "ACTIVE",
    ...stamp(now),
  });
  snap.layoutEditorLeases.push(lease);
  layout.editorLeaseId = lease.id;
  return lease;
}

export function createBlankLayoutOnSnap(
  snap: PlatformSnapshot,
  input: CreateBlankLayoutInput,
  now: string,
  actorPersonId: string,
): Layout {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const eventVenue = requireEventVenue(snap, event.organisationId, event.id, input.eventVenueId);
  const bounds = layoutBoundsFromSize(input.widthMm, input.heightMm);
  const layoutId = randomUUID();
  const contentHash = layoutContentHash({
    coordinateSystem: FROZEN_COORDINATE_SYSTEM,
    bounds,
    objects: [],
  });
  const revision = LayoutRevisionSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    layoutId,
    revisionNumber: 1,
    contentHash,
    coordinateSystem: FROZEN_COORDINATE_SYSTEM,
    bounds,
    objects: [],
    createdByPersonId: actorPersonId,
    immutable: true,
    ...stamp(now),
  });
  const layout = LayoutSchema.parse({
    id: layoutId,
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    eventVenueId: eventVenue.id,
    name: input.name,
    status: "DRAFT",
    coordinateSystem: FROZEN_COORDINATE_SYSTEM,
    bounds,
    displayLengthUnit: input.displayLengthUnit,
    currentRevisionId: revision.id,
    currentRevisionNumber: 1,
    contentHash,
    recordedByPersonId: actorPersonId,
    ...stamp(now),
  });
  snap.layouts.push(layout);
  snap.layoutRevisions.push(revision);
  ensureEditorLease(snap, layout, actorPersonId, now);
  return layout;
}

export function updateLayoutSetupOnSnap(
  snap: PlatformSnapshot,
  input: UpdateLayoutSetupInput,
  now: string,
  actorPersonId: string,
): Layout {
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertVersion(layout.version, input.expectedVersion);
  if (layout.currentRevisionNumber !== input.expectedRevisionNumber) {
    throw new PlatformError("VERSION_CONFLICT", "this layout revision changed while you were editing", {
      publicMessage: "This layout changed while you were editing. Reload before saving.",
    });
  }
  ensureEditorLease(snap, layout, actorPersonId, now);
  if (input.name) layout.name = input.name;
  if (input.displayLengthUnit) layout.displayLengthUnit = input.displayLengthUnit;
  if (input.widthMm !== undefined || input.heightMm !== undefined) {
    layout.bounds = layoutBoundsFromSize(input.widthMm ?? layout.bounds.widthMm, input.heightMm ?? layout.bounds.heightMm);
  }
  const nextRevision = layout.currentRevisionNumber + 1;
  const persisted = persistRevision(snap, layout, actorPersonId, now, nextRevision);
  layout.currentRevisionId = persisted.revisionId;
  layout.currentRevisionNumber = nextRevision;
  layout.contentHash = persisted.contentHash;
  layout.updatedAt = now;
  layout.version += 1;
  return LayoutSchema.parse(layout);
}

export function acquireLayoutLeaseOnSnap(
  snap: PlatformSnapshot,
  input: AcquireLayoutLeaseInput,
  now: string,
  actorPersonId: string,
): LayoutEditorLease {
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertVersion(layout.version, input.expectedVersion);
  const lease = ensureEditorLease(snap, layout, actorPersonId, now);
  layout.updatedAt = now;
  return lease;
}

export function currentReusableFacts(snap: PlatformSnapshot, venueId: string): VenueFact[] {
  return currentFacts(snap, venueId);
}
