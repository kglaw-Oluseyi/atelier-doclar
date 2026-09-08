import { SCHEMA_VERSION } from "./constants.js";
import { FIXTURE_IDS } from "./fixtures.js";
import type { PlatformSnapshot } from "./store.js";

export const S05_FIXTURE_IDS = {
  venueIkoyi: "00000000-0000-4000-8000-000000000501",
} as const;

export function applyS05FixturesIfMissing(input: PlatformSnapshot): PlatformSnapshot {
  if (input.venues.some((item) => item.id === S05_FIXTURE_IDS.venueIkoyi)) return input;
  if (!input.organisations.some((item) => item.id === FIXTURE_IDS.orgMaison)) return input;
  const snap = structuredClone(input);
  const now = "2026-09-08T02:00:00.000Z";
  snap.venues.push({
    id: S05_FIXTURE_IDS.venueIkoyi,
    organisationId: FIXTURE_IDS.orgMaison,
    displayName: "Synthetic Ikoyi Garden Pavilion",
    locality: "Ikoyi",
    countryCode: "NG",
    visibilityPolicy: "ORGANISATION_STAFF",
    assignedClientIds: [],
    crossClientReuse: "DENIED",
    status: "ACTIVE",
    notes: "Synthetic fixture only. Not a real venue.",
    recordedByPersonId: FIXTURE_IDS.personDirector,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
    nonProductionFixture: true,
  });
  return snap;
}
