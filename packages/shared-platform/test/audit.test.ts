import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actor, fixtureService, people } from "./helpers.js";

describe("consequential audit", () => {
  it("records actor, scope, action, hashes and correlation, and is append-only", () => {
    const { service } = fixtureService();
    service.createClient(actor(people.personCeo, { correlationId: "corr-audit" }), {
      organisationId: people.orgMaison,
      code: "DELTA",
      displayName: "Delta",
    });
    const events = service.searchAudit(actor(people.personCeo), people.orgMaison);
    const created = events.find((item) => item.action === "client.created");
    assert.ok(created);
    assert.equal(created?.actorPersonId, people.personCeo);
    assert.equal(created?.organisationId, people.orgMaison);
    assert.equal(created?.correlationId, "corr-audit");
    assert.ok(created?.afterHash);
    assert.match(JSON.stringify(created), /shared-platform/);
    assert.doesNotMatch(JSON.stringify(created), /password|token|cookie/i);
    const before = events.length;
    const exported = service.exportAudit(actor(people.personCeo), people.orgMaison);
    assert.ok(exported.length >= before);
    const after = service.searchAudit(actor(people.personCeo), people.orgMaison);
    assert.ok(after.some((item) => item.action === "audit.exported"));
    assert.ok(after.length > before);
  });
});
