import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyS04AFixtures, S04A_FIXTURE_IDS } from "../src/addressing-fixtures.js";
import { PlatformError } from "../src/errors.js";
import { attentionRequiredFor, projectGuestAttention } from "../src/guest-matching.js";
import { PlatformService } from "../src/service.js";
import { actor, fixtureService, people } from "./helpers.js";

const ALPHA = {
  organisationId: people.orgMaison,
  eventId: people.eventAlphaOne,
};

function dualServices() {
  const { store, service: primary } = fixtureService();
  const secondary = new PlatformService(store);
  return { store, primary, secondary };
}

function director() {
  return actor(people.personDirector);
}

function planner() {
  return actor(people.personPlanner);
}

function auditor() {
  return actor(people.personAuditor);
}

function intakeNamed(service: PlatformService, extras: Record<string, unknown> = {}) {
  return service.intakeGuest(director(), {
    ...ALPHA,
    givenName: "Kẹ́hìndé",
    familyName: "Adéwálé",
    preferredName: "Kẹ́hìndé",
    email: `kehinde.${crypto.randomUUID()}@example.test`,
    reason: "acceptance remediation intake",
    ...extras,
  });
}

describe("EOS-S04A acceptance remediation", () => {
  it("rejects a stale amendment from a second independently loaded service without applying it", () => {
    const { primary, secondary, store } = dualServices();
    const guest = intakeNamed(primary);
    const first = primary.amendGuest(director(), {
      ...ALPHA,
      guestId: guest.id,
      expectedVersion: guest.version,
      preferredName: "Kẹ́hìndé Adé",
      reason: "tab A amendment",
      idempotencyKey: "tab-a-amend",
    });
    assert.equal(first.version, guest.version + 1);
    assert.throws(
      () =>
        secondary.amendGuest(director(), {
          ...ALPHA,
          guestId: guest.id,
          expectedVersion: guest.version,
          preferredName: "Rejected name",
          reason: "tab B stale amendment",
          idempotencyKey: "tab-b-stale",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const durable = store.snapshot().operationalGuests.find((item) => item.id === guest.id);
    assert.equal(durable?.preferredName.value, "Kẹ́hìndé Adé");
    assert.notEqual(durable?.preferredName.value, "Rejected name");
    assert.equal(durable?.version, first.version);
  });

  it("replays an identical amendment from a second service without a second version or audit", async () => {
    const { primary, secondary, store } = dualServices();
    const guest = intakeNamed(primary, { preferredName: "Original" });
    const payload = {
      ...ALPHA,
      guestId: guest.id,
      expectedVersion: guest.version,
      preferredName: "Shared name",
      reason: "identical double submit",
    };
    const settled = await Promise.allSettled([
      Promise.resolve().then(() =>
        primary.amendGuest(director(), { ...payload, idempotencyKey: "double-a" }),
      ),
      Promise.resolve().then(() =>
        secondary.amendGuest(director(), { ...payload, idempotencyKey: "double-b" }),
      ),
    ]);
    assert.equal(settled.filter((item) => item.status === "fulfilled").length, 2);
    const durable = store.snapshot().operationalGuests.find((item) => item.id === guest.id);
    assert.equal(durable?.version, guest.version + 1);
    assert.equal(durable?.preferredName.value, "Shared name");
    const successAudits = store.snapshot().audit.filter(
      (item) => item.action === "guest.record.amended" && item.outcome === "SUCCESS" && item.resourceId === guest.id,
    );
    assert.equal(successAudits.length, 1);
    assert.equal(store.snapshot().idempotency.filter((item) => item.action === "guest.record.amended").length, 1);
    assert.equal(durable?.preferredName.quality === "CONFLICTING", attentionRequiredFor(durable!));
  });

  it("still conflicts when two independently loaded services submit different values", async () => {
    const { primary, secondary, store } = dualServices();
    const guest = intakeNamed(primary);
    const settled = await Promise.allSettled([
      Promise.resolve().then(() =>
        primary.amendGuest(director(), {
          ...ALPHA,
          guestId: guest.id,
          expectedVersion: guest.version,
          preferredName: "First value",
          reason: "concurrent A",
          idempotencyKey: "diff-a",
        }),
      ),
      Promise.resolve().then(() =>
        secondary.amendGuest(director(), {
          ...ALPHA,
          guestId: guest.id,
          expectedVersion: guest.version,
          preferredName: "Second value",
          reason: "concurrent B",
          idempotencyKey: "diff-b",
        }),
      ),
    ]);
    const fulfilled = settled.filter((item) => item.status === "fulfilled");
    const rejected = settled.filter((item) => item.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.ok(rejected[0]?.status === "rejected" && rejected[0].reason instanceof PlatformError);
    assert.equal((rejected[0] as PromiseRejectedResult).reason instanceof PlatformError, true);
    assert.equal(((rejected[0] as PromiseRejectedResult).reason as PlatformError).code, "VERSION_CONFLICT");
    const durable = store.snapshot().operationalGuests.find((item) => item.id === guest.id);
    assert.equal(durable?.version, guest.version + 1);
    assert.ok(durable?.preferredName.value === "First value" || durable?.preferredName.value === "Second value");
  });

  it("raises guest attention for a field-level conflict and agrees across directory and dossier", () => {
    const { primary } = dualServices();
    const guest = intakeNamed(primary, { dietaryRequirement: "No groundnuts" });
    const amended = primary.amendGuest(director(), {
      ...ALPHA,
      guestId: guest.id,
      expectedVersion: guest.version,
      dietaryRequirement: "Halal only",
      reason: "dietary conflict",
    });
    assert.equal(amended.dietaryRequirement.quality, "CONFLICTING");
    assert.equal(amended.attentionRequired, true);
    assert.deepEqual(projectGuestAttention(amended).fieldKeys, ["dietaryRequirement"]);
    const dossier = primary.getGuest(director(), ALPHA.organisationId, ALPHA.eventId, guest.id);
    const directory = primary.listGuests(director(), { ...ALPHA, attentionRequired: true });
    const auditorDossier = primary.getGuest(auditor(), ALPHA.organisationId, ALPHA.eventId, guest.id);
    assert.equal(dossier.attentionRequired, true);
    assert.equal(directory.some((item) => item.id === guest.id && item.attentionRequired), true);
    assert.equal(auditorDossier.attentionRequired, true);
    assert.equal(auditorDossier.dietaryRequirement.quality, "CONFLICTING");
    const resolved = primary.amendGuest(director(), {
      ...ALPHA,
      guestId: guest.id,
      expectedVersion: amended.version,
      dietaryRequirement: "Halal only",
      reason: "operator resolved dietary",
    });
    assert.notEqual(resolved.dietaryRequirement.quality, "CONFLICTING");
    assert.equal(primary.getGuest(director(), ALPHA.organisationId, ALPHA.eventId, guest.id).attentionRequired, false);
    assert.equal(
      primary.listGuests(director(), { ...ALPHA, attentionRequired: true }).some((item) => item.id === guest.id),
      false,
    );
  });

  it("does not silently rewrite an explicit preferred formal salutation when a title changes", () => {
    const { primary, store } = dualServices();
    const guest = intakeNamed(primary, {
      honorific: "Dr (Mrs)",
      preferredFormalSalutation: "Dr (Mrs) Kẹ́hìndé Adéwálé",
    });
    assert.throws(
      () =>
        primary.updateGuestAddressing(director(), {
          ...ALPHA,
          guestId: guest.id,
          expectedVersion: guest.version,
          honorific: "Professor",
          addressingSource: "STAFF",
          reason: "title correction without salutation decision",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    const unchanged = store.snapshot().operationalGuests.find((item) => item.id === guest.id);
    assert.equal(unchanged?.addressing?.honorific, "Dr (Mrs)");
    assert.equal(unchanged?.addressing?.preferredFormalSalutation, "Dr (Mrs) Kẹ́hìndé Adéwálé");

    const retained = primary.updateGuestAddressing(director(), {
      ...ALPHA,
      guestId: guest.id,
      expectedVersion: guest.version,
      honorific: "Professor",
      preferredFormalSalutation: "Dr (Mrs) Kẹ́hìndé Adéwálé",
      salutationDecision: "RETAIN",
      addressingSource: "STAFF",
      reason: "explicitly retain authored salutation",
    });
    assert.equal(retained.guest.honorific, "Professor");
    assert.equal(retained.guest.preferredFormalSalutation, "Dr (Mrs) Kẹ́hìndé Adéwálé");
    assert.equal(retained.guest.preferredFormalSalutationGovernance?.decision, "RETAINED");
    assert.equal(retained.guest.formalSalutation.inferredTitle, false);

    const other = intakeNamed(primary, {
      honorific: "Dr (Mrs)",
      preferredFormalSalutation: "Dr (Mrs) Kẹ́hìndé Adéwálé",
    });
    const updated = primary.updateGuestAddressing(director(), {
      ...ALPHA,
      guestId: other.id,
      expectedVersion: other.version,
      honorific: "Chief",
      preferredFormalSalutation: "Chief Kẹ́hìndé Adéwálé",
      salutationDecision: "UPDATE",
      addressingSource: "STAFF",
      reason: "operator updated authored salutation",
    });
    assert.equal(updated.guest.preferredFormalSalutation, "Chief Kẹ́hìndé Adéwálé");
    assert.equal(updated.guest.preferredFormalSalutationGovernance?.decision, "UPDATED");
    assert.ok(store.snapshot().audit.some((item) => item.action === "guest.addressing.updated" && item.outcome === "SUCCESS"));
  });

  it("does not invent a salutation mismatch for blank title or when no former title is present", () => {
    const { primary } = dualServices();
    const blank = intakeNamed(primary, { preferredFormalSalutation: "Kẹ́hìndé Adéwálé" });
    const cleared = primary.updateGuestAddressing(director(), {
      ...ALPHA,
      guestId: blank.id,
      expectedVersion: blank.version,
      clearHonorific: true,
      addressingSource: "STAFF",
      reason: "keep blank title",
    });
    assert.equal(cleared.guest.honorific, undefined);
    assert.equal(cleared.guest.preferredFormalSalutation, "Kẹ́hìndé Adéwálé");
    assert.equal(cleared.guest.formalSalutation.inferredTitle, false);

    const titled = intakeNamed(primary, { honorific: "Professor" });
    const noInferred = primary.updateGuestAddressing(director(), {
      ...ALPHA,
      guestId: titled.id,
      expectedVersion: titled.version,
      honorific: "Dr",
      addressingSource: "STAFF",
      reason: "title change with no authored salutation",
    });
    assert.equal(noInferred.guest.honorific, "Dr");
    assert.equal(noInferred.guest.preferredFormalSalutation, undefined);
    assert.equal(noInferred.guest.formalSalutation.inferredTitle, false);
  });

  it("replays identical high-risk S04A mutations and still denies auditor writes", () => {
    const { store, service } = fixtureService();
    store.replace(applyS04AFixtures(store.snapshot()));
    const secondary = new PlatformService(store);
    const party = service.createGuestParty(director(), {
      ...ALPHA,
      type: "INVITATION_PARTY",
      label: "Remediation party",
      principalGuestId: S04A_FIXTURE_IDS.guestAdesina,
      reason: "create isolated party",
      idempotencyKey: "party-create",
    });
    const added = service.addGuestPartyMember(director(), {
      ...ALPHA,
      partyId: party.id,
      guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      expectedPartyVersion: party.version,
      role: "MEMBER",
      reason: "add member",
      idempotencyKey: "party-add-1",
    });
    const replayed = secondary.addGuestPartyMember(director(), {
      ...ALPHA,
      partyId: party.id,
      guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      expectedPartyVersion: party.version,
      role: "MEMBER",
      reason: "add member again",
      idempotencyKey: "party-add-2",
    });
    assert.equal(replayed.id, added.id);
    assert.equal(replayed.version, added.version);

    const entitlement = store.snapshot().companionEntitlements.find((item) => item.id === S04A_FIXTURE_IDS.entitlementPlusOne);
    assert.ok(entitlement);
    const firstAdmin = service.administerCompanionEntitlement(director(), {
      ...ALPHA,
      principalGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      allowance: 1,
      authority: { kind: "RSVP_ENTITLEMENT", rsvpEntitlementId: S04A_FIXTURE_IDS.rsvpEntitlementPlusOne },
      status: entitlement.status,
      expectedVersion: entitlement.version,
      reason: "identical entitlement replay",
      idempotencyKey: "entitlement-1",
    });
    const secondAdmin = secondary.administerCompanionEntitlement(director(), {
      ...ALPHA,
      principalGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      allowance: 1,
      authority: { kind: "RSVP_ENTITLEMENT", rsvpEntitlementId: S04A_FIXTURE_IDS.rsvpEntitlementPlusOne },
      status: entitlement.status,
      expectedVersion: entitlement.version,
      reason: "identical entitlement replay",
      idempotencyKey: "entitlement-2",
    });
    assert.equal(secondAdmin.version, firstAdmin.version);
    assert.throws(
      () =>
        service.amendGuest(auditor(), {
          ...ALPHA,
          guestId: S04A_FIXTURE_IDS.guestAdesina,
          expectedVersion: 1,
          preferredName: "Should fail",
          reason: "auditor write",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () =>
        service.updateGuestAddressing(planner(), {
          ...ALPHA,
          guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
          expectedVersion: 1,
          addressingStatus: "HOST_CONFIRMED",
          addressingSource: "HOST",
          reason: "planner confirm",
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "VERSION_CONFLICT"),
    );
  });
});
