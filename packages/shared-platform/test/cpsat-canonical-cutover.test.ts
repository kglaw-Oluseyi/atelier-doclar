import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  applyCanonicalCpsatAuthorityToWorkspace,
  type CanonicalCpsatAuthoritySnapshot,
} from "../src/cpsat/canonical-workspace.js";
import type { SeatingWorkspaceView } from "../src/seating-workspace.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function emptyWorkspace(): SeatingWorkspaceView {
  return {
    eventId: "evt-1",
    organisationId: "org-1",
    eventName: "Synthetic",
    inputFreshness: "CURRENT",
    blockers: [],
    counts: { eligibleGuests: 4, seated: 0, unseated: 4, hardBlockers: 0 },
    guests: [
      { id: "g1", label: "A", eligible: true, eligibilityCode: "OK", seated: false },
      { id: "g2", label: "B", eligible: true, eligibilityCode: "OK", seated: false },
      { id: "g3", label: "C", eligible: true, eligibilityCode: "OK", seated: false },
      { id: "g4", label: "D", eligible: true, eligibilityCode: "OK", seated: false },
    ],
    tables: [{ id: "t1", label: "Table 1", capacity: 4, seated: 0 }],
    constraints: [],
    runs: [],
    decisions: [],
    reviews: [],
    approvals: [],
    publications: [
      {
        id: "legacy-pub",
        status: "CURRENT",
        publicationNumber: 99,
        editionHash: "legacy-hash",
        publishedAt: "2020-01-01T00:00:00.000Z",
      },
    ],
    attention: [],
    nextAction: "Publish the approved seating plan.",
    implicatedReviewDomains: [],
    reviewRequirementCopy: "",
    currentPublication: {
      id: "legacy-pub",
      publicationNumber: 99,
      editionHash: "legacy-hash",
      status: "CURRENT",
    },
  } as SeatingWorkspaceView;
}

describe("M6C canonical CP-SAT cutover", () => {
  it("does not allow production launch path to select heuristic engine", () => {
    const adapter = readSrc("src/seating-v2-solver-adapter.ts");
    assert.match(adapter, /SEATING_ENGINE=heuristic is retired/);
    const durable = readSrc("src/cpsat/durable-launch.ts");
    assert.match(durable, /SEATING_ENGINE are retired/);
    const command = readSrc("src/seating-v2-command-service.ts");
    assert.match(command, /enqueueCpsatSeatingRun/);
    assert.doesNotMatch(command, /solveSeatingV1\(/);
  });

  it("no longer dual-writes CP-SAT launches into seating_v2_runs", () => {
    const command = readSrc("src/seating-v2-command-service.ts");
    assert.match(command, /no seating_v2_runs mirror/);
    assert.doesNotMatch(command, /await tx\.insert\("runs", run\);/);
  });

  it("retires seating_v2 lifecycle projection writes", () => {
    const lifecycle = readSrc("src/cpsat/worker-lifecycle.ts");
    assert.match(lifecycle, /dual-write into seating_v2_runs is retired/);
    assert.doesNotMatch(lifecycle, /UPDATE seating_v2_runs/);
  });

  it("registers migration 017 without dropping historical tables", () => {
    const schema = readSrc("src/cpsat/postgres-schema.ts");
    assert.match(schema, /017_cpsat_canonical_seating_cutover/);
    assert.match(schema, /cpsat_cutover_repair_receipts/);
    assert.doesNotMatch(schema, /DROP TABLE seating_v2/);
    const migrations = readSrc("src/migrations.ts");
    assert.match(migrations, /EOS_S06_CPSAT_CANONICAL_SEATING_CUTOVER_MIGRATION_ID/);
  });

  it("applies CP-SAT adoption as sole operational publication", () => {
    const base = emptyWorkspace();
    const authority: CanonicalCpsatAuthoritySnapshot = {
      currentAdoption: {
        id: "3b771ad9-c4c9-401b-87df-0371f9eee840",
        publicationNumber: 1,
        editionHash: "assign-hash",
        status: "CURRENT",
        source: "CPSAT",
        runId: "9ba506b1-dadc-478b-a857-051180307526",
        adoptionId: "3b771ad9-c4c9-401b-87df-0371f9eee840",
        productResult: "OPTIMAL",
        evidenceGrade: "OPTIMAL_PROOF",
        adoptedAt: "2026-09-17T00:00:00.000Z",
        seatedCount: 4,
        unseatedCount: 0,
        eligibleCount: 4,
      },
      runs: [
        {
          runId: "9ba506b1-dadc-478b-a857-051180307526",
          eventId: "evt-1",
          organisationId: "org-1",
          lifecycle: "ADOPTED",
          purpose: "PLANNING",
          mode: "REPLAY",
          seed: 1,
          resultStatus: "OPTIMAL",
          freshness: "FRESH",
          evidenceGrade: "OPTIMAL_PROOF",
          assignmentHash: "assign-hash",
          cancelRequested: false,
          createdAt: "2026-09-17T00:00:00.000Z",
          queuedAt: null,
          startedAt: null,
          sealedAt: "2026-09-17T00:00:00.000Z",
          progressPhase: null,
        } as never,
      ],
      workerReadyCount: 1,
      assignments: [
        { guestToken: "g1", positionToken: "p1", tableToken: "t1", state: "SEATED", reasonCode: null },
        { guestToken: "g2", positionToken: "p2", tableToken: "t1", state: "SEATED", reasonCode: null },
        { guestToken: "g3", positionToken: "p3", tableToken: "t1", state: "SEATED", reasonCode: null },
        { guestToken: "g4", positionToken: "p4", tableToken: "t1", state: "SEATED", reasonCode: null },
      ],
    };
    const view = applyCanonicalCpsatAuthorityToWorkspace(base, authority);
    assert.equal((view.currentPublication as { source?: string })?.source, "CPSAT");
    assert.equal((view.currentPublication as { adoptionId?: string })?.adoptionId, authority.currentAdoption!.adoptionId);
    assert.equal(view.counts.seated, 4);
    assert.equal(view.counts.unseated, 0);
    assert.equal(view.currentRunId, authority.currentAdoption!.runId);
    assert.ok(view.guests.every((g) => g.seated));
    const adopted = view.runs.find((r) => r.id === authority.currentAdoption!.runId);
    assert.equal(adopted?.current, true);
  });

  it("clears legacy publication when no CP-SAT adoption exists", () => {
    const base = emptyWorkspace();
    const view = applyCanonicalCpsatAuthorityToWorkspace(base, {
      currentAdoption: null,
      runs: [],
      workerReadyCount: 0,
      assignments: [],
    });
    assert.equal(view.currentPublication, undefined);
  });

  it("does not mark approved-but-unadopted runs as current", () => {
    const base = emptyWorkspace();
    const view = applyCanonicalCpsatAuthorityToWorkspace(base, {
      currentAdoption: null,
      runs: [
        {
          runId: "approved-only",
          eventId: "evt-1",
          organisationId: "org-1",
          lifecycle: "APPROVED",
          purpose: "PLANNING",
          mode: "REPLAY",
          seed: 1,
          resultStatus: "OPTIMAL",
          freshness: "FRESH",
          evidenceGrade: "OPTIMAL_PROOF",
          assignmentHash: "h",
          cancelRequested: false,
          createdAt: "2026-09-17T00:00:00.000Z",
          queuedAt: null,
          startedAt: null,
          sealedAt: null,
          progressPhase: null,
        } as never,
      ],
      workerReadyCount: 1,
      assignments: [],
    });
    assert.equal(view.currentPublication, undefined);
    assert.equal(view.runs.find((r) => r.id === "approved-only")?.current, false);
  });

  it("guards Event OS product paths away from legacy publication fallback", () => {
    const page = readFileSync(
      join(root, "../../apps/event-os/src/app/app/events/[eventId]/seating/page.tsx"),
      "utf8",
    );
    assert.doesNotMatch(page, /projectCurrentPublication/);
    assert.doesNotMatch(page, /LEGACY_S06_PUBLICATION_LABEL/);
    assert.match(page, /publicationSource: "CPSAT" \| "NONE"/);
    const actions = readFileSync(join(root, "../../apps/event-os/src/server/seating-actions.ts"), "utf8");
    assert.match(actions, /Legacy seating adopt is retired/);
    assert.match(actions, /Legacy seating publish is retired/);
    const protection = readFileSync(join(root, "../../apps/event-os/src/server/protection-form-action.ts"), "utf8");
    assert.match(protection, /Seating evaluation completed/);
  });
});
