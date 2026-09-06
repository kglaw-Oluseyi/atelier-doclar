import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyS04AFixtures,
  fixtureS04AGuests,
  fixtureS04AHousehold,
  S04A_FIXTURE_IDS,
} from "../src/addressing-fixtures.js";
import { compatibleLegacySnapshot, migrateEosS04A, rollbackEosS04A } from "../src/addressing-migration.js";
import { renderGuestSalutation } from "../src/addressing.js";
import { SCHEMA_VERSION } from "../src/constants.js";
import { FIXTURE_IDS } from "../src/fixtures.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { emptySnapshot, normalizeSnapshot } from "../src/store.js";

const NOW = "2026-09-06T16:00:00.000Z";

function legacyHouseholdSnapshot() {
  const household = fixtureS04AHousehold();
  const guests = fixtureS04AGuests()
    .filter((item) => item.householdId === household.id)
    .map((item) => {
      const { addressing: _addressing, ageBand: _ageBand, childReadiness: _childReadiness, ...legacy } = item;
      return legacy;
    });
  return compatibleLegacySnapshot({
    guestHouseholds: [household],
    operationalGuests: guests,
  });
}

describe("EOS-S04A persistence and migration", () => {
  it("normalises a pre-S04A snapshot without rewriting guest or event identifiers", () => {
    const legacy = {
      organisations: [],
      operationalGuests: fixtureS04AGuests().slice(0, 1),
    };
    const normalised = normalizeSnapshot(legacy as never);
    assert.deepEqual(normalised.guestParties, []);
    assert.deepEqual(normalised.companionEntitlements, []);
    assert.equal(normalised.operationalGuests[0]?.id, S04A_FIXTURE_IDS.guestEbunoluwa);
    assert.equal(normalised.operationalGuests[0]?.eventId, FIXTURE_IDS.eventAlphaOne);
  });

  it("backfills HOUSEHOLD parties only from dedicated household records and is idempotent", () => {
    const first = migrateEosS04A(legacyHouseholdSnapshot(), NOW);
    const second = migrateEosS04A(first, NOW);
    assert.equal(first.guestParties.length, 1);
    assert.equal(second.guestParties.length, 1);
    assert.equal(first.guestParties[0]?.legacyHouseholdId, S04A_FIXTURE_IDS.householdAlakija);
    assert.equal(first.guestParties[0]?.type, "HOUSEHOLD");
    assert.equal(first.guestPartyMembers.length, 4);
    assert.equal(second.guestPartyMembers.length, 4);
    const guestIds = first.operationalGuests.map((item) => item.id).sort();
    assert.deepEqual(
      first.guestPartyMembers.map((item) => item.guestId).sort(),
      guestIds,
    );
    assert.ok(first.guestPartyMembers.every((item) => item.partyId !== item.guestId));
  });

  it("does not invent parties or titles from shared surname, contact details or free-text names", () => {
    const sameName = compatibleLegacySnapshot({
      operationalGuests: [
        {
          ...fixtureS04AGuests()[0]!,
          id: "aaaaaaaa-0000-4000-8000-000000000001",
          householdId: undefined,
          givenName: { value: "Dr Ẹ̀bùnolúwa", quality: "UNVERIFIED" },
          addressing: undefined,
        },
        {
          ...fixtureS04AGuests()[1]!,
          id: "aaaaaaaa-0000-4000-8000-000000000002",
          householdId: undefined,
          givenName: { value: "Olúfẹ́mi", quality: "UNVERIFIED" },
        },
      ],
    });
    const migrated = migrateEosS04A(sameName, NOW);
    assert.equal(migrated.guestParties.length, 0);
    assert.equal(migrated.guestRelationships.length, 0);
    assert.equal(migrated.operationalGuests[0]?.addressing, undefined);
    assert.equal(migrated.operationalGuests[0]?.givenName.value, "Dr Ẹ̀bùnolúwa");
    const rendered = renderGuestSalutation(migrated.operationalGuests[0]!);
    assert.doesNotMatch(rendered.text, /^Dr \(Mrs\)/);
    assert.match(rendered.text, /Dr Ẹ̀bùnolúwa/);
  });

  it("rolls back new collections while preserving guest and event identifiers", () => {
    const migrated = migrateEosS04A(legacyHouseholdSnapshot(), NOW);
    const guestIds = migrated.operationalGuests.map((item) => item.id);
    const rolled = rollbackEosS04A(migrated);
    assert.deepEqual(rolled.operationalGuests.map((item) => item.id), guestIds);
    assert.equal(rolled.guestHouseholds[0]?.id, S04A_FIXTURE_IDS.householdAlakija);
    assert.equal(rolled.guestParties.length, 0);
    assert.equal(rolled.guestPartyMembers.length, 0);
    assert.equal(rolled.companionEntitlements.length, 0);
    assert.equal(rolled.responsibleAdultLinks.length, 0);
  });

  it("round-trips S04A collections through memory and postgres document stores", async () => {
    const memory = new MemoryPlatformStore();
    memory.replace(applyS04AFixtures(emptySnapshot()));
    const before = memory.snapshot();
    assert.equal(before.operationalGuests.length, 5);
    assert.equal(before.companionEntitlements[0]?.nominatedGuestId, undefined);
    assert.match(before.operationalGuests[0]?.givenName.value ?? "", /Ẹ̀bùnolúwa/);
    const db = new MemoryPlatformPg();
    const first = await PostgresPlatformStore.open(db);
    await first.replaceAsync(before);
    const reopened = await PostgresPlatformStore.open(db);
    const after = reopened.snapshot();
    assert.equal(after.guestParties[0]?.id, S04A_FIXTURE_IDS.partyAlakija);
    assert.equal(after.responsibleAdultLinks.length, 2);
    assert.equal(after.companionEntitlements[0]?.status, "AVAILABLE");
    assert.equal(after.operationalGuests.find((item) => item.id === S04A_FIXTURE_IDS.guestTomi)?.ageBand, "CHILD");
    assert.equal(after.operationalGuests[0]?.schemaVersion, SCHEMA_VERSION);
    assert.equal(after.guestParties[0]?.version, 1);
  });
});
