import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateRuntimeConfig } from "../src/runtime-config.js";
import { SYNTHETIC_ACCESS_TOKEN, SYNTHETIC_SESSION_SECRET } from "../src/constants.js";

describe("production configuration contract", () => {
  it("fails closed when production secrets are absent or synthetic", () => {
    const missing = evaluateRuntimeConfig({ NODE_ENV: "production" });
    assert.equal(missing.ready, false);
    assert.ok(missing.failures.length > 0);

    const synthetic = evaluateRuntimeConfig({
      NODE_ENV: "production",
      PROGRAMME_ACCESS_TOKEN: SYNTHETIC_ACCESS_TOKEN,
      PROGRAMME_SESSION_SECRET: SYNTHETIC_SESSION_SECRET,
    });
    assert.equal(synthetic.ready, false);
    assert.equal(synthetic.productionSecretsSafe, false);
  });

  it("is ready in development without inventing production authorisation", () => {
    const dev = evaluateRuntimeConfig({ NODE_ENV: "development" });
    assert.equal(dev.ready, true);
    assert.equal(dev.webhookConfigured, false);
    assert.equal(dev.applicationAlive, true);
  });

  it("accepts explicit non-synthetic production secrets", () => {
    const prod = evaluateRuntimeConfig({
      NODE_ENV: "production",
      PROGRAMME_ACCESS_TOKEN: "named-production-access-token",
      PROGRAMME_SESSION_SECRET: "named-production-session-secret",
      PROGRAMME_DATA_DIR: "/var/data",
    });
    assert.equal(prod.ready, true);
    assert.equal(prod.persistenceConfigured, true);
  });
});
