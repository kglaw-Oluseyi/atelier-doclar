import assert from "node:assert/strict";
import {
  EVENT_OS_CLEANUP_PROJECT_ID,
  EVENT_OS_CLEANUP_PROJECT_NAME,
} from "./synthetic-cleanup.js";
import { CAPACITY_CORPUS_EDITION, capacityCorpusHash, CAPACITY_SCENARIO_IDS } from "./seating-capacity-corpus.js";
import { CAPACITY_1000_CORPUS_EDITION } from "./seating-capacity-1000-corpus.js";

/** Accepted Gate 1 CAP600 corpus hashes (eos-s06-capacity-600-v1). Must not silently drift. */
export const ACCEPTED_CAP600_CORPUS_HASHES = {
  A_LIGHT: "e7d546b16cf00fe377faa87c233328d46c982544532988b4536064abafab8de9",
  B_TYPICAL: "08309644e65bd3f4f927461ac92b09692a5f766a344da5402011452b9692f160",
  C_HEAVY: "22c88419a8313f662f3c02aa85e5049137907e8a48aa2feed7bcce8121efb5e4",
  D_INFEASIBLE: "6dc0b80d994c285e0f5949c26db79eff9c240b87bf68c3afd2cb5c9f8ea39e74",
} as const;

export const CAP600_QUALIFICATION_EVIDENCE_COMMIT = "5561171261f3c193136a0b3be5dbd504a2ed8f70";
export const CAP600_EVENT_CODE = "CAP600";
export const CAP600_EVENT_NAME = "[SYNTHETIC QUALIFICATION] Capacity Qualification 600";
export const CAP600_EDITION = CAPACITY_CORPUS_EDITION;
export const CAP600_EXPECTED = { guests: 600, tables: 63, seats: 600 } as const;

export const CAP1000_EVENT_CODE = "CAP1000";
export const CAP1000_EVENT_NAME = "[SYNTHETIC STRETCH QUALIFICATION] Capacity Stretch 1000";
export const CAP1000_EDITION = CAPACITY_1000_CORPUS_EDITION;
export const CAP1000_EXPECTED = { guests: 1000, tables: 110, seats: 1000 } as const;

export const CAPACITY_LIVE_FIXTURE_CODES = ["CAP600", "CAP1000"] as const;
export type CapacityLiveFixtureCode = (typeof CAPACITY_LIVE_FIXTURE_CODES)[number];

export const CAPACITY_LIVE_RAILWAY = {
  projectId: EVENT_OS_CLEANUP_PROJECT_ID,
  projectName: EVENT_OS_CLEANUP_PROJECT_NAME,
  environment: "production",
  service: "event-os",
} as const;

export type CapacityLiveInstallSafetyInput = {
  fixture: CapacityLiveFixtureCode;
  confirmSyntheticQualification: boolean;
  expectedEdition: string;
  expectedGuestCount: number;
  expectedTableCount: number;
  expectedSeatCount: number;
  expectedCorpusHash?: string;
  authorityPersonId?: string;
  env: NodeJS.Dict<string | undefined>;
  productionAuthorised: boolean;
  providersInactive: boolean;
  communicationsInactive: boolean;
  realDataMode: boolean;
};

export type CapacityLiveInstallSafetyResult = {
  ok: true;
  fixture: CapacityLiveFixtureCode;
  edition: string;
  railway: typeof CAPACITY_LIVE_RAILWAY;
};

/**
 * Tightly controlled live qualification pathway.
 * Does not weaken the generic ephemeral-seed Railway-host refusal.
 */
export function assertCapacityLiveInstallSafety(input: CapacityLiveInstallSafetyInput): CapacityLiveInstallSafetyResult {
  if (!CAPACITY_LIVE_FIXTURE_CODES.includes(input.fixture)) {
    throw new Error(`Live capacity install refused: fixture must be CAP600 or CAP1000 (got ${String(input.fixture)})`);
  }
  if (input.confirmSyntheticQualification !== true) {
    throw new Error("Live capacity install refused: confirmSyntheticQualification must be true");
  }
  if (input.productionAuthorised !== false) {
    throw new Error("Live capacity install refused: productionAuthorised must be false");
  }
  if (!input.providersInactive) {
    throw new Error("Live capacity install refused: providers must be inactive");
  }
  if (!input.communicationsInactive) {
    throw new Error("Live capacity install refused: communications must be inactive");
  }
  if (input.realDataMode) {
    throw new Error("Live capacity install refused: real-data mode is not permitted");
  }

  const env = input.env;
  const projectId = String(env.RAILWAY_PROJECT_ID ?? "");
  const projectName = String(env.RAILWAY_PROJECT_NAME ?? "");
  const environment = String(env.RAILWAY_ENVIRONMENT_NAME ?? env.RAILWAY_ENVIRONMENT ?? "");
  const service = String(env.RAILWAY_SERVICE_NAME ?? env.RAILWAY_SERVICE ?? "");

  if (projectId !== CAPACITY_LIVE_RAILWAY.projectId) {
    throw new Error(`Live capacity install refused: Railway project id must be ${CAPACITY_LIVE_RAILWAY.projectId}`);
  }
  if (projectName !== CAPACITY_LIVE_RAILWAY.projectName) {
    throw new Error(`Live capacity install refused: Railway project name must be ${CAPACITY_LIVE_RAILWAY.projectName}`);
  }
  if (environment.toLowerCase() !== CAPACITY_LIVE_RAILWAY.environment) {
    throw new Error(`Live capacity install refused: environment must be ${CAPACITY_LIVE_RAILWAY.environment}`);
  }
  if (service && service !== CAPACITY_LIVE_RAILWAY.service) {
    throw new Error(`Live capacity install refused: service must be ${CAPACITY_LIVE_RAILWAY.service}`);
  }
  if (!String(env.DATABASE_URL ?? "").trim()) {
    throw new Error("Live capacity install refused: DATABASE_URL is required");
  }

  if (input.fixture === "CAP600") {
    if (input.expectedEdition !== CAP600_EDITION) {
      throw new Error(`Live CAP600 install refused: edition must be ${CAP600_EDITION}`);
    }
    if (
      input.expectedGuestCount !== CAP600_EXPECTED.guests ||
      input.expectedTableCount !== CAP600_EXPECTED.tables ||
      input.expectedSeatCount !== CAP600_EXPECTED.seats
    ) {
      throw new Error("Live CAP600 install refused: expected totals must be 600 guests / 63 tables / 600 seats");
    }
    for (const scenario of CAPACITY_SCENARIO_IDS) {
      const hash = capacityCorpusHash(scenario);
      const accepted = ACCEPTED_CAP600_CORPUS_HASHES[scenario];
      if (hash !== accepted) {
        throw new Error(`Live CAP600 install refused: corpus hash drift for ${scenario}`);
      }
    }
    if (input.expectedCorpusHash && input.expectedCorpusHash !== ACCEPTED_CAP600_CORPUS_HASHES.B_TYPICAL) {
      throw new Error("Live CAP600 install refused: expectedCorpusHash must match accepted B_TYPICAL hash");
    }
  } else {
    if (input.expectedEdition !== CAP1000_EDITION) {
      throw new Error(`Live CAP1000 install refused: edition must be ${CAP1000_EDITION}`);
    }
    if (
      input.expectedGuestCount !== CAP1000_EXPECTED.guests ||
      input.expectedTableCount !== CAP1000_EXPECTED.tables ||
      input.expectedSeatCount !== CAP1000_EXPECTED.seats
    ) {
      throw new Error("Live CAP1000 install refused: expected totals must be 1000 guests / 110 tables / 1000 seats");
    }
  }

  return {
    ok: true,
    fixture: input.fixture,
    edition: input.expectedEdition,
    railway: CAPACITY_LIVE_RAILWAY,
  };
}

/** Verify in-process CAP600 corpus still matches Gate 1 accepted hashes. */
export function assertAcceptedCap600CorpusHashes(): void {
  for (const scenario of CAPACITY_SCENARIO_IDS) {
    assert.equal(capacityCorpusHash(scenario), ACCEPTED_CAP600_CORPUS_HASHES[scenario], scenario);
  }
}
