import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCEPTED_CAP600_CORPUS_HASHES,
  CAP600_EDITION,
  CAP1000_EDITION,
  CAPACITY_LIVE_RAILWAY,
  assertAcceptedCap600CorpusHashes,
  assertCapacityLiveInstallSafety,
  capacityCorpusHash,
  EVENT_OS_CLEANUP_PROJECT_ID,
} from "../src/index.js";

const baseEnv = {
  RAILWAY_PROJECT_ID: EVENT_OS_CLEANUP_PROJECT_ID,
  RAILWAY_PROJECT_NAME: "atelier-doclar",
  RAILWAY_ENVIRONMENT_NAME: "production",
  RAILWAY_SERVICE_NAME: "event-os",
  DATABASE_URL: "postgresql://postgres:test@127.0.0.1:5432/railway",
};

describe("capacity live install safety", () => {
  it("accepts CAP600 with exact Gate 1 provenance totals", () => {
    assertAcceptedCap600CorpusHashes();
    const result = assertCapacityLiveInstallSafety({
      fixture: "CAP600",
      confirmSyntheticQualification: true,
      expectedEdition: CAP600_EDITION,
      expectedGuestCount: 600,
      expectedTableCount: 63,
      expectedSeatCount: 600,
      expectedCorpusHash: ACCEPTED_CAP600_CORPUS_HASHES.B_TYPICAL,
      env: baseEnv,
      productionAuthorised: false,
      providersInactive: true,
      communicationsInactive: true,
      realDataMode: false,
    });
    assert.equal(result.ok, true);
    assert.equal(result.railway.projectName, CAPACITY_LIVE_RAILWAY.projectName);
  });

  it("refuses without synthetic confirmation", () => {
    assert.throws(
      () =>
        assertCapacityLiveInstallSafety({
          fixture: "CAP600",
          confirmSyntheticQualification: false,
          expectedEdition: CAP600_EDITION,
          expectedGuestCount: 600,
          expectedTableCount: 63,
          expectedSeatCount: 600,
          env: baseEnv,
          productionAuthorised: false,
          providersInactive: true,
          communicationsInactive: true,
          realDataMode: false,
        }),
      /confirmSyntheticQualification/,
    );
  });

  it("refuses wrong Railway project", () => {
    assert.throws(
      () =>
        assertCapacityLiveInstallSafety({
          fixture: "CAP1000",
          confirmSyntheticQualification: true,
          expectedEdition: CAP1000_EDITION,
          expectedGuestCount: 1000,
          expectedTableCount: 110,
          expectedSeatCount: 1000,
          env: { ...baseEnv, RAILWAY_PROJECT_NAME: "other" },
          productionAuthorised: false,
          providersInactive: true,
          communicationsInactive: true,
          realDataMode: false,
        }),
      /project name/,
    );
  });

  it("refuses productionAuthorised true", () => {
    assert.throws(
      () =>
        assertCapacityLiveInstallSafety({
          fixture: "CAP600",
          confirmSyntheticQualification: true,
          expectedEdition: CAP600_EDITION,
          expectedGuestCount: 600,
          expectedTableCount: 63,
          expectedSeatCount: 600,
          env: baseEnv,
          productionAuthorised: true,
          providersInactive: true,
          communicationsInactive: true,
          realDataMode: false,
        }),
      /productionAuthorised/,
    );
  });

  it("refuses CAP600 wrong table totals", () => {
    assert.throws(
      () =>
        assertCapacityLiveInstallSafety({
          fixture: "CAP600",
          confirmSyntheticQualification: true,
          expectedEdition: CAP600_EDITION,
          expectedGuestCount: 600,
          expectedTableCount: 60,
          expectedSeatCount: 600,
          env: baseEnv,
          productionAuthorised: false,
          providersInactive: true,
          communicationsInactive: true,
          realDataMode: false,
        }),
      /expected totals/,
    );
  });

  it("keeps accepted CAP600 corpus hashes stable", () => {
    for (const [scenario, hash] of Object.entries(ACCEPTED_CAP600_CORPUS_HASHES)) {
      assert.equal(capacityCorpusHash(scenario as keyof typeof ACCEPTED_CAP600_CORPUS_HASHES), hash);
    }
  });
});
