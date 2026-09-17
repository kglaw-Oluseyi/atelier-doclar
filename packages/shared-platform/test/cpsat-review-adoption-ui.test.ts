/**
 * Milestone 3 — frontend / source component review contract (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const panel = readFileSync(resolve(root, "apps/event-os/src/components/cpsat-candidate-review-panel.tsx"), "utf8");
const statusPanel = readFileSync(resolve(root, "apps/event-os/src/components/cpsat-run-status-panel.tsx"), "utf8");
const page = readFileSync(resolve(root, "apps/event-os/src/app/app/events/[eventId]/seating/page.tsx"), "utf8");
const actions = readFileSync(resolve(root, "apps/event-os/src/server/seating-actions.ts"), "utf8");
const uiModel = readFileSync(resolve(root, "packages/shared-platform/src/cpsat/ui-model.ts"), "utf8");

describe("CPSAT Milestone 3 review UI source contract", () => {
  it("26-27 review header separates result, freshness and evidence", () => {
    assert.match(panel, /Seating plan ready for review/);
    assert.match(panel, /cpsat-review-result/);
    assert.match(panel, /cpsat-review-freshness/);
    assert.match(panel, /cpsat-review-evidence/);
    assert.match(panel, /cpsat-review-assignment-hash/);
    assert.match(panel, /cpsat-review-engine/);
  });

  it("28-30 placement reasons, search/filter and changed-only", () => {
    assert.match(panel, /cpsat-review-placement-table/);
    assert.match(panel, /reasonText/);
    assert.match(panel, /cpsat-review-search/);
    assert.match(panel, /cpsat-review-filter-table/);
    assert.match(panel, /cpsat-review-filter-movement/);
    assert.match(panel, /cpsat-review-filter-changed/);
    assert.match(panel, /Show changed placements only/);
    assert.match(panel, /cpsat-review-clear-filters/);
    assert.match(panel, /cpsat-review-result-count/);
  });

  it("31 mobile-safe table container", () => {
    assert.match(panel, /cpsat-scroll-table/);
    assert.match(panel, /overflow-x: auto/);
    assert.match(panel, /max-width: 390px|@media \(max-width: 390px\)/);
  });

  it("32-33 role-appropriate action visibility; auditor has no mutation controls", () => {
    assert.match(panel, /showMutationControls/);
    assert.match(panel, /cpsat-review-auditor-readonly/);
    assert.match(page, /cpsat-submit-for-approval/);
    assert.match(page, /permissions\.submit/);
    assert.match(page, /permissions\.approve/);
    assert.match(page, /permissions\.publish/);
  });

  it("34-38 approval pending, rejected, stale, adopted, superseded", () => {
    assert.match(panel, /awaiting approval|PENDING_APPROVAL/i);
    assert.match(panel, /Seating plan rejected/);
    assert.match(panel, /cpsat-review-stale-block/);
    assert.match(panel, /Seating plan adopted/);
    assert.match(panel, /cpsat-review-superseded/);
    assert.match(uiModel, /PENDING_APPROVAL/);
    assert.match(uiModel, /ADOPTED/);
  });

  it("39 no heuristic selector", () => {
    assert.doesNotMatch(page, /engine selector|SEATING_ENGINE|heuristic engine/i);
    assert.doesNotMatch(panel, /heuristic/i);
  });

  it("40 live regions and focus behaviour", () => {
    assert.match(panel, /aria-live="polite"/);
    assert.match(panel, /aria-live="assertive"/);
    assert.match(panel, /:focus-visible/);
    assert.match(panel, /cursor: pointer/);
  });

  it("wires server actions for submit/decide/adopt", () => {
    assert.match(actions, /submitCpsatCandidateAction/);
    assert.match(actions, /decideCpsatCandidateAction/);
    assert.match(actions, /adoptCpsatCandidateAction/);
    assert.match(actions, /seating\.plan\.submit/);
    assert.match(actions, /seating\.plan\.approve/);
    assert.match(actions, /seating\.plan\.publish/);
    assert.match(page, /CpsatCandidateReviewPanel/);
    assert.match(page, /#review/);
  });

  it("status panel still forbids percent bars", () => {
    assert.doesNotMatch(statusPanel, /% complete|percentage-complete/i);
  });
});
