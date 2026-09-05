import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTHORISED_REPOSITORY } from "../src/constants.js";
import { IngestionError } from "../src/errors.js";
import { GitHubHttpProvider, createLiveGitHubProvider } from "../src/github-http.js";

describe("GitHub HTTP read client", () => {
  it("requires explicit live mode and the authorised repository", () => {
    assert.throws(
      () => new GitHubHttpProvider({ live: false }),
      (error: unknown) => error instanceof IngestionError && error.code === "LIVE_MODE_DISABLED",
    );
    assert.throws(
      () => new GitHubHttpProvider({ live: true, repository: "someone/else" }),
      (error: unknown) => error instanceof IngestionError && error.code === "UNAUTHORISED_REPOSITORY",
    );
    assert.throws(
      () => createLiveGitHubProvider({}),
      (error: unknown) => error instanceof IngestionError && error.code === "LIVE_MODE_DISABLED",
    );
  });

  it("reads commits and workflow runs through a fetch double, never implicitly live", async () => {
    const calls: string[] = [];
    const provider = new GitHubHttpProvider({
      live: true,
      now: () => "2026-09-05T16:10:00.000Z",
      fetchImpl: async (input) => {
        const url = String(input);
        calls.push(url);
        if (url.includes("/commits/") && !url.includes("per_page")) {
          return new Response(
            JSON.stringify({
              sha: "abc123",
              commit: { message: "feat", author: { date: "2026-09-05T16:00:00.000Z", name: "dev" } },
              author: { login: "dev" },
            }),
            { status: 200 },
          );
        }
        if (url.includes("/commits?")) {
          return new Response(JSON.stringify([{ sha: "abc123", commit: { message: "feat", author: { date: "2026-09-05T16:00:00.000Z" } } }]), {
            status: 200,
          });
        }
        if (url.includes("/actions/runs/9")) {
          return new Response(
            JSON.stringify({
              id: 9,
              name: "programme-validate",
              head_sha: "abc123",
              head_branch: "main",
              status: "completed",
              conclusion: "success",
              html_url: "https://github.com/kglaw-Oluseyi/atelier-doclar/actions/runs/9",
              updated_at: "2026-09-05T16:00:00.000Z",
            }),
            { status: 200 },
          );
        }
        if (url.includes("/actions/runs?")) {
          return new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 });
        }
        return new Response("no", { status: 404 });
      },
    });
    const commit = await provider.getCommit("abc123");
    assert.equal(commit?.repository, AUTHORISED_REPOSITORY);
    assert.equal((await provider.listCommits())[0]?.sha, "abc123");
    assert.equal((await provider.getWorkflowRun("9"))?.runId, "9");
    assert.deepEqual(await provider.listWorkflowRuns(), []);
    assert.ok(calls.every((url) => url.includes(`/repos/${AUTHORISED_REPOSITORY}/`)));
    assert.equal(provider.freshness().state, "FRESH");
  });

  it("surfaces rate limits and retries transient failures", async () => {
    let attempts = 0;
    const provider = new GitHubHttpProvider({
      live: true,
      retries: 1,
      timeoutMs: 200,
      fetchImpl: async () => {
        attempts += 1;
        if (attempts === 1) return new Response("err", { status: 502 });
        return new Response("[]", { status: 200 });
      },
    });
    assert.deepEqual(await provider.listCommits(), []);
    assert.equal(attempts, 2);

    const limited = new GitHubHttpProvider({
      live: true,
      retries: 0,
      fetchImpl: async () =>
        new Response("limited", { status: 403, headers: { "x-ratelimit-remaining": "0" } }),
    });
    await assert.rejects(
      () => limited.listCommits(),
      (error: unknown) => error instanceof IngestionError && error.code === "RATE_LIMITED",
    );
  });
});
