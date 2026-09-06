import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyS04AFixtures, S04A_FIXTURE_IDS } from "../src/addressing-fixtures.js";
import { templateVariablesFor } from "../src/communications-operations.js";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

function s04aService() {
  const { store, service } = fixtureService();
  store.replace(applyS04AFixtures(store.snapshot()));
  return { store, service };
}

const director = () => actor(people.personDirector);
const planner = () => actor(people.personPlanner);
const auditor = () => actor(people.personAuditor);
const ceo = () => actor(people.personCeo);
const admin = () => actor(people.personAdmin);

const ALPHA = {
  organisationId: people.orgMaison,
  eventId: people.eventAlphaOne,
};

function auditFor(store: ReturnType<typeof fixtureService>["store"], action: string) {
  return store.snapshot().audit.filter((item) => item.action === action);
}

describe("EOS-S04A guest services", () => {
  it("intakes a titled Yorùbá adult and persists structured addressing without inferring titles", () => {
    const { service } = fixtureService();
    const guest = service.intakeGuest(director(), {
      ...ALPHA,
      givenName: "Ọmọ́wùnmí",
      familyName: "Adéyẹmí",
      honorific: "Dr (Mrs)",
      preferredFormalSalutation: "Dr (Mrs) Ọmọ́wùnmí Adéyẹmí",
      ageBand: "ADULT",
      reason: "synthetic titled intake",
    });
    assert.equal(guest.givenName.value, "Ọmọ́wùnmí");
    assert.equal(guest.familyName.value, "Adéyẹmí");
    assert.equal(guest.addressing?.honorific, "Dr (Mrs)");
    assert.equal(guest.addressing?.addressingStatus, "UNVERIFIED");
    assert.equal(guest.addressing?.addressingSource, "STAFF");
    assert.equal(guest.ageBand, "ADULT");
    assert.equal(guest.childReadiness, undefined);
  });

  it("updates addressing, confirms with authority, and returns a typed min-necessary projection", () => {
    const { store, service } = s04aService();
    const guest = service.intakeGuest(director(), {
      ...ALPHA,
      givenName: "Bólánlé",
      familyName: "Ṣóyinká",
      reason: "blank-title adult",
    });
    const updated = service.updateGuestAddressing(director(), {
      ...ALPHA,
      guestId: guest.id,
      expectedVersion: guest.version,
      honorific: "Professor",
      preferredFormalSalutation: "Professor Bólánlé Ṣóyinká",
      addressingSource: "HOST",
      addressingStatus: "HOST_CONFIRMED",
      reason: "host confirmed title",
    });
    assert.equal(updated.guest.honorific, "Professor");
    assert.equal(updated.guest.formalSalutation.text, "Professor Bólánlé Ṣóyinká");
    assert.equal(updated.guest.formalSalutation.inferredTitle, false);
    assert.equal(updated.guest.familiarName.text, "Bólánlé Ṣóyinká");
    assert.ok(auditFor(store, "guest.addressing.confirmed").some((item) => item.outcome === "SUCCESS"));
  });

  it("renders a safe blank-title fallback without guessing an honorific", () => {
    const { service } = fixtureService();
    const guest = service.intakeGuest(director(), {
      ...ALPHA,
      givenName: "Títílayọ̀",
      familyName: "Ọlátúnjí",
      reason: "no title supplied",
    });
    const workspace = service.updateGuestAddressing(director(), {
      ...ALPHA,
      guestId: guest.id,
      expectedVersion: guest.version,
      addressingSource: "STAFF",
      reason: "record blank title",
    });
    assert.equal(workspace.guest.honorific, undefined);
    assert.equal(workspace.guest.formalSalutation.kind, "SAFE_FALLBACK");
    assert.equal(workspace.guest.formalSalutation.text, "Títílayọ̀ Ọlátúnjí");
    assert.equal(workspace.guest.formalSalutation.inferredTitle, false);
  });

  it("denies planner confirmation and records a forbidden audit", () => {
    const { store, service } = s04aService();
    const guest = service.intakeGuest(planner(), {
      ...ALPHA,
      givenName: "Kẹ́hìndé",
      familyName: "Àkàndé",
      reason: "planner intake",
    });
    assert.throws(
      () =>
        service.updateGuestAddressing(planner(), {
          ...ALPHA,
          guestId: guest.id,
          expectedVersion: guest.version,
          honorific: "Dr",
          addressingSource: "HOST",
          addressingStatus: "HOST_CONFIRMED",
          reason: "planner confirm",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.ok(auditFor(store, "guest.addressing.confirmed").some((item) => item.outcome === "DENIED"));
    const stored = store.snapshot().operationalGuests.find((item) => item.id === guest.id);
    assert.equal(stored?.addressing, undefined);
  });

  it("strips protocol notes and child fields from directory reads without authority", () => {
    const { store, service } = s04aService();
    service.grantAssignment(ceo(), {
      organisationId: people.orgMaison,
      personId: people.personUnassigned,
      roleKey: "CLIENT_LEAD",
      eventId: people.eventAlphaOne,
      reason: "client lead denial fixture",
    });
    const lead = actor(people.personUnassigned);
    const guest = service.getGuest(lead, people.orgMaison, people.eventAlphaOne, S04A_FIXTURE_IDS.guestOlufemi);
    assert.equal(guest.addressing, undefined);
    assert.equal(guest.ageBand, undefined);
    assert.equal(guest.childReadiness, undefined);
    assert.throws(
      () => service.getGuestAddressingWorkspace(lead, people.orgMaison, people.eventAlphaOne, S04A_FIXTURE_IDS.guestOlufemi),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    void store;
  });

  it("returns auditor child projection without protocol notes or household dump", () => {
    const { service } = s04aService();
    const workspace = service.getGuestAddressingWorkspace(
      auditor(),
      people.orgMaison,
      people.eventAlphaOne,
      S04A_FIXTURE_IDS.guestTomi,
    );
    assert.equal(workspace.child?.ageBand, "CHILD");
    assert.equal(workspace.child?.childReadiness, "READY_FOR_EVENT");
    assert.equal(workspace.child?.responsibleAdult?.adultFamiliarName, "Ẹ̀bùnolúwa");
    assert.equal(workspace.guest.pronunciationNote, undefined);
    assert.equal(workspace.guest.traditionalTitle, undefined);
    assert.equal(workspace.capabilities.canManageAddressing, false);
    assert.equal(workspace.capabilities.canConfirmAddressing, false);
    assert.equal(workspace.capabilities.canViewProtocolNote, false);
    const protocol = service.getGuestAddressingWorkspace(
      director(),
      people.orgMaison,
      people.eventAlphaOne,
      S04A_FIXTURE_IDS.guestOlufemi,
    );
    assert.equal(protocol.guest.traditionalTitle, "Otunba");
    const plannerView = service.getGuestAddressingWorkspace(
      planner(),
      people.orgMaison,
      people.eventAlphaOne,
      S04A_FIXTURE_IDS.guestOlufemi,
    );
    assert.equal(plannerView.guest.traditionalTitle, undefined);
  });

  it("rejects system administrator S04A mutation and query", () => {
    const { service } = s04aService();
    assert.throws(
      () => service.getGuestAddressingWorkspace(admin(), people.orgMaison, people.eventAlphaOne, S04A_FIXTURE_IDS.guestEbunoluwa),
      PlatformError,
    );
    assert.throws(
      () =>
        service.updateGuestAddressing(admin(), {
          ...ALPHA,
          guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
          expectedVersion: 1,
          addressingSource: "STAFF",
          reason: "admin write",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
  });

  it("rejects cross-event party membership and relationship explicitly", () => {
    const { service } = s04aService();
    const other = service.intakeGuest(ceo(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaTwo,
      givenName: "Other",
      familyName: "Event",
      reason: "other event guest",
    });
    const party = service.createGuestParty(director(), {
      ...ALPHA,
      type: "HOUSEHOLD",
      label: "Test party",
      principalGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      reason: "create party",
    });
    assert.throws(
      () =>
        service.addGuestPartyMember(director(), {
          ...ALPHA,
          partyId: party.id,
          guestId: other.id,
          expectedPartyVersion: party.version,
          role: "MEMBER",
          reason: "cross-event member",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "SCOPE_MISMATCH",
    );
    assert.throws(
      () =>
        service.createGuestRelationship(director(), {
          ...ALPHA,
          fromGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
          toGuestId: other.id,
          type: "COMPANION_OF",
          direction: "FORWARD",
          source: "STAFF",
          visibility: "STAFF",
          reason: "cross-event relationship",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "SCOPE_MISMATCH",
    );
  });

  it("refuses S03 entitlement expansion even when the actor has manage", () => {
    const { store, service } = s04aService();
    const before = store.snapshot().companionEntitlements.find((item) => item.id === S04A_FIXTURE_IDS.entitlementPlusOne);
    assert.equal(before?.allowance, 1);
    assert.throws(
      () =>
        service.administerCompanionEntitlement(planner(), {
          ...ALPHA,
          principalGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
          allowance: 2,
          authority: { kind: "RSVP_ENTITLEMENT", rsvpEntitlementId: S04A_FIXTURE_IDS.rsvpEntitlementPlusOne },
          reason: "expand plus-one",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    const after = store.snapshot().companionEntitlements.find((item) => item.id === S04A_FIXTURE_IDS.entitlementPlusOne);
    assert.equal(after?.allowance, 1);
    assert.equal(after?.nominatedGuestId, undefined);
  });

  it("denies planner entitlement exception review", () => {
    const { store, service } = s04aService();
    assert.throws(
      () =>
        service.administerCompanionEntitlement(planner(), {
          ...ALPHA,
          principalGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
          allowance: 1,
          authority: { kind: "RSVP_ENTITLEMENT", rsvpEntitlementId: S04A_FIXTURE_IDS.rsvpEntitlementPlusOne },
          status: "EXCEPTION_REVIEW",
          reason: "planner exception",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.ok(auditFor(store, "guest.entitlement.exception.reviewed").some((item) => item.outcome === "DENIED"));
  });

  it("materialises exactly one companion guest and is concurrent-safe and idempotent", () => {
    const { store, service } = s04aService();
    const first = service.nominateCompanion(planner(), {
      ...ALPHA,
      entitlementId: S04A_FIXTURE_IDS.entitlementPlusOne,
      expectedVersion: 1,
      suppliedGivenName: "Adéọlá",
      suppliedFamilyName: "Bánkọ́lé",
      reason: "named plus-one",
      idempotencyKey: "nom-1",
    });
    assert.equal(first.status, "NOMINATED");
    assert.ok(first.nominatedGuestId);
    const guestsAfterFirst = store.snapshot().operationalGuests.filter((item) => item.givenName.value === "Adéọlá");
    assert.equal(guestsAfterFirst.length, 1);
    const replay = service.nominateCompanion(planner(), {
      ...ALPHA,
      entitlementId: S04A_FIXTURE_IDS.entitlementPlusOne,
      expectedVersion: 1,
      suppliedGivenName: "Adéọlá",
      suppliedFamilyName: "Bánkọ́lé",
      reason: "named plus-one",
      idempotencyKey: "nom-1",
    });
    assert.equal(replay.id, first.id);
    assert.throws(
      () =>
        service.nominateCompanion(planner(), {
          ...ALPHA,
          entitlementId: S04A_FIXTURE_IDS.entitlementPlusOne,
          expectedVersion: 1,
          suppliedGivenName: "Second",
          suppliedFamilyName: "Person",
          reason: "concurrent",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const guestsAfterConflict = store.snapshot().operationalGuests.filter((item) => item.familyName.value === "Person");
    assert.equal(guestsAfterConflict.length, 0);
    assert.equal(store.snapshot().companionNominations.filter((item) => item.entitlementId === first.id).length, 1);
  });

  it("does not fabricate a guest for an unnamed allowance", () => {
    const { store, service } = s04aService();
    const workspace = service.getGuestAddressingWorkspace(
      planner(),
      people.orgMaison,
      people.eventAlphaOne,
      S04A_FIXTURE_IDS.guestEbunoluwa,
    );
    const entitlement = workspace.entitlements.find((item) => item.id === S04A_FIXTURE_IDS.entitlementPlusOne);
    assert.equal(entitlement?.unnamed, true);
    assert.equal(entitlement?.nominatedGuestId, undefined);
    assert.equal(store.snapshot().companionEntitlements.find((item) => item.id === S04A_FIXTURE_IDS.entitlementPlusOne)?.nominatedGuestId, undefined);
  });

  it("reconciles S03 companionNames without creating guests", () => {
    const { store, service } = s04aService();
    const beforeGuests = store.snapshot().operationalGuests.length;
    store.replace(
      (() => {
        const snap = store.snapshot();
        snap.rsvpResponses.push({
          id: "00000000-0000-4000-8000-000000000201",
          organisationId: people.orgMaison,
          clientId: people.clientAlpha,
          eventId: people.eventAlphaOne,
          guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
          questionnaireId: "00000000-0000-4000-8000-000000000202",
          attendanceIntent: "ATTENDING",
          status: "SUBMITTED",
          provenance: "GUEST_SELF_SERVICE",
          answers: { attendanceIntent: "ATTENDING", companionNames: ["Free Text Companion"] },
          schemaVersion: 1,
          version: 1,
          createdAt: "2026-09-06T14:00:00.000Z",
          updatedAt: "2026-09-06T14:00:00.000Z",
        });
        return snap;
      })(),
    );
    const result = service.reconcileCompanionNames(planner(), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      reason: "reconcile free-text companions",
    });
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.legacyDisplayText, "Free Text Companion");
    assert.equal(store.snapshot().operationalGuests.length, beforeGuests);
    const workspace = service.getGuestAddressingWorkspace(
      planner(),
      people.orgMaison,
      people.eventAlphaOne,
      S04A_FIXTURE_IDS.guestEbunoluwa,
    );
    assert.equal(workspace.companionNameReconciliations[0]?.fabricatedGuest, false);
    assert.equal(workspace.pendingCompanionNames.length, 0);
  });

  it("blocks child readiness without a responsible adult and sets READY only after a valid link", () => {
    const { service } = fixtureService();
    const child = service.intakeGuest(director(), {
      ...ALPHA,
      givenName: "Kọ́lá",
      familyName: "Àlàbí",
      ageBand: "CHILD",
      reason: "child without adult",
    });
    assert.equal(child.childReadiness, "BLOCKED_MISSING_RESPONSIBLE_ADULT");
    const adult = service.intakeGuest(director(), {
      ...ALPHA,
      givenName: "Yẹ́mí",
      familyName: "Àlàbí",
      ageBand: "ADULT",
      reason: "responsible adult",
    });
    const link = service.createResponsibleAdultLink(director(), {
      ...ALPHA,
      childGuestId: child.id,
      responsibleAdultGuestId: adult.id,
      scope: "EVENT",
      reason: "declared carer",
    });
    assert.ok(link.id);
    const workspace = service.getGuestAddressingWorkspace(director(), people.orgMaison, people.eventAlphaOne, child.id);
    assert.equal(workspace.child?.childReadiness, "READY_FOR_EVENT");
    assert.throws(
      () =>
        service.createResponsibleAdultLink(director(), {
          ...ALPHA,
          childGuestId: child.id,
          responsibleAdultGuestId: child.id,
          scope: "EVENT",
          reason: "self",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("rolls back a failed coupled nomination and records optimistic conflict", () => {
    const { store, service } = s04aService();
    const beforeGuests = store.snapshot().operationalGuests.length;
    const beforeNominations = store.snapshot().companionNominations.length;
    assert.throws(
      () =>
        service.nominateCompanion(planner(), {
          ...ALPHA,
          entitlementId: S04A_FIXTURE_IDS.entitlementPlusOne,
          expectedVersion: 99,
          suppliedGivenName: "Should",
          suppliedFamilyName: "Rollback",
          reason: "stale version",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    assert.equal(store.snapshot().operationalGuests.length, beforeGuests);
    assert.equal(store.snapshot().companionNominations.length, beforeNominations);
    assert.ok(auditFor(store, "guest.entitlement.nominated").some((item) => item.outcome === "FAILED"));
  });

  it("rejects date of birth on addressing payloads", () => {
    const { service } = s04aService();
    assert.throws(
      () =>
        service.updateGuestAddressing(director(), {
          ...ALPHA,
          guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
          expectedVersion: 1,
          addressingSource: "STAFF",
          reason: "dob attempt",
          dateOfBirth: "2010-01-01",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("rejects addressing fields on amendGuest so they cannot bypass addressing authority", () => {
    const { service } = s04aService();
    const guest = service.intakeGuest(planner(), {
      ...ALPHA,
      givenName: "Fẹ́mi",
      familyName: "Kúyè",
      reason: "amend bypass",
    });
    assert.throws(
      () =>
        service.amendGuest(planner(), {
          ...ALPHA,
          guestId: guest.id,
          expectedVersion: guest.version,
          honorific: "Mr",
          reason: "bypass",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("uses safe communications salutation without inferred titles", () => {
    const { service } = fixtureService();
    const titled = service.intakeGuest(director(), {
      ...ALPHA,
      givenName: "Folákẹ́",
      familyName: "Adébáyọ̀",
      honorific: "Chief",
      preferredFormalSalutation: "Chief Folákẹ́ Adébáyọ̀",
      reason: "comms titled",
    });
    service.updateGuestAddressing(director(), {
      ...ALPHA,
      guestId: titled.id,
      expectedVersion: titled.version,
      honorific: "Chief",
      preferredFormalSalutation: "Chief Folákẹ́ Adébáyọ̀",
      addressingSource: "HOST",
      addressingStatus: "HOST_CONFIRMED",
      reason: "confirm for comms",
    });
    const blank = service.intakeGuest(director(), {
      ...ALPHA,
      givenName: "Sẹ̀yí",
      familyName: "Ọbáfẹ́mi",
      reason: "comms blank",
    });
    const occasion = {
      eventName: "Alpha One",
      when: "Saturday",
      venue: "Lagos",
    };
    const event = { name: "Alpha One" };
    const confirmed = service.getGuest(director(), people.orgMaison, people.eventAlphaOne, titled.id);
    const untitled = service.getGuest(director(), people.orgMaison, people.eventAlphaOne, blank.id);
    assert.equal(
      templateVariablesFor({
        guest: confirmed,
        occasion: occasion as never,
        event: event as never,
      })["guest.name"],
      "Chief Folákẹ́ Adébáyọ̀",
    );
    assert.equal(
      templateVariablesFor({
        guest: untitled,
        occasion: occasion as never,
        event: event as never,
      })["guest.name"],
      "Sẹ̀yí Ọbáfẹ́mi",
    );
  });

  it("ends an authorised responsible-adult link and blocks child readiness", () => {
    const { service } = s04aService();
    const before = service.getGuestAddressingWorkspace(
      director(),
      people.orgMaison,
      people.eventAlphaOne,
      S04A_FIXTURE_IDS.guestTomi,
    );
    assert.equal(before.child?.childReadiness, "READY_FOR_EVENT");
    assert.ok(before.child?.responsibleAdult);
    service.endResponsibleAdultLink(director(), {
      ...ALPHA,
      linkId: before.child!.responsibleAdult!.linkId,
      expectedVersion: before.child!.responsibleAdult!.version,
      reason: "end responsible adult for readiness check",
    });
    const after = service.getGuestAddressingWorkspace(
      director(),
      people.orgMaison,
      people.eventAlphaOne,
      S04A_FIXTURE_IDS.guestTomi,
    );
    assert.equal(after.child?.responsibleAdult, undefined);
    assert.equal(after.child?.childReadiness, "BLOCKED_MISSING_RESPONSIBLE_ADULT");
    assert.equal(after.child?.requiresResponsibleAdult, true);
  });

  it("projects party membership ids, principal only when supplied, and entitlement transitions", () => {
    const { service } = s04aService();
    const workspace = service.getGuestAddressingWorkspace(
      director(),
      people.orgMaison,
      people.eventAlphaOne,
      S04A_FIXTURE_IDS.guestEbunoluwa,
    );
    const party = workspace.parties.find((item) => item.id === S04A_FIXTURE_IDS.partyAlakija);
    assert.ok(party);
    assert.equal(party.principalGuestId, S04A_FIXTURE_IDS.guestEbunoluwa);
    assert.ok(party.members.every((member) => member.membershipId && member.version >= 1));
    const entitlement = workspace.entitlements.find((item) => item.id === S04A_FIXTURE_IDS.entitlementPlusOne);
    assert.ok(entitlement);
    assert.equal(entitlement.unnamed, true);
    assert.equal(entitlement.authorisedAllowance, 1);
    assert.ok(entitlement.allowedTransitions.includes("NOMINATED"));
  });

  it("declines, expires and revokes an unnamed entitlement without creating a guest", () => {
    const { store, service } = s04aService();
    const authority = { kind: "RSVP_ENTITLEMENT" as const, rsvpEntitlementId: S04A_FIXTURE_IDS.rsvpEntitlementPlusOne };
    const declined = service.administerCompanionEntitlement(director(), {
      ...ALPHA,
      principalGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      allowance: 1,
      authority,
      status: "DECLINED",
      reason: "P11 decline unnamed plus-one",
    });
    assert.equal(declined.status, "DECLINED");
    assert.equal(declined.nominatedGuestId, undefined);
    const restored = service.administerCompanionEntitlement(director(), {
      ...ALPHA,
      principalGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      allowance: 1,
      authority,
      status: "AVAILABLE",
      reason: "P11 restore after decline",
    });
    const expired = service.administerCompanionEntitlement(director(), {
      ...ALPHA,
      principalGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      allowance: 1,
      authority,
      status: "EXPIRED",
      reason: "P11 expire unnamed plus-one",
    });
    assert.equal(expired.status, "EXPIRED");
    const availableAgain = service.administerCompanionEntitlement(director(), {
      ...ALPHA,
      principalGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      allowance: 1,
      authority,
      status: "AVAILABLE",
      reason: "P11 restore after expire",
    });
    const revoked = service.administerCompanionEntitlement(director(), {
      ...ALPHA,
      principalGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      allowance: 1,
      authority,
      status: "REVOKED",
      reason: "P11 revoke unnamed plus-one",
    });
    assert.equal(restored.status, "AVAILABLE");
    assert.equal(availableAgain.status, "AVAILABLE");
    assert.equal(revoked.status, "REVOKED");
    assert.equal(revoked.nominatedGuestId, undefined);
    assert.equal(
      store.snapshot().operationalGuests.filter((item) => item.id === S04A_FIXTURE_IDS.guestEbunoluwa).length,
      1,
    );
    assert.ok(auditFor(store, "guest.entitlement.administered").some((item) => item.outcome === "SUCCESS"));
  });

  it("creates and amends a declared relationship without inferring a household", () => {
    const { store, service } = s04aService();
    const created = service.createGuestRelationship(director(), {
      ...ALPHA,
      fromGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      toGuestId: S04A_FIXTURE_IDS.guestAdesina,
      type: "COMPANION_OF",
      direction: "FORWARD",
      source: "STAFF",
      visibility: "STAFF",
      reason: "P11 declared companion relationship",
    });
    assert.equal(created.type, "COMPANION_OF");
    const amended = service.administerGuestRelationship(director(), {
      ...ALPHA,
      relationshipId: created.id,
      expectedVersion: created.version,
      type: "OTHER_DECLARED",
      reason: "P11 governed relationship correction",
    });
    assert.equal(amended.type, "OTHER_DECLARED");
    assert.equal(amended.version, created.version + 1);
    assert.ok(auditFor(store, "guest.relationship.amended").some((item) => item.outcome === "SUCCESS"));
  });
});
