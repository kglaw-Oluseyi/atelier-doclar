import { SCHEMA_VERSION } from "./constants.js";
import { S04A_FIXTURE_IDS } from "./addressing-fixtures.js";
import { FIXTURE_IDS } from "./fixtures.js";
import { signOfflinePackageBody } from "./programme-operations.js";
import { S04B_OFFLINE_HMAC_KEY_REF } from "./constants.js";
import type {
  ArrivalRoute,
  CredentialProjection,
  OfflineAccessPackage,
  OperationalVehicle,
  PerimeterCheckpoint,
  PhaseEntitlement,
  ProgrammePhase,
  VehicleAssociation,
} from "./programme-schemas.js";
import type { PlatformSnapshot } from "./store.js";

const AT = "2026-09-07T10:00:00.000Z";

export const S04B_FIXTURE_IDS = {
  phaseChurch: "00000000-0000-4000-8000-000000000090",
  phaseReception: "00000000-0000-4000-8000-000000000091",
  checkpointGate: "00000000-0000-4000-8000-000000000092",
  checkpointParking: "00000000-0000-4000-8000-000000000093",
  checkpointReception: "00000000-0000-4000-8000-000000000094",
  routeGeneral: "00000000-0000-4000-8000-000000000095",
  routeFastTrack: "00000000-0000-4000-8000-000000000096",
  entitlementEbunChurch: "00000000-0000-4000-8000-000000000097",
  entitlementEbunReception: "00000000-0000-4000-8000-000000000098",
  entitlementOlufemiChurch: "00000000-0000-4000-8000-000000000099",
  vehicleOne: "00000000-0000-4000-8000-00000000009a",
  associationDriver: "00000000-0000-4000-8000-00000000009b",
  credentialEbun: "00000000-0000-4000-8000-00000000009c",
  packageV1: "00000000-0000-4000-8000-00000000009d",
} as const;

function stamp<T extends object>(value: T): T & { nonProductionFixture: true } {
  return { ...value, nonProductionFixture: true };
}

function versioned() {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: AT,
    updatedAt: AT,
  };
}

function scoped() {
  return {
    organisationId: FIXTURE_IDS.orgMaison,
    clientId: FIXTURE_IDS.clientAlpha,
    eventId: FIXTURE_IDS.eventAlphaOne,
  };
}

export function applyS04BFixturesIfMissing(snap: PlatformSnapshot): PlatformSnapshot {
  if (snap.programmePhases.some((item) => item.id === S04B_FIXTURE_IDS.phaseChurch)) return snap;
  const next = structuredClone(snap);
  const event = next.events.find((item) => item.id === FIXTURE_IDS.eventAlphaOne);
  if (!event) return snap;

  const defaultPhase = next.programmePhases.find((item) => item.eventId === event.id && item.isDefault);
  if (defaultPhase) {
    defaultPhase.status = "SUPERSEDED";
    defaultPhase.updatedAt = AT;
    defaultPhase.version += 1;
  }

  const church: ProgrammePhase = stamp({
    id: S04B_FIXTURE_IDS.phaseChurch,
    ...scoped(),
    name: "Church",
    type: "CHURCH",
    isDefault: true,
    status: "READY",
    startsAt: "2026-09-12T09:00:00.000Z",
    endsAt: "2026-09-12T12:00:00.000Z",
    timezone: "Africa/Lagos",
    locationLabel: "Cathedral of Christ the King, Lagos",
    locationGuestSafe: "Cathedral of Christ the King — guests enter from the west porch.",
    sequence: 0,
    overlapAcknowledged: false,
    ...versioned(),
  });
  const reception: ProgrammePhase = stamp({
    id: S04B_FIXTURE_IDS.phaseReception,
    ...scoped(),
    name: "Reception",
    type: "RECEPTION",
    isDefault: false,
    status: "READY",
    startsAt: "2026-09-12T13:00:00.000Z",
    endsAt: "2026-09-12T22:00:00.000Z",
    timezone: "Africa/Lagos",
    locationLabel: "The Wheatbaker, Ikoyi",
    locationGuestSafe: "The Wheatbaker — reception courtyard.",
    sequence: 1,
    overlapAcknowledged: false,
    ...versioned(),
  });
  next.programmePhases.push(church, reception);

  const gate: PerimeterCheckpoint = stamp({
    id: S04B_FIXTURE_IDS.checkpointGate,
    ...scoped(),
    name: "Estate main gate",
    type: "ESTATE_MAIN_GATE",
    status: "READY",
    sharedPerimeter: true,
    verificationRequired: true,
    sequence: 0,
    ...versioned(),
  });
  const parking: PerimeterCheckpoint = stamp({
    id: S04B_FIXTURE_IDS.checkpointParking,
    ...scoped(),
    name: "Reception parking",
    type: "PARKING_GENERAL",
    status: "READY",
    sharedPerimeter: false,
    verificationRequired: true,
    phaseId: S04B_FIXTURE_IDS.phaseReception,
    sequence: 1,
    ...versioned(),
  });
  const venue: PerimeterCheckpoint = stamp({
    id: S04B_FIXTURE_IDS.checkpointReception,
    ...scoped(),
    name: "Reception entrance",
    type: "RECEPTION",
    status: "READY",
    sharedPerimeter: false,
    verificationRequired: true,
    phaseId: S04B_FIXTURE_IDS.phaseReception,
    sequence: 2,
    ...versioned(),
  });
  next.perimeterCheckpoints.push(gate, parking, venue);

  const general: ArrivalRoute = stamp({
    id: S04B_FIXTURE_IDS.routeGeneral,
    ...scoped(),
    name: "General arrival",
    kind: "GENERAL",
    status: "READY",
    checkpointIds: [gate.id, parking.id, venue.id],
    guestFacingCode: "A",
    hostApprovedVipLanguage: false,
    securityClassification: "STAFF",
    ...versioned(),
  });
  const fastTrack: ArrivalRoute = stamp({
    id: S04B_FIXTURE_IDS.routeFastTrack,
    ...scoped(),
    name: "Discreet arrival",
    kind: "DISCREET_FAST_TRACK",
    status: "READY",
    checkpointIds: [gate.id, venue.id],
    guestFacingCode: "FT",
    discreetMarker: "◆",
    hostApprovedVipLanguage: false,
    securityClassification: "RESTRICTED",
    phaseId: S04B_FIXTURE_IDS.phaseReception,
    ...versioned(),
  });
  next.arrivalRoutes.push(general, fastTrack);

  const ebunChurch: PhaseEntitlement = stamp({
    id: S04B_FIXTURE_IDS.entitlementEbunChurch,
    ...scoped(),
    phaseId: church.id,
    subjectType: "GUEST",
    subjectId: S04A_FIXTURE_IDS.guestEbunoluwa,
    routeId: general.id,
    zoneIds: [],
    status: "ACTIVE",
    protectedAccess: false,
    fastTrackRouting: false,
    reason: "Church invitation for Ẹbùnọláúwa Alákíjà",
    ...versioned(),
  });
  const ebunReception: PhaseEntitlement = stamp({
    id: S04B_FIXTURE_IDS.entitlementEbunReception,
    ...scoped(),
    phaseId: reception.id,
    subjectType: "GUEST",
    subjectId: S04A_FIXTURE_IDS.guestEbunoluwa,
    routeId: fastTrack.id,
    zoneIds: [],
    status: "ACTIVE",
    protectedAccess: false,
    fastTrackRouting: true,
    reason: "Reception entitlement with discreet routing",
    ...versioned(),
  });
  const olufemiChurch: PhaseEntitlement = stamp({
    id: S04B_FIXTURE_IDS.entitlementOlufemiChurch,
    ...scoped(),
    phaseId: church.id,
    subjectType: "GUEST",
    subjectId: S04A_FIXTURE_IDS.guestOlufemi,
    routeId: general.id,
    zoneIds: [],
    status: "ACTIVE",
    protectedAccess: false,
    fastTrackRouting: false,
    reason: "Church only — reception not granted from household membership",
    ...versioned(),
  });
  next.phaseEntitlements.push(ebunChurch, ebunReception, olufemiChurch);

  const credential: CredentialProjection = stamp({
    id: S04B_FIXTURE_IDS.credentialEbun,
    ...scoped(),
    subjectType: "GUEST",
    subjectId: S04A_FIXTURE_IDS.guestEbunoluwa,
    presentationReference: "MD-EBUN01A",
    payloadDigest: "a".repeat(64),
    entitlementIds: [ebunChurch.id, ebunReception.id],
    status: "ACTIVE",
    ...versioned(),
  });
  next.credentialProjections.push(credential);

  const vehicle: OperationalVehicle = stamp({
    id: S04B_FIXTURE_IDS.vehicleOne,
    ...scoped(),
    plate: "LAG-904-AL",
    vehicleClass: "SUV",
    colour: "Ivory",
    assignedRouteId: fastTrack.id,
    assignedParkingCheckpointId: parking.id,
    status: "REGISTERED",
    ...versioned(),
  });
  const driver: VehicleAssociation = stamp({
    id: S04B_FIXTURE_IDS.associationDriver,
    ...scoped(),
    vehicleId: vehicle.id,
    guestId: S04A_FIXTURE_IDS.guestOlufemi,
    role: "DRIVER",
    status: "ACTIVE",
    reason: "Named driver for the Alákíjà vehicle — occupant identity remains independent",
    ...versioned(),
  });
  next.operationalVehicles.push(vehicle);
  next.vehicleAssociations.push(driver);

  const unsigned = {
    id: S04B_FIXTURE_IDS.packageV1,
    ...scoped(),
    packageVersion: 1,
    status: "ACTIVE" as const,
    generatedAt: AT,
    validUntil: "2026-09-13T23:00:00.000Z",
    hmacSignature: "pending",
    checksum: "pending",
    keyRef: S04B_OFFLINE_HMAC_KEY_REF,
    body: {
      phaseIds: [church.id, reception.id],
      checkpointIds: [gate.id, parking.id, venue.id],
      credentialDigests: [credential.payloadDigest],
      routeCodes: ["A", "FT"],
      policy: {
        staleFailsClosed: true as const,
        attendanceWriter: "SLICE_8_ONLY" as const,
        fastTrackDoesNotSkipVerification: true as const,
      },
    },
    ...versioned(),
  };
  const signed = signOfflinePackageBody(
    JSON.stringify({
      eventId: unsigned.eventId,
      packageVersion: unsigned.packageVersion,
      generatedAt: unsigned.generatedAt,
      validUntil: unsigned.validUntil,
      keyRef: unsigned.keyRef,
      body: unsigned.body,
    }),
  );
  const pkg: OfflineAccessPackage = stamp({ ...unsigned, ...signed });
  next.offlineAccessPackages.push(pkg);
  return next;
}
