import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const panel = readFileSync(resolve(root, "apps/event-os/src/components/cpsat-run-status-panel.tsx"), "utf8");
const page = readFileSync(resolve(root, "apps/event-os/src/app/app/events/[eventId]/seating/page.tsx"), "utf8");
const poller = readFileSync(resolve(root, "apps/event-os/src/components/cpsat-run-lifecycle-poller.tsx"), "utf8");
const uiModel = readFileSync(resolve(root, "packages/shared-platform/src/cpsat/ui-model.ts"), "utf8");
const flag = readFileSync(resolve(root, "packages/shared-platform/src/seating-v2-flag.ts"), "utf8");

describe("CPSAT Milestone 1 operator lifecycle UI", () => {
  it("covers no-run, launching, queued and cancellation-request wording", () => {
    assert.match(uiModel, /Generate seating plan/);
    assert.match(uiModel, /Preparing the governed seating request/);
    assert.match(uiModel, /Seating run queued/);
    assert.match(uiModel, /Cancellation requested/);
    assert.match(panel, /cpsat-run-primary-message/);
    assert.match(panel, /aria-live=\{assertiveFailure \? "assertive" : "polite"\}/);
  });

  it("keeps lifecycle/result/freshness/evidence separate and forbids percent bars", () => {
    assert.match(panel, /cpsat-run-lifecycle/);
    assert.match(panel, /cpsat-run-result-status/);
    assert.match(panel, /cpsat-run-freshness/);
    assert.match(panel, /cpsat-run-evidence/);
    assert.doesNotMatch(panel, /% complete|percentage-complete/i);
    assert.ok(!panel.includes("progress bar"));
    assert.match(uiModel, /showPercentComplete: false/);
  });

  it("uses persisted poller refresh and pointer cursor on interactive controls", () => {
    assert.match(poller, /router\.refresh/);
    assert.match(poller, /5_000|intervalMs/);
    assert.match(poller, /seating-run-poller/);
    assert.match(panel, /cursor: pointer/);
    assert.match(page, /CpsatRunLifecyclePoller/);
    assert.match(page, /Generate seating plan/);
  });

  it("has no operator engine selector and restores from durable run identity", () => {
    assert.doesNotMatch(page, /engine selector|SEATING_ENGINE|choose engine/i);
    assert.match(page, /data-run-id=\{run\.id\}/);
    assert.match(page, /Cancel run/);
    assert.match(panel, /cpsat-cancel-run|Cancel run/);
  });

  it("documents temporary SOLVER_QUEUE_ENABLED seam for removal later", () => {
    assert.match(flag, /SOLVER_QUEUE_ENABLED/);
    assert.match(flag, /authority-removal milestone/);
    assert.doesNotMatch(page, /name=\"SOLVER_QUEUE_ENABLED\"/);
  });

  it("launch seam and cancel require server-side seating.run.execute; queue path skips in-process solve", () => {
    const command = readFileSync(resolve(root, "packages/shared-platform/src/seating-v2-command-service.ts"), "utf8");
    const actions = readFileSync(resolve(root, "apps/event-os/src/server/seating-actions.ts"), "utf8");
    assert.match(command, /isSolverQueueEnabled\(\)/);
    assert.match(command, /enqueueCpsatSeatingRun/);
    assert.match(command, /freezeCpsatSeatingAuthority/);
    assert.match(command, /solveSeatingV2Compiled/);
    assert.match(command, /seating\.run\.execute/);
    assert.match(actions, /requestCpsatCancellation/);
    assert.match(actions, /isSolverQueueEnabled\(\)/);
    // Queue branch appears before the in-process solve call.
    assert.ok(command.indexOf("enqueueCpsatSeatingRun") < command.indexOf("solved = await solveSeatingV2Compiled"));
  });
});
