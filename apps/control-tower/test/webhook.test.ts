import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { AUTHORISED_REPOSITORY, SYNTHETIC_WEBHOOK_SECRET, computeGitHubSignature } from "@maison-doclar/programme-ingestion";
import { processProgrammeWebhook } from "../src/server/webhook.js";

describe("Control Tower webhook route boundary", () => {
  it("rejects a bad signature and accepts a verified ping without mutating status", () => {
    const dir = mkdtempSync(join(tmpdir(), "md-hook-"));
    const body = JSON.stringify({ zen: "ok", repository: { full_name: AUTHORISED_REPOSITORY } });
    const rejected = processProgrammeWebhook(
      {
        headers: {
          "X-Hub-Signature-256": "sha256=deadbeef",
          "X-GitHub-Event": "ping",
          "X-GitHub-Delivery": "11111111-1111-4111-8111-111111111111",
        },
        rawBody: body,
      },
      SYNTHETIC_WEBHOOK_SECRET,
      dir,
    );
    assert.equal(rejected.ok, false);
    assert.equal(rejected.kind, "rejected");

    const accepted = processProgrammeWebhook(
      {
        headers: {
          "X-Hub-Signature-256": computeGitHubSignature(body, SYNTHETIC_WEBHOOK_SECRET),
          "X-GitHub-Event": "ping",
          "X-GitHub-Delivery": "22222222-2222-4222-8222-222222222222",
        },
        rawBody: body,
      },
      SYNTHETIC_WEBHOOK_SECRET,
      dir,
    );
    assert.equal(accepted.ok, true);
    assert.ok(accepted.kind === "accepted" || accepted.kind === "ignored");

    const replay = processProgrammeWebhook(
      {
        headers: {
          "X-Hub-Signature-256": computeGitHubSignature(body, SYNTHETIC_WEBHOOK_SECRET),
          "X-GitHub-Event": "ping",
          "X-GitHub-Delivery": "22222222-2222-4222-8222-222222222222",
        },
        rawBody: body,
      },
      SYNTHETIC_WEBHOOK_SECRET,
      dir,
    );
    assert.equal(replay.kind, "duplicate");
  });

  it("rejects an unauthorised repository", () => {
    const dir = mkdtempSync(join(tmpdir(), "md-hook-"));
    const body = JSON.stringify({ zen: "no", repository: { full_name: "someone/else" } });
    const result = processProgrammeWebhook(
      {
        headers: {
          "X-Hub-Signature-256": computeGitHubSignature(body, SYNTHETIC_WEBHOOK_SECRET),
          "X-GitHub-Event": "ping",
          "X-GitHub-Delivery": "33333333-3333-4333-8333-333333333333",
        },
        rawBody: body,
      },
      SYNTHETIC_WEBHOOK_SECRET,
      dir,
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "UNAUTHORISED_REPOSITORY");
  });
});
