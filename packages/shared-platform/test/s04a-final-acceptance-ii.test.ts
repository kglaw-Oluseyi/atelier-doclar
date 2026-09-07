import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RETAINED_SALUTATION_INVARIANT,
  retainedSalutationInvariant,
} from "../src/addressing-invariant.js";
import { PlatformError } from "../src/errors.js";
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

function ceo() {
  return actor(people.personCeo);
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
    givenName: "Adérónkẹ́",
    familyName: "Concurrency-Test-Q7F3",
    preferredName: "Adérónkẹ́",
    email: `aderonke.${crypto.randomUUID()}@example.test`,
    reason: "final acceptance II intake",
    ...extras,
  });
}

describe("EOS-S04A final acceptance II — retained salutations", () => {
  it("stores only the explicitly authored replacement when Professor becomes Dr with UPDATED", () => {
    const { primary, store } = dualServices();
    const guest = intakeNamed(primary, {
      honorific: "Professor",
      preferredFormalSalutation: "Professor Adérónkẹ́ Concurrency-Test-Q7F3",
    });
    const updated = primary.updateGuestAddressing(director(), {
      ...ALPHA,
      guestId: guest.id,
      expectedVersion: guest.version,
      honorific: "Dr",
      preferredFormalSalutation: "Dr Adérónkẹ́ Concurrency-Test-Q7F3",
      salutationDecision: "UPDATE",
      addressingSource: "STAFF",
      reason: "Professor to Dr with authored replacement",
    });
    assert.equal(updated.guest.honorific, "Dr");
    assert.equal(updated.guest.preferredFormalSalutation, "Dr Adérónkẹ́ Concurrency-Test-Q7F3");
    assert.equal(updated.guest.formalSalutation.text, "Dr Adérónkẹ́ Concurrency-Test-Q7F3");
    assert.equal(updated.guest.preferredFormalSalutationGovernance?.decision, "UPDATED");
    const audit = store.snapshot().audit.find(
      (item) => item.resourceId === guest.id && item.action === "guest.addressing.updated" && item.outcome === "SUCCESS",
    );
    assert.ok(audit);
    assert.notEqual(updated.guest.formalSalutation.text, "Professor Adérónkẹ́ Concurrency-Test-Q7F3");
  });

  it("preserves the authored salutation byte-for-byte when Dr becomes Mr with RETAINED", () => {
    const { primary, store } = dualServices();
    const authored = "Dr Adérónkẹ́ Concurrency-Test-Q7F3";
    const guest = intakeNamed(primary, {
      honorific: "Dr",
      preferredFormalSalutation: authored,
    });
    const retained = primary.updateGuestAddressing(director(), {
      ...ALPHA,
      guestId: guest.id,
      expectedVersion: guest.version,
      honorific: "Mr",
      preferredFormalSalutation: "Mr Adérónkẹ́ Concurrency-Test-Q7F3",
      salutationDecision: "RETAIN",
      addressingSource: "STAFF",
      reason: "Dr to Mr with explicit retention",
    });
    assert.equal(retained.guest.honorific, "Mr");
    assert.equal(retained.guest.preferredFormalSalutation, authored);
    assert.equal(retained.guest.formalSalutation.text, authored);
    assert.equal(retained.guest.formalSalutation.usedPreferredFormal, true);
    assert.equal(retained.guest.preferredFormalSalutationGovernance?.decision, "RETAINED");
    assert.doesNotMatch(retained.guest.formalSalutation.text, /^Mr /);
    const durable = store.snapshot().operationalGuests.find((item) => item.id === guest.id);
    assert.equal(durable?.addressing?.preferredFormalSalutation, authored);
    const success = store.snapshot().audit.find(
      (item) => item.resourceId === guest.id && item.action === "guest.addressing.updated" && item.outcome === "SUCCESS",
    );
    assert.ok(success);
    assert.equal(durable?.addressing?.preferredFormalSalutationGovernance?.decision, "RETAINED");
  });

  it("preserves Unicode, diacritics, whitespace and punctuation under retention", () => {
    const { primary } = dualServices();
    const authored = "Dr (Mrs) Ẹ̀bùnolúwa-Adérónkẹ́  Alákíjà, OON";
    const guest = intakeNamed(primary, {
      honorific: "Dr (Mrs)",
      preferredFormalSalutation: authored,
    });
    const retained = primary.updateGuestAddressing(director(), {
      ...ALPHA,
      guestId: guest.id,
      expectedVersion: guest.version,
      honorific: "Professor",
      preferredFormalSalutation: "Professor Ẹ̀bùnolúwa-Adérónkẹ́ Alákíjà",
      salutationDecision: "RETAIN",
      addressingSource: "STAFF",
      reason: "retain punctuation and diacritics",
    });
    assert.equal(retained.guest.preferredFormalSalutation, authored);
    assert.equal(retained.guest.formalSalutation.text, authored);
  });

  it("refuses a title change when a former title remains and no decision is supplied", () => {
    const { primary, store } = dualServices();
    const guest = intakeNamed(primary, {
      honorific: "Dr",
      preferredFormalSalutation: "Dr Adérónkẹ́ Concurrency-Test-Q7F3",
    });
    const before = store.snapshot().operationalGuests.find((item) => item.id === guest.id);
    assert.throws(
      () =>
        primary.updateGuestAddressing(director(), {
          ...ALPHA,
          guestId: guest.id,
          expectedVersion: guest.version,
          honorific: "Mr",
          addressingSource: "STAFF",
          reason: "no decision supplied",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    const after = store.snapshot().operationalGuests.find((item) => item.id === guest.id);
    assert.equal(after?.version, before?.version);
    assert.equal(after?.addressing?.honorific, "Dr");
    assert.equal(after?.addressing?.preferredFormalSalutation, "Dr Adérónkẹ́ Concurrency-Test-Q7F3");
    assert.ok(
      !store
        .snapshot()
        .audit.some(
          (item) =>
            item.resourceId === guest.id &&
            item.action === "guest.addressing.updated" &&
            item.outcome === "SUCCESS" &&
            item.reason === "no decision supplied",
        ),
    );
  });

  it("does not invent a mismatch when the title is blank", () => {
    const { primary } = dualServices();
    const guest = intakeNamed(primary, { preferredFormalSalutation: "Adérónkẹ́ Concurrency-Test-Q7F3" });
    const cleared = primary.updateGuestAddressing(director(), {
      ...ALPHA,
      guestId: guest.id,
      expectedVersion: guest.version,
      clearHonorific: true,
      addressingSource: "STAFF",
      reason: "blank title remains blank",
    });
    assert.equal(cleared.guest.honorific, undefined);
    assert.equal(cleared.guest.preferredFormalSalutation, "Adérónkẹ́ Concurrency-Test-Q7F3");
    assert.equal(cleared.guest.formalSalutation.text, "Adérónkẹ́ Concurrency-Test-Q7F3");
  });

  it("conflicts a concurrent title change against a concurrent salutation amendment", () => {
    const { primary, secondary, store } = dualServices();
    const guest = intakeNamed(primary, {
      honorific: "Dr",
      preferredFormalSalutation: "Dr Adérónkẹ́ Concurrency-Test-Q7F3",
    });
    const first = primary.updateGuestAddressing(director(), {
      ...ALPHA,
      guestId: guest.id,
      expectedVersion: guest.version,
      honorific: "Mr",
      preferredFormalSalutation: "Dr Adérónkẹ́ Concurrency-Test-Q7F3",
      salutationDecision: "RETAIN",
      addressingSource: "STAFF",
      reason: "tab A retain",
    });
    assert.throws(
      () =>
        secondary.updateGuestAddressing(director(), {
          ...ALPHA,
          guestId: guest.id,
          expectedVersion: guest.version,
          honorific: "Professor",
          preferredFormalSalutation: "Professor Adérónkẹ́ Concurrency-Test-Q7F3",
          salutationDecision: "UPDATE",
          addressingSource: "STAFF",
          reason: "tab B stale update",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const durable = store.snapshot().operationalGuests.find((item) => item.id === guest.id);
    assert.equal(durable?.version, first.guest.version);
    assert.equal(durable?.addressing?.honorific, "Mr");
    assert.equal(durable?.addressing?.preferredFormalSalutation, "Dr Adérónkẹ́ Concurrency-Test-Q7F3");
  });

  it("rolls back the transaction and audits failure when the retain invariant is violated", () => {
    const { primary, store } = dualServices();
    const guest = intakeNamed(primary, {
      honorific: "Dr",
      preferredFormalSalutation: "Dr Adérónkẹ́ Concurrency-Test-Q7F3",
    });
    const original = retainedSalutationInvariant.assert;
    retainedSalutationInvariant.assert = () => {
      throw new PlatformError("VALIDATION_FAILED", "retained preferred formal salutation changed after RETAIN", {
        details: [RETAINED_SALUTATION_INVARIANT],
        publicMessage: "The preferred formal salutation could not be retained unchanged. Canonical data was not changed.",
      });
    };
    try {
      assert.throws(
        () =>
          primary.updateGuestAddressing(director(), {
            ...ALPHA,
            guestId: guest.id,
            expectedVersion: guest.version,
            honorific: "Mr",
            preferredFormalSalutation: "Dr Adérónkẹ́ Concurrency-Test-Q7F3",
            salutationDecision: "RETAIN",
            addressingSource: "STAFF",
            reason: "forced invariant failure",
          }),
        (error: unknown) =>
          error instanceof PlatformError &&
          error.code === "VALIDATION_FAILED" &&
          Boolean(error.details?.includes(RETAINED_SALUTATION_INVARIANT)),
      );
    } finally {
      retainedSalutationInvariant.assert = original;
    }
    const durable = store.snapshot().operationalGuests.find((item) => item.id === guest.id);
    assert.equal(durable?.version, guest.version);
    assert.equal(durable?.addressing?.honorific, "Dr");
    assert.equal(durable?.addressing?.preferredFormalSalutation, "Dr Adérónkẹ́ Concurrency-Test-Q7F3");
    assert.notEqual(durable?.addressing?.preferredFormalSalutationGovernance?.decision, "RETAINED");
    const failed = store.snapshot().audit.filter(
      (item) => item.resourceId === guest.id && item.action === "guest.addressing.updated",
    );
    assert.ok(failed.some((item) => item.outcome === "FAILED" && item.reason === "VALIDATION_FAILED"));
    assert.ok(!failed.some((item) => item.outcome === "SUCCESS" && item.reason === "forced invariant failure"));
  });
});

describe("EOS-S04A final acceptance II — access administration", () => {
  it("denies Planner and Auditor the access-administration catalogue before any leak", () => {
    const { service, store } = fixtureService();
    const before = store.snapshot().audit.length;
    for (const actorFn of [planner, auditor]) {
      assert.throws(
        () => service.getAccessAdministration(actorFn(), people.orgMaison),
        (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
      );
    }
    const denied = store.snapshot().audit.slice(before).filter((item) => item.outcome === "DENIED");
    assert.ok(denied.some((item) => item.action === "assignment.manage"));
    assert.ok(denied.every((item) => !item.reason?.includes(people.personUnassigned)));
    assert.ok(denied.every((item) => !JSON.stringify(item).includes("EVENT_DIRECTOR")));
  });

  it("denies Planner and Auditor forged assignment grants and self-escalation", () => {
    const { service, store } = fixtureService();
    for (const [actorFn, personId] of [
      [planner, people.personPlanner],
      [auditor, people.personAuditor],
    ] as const) {
      assert.throws(
        () =>
          service.grantAssignment(actorFn(), {
            organisationId: people.orgMaison,
            personId,
            roleKey: "EVENT_DIRECTOR",
            reason: "self escalate",
            eventId: people.eventAlphaOne,
            clientId: people.clientAlpha,
          }),
        (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
      );
      assert.throws(
        () =>
          service.grantAssignment(actorFn(), {
            organisationId: people.orgMaison,
            personId: people.personUnassigned,
            roleKey: "PLANNER",
            reason: "forged grant",
            eventId: people.eventAlphaOne,
            clientId: people.clientAlpha,
          }),
        (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
      );
    }
    const denied = store.snapshot().audit.filter((item) => item.action === "assignment.granted" && item.outcome === "DENIED");
    assert.ok(denied.length >= 4);
    assert.ok(denied.every((item) => item.resourceId === undefined));
    assert.ok(!JSON.stringify(denied).includes(people.personUnassigned));
  });

  it("lets a canonically authorised CEO grant and keeps Event Director on assignment.manage", () => {
    const { service } = fixtureService();
    const admin = service.getAccessAdministration(ceo(), people.orgMaison);
    assert.ok(admin.people.some((item) => item.id === people.personPlanner));
    assert.ok(admin.events.some((item) => item.id === people.eventAlphaOne));
    const granted = service.grantAssignment(ceo(), {
      organisationId: people.orgMaison,
      personId: people.personUnassigned,
      roleKey: "PLANNER",
      reason: "authorised CEO grant",
      eventId: people.eventAlphaOne,
      clientId: people.clientAlpha,
    });
    assert.equal(granted.status, "ACTIVE");
    assert.equal(granted.personId, people.personUnassigned);
    const directorAdmin = service.getAccessAdministration(director(), people.orgMaison);
    assert.ok(directorAdmin.assignments.some((item) => item.id === granted.id));
  });

  it("does not give System Administrator business authority from assignment.manage alone", () => {
    const { service } = fixtureService();
    const admin = service.getAccessAdministration(actor(people.personAdmin), people.orgMaison);
    assert.ok(admin.people.length > 0);
    assert.throws(
      () => service.listGuests(actor(people.personAdmin), ALPHA),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "ACCESS_PENDING"),
    );
  });
});
