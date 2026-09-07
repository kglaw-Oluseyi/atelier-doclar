import { SCHEMA_VERSION } from "./constants.js";
import { S04A_FIXTURE_IDS } from "./addressing-fixtures.js";
import { FIXTURE_IDS } from "./fixtures.js";
import { S04B_FIXTURE_IDS } from "./programme-fixtures.js";
import type { OperationalGuest } from "./guest-schemas.js";
import type { PhaseEntitlement } from "./programme-schemas.js";
import type { RsvpQuestionnaire, RsvpResponse } from "./rsvp-schemas.js";
import type { PlatformSnapshot } from "./store.js";

const AT = "2026-09-07T16:00:00.000Z";

export const S04D_FIXTURE_IDS = {
  guestBabatunde: "00000000-0000-4000-8000-0000000000e1",
  questionnaire: "00000000-0000-4000-8000-0000000000e2",
  entitlementTomiReception: "00000000-0000-4000-8000-0000000000e3",
  entitlementKemiReception: "00000000-0000-4000-8000-0000000000e4",
  entitlementAdesinaChurch: "00000000-0000-4000-8000-0000000000e5",
  entitlementBabatundeReception: "00000000-0000-4000-8000-0000000000e6",
  responseEbun: "00000000-0000-4000-8000-0000000000ea",
  responseOlufemi: "00000000-0000-4000-8000-0000000000eb",
  responseTomi: "00000000-0000-4000-8000-0000000000ec",
  responseKemi: "00000000-0000-4000-8000-0000000000ed",
  responseAdesina: "00000000-0000-4000-8000-0000000000ee",
  responseBabatunde: "00000000-0000-4000-8000-0000000000ef",
} as const;

/**
 * Known-population numerical contract for EOS-S04D.
 * Distinct people (guestId): 6
 *   YES: Ẹ̀bùnolúwa, Olúfẹ́mi, Tómiwà, Bàbátúndé (4)
 *   NO: Adéṣínà (1)
 *   NO_RESPONSE: Kẹ́mi (1)
 * Unnamed allowance: 1 (not a person)
 * Church people: Ẹ̀bùnolúwa, Olúfẹ́mi, Adéṣínà (3)
 * Reception people: Ẹ̀bùnolúwa, Tómiwà, Kẹ́mi, Bàbátúndé (4)
 * Default PARAM-SET-V1 people expected = 4*0.90 + 0.40 + 0.05 = 4.05
 */
export const S04D_KNOWN_COUNTS = {
  distinctPeople: 6,
  yes: 4,
  no: 1,
  noResponse: 1,
  unnamedAllowance: 1,
  churchPeople: 3,
  receptionPeople: 4,
  partyMembers: 4,
  invitationsAreNotPeople: true,
  programmeExpectedExact: 4.05,
  programmeLowExact: 3.7,
  programmeHighExact: 4.4,
  programmeLowDisplay: 3,
  programmeExpectedDisplay: 4,
  programmeHighDisplay: 5,
  churchExpectedExact: 1.85,
  receptionExpectedExact: 3.1,
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

function blankField() {
  return { quality: "NOT_SUPPLIED" as const };
}

function nameField(value: string) {
  return { value, quality: "UNVERIFIED" as const };
}

function guestBabatunde(): OperationalGuest {
  return stamp({
    id: S04D_FIXTURE_IDS.guestBabatunde,
    ...scoped(),
    givenName: nameField("Bàbátúndé"),
    familyName: nameField("Adéyẹmí"),
    preferredName: nameField("Bàbátúndé"),
    email: blankField(),
    phone: blankField(),
    dietaryRequirement: blankField(),
    accessibilityRequirement: blankField(),
    operationalNote: blankField(),
    lifecycle: "ACTIVE" as const,
    identityResolution: "UNRESOLVED" as const,
    intakeSource: "MANUAL_STAFF" as const,
    ageBand: "ADULT" as const,
    attentionRequired: false,
    provenance: {
      source: "MANUAL_STAFF" as const,
      recordedByPersonId: FIXTURE_IDS.personPlanner,
      recordedAt: AT,
      correlationId: "corr-s04d-fixture",
      reason: "EOS-S04D named companion fixture",
    },
    ...versioned(),
  });
}

function entitlement(id: string, phaseId: string, guestId: string, reason: string): PhaseEntitlement {
  return stamp({
    id,
    ...scoped(),
    phaseId,
    subjectType: "GUEST" as const,
    subjectId: guestId,
    routeId: S04B_FIXTURE_IDS.routeGeneral,
    zoneIds: [],
    status: "ACTIVE" as const,
    protectedAccess: false,
    fastTrackRouting: false,
    reason,
    ...versioned(),
  });
}

function questionnaire(): RsvpQuestionnaire {
  return stamp({
    id: S04D_FIXTURE_IDS.questionnaire,
    ...scoped(),
    status: "PUBLISHED" as const,
    versionNumber: 1,
    sections: [
      {
        key: "attendance",
        title: "Attendance",
        questions: [
          {
            key: "ATTENDANCE",
            label: "Will you attend?",
            required: true,
            sensitive: false,
            enabled: true,
            visibleWhenAttendance: "ANY" as const,
          },
        ],
      },
    ],
    publishedAt: AT,
    ...versioned(),
  });
}

function response(id: string, guestId: string, intent: "ATTENDING" | "NOT_ATTENDING" | "NOT_SUPPLIED", status: "SUBMITTED" | "NOT_STARTED"): RsvpResponse {
  return stamp({
    id,
    ...scoped(),
    guestId,
    questionnaireId: S04D_FIXTURE_IDS.questionnaire,
    attendanceIntent: intent,
    status,
    provenance: "STAFF_ENTERED" as const,
    answers: { attendanceIntent: intent },
    respondedAt: status === "SUBMITTED" ? AT : undefined,
    lastActorPersonId: FIXTURE_IDS.personPlanner,
    ...versioned(),
  });
}

export function applyS04DFixturesIfMissing(snap: PlatformSnapshot): PlatformSnapshot {
  if (snap.operationalGuests.some((item) => item.id === S04D_FIXTURE_IDS.guestBabatunde)) return snap;
  if (!snap.operationalGuests.some((item) => item.id === S04A_FIXTURE_IDS.guestEbunoluwa)) return snap;
  if (!snap.programmePhases.some((item) => item.id === S04B_FIXTURE_IDS.phaseChurch)) return snap;
  const next = structuredClone(snap);
  next.operationalGuests.push(guestBabatunde());
  next.phaseEntitlements.push(
    entitlement(S04D_FIXTURE_IDS.entitlementTomiReception, S04B_FIXTURE_IDS.phaseReception, S04A_FIXTURE_IDS.guestTomi, "Reception entitlement for Tómiwà"),
    entitlement(S04D_FIXTURE_IDS.entitlementKemiReception, S04B_FIXTURE_IDS.phaseReception, S04A_FIXTURE_IDS.guestKemi, "Reception entitlement for Kẹ́mi"),
    entitlement(S04D_FIXTURE_IDS.entitlementAdesinaChurch, S04B_FIXTURE_IDS.phaseChurch, S04A_FIXTURE_IDS.guestAdesina, "Church entitlement for Adéṣínà"),
    entitlement(
      S04D_FIXTURE_IDS.entitlementBabatundeReception,
      S04B_FIXTURE_IDS.phaseReception,
      S04D_FIXTURE_IDS.guestBabatunde,
      "Reception entitlement for named companion Bàbátúndé",
    ),
  );
  if (!next.rsvpQuestionnaires.some((item) => item.eventId === FIXTURE_IDS.eventAlphaOne && item.status === "PUBLISHED")) {
    next.rsvpQuestionnaires.push(questionnaire());
  }
  const questionnaireId =
    next.rsvpQuestionnaires.find((item) => item.eventId === FIXTURE_IDS.eventAlphaOne && item.status === "PUBLISHED")?.id ??
    S04D_FIXTURE_IDS.questionnaire;
  const withQuestionnaire = (record: RsvpResponse): RsvpResponse => ({ ...record, questionnaireId });
  next.rsvpResponses.push(
    withQuestionnaire(response(S04D_FIXTURE_IDS.responseEbun, S04A_FIXTURE_IDS.guestEbunoluwa, "ATTENDING", "SUBMITTED")),
    withQuestionnaire(response(S04D_FIXTURE_IDS.responseOlufemi, S04A_FIXTURE_IDS.guestOlufemi, "ATTENDING", "SUBMITTED")),
    withQuestionnaire(response(S04D_FIXTURE_IDS.responseTomi, S04A_FIXTURE_IDS.guestTomi, "ATTENDING", "SUBMITTED")),
    withQuestionnaire(response(S04D_FIXTURE_IDS.responseKemi, S04A_FIXTURE_IDS.guestKemi, "NOT_SUPPLIED", "NOT_STARTED")),
    withQuestionnaire(response(S04D_FIXTURE_IDS.responseAdesina, S04A_FIXTURE_IDS.guestAdesina, "NOT_ATTENDING", "SUBMITTED")),
    withQuestionnaire(response(S04D_FIXTURE_IDS.responseBabatunde, S04D_FIXTURE_IDS.guestBabatunde, "ATTENDING", "SUBMITTED")),
  );
  return next;
}
