import { operationalDisplayName } from "./guest-matching.js";
import type { PermissionKey } from "./schemas.js";
import {
  eventPhases,
  phaseGuestCount,
  wholeEventAttendanceUnion,
} from "./programme-operations.js";
import type { PlatformSnapshot } from "./store.js";

export interface ProgrammeCapabilities {
  canView: boolean;
  canManagePhase: boolean;
  canManageRoute: boolean;
  canManageCheckpoint: boolean;
  canManageEntitlement: boolean;
  canGrantProtectedAccess: boolean;
  canManageVehicle: boolean;
  canPublishAccessPlan: boolean;
  canReviewException: boolean;
}

export function programmePermissionAllowed(
  check: (permission: PermissionKey) => boolean,
): ProgrammeCapabilities {
  return {
    canView: check("programme.view"),
    canManagePhase: check("programme.phase.manage"),
    canManageRoute: check("programme.route.manage"),
    canManageCheckpoint: check("programme.checkpoint.manage"),
    canManageEntitlement: check("programme.entitlement.manage"),
    canGrantProtectedAccess: check("programme.protectedAccess.grant"),
    canManageVehicle: check("programme.vehicle.manage"),
    canPublishAccessPlan: check("programme.accessPlan.publish"),
    canReviewException: check("programme.exception.review"),
  };
}

export function buildEventProgrammeWorkspace(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  capabilities: ProgrammeCapabilities,
) {
  const event = snap.events.find((item) => item.id === eventId && item.organisationId === organisationId);
  if (!event) return undefined;
  const phases = eventPhases(snap, eventId);
  const union = wholeEventAttendanceUnion(snap, eventId);
  const phaseCounts = phases.map((phase) => phaseGuestCount(snap, phase.id));
  const summed = phaseCounts.reduce((total, count) => total + count, 0);
  return {
    eventId: event.id,
    organisationId: event.organisationId,
    eventName: event.name,
    timezone: event.timezone,
    simpleMode: phases.length <= 1,
    phases: phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      type: phase.type,
      isDefault: phase.isDefault,
      status: phase.status,
      startsAt: phase.startsAt,
      endsAt: phase.endsAt,
      locationLabel: phase.locationLabel,
      locationGuestSafe: phase.locationGuestSafe,
      locationRestricted: capabilities.canReviewException ? phase.locationRestricted : undefined,
      overlapAcknowledged: phase.overlapAcknowledged,
      sequence: phase.sequence,
      version: phase.version,
      guestCount: phaseGuestCount(snap, phase.id),
    })),
    attendance: {
      distinctGuests: union.length,
      summedPhaseCounts: summed,
      unionRule: "DISTINCT_PERSON" as const,
      doubleCountPrevented: union.length !== summed || phases.length <= 1 || summed === union.length,
    },
    checkpoints: snap.perimeterCheckpoints
      .filter((item) => item.eventId === eventId)
      .sort((left, right) => left.sequence - right.sequence)
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        status: item.status,
        verificationRequired: item.verificationRequired,
        sharedPerimeter: item.sharedPerimeter,
        phaseId: item.phaseId,
        version: item.version,
      })),
    routes: snap.arrivalRoutes
      .filter((item) => item.eventId === eventId)
      .map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        status: item.status,
        checkpointIds: item.checkpointIds,
        guestFacingCode: item.guestFacingCode,
        discreetMarker: item.discreetMarker,
        hostApprovedVipLanguage: item.hostApprovedVipLanguage,
        securityClassification: capabilities.canReviewException ? item.securityClassification : undefined,
        version: item.version,
      })),
    vehicles: snap.operationalVehicles
      .filter((item) => item.eventId === eventId)
      .map((vehicle) => {
        const associations = snap.vehicleAssociations.filter(
          (item) => item.vehicleId === vehicle.id && item.status === "ACTIVE",
        );
        return {
          id: vehicle.id,
          plate: capabilities.canManageVehicle || capabilities.canView ? maskPlate(vehicle.plate, capabilities) : "••••",
          vehicleClass: vehicle.vehicleClass,
          colour: vehicle.colour,
          assignedRouteId: vehicle.assignedRouteId,
          assignedParkingCheckpointId: vehicle.assignedParkingCheckpointId,
          status: vehicle.status,
          version: vehicle.version,
          occupants: associations.map((item) => ({
            guestId: item.guestId,
            role: item.role,
            displayName: guestName(snap, item.guestId),
          })),
        };
      }),
    packages: snap.offlineAccessPackages
      .filter((item) => item.eventId === eventId)
      .sort((left, right) => right.packageVersion - left.packageVersion)
      .map((item) => ({
        id: item.id,
        packageVersion: item.packageVersion,
        status: item.status,
        generatedAt: item.generatedAt,
        validUntil: item.validUntil,
        keyRef: item.keyRef,
        checksum: item.checksum,
        hmacSignature: undefined,
        attendanceWriter: item.body.policy.attendanceWriter,
        version: item.version,
      })),
    exceptions: snap.accessExceptions
      .filter((item) => item.eventId === eventId)
      .map((item) => ({
        id: item.id,
        status: item.status,
        rationale: item.restricted && !capabilities.canReviewException ? "Restricted rationale withheld" : item.rationale,
        restricted: item.restricted,
        guestId: item.guestId,
        checkpointId: item.checkpointId,
        version: item.version,
      })),
    entitlements: snap.phaseEntitlements
      .filter((item) => item.eventId === eventId && item.status === "ACTIVE")
      .map((item) => ({
        id: item.id,
        phaseId: item.phaseId,
        subjectType: item.subjectType,
        subjectId: item.subjectId,
        displayName: item.subjectType === "GUEST" ? guestName(snap, item.subjectId) : item.subjectId,
        protectedAccess: item.protectedAccess,
        fastTrackRouting: item.fastTrackRouting,
        routeId: item.routeId,
        version: item.version,
      })),
    guests: snap.operationalGuests
      .filter((item) => item.eventId === eventId && item.lifecycle === "ACTIVE")
      .map((item) => ({
        id: item.id,
        displayName: operationalDisplayName(item),
      })),
    capabilities,
  };
}

export type EventProgrammeWorkspace = NonNullable<ReturnType<typeof buildEventProgrammeWorkspace>>;

export function buildGuestPhaseProjection(snap: PlatformSnapshot, eventId: string, guestId: string) {
  const entitlements = snap.phaseEntitlements.filter(
    (item) => item.eventId === eventId && item.subjectType === "GUEST" && item.subjectId === guestId && item.status === "ACTIVE",
  );
  const credential = snap.credentialProjections.find(
    (item) => item.eventId === eventId && item.subjectType === "GUEST" && item.subjectId === guestId && item.status === "ACTIVE",
  );
  return {
    guestId,
    eventId,
    phases: entitlements.map((item) => {
      const phase = snap.programmePhases.find((phaseItem) => phaseItem.id === item.phaseId);
      const route = item.routeId ? snap.arrivalRoutes.find((routeItem) => routeItem.id === item.routeId) : undefined;
      return {
        phaseId: item.phaseId,
        phaseName: phase?.name ?? "Phase",
        fastTrackRouting: item.fastTrackRouting,
        routeLabel: route?.name,
        discreetMarker: route?.hostApprovedVipLanguage ? "VIP" : route?.discreetMarker,
      };
    }),
    presentationReference: credential?.presentationReference,
    oneGuest: true,
  };
}

function guestName(snap: PlatformSnapshot, guestId: string): string {
  const guest = snap.operationalGuests.find((item) => item.id === guestId);
  return guest ? operationalDisplayName(guest) : "Named guest";
}

function maskPlate(plate: string, capabilities: ProgrammeCapabilities): string {
  if (capabilities.canManageVehicle) return plate;
  if (plate.length <= 3) return "•••";
  return `${plate.slice(0, 2)}••${plate.slice(-1)}`;
}
