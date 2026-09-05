import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendAudit,
  approvalStillValid,
  buildReleaseCandidate,
  evaluateApproval,
} from "../src/authority.js";
import type { Gate } from "@maison-doclar/programme-domain";

const gate: Gate = {
  id: "GATE-INDEPENDENT",
  product: "INTEGRATION",
  title: "Independent acceptance",
  status: "NOT_READY",
  authority: "Named independent reviewer — not Cursor",
  requiredEvidenceIds: [],
};

describe("CT6 authority and audit", () => {
  it("rejects implementer, reserved identity and missing authority", () => {
    assert.equal(
      evaluateApproval({
        actorId: "cursor-agent",
        role: "implementer",
        namedAuthority: "Named Reviewer",
        gate,
        now: "2026-09-05T12:00:00.000Z",
      }).allowed,
      false,
    );
    assert.equal(
      evaluateApproval({
        actorId: "Cursor",
        role: "executive",
        namedAuthority: "CEO",
        gate,
        now: "2026-09-05T12:00:00.000Z",
      }).code,
      "RESERVED_IDENTITY",
    );
    assert.equal(
      evaluateApproval({
        actorId: "named-reviewer",
        role: "reviewer",
        namedAuthority: "",
        gate,
        now: "2026-09-05T12:00:00.000Z",
      }).code,
      "MISSING_AUTHORITY",
    );
  });

  it("does not treat rejected or expired approvals as valid", () => {
    assert.equal(
      evaluateApproval({
        actorId: "named-reviewer",
        role: "reviewer",
        namedAuthority: "Named Reviewer",
        gate: { ...gate, status: "REJECTED" },
        now: "2026-09-05T12:00:00.000Z",
      }).code,
      "REJECTED_GATE",
    );
    assert.equal(
      evaluateApproval({
        actorId: "named-reviewer",
        role: "reviewer",
        namedAuthority: "Named Reviewer",
        gate: { ...gate, status: "NOT_READY", expiresAt: "2020-01-01T00:00:00.000Z" },
        now: "2026-09-05T12:00:00.000Z",
      }).code,
      "EXPIRED",
    );
    assert.equal(approvalStillValid({ status: "APPROVED", expiresAt: "2020-01-01T00:00:00.000Z", now: "2026-09-05T12:00:00.000Z" }), false);
    assert.equal(approvalStillValid({ status: "REJECTED", now: "2026-09-05T12:00:00.000Z" }), false);
  });

  it("appends audit history instead of overwriting", () => {
    const first = appendAudit([], {
      id: "AUD-1",
      at: "2026-09-05T12:00:00.000Z",
      actorId: "named-reviewer",
      action: "GATE_APPROVAL_ATTEMPT",
      targetId: "GATE-INDEPENDENT",
      result: "rejected",
      reason: "UNAUTHORISED_ACTOR",
    });
    const second = appendAudit(first, {
      id: "AUD-2",
      at: "2026-09-05T12:01:00.000Z",
      actorId: "named-reviewer",
      action: "CORRECTION",
      targetId: "AUD-1",
      result: "accepted",
      reason: "appended note",
    });
    assert.equal(first.length, 1);
    assert.equal(second.length, 2);
    assert.equal(second[0]?.id, "AUD-1");
    assert.equal(buildReleaseCandidate({ accepted: 0, unsignedGates: 4, blockingItems: 3 }).productionAuthorised, false);
  });
});
