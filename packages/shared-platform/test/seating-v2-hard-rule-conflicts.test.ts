import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  annotateHardRuleConflicts,
  findHardRuleConflicts,
  HARD_RULE_CONTRADICTION_PAIRS,
  PlatformError,
} from "../src/index.js";
import type { SeatingV2RuleEdition, SeatingV2RuleSubject } from "../src/seating-v2-state.js";
import { applyS06SeatingLayoutIfMissing, ensureS06SeatingLayoutBinding } from "../src/seating-fixtures.js";
import type { SeatingV2RuleContent } from "../src/seating-v2-schemas.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-15T08:00:00.000Z";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "hard-conflict-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "hard-conflict-director" });
}
function envelope(assignmentId: string, key: string) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: assignmentId,
    idempotencyKey: key,
  };
}
function cas(assignmentId: string, key: string, row: { contentHash: string; editionNo?: number }) {
  return { ...envelope(assignmentId, key), expectedVersion: row.editionNo ?? 1, expectedContentHash: row.contentHash };
}

function keepTogether(guestA: string, guestB: string): SeatingV2RuleContent {
  return {
    kind: "KEEP_TOGETHER",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects: [
      { type: "EVENT_GUEST", id: guestA },
      { type: "EVENT_GUEST", id: guestB },
    ],
    targets: [],
    source: { type: "MANUAL" },
  };
}

function keepApart(guestA: string, guestB: string): SeatingV2RuleContent {
  return {
    kind: "KEEP_APART",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects: [
      { type: "EVENT_GUEST", id: guestA },
      { type: "EVENT_GUEST", id: guestB },
    ],
    targets: [],
    source: { type: "MANUAL" },
  };
}

async function prepareSurface(service: ReturnType<typeof fixtureService>["service"], store: ReturnType<typeof fixtureService>["store"]) {
  applyS06SeatingLayoutIfMissing(store, service);
  await ensureS06SeatingLayoutBinding(store, service);
  service.prepareEventRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: "Alpha One",
    reason: "prepare RSVP for hard-rule conflict tests",
    idempotencyKey: "hc-prepare-rsvp-01",
  });
}

function attendingGuest(service: ReturnType<typeof fixtureService>["service"], givenName: string, key: string) {
  const guest = service.intakeGuest(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName,
    familyName: "Conflict",
    email: `${givenName.toLowerCase()}.conflict@example.test`,
    reason: "hard-rule conflict guest",
    idempotencyKey: `${key}-intake`,
  });
  service.staffEnterRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    guestId: guest.id,
    attendanceIntent: "ATTENDING",
    answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
    reason: "mark attending",
    idempotencyKey: `${key}-rsvp`,
  });
  return guest;
}

describe("EOS-S06 HARD rule contradiction matrix", () => {
  it("documents KEEP_TOGETHER ↔ KEEP_APART as a contradiction pair", () => {
    assert.ok(HARD_RULE_CONTRADICTION_PAIRS.some(([a, b]) => a === "KEEP_TOGETHER" && b === "KEEP_APART"));
  });

  it("detects contradiction regardless of guest order", () => {
    const active: Pick<SeatingV2RuleEdition, "id" | "kind" | "hardness" | "scope" | "lifecycle"> = {
      id: "active-1",
      kind: "KEEP_TOGETHER",
      hardness: "HARD",
      scope: "TABLE",
      lifecycle: "ACTIVE",
    };
    const draft = {
      id: "draft-1",
      kind: "KEEP_APART",
      hardness: "HARD" as const,
      scope: "TABLE",
      lifecycle: "DRAFT" as const,
    };
    const subjects: SeatingV2RuleSubject[] = [
      {
        id: "s1",
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        schemaVersion: 1,
        ruleEditionId: "active-1",
        subjectType: "EVENT_GUEST",
        subjectId: "guest-a",
        createdAt: NOW,
      },
      {
        id: "s2",
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        schemaVersion: 1,
        ruleEditionId: "active-1",
        subjectType: "EVENT_GUEST",
        subjectId: "guest-b",
        createdAt: NOW,
      },
      {
        id: "s3",
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        schemaVersion: 1,
        ruleEditionId: "draft-1",
        subjectType: "EVENT_GUEST",
        subjectId: "guest-b",
        createdAt: NOW,
      },
      {
        id: "s4",
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        schemaVersion: 1,
        ruleEditionId: "draft-1",
        subjectType: "EVENT_GUEST",
        subjectId: "guest-a",
        createdAt: NOW,
      },
    ];
    const hits = findHardRuleConflicts({
      draft,
      draftSubjectIds: ["guest-b", "guest-a"],
      activeEditions: [active],
      subjects,
    });
    assert.equal(hits.length, 1);
    assert.equal(hits[0]!.conflictingEditionId, "active-1");
    const annotated = annotateHardRuleConflicts({ editions: [active as SeatingV2RuleEdition, draft as SeatingV2RuleEdition], subjects });
    assert.equal(annotated.length, 1);
    assert.equal(annotated[0]!.edition.id, "draft-1");
  });

  it("allows draft save while ACTIVE KEEP_TOGETHER exists, blocks activation, allows after withdraw", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Adaeze", "hc-a");
    const guestB = attendingGuest(service, "Bola", "hc-b");
    const guestC = attendingGuest(service, "Chidi", "hc-c");
    const v2 = service.seatingV2Commands();

    const together = await v2.createRule(planner(), envelope(people.assignPlanner, "hc-together-create"), keepTogether(guestA.id, guestB.id));
    const activatedTogether = await v2.activateRule(
      director(),
      cas(people.assignDirector, "hc-together-activate", together.value),
      { editionId: together.value.id },
    );
    assert.equal(activatedTogether.application, "APPLIED");
    assert.equal(activatedTogether.value.lifecycle, "ACTIVE");

    const apartDraft = await v2.createRule(
      planner(),
      envelope(people.assignPlanner, "hc-apart-create"),
      keepApart(guestB.id, guestA.id),
    );
    assert.equal(apartDraft.application, "APPLIED");
    assert.equal(apartDraft.value.lifecycle, "DRAFT");

    await assert.rejects(
      () =>
        v2.activateRule(director(), cas(people.assignDirector, "hc-apart-activate", apartDraft.value), {
          editionId: apartDraft.value.id,
        }),
      (error: unknown) => {
        assert.ok(error instanceof PlatformError);
        assert.equal(error.code, "SEATING_HARD_RULE_CONFLICT");
        assert.match(error.publicMessage, /Withdraw or supersede/i);
        return true;
      },
    );

    const stillDraft = await v2.repository.transaction(async (tx) =>
      tx.load("ruleEditions", apartDraft.value.id, {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    assert.equal((stillDraft as { lifecycle: string } | undefined)?.lifecycle, "DRAFT");

    const otherPair = await v2.createRule(
      planner(),
      envelope(people.assignPlanner, "hc-other-create"),
      keepApart(guestA.id, guestC.id),
    );
    const otherActivated = await v2.activateRule(
      director(),
      cas(people.assignDirector, "hc-other-activate", otherPair.value),
      { editionId: otherPair.value.id },
    );
    assert.equal(otherActivated.application, "APPLIED");

    await v2.withdrawRule(planner(), cas(people.assignPlanner, "hc-together-withdraw", activatedTogether.value), {
      editionId: activatedTogether.value.id,
      reason: "VERIFICATION_CONFLICT_RECONCILIATION_AFTER_HARD_RULE_GUARD",
    });

    const apartActivated = await v2.activateRule(
      director(),
      cas(people.assignDirector, "hc-apart-activate-2", apartDraft.value),
      { editionId: apartDraft.value.id },
    );
    assert.equal(apartActivated.application, "APPLIED");
    assert.equal(apartActivated.value.lifecycle, "ACTIVE");
  });

  it("refuses contradictory activation after the other HARD rule is already ACTIVE", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Ngozi", "hc2-a");
    const guestB = attendingGuest(service, "Tunde", "hc2-b");
    const v2 = service.seatingV2Commands();

    const together = await v2.createRule(planner(), envelope(people.assignPlanner, "hc2-together-create"), keepTogether(guestA.id, guestB.id));
    const apart = await v2.createRule(planner(), envelope(people.assignPlanner, "hc2-apart-create-x"), keepApart(guestA.id, guestB.id));

    const first = await v2.activateRule(director(), cas(people.assignDirector, "hc2-act-together-x", together.value), {
      editionId: together.value.id,
    });
    assert.equal(first.application, "APPLIED");

    await assert.rejects(
      () =>
        v2.activateRule(director(), cas(people.assignDirector, "hc2-act-apart-xxxx", apart.value), {
          editionId: apart.value.id,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "SEATING_HARD_RULE_CONFLICT",
    );

    const actives = await v2.repository.transaction(async (tx) => {
      const rows = await tx.list<{ lifecycle: string; id: string }>("ruleEditions", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      });
      return rows.filter((item) => item.lifecycle === "ACTIVE" && (item.id === together.value.id || item.id === apart.value.id));
    });
    assert.equal(actives.length, 1);
    assert.equal(actives[0]!.id, together.value.id);
  });
});
