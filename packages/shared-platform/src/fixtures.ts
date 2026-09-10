import { SCHEMA_VERSION } from "./constants.js";
import { seededPermissions, seededRoles } from "./catalog.js";
import type {
  Assignment,
  Client,
  EventRecord,
  MasterEventFile,
  Membership,
  Organisation,
  Person,
} from "./schemas.js";
import { emptyMasterEventFile } from "./mef.js";

export const FIXTURE_MARK = true;

export const FIXTURE_IDS = {
  orgMaison: "00000000-0000-4000-8000-000000000001",
  orgOther: "00000000-0000-4000-8000-000000000002",
  clientAlpha: "00000000-0000-4000-8000-000000000011",
  clientBeta: "00000000-0000-4000-8000-000000000012",
  clientOther: "00000000-0000-4000-8000-000000000013",
  eventAlphaOne: "00000000-0000-4000-8000-000000000021",
  eventAlphaTwo: "00000000-0000-4000-8000-000000000022",
  eventOther: "00000000-0000-4000-8000-000000000023",
  mefAlphaOne: "00000000-0000-4000-8000-000000000031",
  mefAlphaTwo: "00000000-0000-4000-8000-000000000032",
  mefOther: "00000000-0000-4000-8000-000000000033",
  personCeo: "00000000-0000-4000-8000-000000000041",
  personDirector: "00000000-0000-4000-8000-000000000042",
  personPlanner: "00000000-0000-4000-8000-000000000043",
  personAdmin: "00000000-0000-4000-8000-000000000044",
  personAuditor: "00000000-0000-4000-8000-000000000045",
  personUnassigned: "00000000-0000-4000-8000-000000000046",
  personOtherOrg: "00000000-0000-4000-8000-000000000047",
  personRiskReviewer: "00000000-0000-4000-8000-000000000048",
  membershipCeo: "00000000-0000-4000-8000-000000000051",
  membershipDirector: "00000000-0000-4000-8000-000000000052",
  membershipPlanner: "00000000-0000-4000-8000-000000000053",
  membershipAdmin: "00000000-0000-4000-8000-000000000054",
  membershipAuditor: "00000000-0000-4000-8000-000000000055",
  membershipOther: "00000000-0000-4000-8000-000000000056",
  membershipRiskReviewer: "00000000-0000-4000-8000-000000000057",
  assignCeo: "00000000-0000-4000-8000-000000000061",
  assignDirector: "00000000-0000-4000-8000-000000000062",
  assignPlanner: "00000000-0000-4000-8000-000000000063",
  assignAdmin: "00000000-0000-4000-8000-000000000064",
  assignAuditor: "00000000-0000-4000-8000-000000000065",
  assignOther: "00000000-0000-4000-8000-000000000066",
  assignRiskReviewer: "00000000-0000-4000-8000-000000000067",
} as const;

const AT = "2026-09-05T14:00:00.000Z";

function stamp<T extends object>(value: T): T & { nonProductionFixture: true } {
  return { ...value, nonProductionFixture: FIXTURE_MARK };
}

export function fixtureOrganisations(): Organisation[] {
  return [
    stamp({
      id: FIXTURE_IDS.orgMaison,
      slug: "maison-doclar",
      legalName: "Maison Doclar Limited",
      displayName: "Maison Doclar",
      status: "ACTIVE",
      defaultTimezone: "Africa/Lagos",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: AT,
      updatedAt: AT,
    }),
    stamp({
      id: FIXTURE_IDS.orgOther,
      slug: "other-house",
      legalName: "Other House Limited",
      displayName: "Other House",
      status: "ACTIVE",
      defaultTimezone: "Africa/Lagos",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: AT,
      updatedAt: AT,
    }),
  ];
}

export function fixtureClients(): Client[] {
  return [
    stamp({
      id: FIXTURE_IDS.clientAlpha,
      organisationId: FIXTURE_IDS.orgMaison,
      code: "ALPHA",
      displayName: "Alpha Family",
      legalName: "Alpha Holdings",
      status: "ACTIVE",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: AT,
      updatedAt: AT,
    }),
    stamp({
      id: FIXTURE_IDS.clientBeta,
      organisationId: FIXTURE_IDS.orgMaison,
      code: "BETA",
      displayName: "Beta House",
      status: "PROSPECT",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: AT,
      updatedAt: AT,
    }),
    stamp({
      id: FIXTURE_IDS.clientOther,
      organisationId: FIXTURE_IDS.orgOther,
      code: "OTHER",
      displayName: "Other Client",
      status: "ACTIVE",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: AT,
      updatedAt: AT,
    }),
  ];
}

function event(
  id: string,
  organisationId: string,
  clientId: string,
  mefId: string,
  code: string,
  name: string,
): EventRecord {
  return stamp({
    id,
    organisationId,
    clientId,
    code,
    name,
    startsAt: "2026-12-01T09:00:00.000Z",
    endsAt: "2026-12-01T22:00:00.000Z",
    timezone: "Africa/Lagos",
    venueSummary: "Fixture venue — not production",
    phase: "DISCOVER",
    status: "DRAFT",
    masterEventFileId: mefId,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: AT,
    updatedAt: AT,
  });
}

export function fixtureEvents(): EventRecord[] {
  return [
    event(FIXTURE_IDS.eventAlphaOne, FIXTURE_IDS.orgMaison, FIXTURE_IDS.clientAlpha, FIXTURE_IDS.mefAlphaOne, "A1", "Alpha One"),
    event(FIXTURE_IDS.eventAlphaTwo, FIXTURE_IDS.orgMaison, FIXTURE_IDS.clientAlpha, FIXTURE_IDS.mefAlphaTwo, "A2", "Alpha Two"),
    event(FIXTURE_IDS.eventOther, FIXTURE_IDS.orgOther, FIXTURE_IDS.clientOther, FIXTURE_IDS.mefOther, "O1", "Other Event"),
  ];
}

export function fixtureMasterEventFiles(): MasterEventFile[] {
  return [
    emptyMasterEventFile({
      id: FIXTURE_IDS.mefAlphaOne,
      organisationId: FIXTURE_IDS.orgMaison,
      clientId: FIXTURE_IDS.clientAlpha,
      eventId: FIXTURE_IDS.eventAlphaOne,
      at: AT,
      fixture: true,
    }),
    emptyMasterEventFile({
      id: FIXTURE_IDS.mefAlphaTwo,
      organisationId: FIXTURE_IDS.orgMaison,
      clientId: FIXTURE_IDS.clientAlpha,
      eventId: FIXTURE_IDS.eventAlphaTwo,
      at: AT,
      fixture: true,
    }),
    emptyMasterEventFile({
      id: FIXTURE_IDS.mefOther,
      organisationId: FIXTURE_IDS.orgOther,
      clientId: FIXTURE_IDS.clientOther,
      eventId: FIXTURE_IDS.eventOther,
      at: AT,
      fixture: true,
    }),
  ];
}

function person(id: string, subject: string, email: string, displayName: string): Person {
  return stamp({
    id,
    externalSubject: subject,
    email,
    displayName,
    status: "ACTIVE",
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: AT,
    updatedAt: AT,
  });
}

export function fixturePersons(): Person[] {
  return [
    person(FIXTURE_IDS.personCeo, "dev:ceo@maison-doclar.test", "ceo@maison-doclar.test", "George Lawson"),
    person(FIXTURE_IDS.personDirector, "dev:director@maison-doclar.test", "director@maison-doclar.test", "Event Director"),
    person(FIXTURE_IDS.personPlanner, "dev:planner@maison-doclar.test", "planner@maison-doclar.test", "Assigned Planner"),
    person(FIXTURE_IDS.personAdmin, "dev:admin@maison-doclar.test", "admin@maison-doclar.test", "System Administrator"),
    person(FIXTURE_IDS.personAuditor, "dev:auditor@maison-doclar.test", "auditor@maison-doclar.test", "Read Only Auditor"),
    person(FIXTURE_IDS.personRiskReviewer, "dev:reviewer@maison-doclar.test", "reviewer@maison-doclar.test", "Risk Governance Reviewer"),
    person(FIXTURE_IDS.personUnassigned, "dev:unassigned@maison-doclar.test", "unassigned@maison-doclar.test", "Unassigned User"),
    person(FIXTURE_IDS.personOtherOrg, "dev:other@other-house.test", "other@other-house.test", "Other House Operator"),
  ];
}

function membership(id: string, organisationId: string, personId: string): Membership {
  return stamp({
    id,
    organisationId,
    personId,
    status: "ACTIVE",
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: AT,
    updatedAt: AT,
  });
}

export function fixtureMemberships(): Membership[] {
  return [
    membership(FIXTURE_IDS.membershipCeo, FIXTURE_IDS.orgMaison, FIXTURE_IDS.personCeo),
    membership(FIXTURE_IDS.membershipDirector, FIXTURE_IDS.orgMaison, FIXTURE_IDS.personDirector),
    membership(FIXTURE_IDS.membershipPlanner, FIXTURE_IDS.orgMaison, FIXTURE_IDS.personPlanner),
    membership(FIXTURE_IDS.membershipAdmin, FIXTURE_IDS.orgMaison, FIXTURE_IDS.personAdmin),
    membership(FIXTURE_IDS.membershipAuditor, FIXTURE_IDS.orgMaison, FIXTURE_IDS.personAuditor),
    membership(FIXTURE_IDS.membershipRiskReviewer, FIXTURE_IDS.orgMaison, FIXTURE_IDS.personRiskReviewer),
    membership(FIXTURE_IDS.membershipOther, FIXTURE_IDS.orgOther, FIXTURE_IDS.personOtherOrg),
  ];
}

function assignment(
  id: string,
  organisationId: string,
  personId: string,
  roleKey: "CEO" | "EVENT_DIRECTOR" | "PLANNER" | "SYSTEM_ADMINISTRATOR" | "READ_ONLY_AUDITOR" | "RISK_GOVERNANCE_REVIEWER",
  scope: { clientId?: string; eventId?: string },
): Assignment {
  const role = seededRoles().find((item) => item.key === roleKey);
  if (!role) throw new Error(`missing role ${roleKey}`);
  return stamp({
    id,
    organisationId,
    clientId: scope.clientId,
    eventId: scope.eventId,
    personId,
    roleId: role.id,
    status: "ACTIVE",
    grantedByPersonId: FIXTURE_IDS.personCeo,
    reason: "NON_PRODUCTION fixture assignment",
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: AT,
    updatedAt: AT,
  });
}

export function fixtureAssignments(): Assignment[] {
  return [
    assignment(FIXTURE_IDS.assignCeo, FIXTURE_IDS.orgMaison, FIXTURE_IDS.personCeo, "CEO", {}),
    assignment(FIXTURE_IDS.assignDirector, FIXTURE_IDS.orgMaison, FIXTURE_IDS.personDirector, "EVENT_DIRECTOR", {
      eventId: FIXTURE_IDS.eventAlphaOne,
      clientId: FIXTURE_IDS.clientAlpha,
    }),
    assignment(FIXTURE_IDS.assignPlanner, FIXTURE_IDS.orgMaison, FIXTURE_IDS.personPlanner, "PLANNER", {
      eventId: FIXTURE_IDS.eventAlphaOne,
      clientId: FIXTURE_IDS.clientAlpha,
    }),
    assignment(FIXTURE_IDS.assignAdmin, FIXTURE_IDS.orgMaison, FIXTURE_IDS.personAdmin, "SYSTEM_ADMINISTRATOR", {}),
    assignment(FIXTURE_IDS.assignAuditor, FIXTURE_IDS.orgMaison, FIXTURE_IDS.personAuditor, "READ_ONLY_AUDITOR", {}),
    assignment(FIXTURE_IDS.assignRiskReviewer, FIXTURE_IDS.orgMaison, FIXTURE_IDS.personRiskReviewer, "RISK_GOVERNANCE_REVIEWER", {}),
    assignment(FIXTURE_IDS.assignOther, FIXTURE_IDS.orgOther, FIXTURE_IDS.personOtherOrg, "CEO", {}),
  ];
}

export function isFixtureId(id: string): boolean {
  return Object.values(FIXTURE_IDS).includes(id as (typeof FIXTURE_IDS)[keyof typeof FIXTURE_IDS]);
}

export function lineageFixtureMark(
  ...sources: Array<{ id?: string; nonProductionFixture?: boolean } | undefined>
): { nonProductionFixture: true } | Record<string, never> {
  const inherited = sources.some(
    (item) => item?.nonProductionFixture === true || (typeof item?.id === "string" && isFixtureId(item.id)),
  );
  return inherited ? { nonProductionFixture: true } : {};
}

export { seededPermissions, seededRoles };
