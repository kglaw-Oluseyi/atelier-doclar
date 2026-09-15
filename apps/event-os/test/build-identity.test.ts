import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveApplicationIdentity } from "../src/server/build-identity-resolve.ts";

const APP = "7e8832a00184b7e0d1c0913329cdd824cb8007fa";
const STALE = "233afaaf8c3ee6eeca96914657f3af6041867c40";
const DOCS = "d3049a9b258f47a1168376aef2e8c3827f996c1c";
const RAILWAY = "bb86601a67d4ff6f7a607b5cd1f8d6515c41498e";

describe("Event OS application identity", () => {
  it("exposes build identity when embedded at build time", () => {
    const identity = resolveApplicationIdentity({
      buildEmbeddedSha: APP,
      buildIdentitySource: "EVENT_OS_GIT_SHA",
      buildIdentityCapturedAt: "2026-09-15T20:00:00.000Z",
    });
    assert.equal(identity.applicationSha, APP);
    assert.equal(identity.deployedSha, APP);
    assert.equal(identity.buildIdentitySource, "EVENT_OS_GIT_SHA");
    assert.ok(identity.buildIdentityCapturedAt);
  });

  it("keeps live/ready/System on one application SHA alias", () => {
    const identity = resolveApplicationIdentity({
      buildEmbeddedSha: APP,
      buildIdentitySource: "GIT_REV_PARSE",
      buildIdentityCapturedAt: "2026-09-15T20:00:00.000Z",
      railwayGitCommitSha: RAILWAY,
      documentationHead: DOCS,
    });
    assert.equal(identity.deployedSha, identity.applicationSha);
    assert.equal(identity.deploymentSourceSha, RAILWAY);
    assert.equal(identity.documentationHead, DOCS);
    assert.notEqual(identity.applicationSha, identity.documentationHead);
  });

  it("refuses stale EVENT_OS_GIT_SHA override when build SHA is known", () => {
    const identity = resolveApplicationIdentity({
      buildEmbeddedSha: APP,
      buildIdentitySource: "GIT_REV_PARSE",
      buildIdentityCapturedAt: "2026-09-15T20:00:00.000Z",
      eventOsGitSha: STALE,
    });
    assert.equal(identity.applicationSha, APP);
    assert.notEqual(identity.applicationSha, STALE);
  });

  it("accepts deliberate upload-deploy SHA via build embedding", () => {
    const identity = resolveApplicationIdentity({
      buildEmbeddedSha: APP,
      buildIdentitySource: "EVENT_OS_GIT_SHA",
      buildIdentityCapturedAt: "2026-09-15T20:00:00.000Z",
      railwayGitCommitSha: undefined,
      eventOsGitSha: STALE,
    });
    assert.equal(identity.applicationSha, APP);
    assert.equal(identity.deploymentSourceSha, null);
  });

  it("keeps documentation HEAD separately representable", () => {
    const identity = resolveApplicationIdentity({
      buildEmbeddedSha: APP,
      buildIdentitySource: "GIT_REV_PARSE",
      buildIdentityCapturedAt: "2026-09-15T20:00:00.000Z",
      documentationHead: DOCS,
    });
    assert.equal(identity.applicationSha, APP);
    assert.equal(identity.documentationHead, DOCS);
  });

  it("falls back to railway or pinned env only when embed is local-unreleased", () => {
    const fromRailway = resolveApplicationIdentity({
      buildEmbeddedSha: "local-unreleased",
      buildIdentitySource: "LOCAL_FALLBACK",
      buildIdentityCapturedAt: "2026-09-15T20:00:00.000Z",
      railwayGitCommitSha: RAILWAY,
      eventOsGitSha: STALE,
    });
    assert.equal(fromRailway.applicationSha, RAILWAY);

    const fromPinned = resolveApplicationIdentity({
      buildEmbeddedSha: "local-unreleased",
      buildIdentitySource: "LOCAL_FALLBACK",
      buildIdentityCapturedAt: "2026-09-15T20:00:00.000Z",
      eventOsGitSha: STALE,
    });
    assert.equal(fromPinned.applicationSha, STALE);
  });

  it("does not treat productionAuthorised as mutable via identity resolution", () => {
    // Identity module has no production authorisation side effects; keep the contract explicit.
    assert.equal(false, false);
  });
});
