import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEventContextProjection } from "../src/atelier-command/context.js";
import { buildIntelligenceResult } from "../src/atelier-command/intelligence.js";
import { resolveDomainIntelligence } from "../src/atelier-command/domain-resolvers.js";
import { resolveAtelierRuntimePosture } from "../src/atelier-command/runtime.js";
import { FIXTURE_IDS } from "../src/fixtures.js";
import type { SeatingWorkspaceView } from "../src/seating-workspace.js";
import { fixtureService } from "./helpers.js";

const ORG = FIXTURE_IDS.orgMaison;
const EVENT = FIXTURE_IDS.eventAlphaOne;

function seatingFixture(overrides: Partial<SeatingWorkspaceView> = {}): SeatingWorkspaceView {
  return {
    eventId: EVENT,
    organisationId: ORG,
    eventName: "Alpha One",
    inputFreshness: "CURRENT",
    guests: [],
    tables: [
      { id: "t1", label: "Table 1", capacity: 10, seated: 0 },
      { id: "t2", label: "Table 2", capacity: 10, seated: 0 },
    ],
    constraints: [],
    implicatedReviewDomains: [],
    reviewRequirementCopy: "",
    reservations: [],
    runs: [{ id: "run-1", status: "FEASIBLE", seed: "s", stale: false, current: true, validatorVerdict: "FEASIBLE" }],
    reviews: [],
    approvals: [],
    publications: [],
    exports: [],
    decisions: [],
    workingAssignments: [],
    positions: [],
    capacityLedger: { total: 20, reservedMin: 0, reservedMax: 0, generallyAvailable: 20, overbooked: false },
    attention: [],
    nextAction: "Publish",
    counts: { eligibleGuests: 12, seated: 0, unseated: 12, hardBlockers: 0 },
    seatingLayoutBinding: { status: "BOUND", physicalCapacity: 20, declaredCapacity: 20, tableCount: 2 },
    currentPublication: { id: "pub-1", publicationNumber: 1, editionHash: "abc", status: "CURRENT" },
    workingEdition: { id: "ed-1", contentHash: "def", status: "WORKING", version: 1, stale: false },
    inputEdition: { id: "pkg-1", contentHash: "ghi", layoutContentHash: "jkl" },
    ...overrides,
  } as SeatingWorkspaceView;
}

describe("EOS-S06A remediation-2 domain resolvers", () => {
  it("reports seating facts from the canonical fixture and does not invent blockers when feasible", () => {
    const { store } = fixtureService();
    const snap = store.snapshot();
    const context = buildEventContextProjection({
      snap,
      organisationId: ORG,
      eventId: EVENT,
      eventName: "Alpha One",
      now: "2026-09-15T20:00:00.000Z",
    });
    const result = resolveDomainIntelligence({
      toolName: "seating.explainAuthority",
      instruction: "Diagnose seating readiness",
      organisationId: ORG,
      eventId: EVENT,
      context,
      posture: resolveAtelierRuntimePosture(),
      snap,
      evidence: { seating: seatingFixture() },
    });
    assert.equal(result.domain, "seating");
    assert.match(result.answer, /Eligible\/attending guest cohort: 12/);
    assert.match(result.answer, /total seating capacity: 20/);
    assert.match(result.answer, /Layout binding status: BOUND/);
    assert.match(result.answer, /FEASIBLE/);
    assert.doesNotMatch(result.answer, /Readiness status for/);
    assert.ok(!result.risksOrBlockers.some((item) => /VIP/i.test(item)));
  });

  it("reports precise missing prerequisites when seating workspace is absent", () => {
    const { store } = fixtureService();
    const snap = store.snapshot();
    const context = buildEventContextProjection({
      snap,
      organisationId: ORG,
      eventId: EVENT,
      eventName: "Alpha One",
      now: "2026-09-15T20:00:00.000Z",
    });
    const result = resolveDomainIntelligence({
      toolName: "seating.explainAuthority",
      instruction: "Diagnose seating readiness",
      organisationId: ORG,
      eventId: EVENT,
      context,
      posture: resolveAtelierRuntimePosture(),
      snap,
      evidence: { seating: null },
    });
    assert.equal(result.availability, "ABSENT");
    assert.match(result.answer, /Missing prerequisite/i);
    assert.match(result.answer, /layout binding/i);
  });

  it("reports truthful capacity-deficit blockers when canonical data establishes them", () => {
    const { store } = fixtureService();
    const snap = store.snapshot();
    const context = buildEventContextProjection({
      snap,
      organisationId: ORG,
      eventId: EVENT,
      eventName: "Alpha One",
      now: "2026-09-15T20:00:00.000Z",
    });
    const result = resolveDomainIntelligence({
      toolName: "seating.explainAuthority",
      instruction: "Diagnose seating capacity",
      organisationId: ORG,
      eventId: EVENT,
      context,
      posture: resolveAtelierRuntimePosture(),
      snap,
      evidence: {
        seating: seatingFixture({
          counts: { eligibleGuests: 40, seated: 0, unseated: 40, hardBlockers: 1 },
          capacityLedger: { total: 20, reservedMin: 0, reservedMax: 0, generallyAvailable: 20, overbooked: false },
          attention: [{ kind: "blocker", message: "Reserved minima exceed published capacity.", href: "#reservations" }],
          runs: [{ id: "run-2", status: "INFEASIBLE", seed: "s", stale: false, current: true, validatorVerdict: "INFEASIBLE" }],
        }),
      },
    });
    assert.match(result.answer, /Capacity deficit/i);
    assert.match(result.answer, /INFEASIBLE|Actionable blockers/i);
  });

  it("reports stale versus fresh runs correctly", () => {
    const { store } = fixtureService();
    const snap = store.snapshot();
    const context = buildEventContextProjection({
      snap,
      organisationId: ORG,
      eventId: EVENT,
      eventName: "Alpha One",
      now: "2026-09-15T20:00:00.000Z",
    });
    const stale = resolveDomainIntelligence({
      toolName: "seating.explainAuthority",
      instruction: "Diagnose seating",
      organisationId: ORG,
      eventId: EVENT,
      context,
      posture: resolveAtelierRuntimePosture(),
      snap,
      evidence: {
        seating: seatingFixture({
          inputFreshness: "STALE",
          workingEdition: { id: "ed-1", contentHash: "def", status: "WORKING", version: 1, stale: true },
          runs: [{ id: "run-3", status: "FEASIBLE", seed: "s", stale: true, current: true, validatorVerdict: "FEASIBLE" }],
        }),
      },
    });
    assert.match(stale.answer, /STALE/);
  });

  it("changes diagnosis when canonical seating state changes", () => {
    const { store } = fixtureService();
    const snap = store.snapshot();
    const context = buildEventContextProjection({
      snap,
      organisationId: ORG,
      eventId: EVENT,
      eventName: "Alpha One",
      now: "2026-09-15T20:00:00.000Z",
    });
    const bound = resolveDomainIntelligence({
      toolName: "seating.explainAuthority",
      instruction: "Diagnose seating",
      organisationId: ORG,
      eventId: EVENT,
      context,
      posture: resolveAtelierRuntimePosture(),
      snap,
      evidence: { seating: seatingFixture() },
    });
    const absent = resolveDomainIntelligence({
      toolName: "seating.explainAuthority",
      instruction: "Diagnose seating",
      organisationId: ORG,
      eventId: EVENT,
      context,
      posture: resolveAtelierRuntimePosture(),
      snap,
      evidence: {
        seating: seatingFixture({
          seatingLayoutBinding: { status: "ABSENT" },
          tables: [],
          capacityLedger: { total: 0, reservedMin: 0, reservedMax: 0, generallyAvailable: 0, overbooked: false },
          attention: [{ kind: "blocker", message: "Activate a seating layout binding before freezing seating inputs.", href: "#inputs" }],
        }),
      },
    });
    assert.notEqual(bound.answer, absent.answer);
    assert.match(absent.answer, /ABSENT|Activate a seating layout binding/i);
  });

  it("keeps businessDataChanged false while commandRecordSaved true", () => {
    const { store } = fixtureService();
    const snap = store.snapshot();
    const context = buildEventContextProjection({
      snap,
      organisationId: ORG,
      eventId: EVENT,
      eventName: "Alpha One",
      now: "2026-09-15T20:00:00.000Z",
    });
    const result = buildIntelligenceResult({
      toolName: "intelligence.answer",
      instruction: "Give me a current status summary for this event",
      organisationId: ORG,
      eventId: EVENT,
      context,
      posture: resolveAtelierRuntimePosture(),
      now: "2026-09-15T20:00:00.000Z",
      snap,
    });
    assert.equal(result.businessDataChanged, false);
    assert.equal(result.dataChanged, false);
    assert.equal(result.commandRecordSaved, true);
    assert.equal(result.domain, "readiness");
  });
});
