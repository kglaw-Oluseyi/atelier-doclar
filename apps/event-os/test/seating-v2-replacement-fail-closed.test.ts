import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const seatingActions = readFileSync(fileURLToPath(new URL("../src/server/seating-actions.ts", import.meta.url)), "utf8");
const seatingPage = readFileSync(fileURLToPath(new URL("../src/app/app/events/[eventId]/seating/page.tsx", import.meta.url)), "utf8");
const flagModule = readFileSync(
  fileURLToPath(new URL("../../../packages/shared-platform/src/seating-v2-flag.ts", import.meta.url)),
  "utf8",
);
const v1Command = readFileSync(
  fileURLToPath(new URL("../../../packages/shared-platform/src/seating-command-service.ts", import.meta.url)),
  "utf8",
);

describe("MD-PR-S075 V2 replacement fail-closed mutation surface", () => {
  it("flag defaults on; off means CAPABILITY_NOT_ENABLED without reactivating V1 writers", () => {
    assert.match(flagModule, /EVENT_OS_SEATING_V2_REPLACEMENT !== "0"/);
    assert.match(flagModule, /requireSeatingV2Writable/);
    assert.match(flagModule, /CAPABILITY_NOT_ENABLED/);
    assert.match(flagModule, /reading the legacy publication|historic V1|read access/i);
  });

  it("every Seating Server Action mutation requires V2 writable and never calls seatingCommands()", () => {
    assert.match(seatingActions, /requireSeatingV2Writable|requireV2Mutation/);
    assert.equal(/seatingCommands\(\)/.test(seatingActions), false);
    assert.equal(/freezeSeatingInputs\(/.test(seatingActions), false);
    assert.equal(/createSeatingConstraint\(/.test(seatingActions), false);
    assert.equal(/launchSeatingRun\(/.test(seatingActions), false);
    assert.equal(/adoptSeatingRun\(/.test(seatingActions), false);
    assert.equal(/applySeatingChange\(/.test(seatingActions), false);
    assert.equal(/submitSeatingPlan\(/.test(seatingActions), false);
    assert.equal(/publishSeatingPlan\(/.test(seatingActions), false);
    assert.equal(/cancelSeatingRun\(/.test(seatingActions), false);
    assert.match(seatingActions, /seatingV2Commands\(\)/);
    assert.equal(/if \(v2\(\)\)/.test(seatingActions), false);
    assert.equal(/else[\s\S]{0,80}seatingCommands/.test(seatingActions), false);
  });

  it("does not fall back from a V2 path to V1 writers; obsolete V1 freeze remains snapshot-based but unused by actions", () => {
    assert.match(v1Command, /async freezeSeatingInputs/);
    assert.match(v1Command, /this\.deps\.snapshot\(\)/);
    assert.equal(/seatingCommands\(\)\.freezeSeatingInputs/.test(seatingActions), false);
    assert.equal(/\.freezeSeatingInputs\(/.test(seatingActions), false);
    assert.equal(seatingActions.includes("deps.snapshot"), false);
  });

  it("page retains historic V1 publication read compatibility without mutation authority", () => {
    assert.match(seatingPage, /projectCurrentPublication/);
    assert.match(seatingPage, /LEGACY/);
    assert.match(seatingPage, /seatingV2ReplacementEnabled\(\)/);
    assert.match(seatingPage, /seatingCommands\(\)\.projectWorkspace/);
  });
});
