import { createHmac, createHash, randomUUID } from "node:crypto";
import {
  SCHEMA_VERSION,
  S04B_NON_PRODUCTION_HMAC_KEY,
  S04B_OFFLINE_HMAC_KEY_REF,
} from "./constants.js";
import { PlatformError } from "./errors.js";
import type {
  AccessException,
  ArrivalRoute,
  AssignPhaseEntitlementInput,
  ConsumeOfflinePackageInput,
  CreateArrivalRouteInput,
  CreateCheckpointInput,
  CreateProgrammePhaseInput,
  CreateVehicleInput,
  CredentialProjection,
  OfflineAccessPackage,
  OperationalVehicle,
  PerimeterCheckpoint,
  PhaseEntitlement,
  ProgrammePhase,
  PublishOfflinePackageInput,
  RaiseAccessExceptionInput,
  ResolveCheckpointInput,
  VehicleAssociation,
} from "./programme-schemas.js";
import {
  ArrivalRouteSchema,
  CredentialProjectionSchema,
  OfflineAccessPackageSchema,
  OperationalVehicleSchema,
  PerimeterCheckpointSchema,
  PhaseEntitlementSchema,
  ProgrammePhaseSchema,
  VehicleAssociationSchema,
} from "./programme-schemas.js";
import { stableHash } from "./redaction.js";
import type { EventRecord } from "./schemas.js";
import type { PlatformSnapshot } from "./store.js";

function versioned(now: string) {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function requireScopedEvent(snap: PlatformSnapshot, organisationId: string, eventId: string): EventRecord {
  const event = snap.events.find((item) => item.id === eventId);
  if (!event || event.organisationId !== organisationId) {
    throw new PlatformError("NOT_FOUND", "event was not found");
  }
  return event;
}

function requirePhase(snap: PlatformSnapshot, organisationId: string, eventId: string, phaseId: string): ProgrammePhase {
  const phase = snap.programmePhases.find((item) => item.id === phaseId);
  if (!phase || phase.organisationId !== organisationId || phase.eventId !== eventId) {
    throw new PlatformError("NOT_FOUND", "programme phase was not found");
  }
  return phase;
}

function windowsOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string): boolean {
  return Date.parse(leftStart) < Date.parse(rightEnd) && Date.parse(rightStart) < Date.parse(leftEnd);
}

export function defaultPhaseName(event: EventRecord): string {
  return event.name;
}

export function buildDefaultProgrammePhase(event: EventRecord, now: string, phaseId: string): ProgrammePhase {
  return ProgrammePhaseSchema.parse({
    id: phaseId,
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    name: defaultPhaseName(event),
    type: "PRIMARY",
    isDefault: true,
    status: "DRAFT",
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    locationLabel: event.venueSummary ?? "Primary venue",
    sequence: 0,
    overlapAcknowledged: false,
    ...versioned(now),
  });
}

export function eventPhases(snap: PlatformSnapshot, eventId: string): ProgrammePhase[] {
  return snap.programmePhases
    .filter((item) => item.eventId === eventId && item.status !== "CANCELLED" && item.status !== "SUPERSEDED")
    .sort((left, right) => left.sequence - right.sequence || Date.parse(left.startsAt) - Date.parse(right.startsAt));
}

export function wholeEventAttendanceUnion(snap: PlatformSnapshot, eventId: string): string[] {
  const ids = new Set<string>();
  for (const entitlement of snap.phaseEntitlements) {
    if (entitlement.eventId !== eventId) continue;
    if (entitlement.subjectType !== "GUEST") continue;
    if (entitlement.status !== "ACTIVE") continue;
    ids.add(entitlement.subjectId);
  }
  return [...ids].sort();
}

export function phaseGuestCount(snap: PlatformSnapshot, phaseId: string): number {
  return snap.phaseEntitlements.filter(
    (item) => item.phaseId === phaseId && item.subjectType === "GUEST" && item.status === "ACTIVE",
  ).length;
}

export function ensureDefaultPhaseOnSnap(snap: PlatformSnapshot, event: EventRecord, now: string, phaseId: string): ProgrammePhase {
  const existing = snap.programmePhases.find((item) => item.eventId === event.id && item.isDefault && item.status !== "CANCELLED");
  if (existing) return existing;
  const phase = buildDefaultProgrammePhase(event, now, phaseId);
  snap.programmePhases.push(phase);
  return phase;
}

export function createProgrammePhaseOnSnap(snap: PlatformSnapshot, input: CreateProgrammePhaseInput, now: string): ProgrammePhase {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  if (Date.parse(input.endsAt) <= Date.parse(input.startsAt)) {
    throw new PlatformError("VALIDATION_FAILED", "phase end must be after start", { field: "endsAt" });
  }
  const siblings = eventPhases(snap, event.id);
  const overlapping = siblings.filter((item) => windowsOverlap(item.startsAt, item.endsAt, input.startsAt, input.endsAt));
  if (overlapping.length > 0 && !input.overlapAcknowledged) {
    throw new PlatformError("VALIDATION_FAILED", "overlapping phases require an explicit operating acknowledgement", {
      field: "overlapAcknowledged",
    });
  }
  if (overlapping.length > 0 && !input.overlapAcknowledgementReason?.trim()) {
    throw new PlatformError("VALIDATION_FAILED", "overlap acknowledgement requires a reason", {
      field: "overlapAcknowledgementReason",
    });
  }
  const record = ProgrammePhaseSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    name: input.name,
    type: input.type,
    isDefault: false,
    status: "DRAFT",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone ?? event.timezone,
    locationLabel: input.locationLabel,
    ...(input.locationGuestSafe ? { locationGuestSafe: input.locationGuestSafe } : {}),
    sequence: siblings.length,
    overlapAcknowledged: Boolean(input.overlapAcknowledged && overlapping.length > 0),
    ...(input.overlapAcknowledgementReason ? { overlapAcknowledgementReason: input.overlapAcknowledgementReason } : {}),
    ...versioned(now),
  });
  snap.programmePhases.push(record);
  return record;
}

export function assignPhaseEntitlementOnSnap(
  snap: PlatformSnapshot,
  input: AssignPhaseEntitlementInput,
  now: string,
  options: { allowProtected: boolean },
): PhaseEntitlement {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const phase = requirePhase(snap, input.organisationId, input.eventId, input.phaseId);
  if (phase.version !== input.expectedPhaseVersion) {
    throw new PlatformError("VERSION_CONFLICT", `expected version ${input.expectedPhaseVersion} but found ${phase.version}`);
  }
  const guest = snap.operationalGuests.find((item) => item.id === input.guestId);
  if (!guest || guest.organisationId !== event.organisationId || guest.eventId !== event.id) {
    throw new PlatformError("NOT_FOUND", "guest record was not found");
  }
  if (input.protectedAccess && !options.allowProtected) {
    throw new PlatformError("FORBIDDEN", "planner authority cannot grant protected access");
  }
  if (input.routeId) {
    const route = snap.arrivalRoutes.find((item) => item.id === input.routeId);
    if (!route || route.eventId !== event.id) {
      throw new PlatformError("NOT_FOUND", "arrival route was not found");
    }
  }
  const duplicate = snap.phaseEntitlements.find(
    (item) =>
      item.eventId === event.id &&
      item.phaseId === phase.id &&
      item.subjectType === "GUEST" &&
      item.subjectId === guest.id &&
      item.status === "ACTIVE",
  );
  if (duplicate) {
    throw new PlatformError("VALIDATION_FAILED", "this guest is already entitled for the selected phase", {
      field: "guestId",
    });
  }
  const record = PhaseEntitlementSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    phaseId: phase.id,
    subjectType: "GUEST",
    subjectId: guest.id,
    ...(input.routeId ? { routeId: input.routeId } : {}),
    zoneIds: [],
    status: "ACTIVE",
    protectedAccess: Boolean(input.protectedAccess),
    fastTrackRouting: Boolean(input.fastTrackRouting),
    reason: input.reason,
    ...versioned(now),
  });
  snap.phaseEntitlements.push(record);
  phase.version += 1;
  phase.updatedAt = now;
  upsertGuestCredential(snap, event, guest.id, now);
  return record;
}

function presentationReference(eventId: string, subjectId: string): string {
  const hex = createHash("sha256").update(`${eventId}:${subjectId}`).digest("hex");
  return `MD-${hex.slice(0, 8).toUpperCase()}`;
}

function upsertGuestCredential(snap: PlatformSnapshot, event: EventRecord, guestId: string, now: string): CredentialProjection {
  const entitlementIds = snap.phaseEntitlements
    .filter((item) => item.eventId === event.id && item.subjectType === "GUEST" && item.subjectId === guestId && item.status === "ACTIVE")
    .map((item) => item.id);
  const existing = snap.credentialProjections.find(
    (item) => item.eventId === event.id && item.subjectType === "GUEST" && item.subjectId === guestId && item.status === "ACTIVE",
  );
  const presentation = presentationReference(event.id, guestId);
  const digest = createHash("sha256").update(`${event.id}:${guestId}:${entitlementIds.join(",")}`).digest("hex");
  if (existing) {
    existing.entitlementIds = entitlementIds;
    existing.payloadDigest = digest;
    existing.version += 1;
    existing.updatedAt = now;
    return existing;
  }
  const record = CredentialProjectionSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    subjectType: "GUEST",
    subjectId: guestId,
    presentationReference: presentation,
    payloadDigest: digest,
    entitlementIds,
    status: "ACTIVE",
    ...versioned(now),
  });
  snap.credentialProjections.push(record);
  return record;
}

export function createCheckpointOnSnap(snap: PlatformSnapshot, input: CreateCheckpointInput, now: string): PerimeterCheckpoint {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  if (input.phaseId) requirePhase(snap, input.organisationId, input.eventId, input.phaseId);
  const sequence = snap.perimeterCheckpoints.filter((item) => item.eventId === event.id).length;
  const record = PerimeterCheckpointSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    ...(input.phaseId ? { phaseId: input.phaseId } : {}),
    name: input.name,
    type: input.type,
    status: "READY",
    sharedPerimeter: Boolean(input.sharedPerimeter),
    verificationRequired: input.verificationRequired !== false,
    sequence,
    ...versioned(now),
  });
  snap.perimeterCheckpoints.push(record);
  return record;
}

export function createArrivalRouteOnSnap(snap: PlatformSnapshot, input: CreateArrivalRouteInput, now: string): ArrivalRoute {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  if (input.phaseId) requirePhase(snap, input.organisationId, input.eventId, input.phaseId);
  for (const checkpointId of input.checkpointIds) {
    const checkpoint = snap.perimeterCheckpoints.find((item) => item.id === checkpointId);
    if (!checkpoint || checkpoint.eventId !== event.id) {
      throw new PlatformError("NOT_FOUND", "checkpoint is not in this event");
    }
  }
  const record = ArrivalRouteSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    ...(input.phaseId ? { phaseId: input.phaseId } : {}),
    name: input.name,
    kind: input.kind,
    status: "READY",
    checkpointIds: input.checkpointIds,
    ...(input.guestFacingCode ? { guestFacingCode: input.guestFacingCode } : {}),
    ...(input.discreetMarker ? { discreetMarker: input.discreetMarker } : {}),
    hostApprovedVipLanguage: Boolean(input.hostApprovedVipLanguage),
    securityClassification: input.kind === "DISCREET_FAST_TRACK" ? "RESTRICTED" : "STAFF",
    ...versioned(now),
  });
  snap.arrivalRoutes.push(record);
  return record;
}

export function createVehicleOnSnap(snap: PlatformSnapshot, input: CreateVehicleInput, now: string): {
  vehicle: OperationalVehicle;
  association?: VehicleAssociation;
} {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  if (input.assignedRouteId) {
    const route = snap.arrivalRoutes.find((item) => item.id === input.assignedRouteId && item.eventId === event.id);
    if (!route) throw new PlatformError("NOT_FOUND", "arrival route was not found");
  }
  if (input.assignedParkingCheckpointId) {
    const checkpoint = snap.perimeterCheckpoints.find(
      (item) => item.id === input.assignedParkingCheckpointId && item.eventId === event.id,
    );
    if (!checkpoint) throw new PlatformError("NOT_FOUND", "parking checkpoint was not found");
  }
  const vehicle = OperationalVehicleSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    plate: input.plate,
    vehicleClass: input.vehicleClass,
    ...(input.colour ? { colour: input.colour } : {}),
    ...(input.assignedRouteId ? { assignedRouteId: input.assignedRouteId } : {}),
    ...(input.assignedParkingCheckpointId ? { assignedParkingCheckpointId: input.assignedParkingCheckpointId } : {}),
    status: "REGISTERED",
    ...versioned(now),
  });
  snap.operationalVehicles.push(vehicle);
  if (!input.driverGuestId) return { vehicle };
  const guest = snap.operationalGuests.find((item) => item.id === input.driverGuestId);
  if (!guest || guest.eventId !== event.id) {
    throw new PlatformError("NOT_FOUND", "driver guest was not found");
  }
  const association = VehicleAssociationSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    vehicleId: vehicle.id,
    guestId: guest.id,
    role: "DRIVER",
    status: "ACTIVE",
    reason: input.reason,
    ...versioned(now),
  });
  snap.vehicleAssociations.push(association);
  return { vehicle, association };
}

function packageCanonicalBody(pkg: Omit<OfflineAccessPackage, "hmacSignature" | "checksum">): string {
  return JSON.stringify({
    eventId: pkg.eventId,
    packageVersion: pkg.packageVersion,
    generatedAt: pkg.generatedAt,
    validUntil: pkg.validUntil,
    keyRef: pkg.keyRef,
    body: pkg.body,
  });
}

export function signOfflinePackageBody(canonical: string, hmacKey = S04B_NON_PRODUCTION_HMAC_KEY): {
  checksum: string;
  hmacSignature: string;
} {
  return {
    checksum: createHash("sha256").update(canonical).digest("hex"),
    hmacSignature: createHmac("sha256", hmacKey).update(canonical).digest("hex"),
  };
}

export function verifyOfflinePackage(pkg: OfflineAccessPackage, hmacKey = S04B_NON_PRODUCTION_HMAC_KEY, now: string): void {
  const { checksum, hmacSignature } = signOfflinePackageBody(packageCanonicalBody(pkg), hmacKey);
  if (checksum !== pkg.checksum || hmacSignature !== pkg.hmacSignature) {
    throw new PlatformError("VALIDATION_FAILED", "offline package signature is not valid");
  }
  if (pkg.status !== "ACTIVE") {
    throw new PlatformError("VALIDATION_FAILED", "offline package is not the current published version");
  }
  if (Date.parse(pkg.validUntil) <= Date.parse(now)) {
    throw new PlatformError("VALIDATION_FAILED", "offline package is stale");
  }
}

export function publishOfflinePackageOnSnap(
  snap: PlatformSnapshot,
  input: PublishOfflinePackageInput,
  now: string,
): OfflineAccessPackage {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const current = snap.offlineAccessPackages
    .filter((item) => item.eventId === event.id)
    .sort((left, right) => right.packageVersion - left.packageVersion)[0];
  if (current?.status === "ACTIVE") {
    current.status = "SUPERSEDED";
    current.version += 1;
    current.updatedAt = now;
  }
  const unsigned = {
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    packageVersion: (current?.packageVersion ?? 0) + 1,
    status: "ACTIVE" as const,
    generatedAt: now,
    validUntil: input.validUntil,
    hmacSignature: "pending",
    checksum: "pending",
    keyRef: S04B_OFFLINE_HMAC_KEY_REF,
    ...(current ? { supersededPackageId: current.id } : {}),
    body: {
      phaseIds: eventPhases(snap, event.id).map((item) => item.id),
      checkpointIds: snap.perimeterCheckpoints.filter((item) => item.eventId === event.id).map((item) => item.id),
      credentialDigests: snap.credentialProjections
        .filter((item) => item.eventId === event.id && item.status === "ACTIVE")
        .map((item) => item.payloadDigest),
      routeCodes: snap.arrivalRoutes
        .filter((item) => item.eventId === event.id)
        .map((item) => item.guestFacingCode ?? item.discreetMarker ?? item.kind)
        .filter((item): item is string => Boolean(item)),
      policy: {
        staleFailsClosed: true as const,
        attendanceWriter: "SLICE_8_ONLY" as const,
        fastTrackDoesNotSkipVerification: true as const,
      },
    },
    ...versioned(now),
  };
  const { checksum, hmacSignature } = signOfflinePackageBody(packageCanonicalBody(unsigned));
  const record = OfflineAccessPackageSchema.parse({ ...unsigned, checksum, hmacSignature });
  snap.offlineAccessPackages.push(record);
  return record;
}

export function consumeOfflinePackageOnSnap(
  snap: PlatformSnapshot,
  input: ConsumeOfflinePackageInput,
  now: string,
): OfflineAccessPackage {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const pkg = snap.offlineAccessPackages.find((item) => item.id === input.packageId);
  if (!pkg || pkg.eventId !== event.id) {
    throw new PlatformError("NOT_FOUND", "offline package was not found");
  }
  if (pkg.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", `expected version ${input.expectedVersion} but found ${pkg.version}`);
  }
  verifyOfflinePackage(pkg, S04B_NON_PRODUCTION_HMAC_KEY, now);
  const beforeHash = stableHash({ phases: eventPhases(snap, event.id), entitlements: snap.phaseEntitlements.filter((item) => item.eventId === event.id) });
  pkg.updatedAt = now;
  const afterHash = stableHash({ phases: eventPhases(snap, event.id), entitlements: snap.phaseEntitlements.filter((item) => item.eventId === event.id) });
  if (beforeHash !== afterHash) {
    throw new PlatformError("INTERNAL_ERROR", "offline consume must not mutate canonical programme truth");
  }
  return pkg;
}

export function resolveCheckpointOnSnap(snap: PlatformSnapshot, input: ResolveCheckpointInput): {
  outcome: "AUTHORISED" | "REFER" | "INSUFFICIENT" | "REVOKED" | "STALE" | "WRONG_CHECKPOINT" | "WRONG_EVENT" | "WRONG_PHASE";
  verificationRequired: boolean;
  routingCode?: string;
  guestFacingMarker?: string;
  attendanceWritten: false;
} {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const checkpoint = snap.perimeterCheckpoints.find((item) => item.id === input.checkpointId);
  if (!checkpoint) throw new PlatformError("NOT_FOUND", "checkpoint was not found");
  if (checkpoint.eventId !== event.id) {
    return { outcome: "WRONG_EVENT", verificationRequired: true, attendanceWritten: false };
  }
  const credential = snap.credentialProjections.find(
    (item) =>
      item.eventId === event.id &&
      item.presentationReference === input.presentationReference &&
      item.status === "ACTIVE",
  );
  if (!credential) {
    const otherEvent = snap.credentialProjections.find(
      (item) => item.presentationReference === input.presentationReference && item.eventId !== event.id,
    );
    if (otherEvent) return { outcome: "WRONG_EVENT", verificationRequired: true, attendanceWritten: false };
    return { outcome: "INSUFFICIENT", verificationRequired: true, attendanceWritten: false };
  }
  if (credential.status === "REVOKED") {
    return { outcome: "REVOKED", verificationRequired: true, attendanceWritten: false };
  }
  const entitlements = snap.phaseEntitlements.filter((item) => credential.entitlementIds.includes(item.id) && item.status === "ACTIVE");
  if (checkpoint.phaseId && !entitlements.some((item) => item.phaseId === checkpoint.phaseId)) {
    return { outcome: "WRONG_PHASE", verificationRequired: true, attendanceWritten: false };
  }
  const route = entitlements
    .map((item) => snap.arrivalRoutes.find((routeItem) => routeItem.id === item.routeId))
    .find((item) => item && item.checkpointIds.includes(checkpoint.id));
  if (!route && entitlements.length === 0) {
    return { outcome: "INSUFFICIENT", verificationRequired: true, attendanceWritten: false };
  }
  const fastTrack = entitlements.some((item) => item.fastTrackRouting);
  return {
    outcome: "AUTHORISED",
    verificationRequired: checkpoint.verificationRequired,
    ...((route?.guestFacingCode || fastTrack)
      ? { routingCode: route?.guestFacingCode ?? "FT", guestFacingMarker: route?.discreetMarker ?? "◆" }
      : {}),
    attendanceWritten: false,
  };
}

export function raiseAccessExceptionOnSnap(snap: PlatformSnapshot, input: RaiseAccessExceptionInput, now: string): AccessException {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const record: AccessException = {
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    ...(input.phaseId ? { phaseId: input.phaseId } : {}),
    ...(input.checkpointId ? { checkpointId: input.checkpointId } : {}),
    ...(input.guestId ? { guestId: input.guestId } : {}),
    status: "OPEN",
    rationale: input.rationale,
    restricted: Boolean(input.restricted),
    ...versioned(now),
  };
  snap.accessExceptions.push(record);
  return record;
}
