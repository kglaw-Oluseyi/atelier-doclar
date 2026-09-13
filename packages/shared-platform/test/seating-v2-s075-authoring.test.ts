import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { applyS06SeatingLayoutIfMissing } from "../src/seating-fixtures.js";
import { snapshotLayoutAdapter } from "../src/seating-adapters.js";
import { assertSeatingV2RuleAuthoring, seatingV2RuleSemanticSentence } from "../src/seating-v2-authoring.js";
import { compileSeatingV2Request } from "../src/seating-v2-compiler.js";
import { seatingV2RuleContentHash, seatingV2TableToken } from "../src/seating-v2-hash.js";
import type { SeatingV2RuleContent } from "../src/seating-v2-schemas.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-13T11:00:00.000Z";
const GUEST_A = "00000000-0000-4000-8000-0000000000a1";
const GUEST_B = "00000000-0000-4000-8000-0000000000b2";
const TABLE = "00000000-0000-4000-8000-00000000aaaa";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "s075-auth-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "s075-auth-director" });
}
function envelope(key: string) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: people.assignPlanner,
    idempotencyKey: key,
  };
}

function keepApart(extra?: Partial<SeatingV2RuleContent>): SeatingV2RuleContent {
  return {
    kind: "KEEP_APART",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects: [
      { type: "EVENT_GUEST", id: GUEST_A },
      { type: "EVENT_GUEST", id: GUEST_B },
    ],
    targets: [],
    source: { type: "MANUAL" },
    ...extra,
  };
}

describe("S075 rule authoring cardinality", () => {
  it("rejects a new pairwise command that carries an inert table target", () => {
    assert.throws(
      () =>
        assertSeatingV2RuleAuthoring({
          ...keepApart(),
          targets: [{ type: "TABLE", idOrCode: TABLE }],
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("accepts historic-style two-subject REQUIRE_TABLE and one-subject REQUIRE_TABLE", () => {
    assert.doesNotThrow(() =>
      assertSeatingV2RuleAuthoring(
        {
          ...keepApart(),
          kind: "REQUIRE_TABLE",
          subjects: [{ type: "EVENT_GUEST", id: GUEST_A }],
          targets: [{ type: "TABLE", idOrCode: TABLE }],
        },
        new Set([TABLE]),
      ),
    );
    assert.doesNotThrow(() =>
      assertSeatingV2RuleAuthoring(
        {
          ...keepApart(),
          kind: "REQUIRE_TABLE",
          targets: [{ type: "TABLE", idOrCode: TABLE }],
        },
        new Set([TABLE]),
      ),
    );
  });

  it("compiles historic pairwise editions with an inert stored table target as pairwise-only", () => {
    const historic = keepApart({ targets: [{ type: "TABLE", idOrCode: TABLE }] });
    const compiled = compileSeatingV2Request({
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      semanticHash: "s".repeat(32),
      pepper: "pepper",
      configHash: "c".repeat(32),
      seed: "seed",
      guests: [
        { eventGuestId: GUEST_A, eligible: true },
        { eventGuestId: GUEST_B, eligible: true },
      ],
      positions: [
        { positionToken: "pos-1", tableToken: seatingV2TableToken(TABLE) },
        { positionToken: "pos-2", tableToken: seatingV2TableToken("00000000-0000-4000-8000-00000000bbbb") },
      ],
      rules: [
        {
          editionId: "00000000-0000-4000-8000-0000000000d4",
          contentHash: seatingV2RuleContentHash(historic),
          lifecycle: "ACTIVE",
          content: historic,
        },
      ],
      reservations: [],
    });
    assert.deepEqual(compiled.request.rules[0]!.tableTokens, []);
    assert.equal(compiled.request.rules[0]!.kind, "KEEP_APART");
  });

  it("createRule rejects pairwise+table and accepts REQUIRE_TABLE on a published table", async () => {
    const { service, store } = fixtureService();
    applyS06SeatingLayoutIfMissing(store, service);
    service.prepareEventRsvp(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      hostDisplayName: "Maison Doclar",
      eventDisplayName: "Alpha One",
      reason: "S075 authoring RSVP",
      idempotencyKey: "s075-auth-rsvp",
    });
    const guestA = service.intakeGuest(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName: "Ada",
      familyName: "Auth",
      email: "ada.auth@example.test",
      reason: "S075",
      idempotencyKey: "s075-auth-a-in",
    });
    const guestB = service.intakeGuest(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName: "Bisi",
      familyName: "Auth",
      email: "bisi.auth@example.test",
      reason: "S075",
      idempotencyKey: "s075-auth-b-in",
    });
    for (const guest of [guestA, guestB]) {
      service.staffEnterRsvp(director(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        guestId: guest.id,
        attendanceIntent: "ATTENDING",
        answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
        reason: "S075",
        idempotencyKey: `s075-auth-${guest.id.slice(-4)}-rsvp`,
      });
    }
    const tableId = snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne).tables[0]!.objectId;
    const v2 = service.seatingV2Commands();
    await assert.rejects(
      () =>
        v2.createRule(planner(), envelope("s075-auth-pair-table"), {
          kind: "KEEP_APART",
          hardness: "HARD",
          weight: null,
          scope: "TABLE",
          specialistDomain: "NONE",
          subjects: [
            { type: "EVENT_GUEST", id: guestA.id },
            { type: "EVENT_GUEST", id: guestB.id },
          ],
          targets: [{ type: "TABLE", idOrCode: tableId }],
          source: { type: "MANUAL" },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    const created = await v2.createRule(planner(), envelope("s075-auth-require"), {
      kind: "REQUIRE_TABLE",
      hardness: "HARD",
      weight: null,
      scope: "TABLE",
      specialistDomain: "NONE",
      subjects: [{ type: "EVENT_GUEST", id: guestA.id }],
      targets: [{ type: "TABLE", idOrCode: tableId }],
      source: { type: "MANUAL" },
    });
    assert.equal(created.application, "APPLIED");
    const workspace = await v2.projectWorkspace(planner(), people.eventAlphaOne);
    assert.match(workspace.constraints[0]!.preview, /must be seated at/i);
    assert.match(workspace.constraints[0]!.preview, /REQUIRE TABLE/);
  });

  it("writes the documented semantic sentences", () => {
    assert.equal(
      seatingV2RuleSemanticSentence({ kind: "REQUIRE_TABLE", subjectLabels: ["Bola"], tableLabels: ["Table 1"] }),
      "Bola must be seated at Table 1",
    );
    assert.equal(
      seatingV2RuleSemanticSentence({
        kind: "REQUIRE_TABLE",
        subjectLabels: ["Bola", "Damilola"],
        tableLabels: ["Table 1"],
      }),
      "Each selected guest must be seated at Table 1",
    );
    assert.equal(
      seatingV2RuleSemanticSentence({
        kind: "KEEP_APART",
        subjectLabels: ["Bola", "Damilola"],
        tableLabels: [],
      }),
      "Bola and Damilola must be seated at different tables",
    );
  });
});
