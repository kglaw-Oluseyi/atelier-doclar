import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTHORISED_REPOSITORY } from "../src/constants.js";
import { IngestionError } from "../src/errors.js";
import { computeGitHubSignature, verifyGitHubSignature } from "../src/webhook.js";
import { SECRET, SHA_A, signedRequest, testHarness } from "./helpers.js";

const body = JSON.stringify({
  zen: "test",
  repository: { full_name: AUTHORISED_REPOSITORY },
});

describe("webhook signature verification", () => {
  it("accepts a valid GitHub SHA-256 signature", () => {
    assert.doesNotThrow(() =>
      verifyGitHubSignature({
        rawBody: body,
        signatureHeader: computeGitHubSignature(body, SECRET),
        secret: SECRET,
      }),
    );
  });

  it("rejects a missing signature", () => {
    assert.throws(
      () => verifyGitHubSignature({ rawBody: body, signatureHeader: undefined, secret: SECRET }),
      (error: unknown) => error instanceof IngestionError && error.code === "MISSING_SIGNATURE" && !error.retryable,
    );
  });

  it("rejects a malformed signature", () => {
    assert.throws(
      () => verifyGitHubSignature({ rawBody: body, signatureHeader: "md5=abcd", secret: SECRET }),
      (error: unknown) => error instanceof IngestionError && error.code === "MALFORMED_SIGNATURE" && !error.retryable,
    );
  });

  it("rejects an invalid signature", () => {
    assert.throws(
      () =>
        verifyGitHubSignature({
          rawBody: body,
          signatureHeader: "sha256=0000000000000000000000000000000000000000000000000000000000000000",
          secret: SECRET,
        }),
      (error: unknown) => error instanceof IngestionError && error.code === "INVALID_SIGNATURE" && !error.retryable,
    );
  });

  it("rejects a body modified after signing", () => {
    const signature = computeGitHubSignature(body, SECRET);
    assert.throws(
      () =>
        verifyGitHubSignature({
          rawBody: body.replace("test", "changed"),
          signatureHeader: signature,
          secret: SECRET,
        }),
      (error: unknown) => error instanceof IngestionError && error.code === "INVALID_SIGNATURE",
    );
  });

  it("does not treat signature failures as retryable", () => {
    const { service } = testHarness();
    const outcome = service.handleWebhook(
      {
        headers: {
          "X-GitHub-Event": "ping",
          "X-GitHub-Delivery": "d1",
        },
        rawBody: body,
      },
      SECRET,
    );
    assert.equal(outcome.ok, false);
    assert.equal(outcome.code, "MISSING_SIGNATURE");
    assert.equal(outcome.retryable, false);
    assert.equal(JSON.stringify(outcome).includes(SECRET), false);
  });

  it("never includes the synthetic secret in handler output", () => {
    const { service } = testHarness();
    const outcome = service.handleWebhook(signedRequest("ping", JSON.parse(body), "del-secret"), SECRET);
    assert.equal(outcome.ok, true);
    assert.equal(JSON.stringify(outcome).includes(SECRET), false);
    assert.equal(JSON.stringify(service.freshness()).includes(SECRET), false);
  });
});

describe("webhook event admission", () => {
  it("rejects an unsupported event type", () => {
    const { service } = testHarness();
    const outcome = service.handleWebhook(
      signedRequest("issues", { repository: { full_name: AUTHORISED_REPOSITORY } }, "del-unsup"),
      SECRET,
    );
    assert.equal(outcome.ok, false);
    assert.equal(outcome.code, "UNSUPPORTED_EVENT");
    assert.equal(outcome.retryable, false);
  });

  it("rejects a malformed JSON body", () => {
    const { service } = testHarness();
    const rawBody = "{not-json";
    const outcome = service.handleWebhook(
      {
        headers: {
          "X-Hub-Signature-256": computeGitHubSignature(rawBody, SECRET),
          "X-GitHub-Event": "push",
          "X-GitHub-Delivery": "del-malformed",
        },
        rawBody,
      },
      SECRET,
    );
    assert.equal(outcome.ok, false);
    assert.equal(outcome.code, "MALFORMED_PAYLOAD");
    assert.equal(outcome.retryable, false);
  });

  it("rejects a replayed delivery without appending events", () => {
    const { service, store } = testHarness();
    const payload = {
      ref: "refs/heads/main",
      repository: { full_name: AUTHORISED_REPOSITORY },
      commits: [
        {
          id: SHA_A,
          message: "feat\n\nSlice-ID: MD-AA\nProduct: FOUNDATION\nPrompt-Control-ID: MD-PR-0099",
          timestamp: "2026-09-05T09:00:00Z",
        },
      ],
    };
    const request = signedRequest("push", payload, "del-replay");
    const first = service.handleWebhook(request, SECRET);
    const count = store.eventCount();
    const second = service.handleWebhook(request, SECRET);
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(second.kind, "duplicate");
    assert.equal(second.code, "REPLAY");
    assert.equal(store.eventCount(), count);
    assert.ok(first.eventsAppended > 0);
    assert.equal(second.eventsAppended, 0);
  });
});
