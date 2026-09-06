import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactCorrectionReview } from "@maison-doclar/shared-platform";
import { presentCorrectionReview, presentSourceEvidence } from "../src/server/correction-review-display.js";

const EVENT = "00000000-0000-4000-8000-000000000021";
const OTHER_EVENT = "00000000-0000-4000-8000-000000000022";
const THREAD = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MESSAGE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CORRECTION = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PERSON = "00000000-0000-4000-8000-000000000002";

function baseReview(overrides: Partial<ContactCorrectionReview> = {}): ContactCorrectionReview {
  return {
    id: CORRECTION,
    organisationId: "00000000-0000-4000-8000-000000000001",
    eventId: EVENT,
    guestId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    guestDisplayName: "Ọláyẹmí Folákẹ̀ Adeṣínà-Babatúndé",
    channel: "EMAIL",
    existingValue: "olayemi.current@example.test",
    proposedValue: "olayemi.folake.adesina-babatunde.corrections.review@example.test",
    reason: "Synthetic governed review proposal",
    status: "PROPOSED",
    version: 1,
    proposedAt: "2026-09-05T14:00:00.000Z",
    maker: {
      state: "AVAILABLE",
      personId: PERSON,
      displayName: "Event Director",
      roleKey: "EVENT_DIRECTOR",
    },
    decision: { state: "PENDING" },
    sourceEvidence: {
      state: "AVAILABLE",
      inboundMessageId: MESSAGE,
      reviewPath: `/app/events/${EVENT}/communications/inbox/${THREAD}`,
    },
    ...overrides,
  };
}

describe("correction review presentation", () => {
  it("uses the governed review projection without leaking identifiers", () => {
    const presented = presentCorrectionReview(baseReview());
    const json = JSON.stringify(presented);
    assert.equal(presented.maker.state, "AVAILABLE");
    if (presented.maker.state === "AVAILABLE") {
      assert.equal(presented.maker.displayName, "Event Director");
      assert.equal(presented.maker.roleLabel, "Event Director");
      assert.match(presented.maker.proposedAtLabel, /2026/);
      assert.equal(presented.maker.explanation, "A different authorised person must review this correction.");
    }
    assert.doesNotMatch(json, /EVENT_DIRECTOR/);
    assert.doesNotMatch(json, /proposedByPersonId/);
    assert.doesNotMatch(json, /personId/);
    assert.doesNotMatch(json, /inboundMessageId/);
    assert.doesNotMatch(presented.guestDisplayName, /00000000/);
  });

  it("keeps long names and contact values intact", () => {
    const presented = presentCorrectionReview(baseReview());
    assert.match(presented.guestDisplayName, /Ọláyẹmí/);
    assert.match(presented.proposedValue, /adesina-babatunde/);
    assert.equal(presented.proposedValue.includes("…"), false);
  });

  it("renders AVAILABLE evidence as an authorised same-event link", () => {
    const presented = presentCorrectionReview(baseReview());
    assert.equal(presented.evidence.state, "AVAILABLE");
    if (presented.evidence.state === "AVAILABLE") {
      assert.equal(presented.evidence.linkLabel, "Review linked inbound message");
      assert.match(presented.evidence.href, new RegExp(`/app/events/${EVENT}/communications/inbox/${THREAD}`));
      assert.doesNotMatch(presented.evidence.href, new RegExp(OTHER_EVENT));
    }
  });

  it("does not render a link for NOT_LINKED evidence", () => {
    const presented = presentCorrectionReview(baseReview({ sourceEvidence: { state: "NOT_LINKED" } }));
    assert.equal(presented.evidence.state, "NOT_LINKED");
    if (presented.evidence.state === "NOT_LINKED") {
      assert.equal(presented.evidence.message, "No inbound message was linked to this proposal.");
      assert.equal("href" in presented.evidence, false);
    }
  });

  it("does not render a broken link for UNAVAILABLE evidence", () => {
    const presented = presentCorrectionReview(baseReview({ sourceEvidence: { state: "UNAVAILABLE" } }));
    assert.equal(presented.evidence.state, "UNAVAILABLE");
    if (presented.evidence.state === "UNAVAILABLE") {
      assert.equal(presented.evidence.message, "The linked source is no longer available.");
      assert.equal("href" in presented.evidence, false);
    }
  });

  it("does not reveal protected details for REDACTED evidence", () => {
    const presented = presentCorrectionReview(baseReview({ sourceEvidence: { state: "REDACTED" } }));
    assert.equal(presented.evidence.state, "REDACTED");
    if (presented.evidence.state === "REDACTED") {
      assert.equal(presented.evidence.message, "The linked source is restricted.");
      assert.doesNotMatch(presented.evidence.message, /quarantine|attachment|body|sender/i);
      assert.equal("href" in presented.evidence, false);
    }
  });

  it("refuses a cross-event evidence path instead of rendering a link", () => {
    const evidence = presentSourceEvidence(EVENT, {
      state: "AVAILABLE",
      inboundMessageId: MESSAGE,
      reviewPath: `/app/events/${OTHER_EVENT}/communications/inbox/${THREAD}`,
    });
    assert.equal(evidence.state, "UNAVAILABLE");
    assert.equal("href" in evidence, false);
  });

  it("does not offer a decision for a legacy maker-unavailable correction", () => {
    const presented = presentCorrectionReview(
      baseReview({
        maker: { state: "UNAVAILABLE" },
      }),
    );
    assert.equal(presented.decidable, false);
    assert.equal(presented.maker.state, "UNAVAILABLE");
    if (presented.maker.state === "UNAVAILABLE") {
      assert.equal(presented.maker.message, "Proposer unavailable — this historical correction cannot be decided.");
    }
  });

  it("omits decision controls after the correction is decided", () => {
    const presented = presentCorrectionReview(
      baseReview({
        status: "APPLIED",
        decision: {
          state: "RECORDED",
          personId: "00000000-0000-4000-8000-000000000001",
          displayName: "George Lawson",
          decidedAt: "2026-09-05T14:05:00.000Z",
        },
      }),
    );
    assert.equal(presented.decidable, false);
    assert.equal(presented.alreadyDecided, true);
    assert.match(presented.decisionClosedCopy ?? "", /already been decided/);
    assert.equal(presented.decision.state, "RECORDED");
    if (presented.decision.state === "RECORDED") {
      assert.equal(presented.decision.displayName, "George Lawson");
    }
  });
});
