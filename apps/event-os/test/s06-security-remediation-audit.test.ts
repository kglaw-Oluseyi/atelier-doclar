import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { authorize } from "@maison-doclar/shared-platform";
import { actor, fixtureService, people } from "../../../packages/shared-platform/test/helpers.ts";

const auditPage = readFileSync(
  fileURLToPath(new URL("../src/app/app/admin/audit/page.tsx", import.meta.url)),
  "utf8",
);
const shell = readFileSync(fileURLToPath(new URL("../src/components/shell.tsx", import.meta.url)), "utf8");
const home = readFileSync(fileURLToPath(new URL("../src/app/app/page.tsx", import.meta.url)), "utf8");
const seatingPage = readFileSync(
  fileURLToPath(new URL("../src/app/app/events/[eventId]/seating/page.tsx", import.meta.url)),
  "utf8",
);

describe("Security remediation — Audit Executive Ledger gate", () => {
  it("Audit page and shell gate on platform.audit.read_all only", () => {
    assert.match(auditPage, /permission: "platform\.audit\.read_all"/);
    assert.equal((auditPage.match(/platform\.audit\.read_all/g) ?? []).length >= 1, true);
    assert.equal(auditPage.includes('permission: "platform.audit.read_operational"'), false);
    assert.match(shell, /permission: "platform\.audit\.read_all"/);
    assert.equal(shell.includes('permission: "platform.audit.read_operational"'), false);
    assert.equal(shell.includes('permission: "audit.view"'), false);
  });

  it("CEO and Auditor may authorise Executive Ledger; Director and Planner may not", () => {
    const { service } = fixtureService();
    const org = people.orgMaison;
    const cases = [
      [people.personCeo, true],
      [people.personAuditor, true],
      [people.personDirector, false],
      [people.personPlanner, false],
    ] as const;
    for (const [personId, expected] of cases) {
      const actorSnap = service.resolveActor(personId);
      const allowed = authorize({
        actor: actorSnap,
        permission: "platform.audit.read_all",
        scope: { organisationId: org },
      }).allow;
      assert.equal(allowed, expected, `person ${personId}`);
    }
  });

  it("Director operational audit must not be treated as Executive Ledger data on the page path", () => {
    const { service } = fixtureService();
    const director = actor(people.personDirector);
    const actorSnap = service.resolveActor(people.personDirector);
    const executive = authorize({
      actor: actorSnap,
      permission: "platform.audit.read_all",
      scope: { organisationId: people.orgMaison },
    });
    assert.equal(executive.allow, false);
    // Service still returns operational rows for assigned-event remit — the page must not call this.
    const operationalRows = service.searchAudit(director, people.orgMaison);
    assert.ok(Array.isArray(operationalRows));
    assert.match(auditPage, /canViewExecutiveLedger/);
    assert.match(auditPage, /AuditDenied/);
  });

  it("refused roles surface zero ledger rows contract in page source", () => {
    assert.match(auditPage, /cannot view the audit ledger/);
    assert.match(auditPage, /searchAudit/);
    // searchAudit only runs after canViewExecutiveLedger
    const gateIdx = auditPage.indexOf("canViewExecutiveLedger");
    const searchIdx = auditPage.indexOf("searchAudit");
    assert.ok(gateIdx >= 0 && searchIdx > gateIdx);
  });
});

describe("Security remediation — Executive Event Command home visibility", () => {
  it("Home card uses executiveCommand.view", () => {
    assert.match(home, /executiveCommand\.view/);
    assert.match(home, /home-executive-command/);
    assert.match(home, /canOpenCommand/);
  });
});

describe("Security remediation — seating export replay hydration", () => {
  it("export form uses server-minted idempotency key without client IdempotencyField", () => {
    assert.match(seatingPage, /idempotencyKey: crypto\.randomUUID\(\)/);
    assert.match(seatingPage, /seating-export-\$\{presented\.correlationId/);
    const exportBlock = seatingPage.slice(
      seatingPage.indexOf('testId="seating-export"'),
      seatingPage.indexOf("seating-export-list"),
    );
    assert.doesNotMatch(exportBlock, /<IdempotencyField/);
  });

  it("REPLAYED seating.export feedback states no new export was created", () => {
    const protection = readFileSync(
      fileURLToPath(new URL("../src/server/protection-form-action.ts", import.meta.url)),
      "utf8",
    );
    const actionResult = readFileSync(
      fileURLToPath(new URL("../src/server/action-result.ts", import.meta.url)),
      "utf8",
    );
    assert.match(protection, /No new export was created\. The existing READY export was reused\./);
    assert.match(actionResult, /No new export was created/);
    assert.match(actionResult, /seating\.export/);
  });
});
