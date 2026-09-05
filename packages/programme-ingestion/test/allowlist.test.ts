import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertAuthorisedRef, assertAuthorisedRepository } from "../src/allowlist.js";
import { AUTHORISED_REPOSITORY } from "../src/constants.js";
import { IngestionError } from "../src/errors.js";
import { SECRET, SHA_A, signedRequest, testHarness } from "./helpers.js";

describe("repository and ref allow-list", () => {
  it("accepts the authorised repository and main", () => {
    assert.doesNotThrow(() => assertAuthorisedRepository(AUTHORISED_REPOSITORY));
    assert.deepEqual(assertAuthorisedRef("refs/heads/main"), {
      branch: "main",
      ref: "refs/heads/main",
    });
  });

  it("rejects another repository", () => {
    assert.throws(
      () => assertAuthorisedRepository("someone-else/other-repo"),
      (error: unknown) => error instanceof IngestionError && error.code === "UNAUTHORISED_REPOSITORY" && !error.retryable,
    );
  });

  it("rejects a malformed repository identity", () => {
    assert.throws(
      () => assertAuthorisedRepository("not-a-repo"),
      (error: unknown) => error instanceof IngestionError && error.code === "UNAUTHORISED_REPOSITORY",
    );
  });

  it("rejects an unauthorised branch", () => {
    assert.throws(
      () => assertAuthorisedRef("refs/heads/feature"),
      (error: unknown) => error instanceof IngestionError && error.code === "UNAUTHORISED_REF" && !error.retryable,
    );
  });

  it("rejects a webhook whose payload claims a different repository", () => {
    const { service } = testHarness();
    const outcome = service.handleWebhook(
      signedRequest(
        "push",
        {
          ref: "refs/heads/main",
          repository: { full_name: "other-org/other-repo" },
          commits: [{ id: SHA_A, message: "x", timestamp: "2026-09-05T09:00:00Z" }],
        },
        "del-wrong-repo",
      ),
      SECRET,
    );
    assert.equal(outcome.ok, false);
    assert.equal(outcome.code, "UNAUTHORISED_REPOSITORY");
    assert.equal(outcome.retryable, false);
    assert.equal(outcome.eventsAppended, 0);
  });

  it("rejects a webhook for an unauthorised branch", () => {
    const { service } = testHarness();
    const outcome = service.handleWebhook(
      signedRequest(
        "push",
        {
          ref: "refs/heads/develop",
          repository: { full_name: AUTHORISED_REPOSITORY },
          commits: [{ id: SHA_A, message: "x", timestamp: "2026-09-05T09:00:00Z" }],
        },
        "del-wrong-ref",
      ),
      SECRET,
    );
    assert.equal(outcome.ok, false);
    assert.equal(outcome.code, "UNAUTHORISED_REF");
    assert.equal(outcome.retryable, false);
  });
});
