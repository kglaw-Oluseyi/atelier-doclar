import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  annotateSemanticRuleDuplicates,
  planLegacyDuplicateReconciliation,
  selectAuthoritativeActiveRule,
  seatingV2RuleContentHash,
} from "../src/index.js";
import type { SeatingV2RuleEdition } from "../src/seating-v2-state.js";
import { MemorySeatingV2Repository } from "../src/memory-seating-v2-store.js";
import { actor, fixtureService, people } from "./helpers.js";
import { applyS06SeatingLayoutIfMissing, ensureS06SeatingLayoutBinding } from "../src/seating-fixtures.js";
import type { SeatingV2RuleContent } from "../src/seating-v2-schemas.js";

const NOW = "2026-09-12T19:00:00.000Z";
const HASH =
  "434a2ddc58fe7e7898fb577e94c9fc00382286040759124b9c6fa7b2e96a087b";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "dup2-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "dup2-director" });
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

function edition(partial: Partial<SeatingV2RuleEdition> & Pick<SeatingV2RuleEdition, "id" | "lifecycle" | "createdAt">): SeatingV2RuleEdition {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    schemaVersion: 1,
    ruleId: partial.id,
    editionNo: 1,
    contentHash: HASH,
    kind: "KEEP_APART",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    sourceType: "MANUAL",
    createdByPersonId: people.personPlanner,
    activatedByPersonId: partial.lifecycle === "ACTIVE" ? people.personDirector : null,
    activatedAt: partial.activatedAt ?? null,
    ...partial,
  } as SeatingV2RuleEdition;
}

describe("EOS-S06 remediation 2 duplicate identity", () => {
  it("selects earliest activated ACTIVE as authoritative survivor", () => {
    const survivor = selectAuthoritativeActiveRule([
      { id: "b", createdAt: "2026-09-12T19:00:00.000Z", activatedAt: "2026-09-12T19:20:00.000Z" },
      { id: "a", createdAt: "2026-09-12T19:10:00.000Z", activatedAt: "2026-09-12T19:16:00.000Z" },
      { id: "c", createdAt: "2026-09-12T18:00:00.000Z", activatedAt: "2026-09-12T19:30:00.000Z" },
    ]);
    assert.equal(survivor?.id, "a");
  });

  it("coerces Postgres Date stamps before authoritative selection", () => {
    const survivor = selectAuthoritativeActiveRule([
      {
        id: "later",
        createdAt: new Date("2026-09-12T19:00:00.000Z"),
        activatedAt: new Date("2026-09-12T19:20:00.000Z"),
      },
      {
        id: "earliest",
        createdAt: new Date("2026-09-12T19:10:00.000Z"),
        activatedAt: new Date("2026-09-12T19:16:00.000Z"),
      },
    ]);
    assert.equal(survivor?.id, "earliest");
    const annotated = annotateSemanticRuleDuplicates([
      edition({
        id: "later",
        lifecycle: "ACTIVE",
        createdAt: new Date("2026-09-12T19:00:00.000Z") as unknown as string,
        activatedAt: new Date("2026-09-12T19:20:00.000Z") as unknown as string,
      }),
      edition({
        id: "earliest",
        lifecycle: "ACTIVE",
        createdAt: new Date("2026-09-12T19:10:00.000Z") as unknown as string,
        activatedAt: new Date("2026-09-12T19:16:00.000Z") as unknown as string,
      }),
    ]);
    assert.equal(annotated.find((row) => row.edition.id === "earliest")?.role, "AUTHORITATIVE");
    assert.equal(annotated.find((row) => row.edition.id === "later")?.role, "REDUNDANT_HISTORICAL");
  });

  it("distinguishes full hash identity even when shortened prefixes match", () => {
    const left = seatingV2RuleContentHash(
      keepApart("00000000-0000-4000-8000-000000000072", "00000000-0000-4000-8000-000000000073"),
    );
    const right = seatingV2RuleContentHash(
      keepApart("00000000-0000-4000-8000-000000000072", "00000000-0000-4000-8000-000000000074"),
    );
    assert.equal(left.slice(0, 8), left.slice(0, 8));
    assert.notEqual(left, right);
  });

  it("annotates governing, redundant historical and already-active drafts", () => {
    const rows = [
      edition({ id: "auth", lifecycle: "ACTIVE", createdAt: "2026-09-12T19:00:00.000Z", activatedAt: "2026-09-12T19:01:00.000Z" }),
      edition({ id: "red", lifecycle: "ACTIVE", createdAt: "2026-09-12T19:02:00.000Z", activatedAt: "2026-09-12T19:03:00.000Z" }),
      edition({ id: "draft", lifecycle: "DRAFT", createdAt: "2026-09-12T19:04:00.000Z" }),
    ];
    const annotated = annotateSemanticRuleDuplicates(rows);
    assert.equal(annotated.find((item) => item.edition.id === "auth")?.role, "AUTHORITATIVE");
    assert.equal(annotated.find((item) => item.edition.id === "red")?.role, "REDUNDANT_HISTORICAL");
    assert.equal(annotated.find((item) => item.edition.id === "draft")?.role, "ALREADY_ACTIVE_DRAFT");
    assert.equal(annotated.find((item) => item.edition.id === "draft")?.authoritativeId, "auth");
  });

  it("plans reconciliation dry-run without mutating editions", () => {
    const rows = [
      edition({ id: "auth", lifecycle: "ACTIVE", createdAt: "2026-09-12T19:00:00.000Z", activatedAt: "2026-09-12T19:01:00.000Z" }),
      edition({ id: "red", lifecycle: "ACTIVE", createdAt: "2026-09-12T19:02:00.000Z", activatedAt: "2026-09-12T19:03:00.000Z" }),
      edition({ id: "draft", lifecycle: "DRAFT", createdAt: "2026-09-12T19:04:00.000Z" }),
    ];
    const plans = planLegacyDuplicateReconciliation(rows, HASH);
    assert.equal(plans.length, 1);
    assert.equal(plans[0]?.authoritativeId, "auth");
    assert.deepEqual(plans[0]?.withdrawActiveIds, ["red"]);
    assert.deepEqual(plans[0]?.withdrawDraftIds, ["draft"]);
    assert.equal(rows.filter((item) => item.lifecycle === "ACTIVE").length, 2);
  });

  it("executes reconciliation idempotently in memory repository", async () => {
    const { service, store } = fixtureService();
    applyS06SeatingLayoutIfMissing(store, service);
    await ensureS06SeatingLayoutBinding(store, service);
    const guestA = service.intakeGuest(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName: "Ava",
      familyName: "Dup",
      email: "ava.dup@example.test",
      reason: "dup2",
      idempotencyKey: "dup2-intake-a",
    });
    const guestB = service.intakeGuest(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName: "Ben",
      familyName: "Dup",
      email: "ben.dup@example.test",
      reason: "dup2",
      idempotencyKey: "dup2-intake-b",
    });
    service.prepareEventRsvp(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      hostDisplayName: "Maison",
      eventDisplayName: "Alpha One",
      reason: "dup2",
      idempotencyKey: "dup2-rsvp",
    });
    for (const guest of [guestA, guestB]) {
      service.staffEnterRsvp(director(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        guestId: guest.id,
        attendanceIntent: "ATTENDING",
        answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
        reason: "dup2",
        idempotencyKey: `dup2-rsvp-${guest.id}`,
      });
    }
    const v2 = service.seatingV2Commands();
    const first = await v2.createRule(planner(), envelope(people.assignPlanner, "dup2-create-01"), keepApart(guestA.id, guestB.id));
    const second = await v2.createRule(planner(), envelope(people.assignPlanner, "dup2-create-02"), keepApart(guestA.id, guestB.id));
    await v2.activateRule(director(), cas(people.assignDirector, "dup2-activate-01", first.value), { editionId: first.value.id });
    // Seed a historical second ACTIVE by direct store write (pre-guard residue simulation).
    assert.ok(v2.repository instanceof MemorySeatingV2Repository);
    await v2.repository.transaction(async (tx) => {
      await tx.updateLifecycle("ruleEditions", second.value.id, envelope(people.assignPlanner, "dup2-force-act"), {
        lifecycle: "ACTIVE",
        activatedByPersonId: people.personDirector,
        activatedAt: "2026-09-12T19:10:00.000Z",
      });
    });
    const dry = await v2.reconcileLegacyDuplicateRules(planner(), envelope(people.assignPlanner, "dup2-dry-run-01"), {
      dryRun: true,
      contentHash: first.value.contentHash,
    });
    assert.equal(dry.application, "NOT_APPLIED");
    assert.equal(dry.value.plans[0]?.authoritativeId, first.value.id);
    const executed = await v2.reconcileLegacyDuplicateRules(planner(), envelope(people.assignPlanner, "dup2-execute-01"), {
      dryRun: false,
      contentHash: first.value.contentHash,
    });
    assert.equal(executed.application, "APPLIED");
    assert.ok(executed.value.withdrawnIds.includes(second.value.id));
    const replay = await v2.reconcileLegacyDuplicateRules(planner(), envelope(people.assignPlanner, "dup2-execute-02"), {
      dryRun: false,
      contentHash: first.value.contentHash,
    });
    assert.equal(replay.value.withdrawnIds.length, 0);
    const editions = await v2.repository.transaction(async (tx) =>
      tx.list<{ id: string; lifecycle: string; contentHash: string }>("ruleEditions", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    assert.equal(editions.filter((item) => item.lifecycle === "ACTIVE" && item.contentHash === first.value.contentHash).length, 1);
  });
});
