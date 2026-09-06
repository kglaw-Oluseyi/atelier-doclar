import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CompanionEntitlementSchema,
  CompanionNominationSchema,
  CreateRelationshipInputSchema,
  EventSeriesMemberSchema,
  GuestAddressingSchema,
  GuestPartyMemberSchema,
  GuestPartySchema,
  ResponsibleAdultLinkSchema,
} from "../src/addressing-schemas.js";
import {
  allowanceExceedsAuthority,
  childReadinessFor,
  composeStoredName,
  dateOfBirthForbidden,
  entitlementTransitionAllowed,
  partyIsNotIdentity,
  renderFamiliarName,
  renderGuestSalutation,
  requiresResponsibleAdult,
  unnamedAllowanceHasNoGuest,
} from "../src/addressing.js";
import { permissionsForRole } from "../src/catalog.js";
import { FIELD_QUALITY_STATES, MSG_CORRECTION_STATUSES, PERMISSION_KEYS } from "../src/constants.js";
import { IntakeGuestInputSchema, OperationalGuestSchema as GuestRecordSchema } from "../src/guest-schemas.js";
import { RsvpEntitlementSchema } from "../src/rsvp-schemas.js";

const AT = "2026-09-06T14:00:00.000Z";
const ORG = "00000000-0000-4000-8000-000000000001";
const CLIENT = "00000000-0000-4000-8000-000000000011";
const EVENT = "00000000-0000-4000-8000-000000000021";
const GUEST_A = "10000000-0000-4000-8000-000000000001";
const GUEST_B = "10000000-0000-4000-8000-000000000002";
const GUEST_C = "10000000-0000-4000-8000-000000000003";
const PARTY = "20000000-0000-4000-8000-000000000001";
const ENTITLEMENT = "30000000-0000-4000-8000-000000000001";
const RSVP_ENTITLEMENT = "30000000-0000-4000-8000-000000000099";
const SERIES = "40000000-0000-4000-8000-000000000001";

function versioned() {
  return {
    schemaVersion: 1 as const,
    version: 1,
    createdAt: AT,
    updatedAt: AT,
  };
}

function guest(input: {
  id: string;
  given?: string;
  family?: string;
  preferred?: string;
  addressing?: Parameters<typeof GuestAddressingSchema.parse>[0];
  ageBand?: "INFANT" | "EARLY_CHILDHOOD" | "CHILD" | "PRE_TEEN" | "TEEN" | "ADULT" | "UNKNOWN";
  childReadiness?: "DRAFT" | "BLOCKED_MISSING_RESPONSIBLE_ADULT" | "READY_FOR_EVENT";
}) {
  return GuestRecordSchema.parse({
    id: input.id,
    organisationId: ORG,
    clientId: CLIENT,
    eventId: EVENT,
    givenName: input.given ? { value: input.given, quality: "UNVERIFIED" } : { quality: "NOT_SUPPLIED" },
    familyName: input.family ? { value: input.family, quality: "UNVERIFIED" } : { quality: "NOT_SUPPLIED" },
    preferredName: input.preferred ? { value: input.preferred, quality: "UNVERIFIED" } : { quality: "NOT_SUPPLIED" },
    email: { quality: "NOT_SUPPLIED" },
    phone: { quality: "NOT_SUPPLIED" },
    dietaryRequirement: { quality: "NOT_SUPPLIED" },
    accessibilityRequirement: { quality: "NOT_SUPPLIED" },
    operationalNote: { quality: "NOT_SUPPLIED" },
    ...(input.addressing ? { addressing: input.addressing } : {}),
    ...(input.ageBand ? { ageBand: input.ageBand } : {}),
    ...(input.childReadiness ? { childReadiness: input.childReadiness } : {}),
    lifecycle: "ACTIVE",
    identityResolution: "UNRESOLVED",
    intakeSource: "MANUAL_STAFF",
    provenance: {
      source: "MANUAL_STAFF",
      recordedByPersonId: "00000000-0000-4000-8000-000000000042",
      recordedAt: AT,
      correlationId: "corr-s04a",
      reason: "contract fixture",
    },
    attentionRequired: false,
    ...versioned(),
  });
}

describe("EOS-S04A domain contracts", () => {
  it("renders titled Yorùbá formal and familiar forms without inferring a title", () => {
    const adult = guest({
      id: GUEST_A,
      given: "Ẹ̀bùnolúwa",
      family: "Alákíjà",
      addressing: {
        honorific: "Dr (Mrs)",
        addressingStatus: "HOST_CONFIRMED",
        addressingSource: "HOST",
      },
    });
    const formal = renderGuestSalutation(adult);
    const familiar = renderFamiliarName(adult);
    assert.equal(formal.text, "Dr (Mrs) Ẹ̀bùnolúwa Alákíjà");
    assert.equal(formal.inferredTitle, false);
    assert.match(formal.text, /Ẹ̀bùnolúwa/);
    assert.match(formal.text, /Alákíjà/);
    assert.equal(familiar.text, "Ẹ̀bùnolúwa Alákíjà");
    assert.equal(familiar.inferredTitle, false);
  });

  it("leads with an explicit traditional title and keeps a blank honorific blank", () => {
    const titled = guest({
      id: GUEST_A,
      given: "Olúfẹ́mi",
      family: "Alákíjà",
      addressing: {
        traditionalTitle: "Otunba",
        traditionalTitleSource: "PROTOCOL_TEAM",
        addressingStatus: "PROTOCOL_CONFIRMED",
        addressingSource: "PROTOCOL_TEAM",
      },
    });
    assert.equal(composeStoredName({
      givenName: "Olúfẹ́mi",
      familyName: "Alákíjà",
      addressing: titled.addressing,
    }), "Otunba Olúfẹ́mi Alákíjà");
    const untitled = guest({ id: GUEST_B, given: "Adeola", family: "Balogun" });
    const rendered = renderGuestSalutation(untitled);
    assert.equal(rendered.text, "Adeola Balogun");
    assert.equal(rendered.kind, "SAFE_FALLBACK");
    assert.doesNotMatch(rendered.text, /^(Mr|Mrs|Ms|Dr)\b/);
  });

  it("uses a confirmed preferred formal salutation and otherwise a safe fallback", () => {
    const confirmed = guest({
      id: GUEST_A,
      given: "Ẹ̀bùnolúwa",
      family: "Alákíjà",
      addressing: {
        honorific: "Dr (Mrs)",
        preferredFormalSalutation: "Dr (Mrs) Ẹ̀bùnolúwa Alákíjà",
        addressingStatus: "GUEST_CONFIRMED",
        addressingSource: "GUEST",
      },
    });
    const formal = renderGuestSalutation(confirmed);
    assert.equal(formal.usedPreferredFormal, true);
    assert.equal(formal.kind, "FORMAL");
    const unverifiedImport = GuestAddressingSchema.safeParse({
      preferredFormalSalutation: "Mr Something",
      addressingStatus: "HOST_CONFIRMED",
      addressingSource: "AUTHORISED_IMPORT",
    });
    assert.equal(unverifiedImport.success, false);
  });

  it("gives every represented person a distinct guestId and keeps party as a container", () => {
    const childOne = guest({ id: GUEST_A, given: "Tomi", family: "Alákíjà", ageBand: "CHILD" });
    const childTwo = guest({ id: GUEST_B, given: "Kemi", family: "Alákíjà", ageBand: "EARLY_CHILDHOOD" });
    const companion = guest({ id: GUEST_C, given: "Femi", family: "Adeyemi" });
    assert.notEqual(childOne.id, childTwo.id);
    assert.notEqual(childOne.id, companion.id);
    const party = GuestPartySchema.parse({
      id: PARTY,
      organisationId: ORG,
      clientId: CLIENT,
      eventId: EVENT,
      type: "FAMILY_UNIT",
      principalGuestId: GUEST_C,
      label: "Alákíjà family",
      status: "ACTIVE",
      ...versioned(),
    });
    const member = GuestPartyMemberSchema.parse({
      id: "20000000-0000-4000-8000-000000000002",
      organisationId: ORG,
      clientId: CLIENT,
      eventId: EVENT,
      partyId: PARTY,
      guestId: GUEST_A,
      role: "CHILD",
      joinedAt: AT,
      status: "ACTIVE",
      ...versioned(),
    });
    assert.equal(partyIsNotIdentity(party, member), true);
    const collapsed = GuestPartyMemberSchema.safeParse({
      ...member,
      partyId: GUEST_A,
      guestId: GUEST_A,
    });
    assert.equal(collapsed.success, false);
  });

  it("keeps unnamed companion entitlements without a fabricated guestId", () => {
    const unnamed = CompanionEntitlementSchema.parse({
      id: ENTITLEMENT,
      organisationId: ORG,
      clientId: CLIENT,
      eventId: EVENT,
      principalGuestId: GUEST_A,
      allowance: 1,
      authority: { kind: "RSVP_ENTITLEMENT", rsvpEntitlementId: RSVP_ENTITLEMENT },
      status: "AVAILABLE",
      reason: "S03 companion allowance",
      ...versioned(),
    });
    assert.equal(unnamed.nominatedGuestId, undefined);
    assert.equal(unnamedAllowanceHasNoGuest(unnamed), true);
    const fabricated = CompanionEntitlementSchema.safeParse({
      ...unnamed,
      nominatedGuestId: GUEST_B,
    });
    assert.equal(fabricated.success, false);
  });

  it("materialises a nomination only with exactly one guestId and preserves entitlement lineage", () => {
    const missingGuest = CompanionNominationSchema.safeParse({
      id: "30000000-0000-4000-8000-000000000002",
      organisationId: ORG,
      clientId: CLIENT,
      eventId: EVENT,
      entitlementId: ENTITLEMENT,
      state: "MATERIALISED",
      reason: "named companion",
      ...versioned(),
    });
    assert.equal(missingGuest.success, false);
    const materialised = CompanionNominationSchema.parse({
      id: "30000000-0000-4000-8000-000000000002",
      organisationId: ORG,
      clientId: CLIENT,
      eventId: EVENT,
      entitlementId: ENTITLEMENT,
      guestId: GUEST_B,
      suppliedGivenName: "Olúfẹ́mi",
      suppliedFamilyName: "Adeyemi",
      state: "MATERIALISED",
      reason: "named companion",
      ...versioned(),
    });
    assert.equal(materialised.guestId, GUEST_B);
    assert.equal(materialised.entitlementId, ENTITLEMENT);
  });

  it("requires a responsible adult for child readiness and never collects a date of birth", () => {
    assert.equal(requiresResponsibleAdult("CHILD"), true);
    assert.equal(requiresResponsibleAdult("ADULT"), false);
    assert.equal(childReadinessFor({ ageBand: "TEEN", hasActiveResponsibleAdult: false }), "BLOCKED_MISSING_RESPONSIBLE_ADULT");
    assert.equal(childReadinessFor({ ageBand: "INFANT", hasActiveResponsibleAdult: true }), "READY_FOR_EVENT");
    const withDob = IntakeGuestInputSchema.safeParse({
      organisationId: ORG,
      eventId: EVENT,
      givenName: "Tomi",
      familyName: "Alákíjà",
      ageBand: "CHILD",
      dateOfBirth: "2018-04-01",
      reason: "intake",
    });
    assert.equal(withDob.success, false);
    assert.equal(dateOfBirthForbidden({ dateOfBirth: "2018-04-01" }), true);
    const link = ResponsibleAdultLinkSchema.parse({
      id: "50000000-0000-4000-8000-000000000001",
      organisationId: ORG,
      clientId: CLIENT,
      eventId: EVENT,
      childGuestId: GUEST_A,
      responsibleAdultGuestId: GUEST_C,
      scope: "EVENT",
      status: "ACTIVE",
      reason: "parent",
      ...versioned(),
    });
    assert.notEqual(link.childGuestId, link.responsibleAdultGuestId);
    const self = ResponsibleAdultLinkSchema.safeParse({ ...link, responsibleAdultGuestId: GUEST_A });
    assert.equal(self.success, false);
  });

  it("refuses inferred relationships and keeps eventSeriesId from replacing eventId", () => {
    const inferred = CreateRelationshipInputSchema.safeParse({
      organisationId: ORG,
      eventId: EVENT,
      fromGuestId: GUEST_A,
      toGuestId: GUEST_A,
      type: "SPOUSE_PARTNER",
      direction: "BIDIRECTIONAL",
      source: "STAFF",
      visibility: "STAFF",
      reason: "shared surname",
    });
    assert.equal(inferred.success, false);
    const seriesMember = EventSeriesMemberSchema.parse({
      id: "40000000-0000-4000-8000-000000000002",
      organisationId: ORG,
      eventSeriesId: SERIES,
      eventId: EVENT,
      occurrenceType: "PRIMARY",
      order: 0,
      ...versioned(),
    });
    assert.notEqual(seriesMember.eventSeriesId, seriesMember.eventId);
    const collapsed = EventSeriesMemberSchema.safeParse({
      ...seriesMember,
      eventSeriesId: EVENT,
      eventId: EVENT,
    });
    assert.equal(collapsed.success, false);
  });

  it("keeps EOS-S03 as entitlement quantity authority", () => {
    const s03 = RsvpEntitlementSchema.parse({
      id: RSVP_ENTITLEMENT,
      organisationId: ORG,
      clientId: CLIENT,
      eventId: EVENT,
      guestId: GUEST_A,
      kind: "COMPANION",
      allowance: 1,
      status: "ACTIVE",
      reason: "issued by S03",
      ...versioned(),
    });
    assert.equal(s03.allowance, 1);
    assert.equal(allowanceExceedsAuthority({ requested: 2, authorised: 1 }), true);
    assert.equal(allowanceExceedsAuthority({ requested: 1, authorised: 1 }), false);
    assert.equal(entitlementTransitionAllowed("AVAILABLE", "NOMINATED"), true);
    assert.equal(entitlementTransitionAllowed("REVOKED", "AVAILABLE"), false);
  });

  it("keeps field-level CONFLICTING distinct from correction status APPLIED", () => {
    assert.ok((FIELD_QUALITY_STATES as readonly string[]).includes("CONFLICTING"));
    assert.ok((MSG_CORRECTION_STATUSES as readonly string[]).includes("APPLIED"));
    assert.notEqual("CONFLICTING", "APPLIED");
  });

  it("assigns S04A permission keys without granting Planner protocol confirmation", () => {
    const required = [
      "guest.addressing.view",
      "guest.addressing.manage",
      "guest.addressing.confirm",
      "guest.relationship.view",
      "guest.relationship.manage",
      "guest.entitlement.view",
      "guest.entitlement.manage",
      "guest.entitlement.exception.review",
      "guest.child.view",
      "guest.child.manage",
      "guest.protocolNote.view",
    ];
    for (const key of required) {
      assert.ok((PERMISSION_KEYS as readonly string[]).includes(key));
    }
    const planner = permissionsForRole("PLANNER");
    assert.ok(planner.includes("guest.addressing.manage"));
    assert.ok(planner.includes("guest.entitlement.manage"));
    assert.equal(planner.includes("guest.addressing.confirm"), false);
    assert.equal(planner.includes("guest.entitlement.exception.review"), false);
    assert.equal(planner.includes("guest.protocolNote.view"), false);
    const director = permissionsForRole("EVENT_DIRECTOR");
    assert.ok(director.includes("guest.addressing.confirm"));
    assert.ok(director.includes("guest.entitlement.exception.review"));
    const auditor = permissionsForRole("READ_ONLY_AUDITOR");
    assert.ok(auditor.includes("guest.addressing.view"));
    assert.equal(auditor.includes("guest.addressing.manage"), false);
    const admin = permissionsForRole("SYSTEM_ADMINISTRATOR");
    assert.equal(admin.includes("guest.addressing.manage"), false);
  });

  it("rejects unknown honorifics, titles without source, and extra identity fields", () => {
    const unknownTitle = GuestAddressingSchema.safeParse({
      honorific: "Guessed",
      addressingStatus: "UNVERIFIED",
      addressingSource: "STAFF",
    });
    assert.equal(unknownTitle.success, false);
    const unsourcedTraditional = GuestAddressingSchema.safeParse({
      traditionalTitle: "Otunba",
      addressingStatus: "UNVERIFIED",
      addressingSource: "STAFF",
    });
    assert.equal(unsourcedTraditional.success, false);
    const extra = GuestRecordSchema.safeParse({
      honorific: "Dr",
    });
    assert.equal(extra.success, false);
  });
});
