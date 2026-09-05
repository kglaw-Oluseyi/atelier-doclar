import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAllStatuses } from "@maison-doclar/programme-domain";
import { AUTHORISED_REPOSITORY } from "../src/constants.js";
import {
  SHA_A,
  SHA_B,
  SHA_C,
  commitEvidence,
  runEvidence,
  testHarness,
} from "./helpers.js";

describe("commit ingestion", () => {
  it("links a commit with complete CT metadata", () => {
    const { service, engine } = testHarness();
    const outcome = service.ingestCommit(
      commitEvidence({
        message: [
          "feat: complete metadata",
          "",
          "Slice-ID: MD-AA",
          "Product: FOUNDATION",
          "Native-ID: AA",
          "Prompt-Control-ID: MD-PR-0099",
          "Canonical-Refs: docs/control/CT3_IMPLEMENTATION.md",
          "Evidence-Refs: typecheck",
          "Open-Items: NONE",
        ].join("\n"),
      }),
    );
    assert.equal(outcome.ok, true);
    assert.equal(outcome.kind, "accepted");
    assert.equal(outcome.unlinked, false);
    assert.ok(outcome.eventsAppended >= 3);
    const facts = engine.projectionAt().slices["MD-AA"];
    assert.ok(facts?.commits.includes(SHA_A));
    assert.equal(calculateAllStatuses(engine.projectionAt()).get("MD-AA"), "IN_PROGRESS");
  });

  it("keeps a commit without Slice-ID visible as UNLINKED COMMIT", () => {
    const { service, engine } = testHarness();
    const outcome = service.ingestCommit(commitEvidence({ message: "chore: no trailers" }));
    assert.equal(outcome.ok, true);
    assert.equal(outcome.unlinked, true);
    assert.equal(outcome.message, "UNLINKED COMMIT");
    assert.equal(outcome.eventsAppended, 0);
    const unlinked = service.unlinkedCommits();
    assert.equal(unlinked.length, 1);
    assert.equal(unlinked[0]?.sha, SHA_A);
    assert.equal(engine.projectionAt().slices["MD-AA"]?.commits.length, 0);
    assert.equal(calculateAllStatuses(engine.projectionAt()).get("MD-AA"), "READY");
  });

  it("accepts a commit with partial metadata when the slice exists", () => {
    const { service, engine } = testHarness();
    const outcome = service.ingestCommit(commitEvidence({ message: "feat\n\nSlice-ID: MD-AA" }));
    assert.equal(outcome.ok, true);
    assert.equal(outcome.unlinked, false);
    assert.ok(engine.projectionAt().slices["MD-AA"]?.commits.includes(SHA_A));
  });

  it("quarantines an unknown slice without advancing programme status", () => {
    const { service, engine } = testHarness();
    const outcome = service.ingestCommit(commitEvidence({ message: "feat\n\nSlice-ID: ZZ-UNKNOWN" }));
    assert.equal(outcome.kind, "quarantined");
    assert.equal(outcome.code, "UNKNOWN_SLICE");
    assert.equal(outcome.unlinked, true);
    assert.equal(service.unlinkedCommits().length, 1);
    assert.equal(calculateAllStatuses(engine.projectionAt()).get("MD-AA"), "READY");
  });

  it("records a metadata conflict as a structured open item", () => {
    const { service, engine } = testHarness();
    const outcome = service.ingestCommit(
      commitEvidence({
        message: [
          "feat: conflict",
          "",
          "Slice-ID: MD-AA",
          "Product: EVENT_OS",
          "Prompt-Control-ID: MD-PR-0099",
        ].join("\n"),
      }),
    );
    assert.equal(outcome.code, "METADATA_CONFLICT");
    assert.equal(outcome.unlinked, true);
    const item = engine.projectionAt().openItems["OI-INGEST-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-CONFLICT"];
    assert.ok(item);
    assert.equal(item.status, "OPEN");
    assert.equal(item.blocker, false);
    assert.match(item.notes ?? "", /Product/);
    assert.equal(engine.projectionAt().slices["MD-AA"]?.commits.length, 0);
  });

  it("does not treat a CEO-authored commit as acceptance", () => {
    const { service, engine } = testHarness();
    service.ingestCommit(commitEvidence({ authorName: "CEO", authorLogin: "kglaw-Oluseyi" }));
    const facts = engine.projectionAt().slices["MD-AA"];
    assert.equal(facts?.acceptedAt, undefined);
    assert.equal(calculateAllStatuses(engine.projectionAt()).get("MD-AA"), "IN_PROGRESS");
    assert.equal(
      engine.projectionAt() &&
        Object.values(engine.projectionAt().slices).every((slice) => !slice.acceptedAt),
      true,
    );
  });
});

describe("CI ingestion", () => {
  it("records explicit CI success only when the commit is linked", () => {
    const { service, engine } = testHarness();
    service.ingestCommit(commitEvidence());
    const outcome = service.ingestWorkflowRun(runEvidence());
    assert.equal(outcome.ok, true);
    assert.equal(outcome.kind, "accepted");
    const check = engine.projectionAt().slices["MD-AA"]?.checks[0];
    assert.equal(check?.result, "PASS");
    assert.equal(check?.name, "programme-validate");
  });

  it("records CI failure as FAIL, not success", () => {
    const { service, engine } = testHarness();
    service.ingestCommit(commitEvidence());
    service.ingestWorkflowRun(runEvidence({ runId: "2002", conclusion: "failure" }));
    assert.equal(engine.projectionAt().slices["MD-AA"]?.checks[0]?.result, "FAIL");
  });

  it("does not treat queued or in-progress CI as success", () => {
    const { service, engine } = testHarness();
    service.ingestCommit(commitEvidence());
    const pending = service.ingestWorkflowRun(
      runEvidence({ runId: "3003", status: "in_progress", conclusion: null }),
    );
    assert.equal(pending.kind, "ignored");
    assert.equal(engine.projectionAt().slices["MD-AA"]?.checks.length, 0);
  });

  it("does not treat cancelled, skipped or neutral as success", () => {
    const { service, engine } = testHarness();
    service.ingestCommit(commitEvidence());
    for (const [runId, conclusion] of [
      ["4004", "cancelled"],
      ["4005", "skipped"],
      ["4006", "neutral"],
      ["4007", "action_required"],
    ] as const) {
      service.ingestWorkflowRun(runEvidence({ runId, conclusion }));
    }
    assert.equal(engine.projectionAt().slices["MD-AA"]?.checks.length, 0);
  });

  it("keeps CI for an unknown commit visible", () => {
    const { service } = testHarness();
    const outcome = service.ingestWorkflowRun(runEvidence({ sha: SHA_B }));
    assert.equal(outcome.code, "UNKNOWN_COMMIT");
    assert.equal(service.quarantine().some((item) => item.reason === "UNKNOWN_COMMIT"), true);
  });

  it("does not duplicate CI evidence for a repeated run", () => {
    const { service, engine, store } = testHarness();
    service.ingestCommit(commitEvidence());
    service.ingestWorkflowRun(runEvidence());
    const count = store.eventCount();
    const second = service.ingestWorkflowRun(runEvidence());
    assert.equal(second.kind, "duplicate");
    assert.equal(store.eventCount(), count);
    assert.equal(engine.projectionAt().slices["MD-AA"]?.checks.length, 1);
  });

  it("recovers out-of-order CI after the commit arrives", () => {
    const { service, engine } = testHarness();
    const first = service.ingestWorkflowRun(runEvidence({ sha: SHA_C, runId: "5555" }));
    assert.equal(first.code, "UNKNOWN_COMMIT");
    service.ingestCommit(commitEvidence({ sha: SHA_C }));
    const check = engine.projectionAt().slices["MD-AA"]?.checks.find((item) => item.id === "CHK-GH-5555");
    assert.equal(check?.result, "PASS");
  });

  it("quarantines an unrecognised workflow even when it succeeded", () => {
    const { service, engine } = testHarness();
    service.ingestCommit(commitEvidence());
    const outcome = service.ingestWorkflowRun(runEvidence({ name: "random-workflow", runId: "7777" }));
    assert.equal(outcome.code, "UNRECOGNISED_WORKFLOW");
    assert.equal(engine.projectionAt().slices["MD-AA"]?.checks.length, 0);
  });
});

describe("freshness", () => {
  it("starts unknown and is not treated as healthy", () => {
    const { service } = testHarness();
    assert.equal(service.freshness().state, "UNKNOWN");
    assert.equal(service.freshness().repository, AUTHORISED_REPOSITORY);
    assert.equal(service.freshness().lastSuccessfulIngestion, undefined);
  });

  it("records source metadata after a successful ingest", () => {
    const { service } = testHarness();
    service.ingestCommit(commitEvidence());
    const freshness = service.freshness();
    assert.equal(freshness.state, "FRESH");
    assert.equal(freshness.latestObservedCommit, SHA_A);
    assert.ok(freshness.lastSuccessfulIngestion);
    assert.ok(freshness.lastAttemptedIngestion);
  });
});
