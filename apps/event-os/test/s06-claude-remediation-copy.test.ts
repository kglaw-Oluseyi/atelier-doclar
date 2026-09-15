import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const seatingPage = readFileSync(
  fileURLToPath(new URL("../src/app/app/events/[eventId]/seating/page.tsx", import.meta.url)),
  "utf8",
);
const shell = readFileSync(fileURLToPath(new URL("../src/components/shell.tsx", import.meta.url)), "utf8");

describe("EOS-S06 Claude remediation surface copy", () => {
  it("DEF-01 run cards expose stable identity fields", () => {
    assert.match(seatingPage, /seating-run-identity/);
    assert.match(seatingPage, /seating-run-full-id/);
    assert.match(seatingPage, /seating-run-started/);
    assert.match(seatingPage, /seating-run-counts/);
    assert.match(seatingPage, /seating-run-current-stale/);
    assert.match(seatingPage, /Current.*Stale|selected\/current run/);
  });

  it("DEF-02 never equates seating publication with missing venue layout tables", () => {
    assert.doesNotMatch(seatingPage, /No current layout is published/);
    assert.match(seatingPage, /Current operational publication/);
    assert.match(seatingPage, /seating-publication-dual-truth/);
    assert.match(seatingPage, /remains operational until a successor is published|remains the operational seating until a successor is published/);
    assert.match(seatingPage, /WORKING|unpublished/);
  });

  it("DEF-03 tables empty state covers role-safe next action", () => {
    assert.match(seatingPage, /seating-tables-empty/);
    assert.match(seatingPage, /No table layout is configured/);
    assert.match(seatingPage, /Placements cannot be displayed/);
    assert.match(seatingPage, /Ask an authorised planner or director/);
  });

  it("DEF-04 nav is permission-gated for Access, Audit and Event Command", () => {
    assert.match(shell, /executiveCommand\.view/);
    assert.match(shell, /platform\.access\.administer/);
    assert.match(shell, /permission: "platform\.audit\.read_all"/);
    assert.equal(shell.includes('permission: "platform.audit.read_operational"'), false);
    assert.match(shell, /canOpenCommand/);
    assert.match(shell, /canOpenAccess/);
    assert.match(shell, /canOpenAudit/);
  });
});
