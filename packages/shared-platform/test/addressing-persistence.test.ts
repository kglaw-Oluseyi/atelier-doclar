import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  applyS04AFixtures,
  fixtureS04AGuests,
  fixtureS04AHousehold,
  S04A_FIXTURE_IDS,
} from "../src/addressing-fixtures.js";
import {
  compatibleLegacySnapshot,
  EOS_S04A_MIGRATION_ID,
  migrateEosS04A,
  rollbackEosS04A,
} from "../src/addressing-migration.js";
import { S04A_UNKNOWN_FIELDS_POLICY, validateS04APersistedCollections } from "../src/addressing-persistence.js";
import type { GuestParty, GuestPartyMember, GuestRelationship } from "../src/addressing-schemas.js";
import { renderGuestSalutation } from "../src/addressing.js";
import { SCHEMA_VERSION } from "../src/constants.js";
import { PlatformError } from "../src/errors.js";
import { FIXTURE_IDS } from "../src/fixtures.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { emptySnapshot, normalizeSnapshot, type PlatformSnapshot } from "../src/store.js";

const NOW = "2026-09-06T16:00:00.000Z";
const LATER = "2026-09-06T17:00:00.000Z";
const PREEXISTING_PARTY = "aaaaaaaa-0000-4000-8000-000000000010";
const PREEXISTING_MEMBER = "aaaaaaaa-0000-4000-8000-000000000011";
const SECOND_HOUSEHOLD = "aaaaaaaa-0000-4000-8000-000000000020";
const SECOND_GUEST = "aaaaaaaa-0000-4000-8000-000000000021";
const POST_RELATIONSHIP = "aaaaaaaa-0000-4000-8000-000000000040";

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S04A_MIGRATION_ID}:${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function versioned(now = NOW) {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

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

function businessS04A(snapshot: PlatformSnapshot) {
  return {
    operationalGuests: snapshot.operationalGuests,
    guestHouseholds: snapshot.guestHouseholds,
    guestParties: snapshot.guestParties,
    guestPartyMembers: snapshot.guestPartyMembers,
    guestRelationships: snapshot.guestRelationships,
    companionEntitlements: snapshot.companionEntitlements,
    companionNominations: snapshot.companionNominations,
    responsibleAdultLinks: snapshot.responsibleAdultLinks,
    eventSeries: snapshot.eventSeries,
    eventSeriesMembers: snapshot.eventSeriesMembers,
    addressingReconciliationItems: snapshot.addressingReconciliationItems,
  };
}

function handParty(overrides: Partial<GuestParty> = {}): GuestParty {
  return {
    id: PREEXISTING_PARTY,
    organisationId: FIXTURE_IDS.orgMaison,
    clientId: FIXTURE_IDS.clientAlpha,
    eventId: FIXTURE_IDS.eventAlphaOne,
    type: "FAMILY_UNIT",
    label: "Pre-existing party",
    status: "ACTIVE",
    ...versioned(),
    ...overrides,
  };
}

function handMember(overrides: Partial<GuestPartyMember> = {}): GuestPartyMember {
  return {
    id: PREEXISTING_MEMBER,
    organisationId: FIXTURE_IDS.orgMaison,
    clientId: FIXTURE_IDS.clientAlpha,
    eventId: FIXTURE_IDS.eventAlphaOne,
    partyId: PREEXISTING_PARTY,
    guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
    role: "MEMBER",
    joinedAt: NOW,
    status: "ACTIVE",
    ...versioned(),
    ...overrides,
  };
}

function handRelationship(): GuestRelationship {
  return {
    id: POST_RELATIONSHIP,
    organisationId: FIXTURE_IDS.orgMaison,
    clientId: FIXTURE_IDS.clientAlpha,
    eventId: FIXTURE_IDS.eventAlphaOne,
    fromGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
    toGuestId: S04A_FIXTURE_IDS.guestOlufemi,
    type: "SPOUSE_PARTNER",
    direction: "BIDIRECTIONAL",
    source: "STAFF",
    visibility: "STAFF",
    status: "ACTIVE",
    reason: "post-migration staff relationship",
    ...versioned(LATER),
  };
}

function assertPersistenceError(error: unknown): asserts error is PlatformError {
  assert.ok(error instanceof PlatformError);
  assert.equal(error.code, "VALIDATION_FAILED");
  assert.equal(error.publicMessage, "The submitted information is not valid.");
  const serialized = `${error.message} ${(error.details ?? []).join(" ")}`;
  assert.doesNotMatch(serialized, /password|secret|token/i);
  assert.doesNotMatch(serialized, /Ẹ̀bùnolúwa|Alákíjà|Adéṣínà/);
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
    assert.deepEqual(normalised.s04aMigrationReceipts, []);
    assert.equal(normalised.operationalGuests[0]?.id, S04A_FIXTURE_IDS.guestEbunoluwa);
    assert.equal(normalised.operationalGuests[0]?.eventId, FIXTURE_IDS.eventAlphaOne);
    assert.equal(SCHEMA_VERSION, 1);
  });

  it("backfills HOUSEHOLD parties only from dedicated household records and is idempotent", () => {
    const first = migrateEosS04A(legacyHouseholdSnapshot(), NOW);
    const second = migrateEosS04A(first.snapshot, NOW);
    assert.equal(first.status, "APPLIED");
    assert.equal(second.status, "APPLIED");
    assert.equal(first.snapshot.guestParties.length, 1);
    assert.equal(second.snapshot.guestParties.length, 1);
    assert.equal(first.created.length, 5);
    assert.equal(second.created.length, 0);
    assert.equal(first.snapshot.guestParties[0]?.legacyHouseholdId, S04A_FIXTURE_IDS.householdAlakija);
    assert.equal(first.snapshot.guestParties[0]?.type, "HOUSEHOLD");
    assert.equal(first.snapshot.guestParties[0]?.principalGuestId, undefined);
    assert.equal(first.snapshot.guestPartyMembers.length, 4);
    assert.equal(second.snapshot.guestPartyMembers.length, 4);
    const guestIds = first.snapshot.operationalGuests.map((item) => item.id).sort();
    assert.deepEqual(
      first.snapshot.guestPartyMembers.map((item) => item.guestId).sort(),
      guestIds,
    );
    assert.ok(first.snapshot.guestPartyMembers.every((item) => item.partyId !== item.guestId));
    assert.equal(first.receipt?.status, "APPLIED");
    assert.equal(second.receipt?.id, first.receipt?.id);
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
    assert.equal(migrated.snapshot.guestParties.length, 0);
    assert.equal(migrated.snapshot.guestRelationships.length, 0);
    assert.equal(migrated.snapshot.operationalGuests[0]?.addressing, undefined);
    assert.equal(migrated.snapshot.operationalGuests[0]?.givenName.value, "Dr Ẹ̀bùnolúwa");
    const rendered = renderGuestSalutation(migrated.snapshot.operationalGuests[0]!);
    assert.doesNotMatch(rendered.text, /^Dr \(Mrs\)/);
    assert.match(rendered.text, /Dr Ẹ̀bùnolúwa/);
  });

  it("migrate then immediate rollback restores the complete legacy business snapshot", () => {
    const legacy = legacyHouseholdSnapshot();
    const migrated = migrateEosS04A(legacy, NOW);
    const rolled = rollbackEosS04A(migrated.snapshot);
    assert.equal(rolled.status, "ROLLED_BACK");
    assert.deepEqual(businessS04A(rolled.snapshot), businessS04A(legacy));
    assert.equal(rolled.snapshot.s04aMigrationReceipts[0]?.status, "ROLLED_BACK");
  });

  it("repeated migration creates no duplicates", () => {
    const first = migrateEosS04A(legacyHouseholdSnapshot(), NOW);
    const second = migrateEosS04A(first.snapshot, LATER);
    assert.equal(second.snapshot.guestParties.length, 1);
    assert.equal(second.snapshot.guestPartyMembers.length, 4);
    assert.equal(second.created.length, 0);
    assert.equal(second.snapshot.s04aMigrationReceipts.length, 1);
  });

  it("rollback preserves pre-existing S04A records", () => {
    const legacy = legacyHouseholdSnapshot();
    legacy.guestParties.push(handParty());
    const migrated = migrateEosS04A(legacy, NOW);
    const rolled = rollbackEosS04A(migrated.snapshot);
    assert.equal(rolled.status, "ROLLED_BACK");
    assert.equal(rolled.snapshot.guestParties.length, 1);
    assert.equal(rolled.snapshot.guestParties[0]?.id, PREEXISTING_PARTY);
    assert.equal(rolled.snapshot.guestPartyMembers.length, 0);
  });

  it("rollback preserves legitimate S04A writes made after migration", () => {
    const migrated = migrateEosS04A(legacyHouseholdSnapshot(), NOW);
    migrated.snapshot.guestRelationships.push(handRelationship());
    const rolled = rollbackEosS04A(migrated.snapshot);
    assert.equal(rolled.status, "ROLLED_BACK");
    assert.equal(rolled.snapshot.guestParties.length, 0);
    assert.equal(rolled.snapshot.guestRelationships.length, 1);
    assert.equal(rolled.snapshot.guestRelationships[0]?.id, POST_RELATIONSHIP);
  });

  it("rollback refuses if a migration-created record was subsequently modified", () => {
    const migrated = migrateEosS04A(legacyHouseholdSnapshot(), NOW);
    const party = migrated.snapshot.guestParties[0]!;
    party.version = 2;
    party.updatedAt = LATER;
    const before = structuredClone(migrated.snapshot);
    const rolled = rollbackEosS04A(migrated.snapshot);
    assert.equal(rolled.status, "REFUSED");
    assert.equal(rolled.reason?.code, "RECORD_MODIFIED");
    assert.deepEqual(businessS04A(rolled.snapshot), businessS04A(before));
  });

  it("a refused rollback performs no partial deletion", () => {
    const firstHousehold = fixtureS04AHousehold();
    const firstGuests = fixtureS04AGuests().filter((item) => item.householdId === firstHousehold.id);
    const secondHousehold = {
      ...firstHousehold,
      id: SECOND_HOUSEHOLD,
      key: "second",
      label: "Second household",
    };
    const secondGuest = {
      ...firstGuests[0]!,
      id: SECOND_GUEST,
      householdId: SECOND_HOUSEHOLD,
    };
    const snapshot = compatibleLegacySnapshot({
      guestHouseholds: [firstHousehold, secondHousehold],
      operationalGuests: [...firstGuests, secondGuest],
    });
    const migrated = migrateEosS04A(snapshot, NOW);
    assert.equal(migrated.snapshot.guestParties.length, 2);
    const secondParty = migrated.snapshot.guestParties.find((item) => item.legacyHouseholdId === SECOND_HOUSEHOLD)!;
    secondParty.version = 2;
    const before = structuredClone(migrated.snapshot);
    const rolled = rollbackEosS04A(migrated.snapshot);
    assert.equal(rolled.status, "REFUSED");
    assert.equal(rolled.removed.length, 0);
    assert.equal(rolled.snapshot.guestParties.length, 2);
    assert.deepEqual(
      rolled.snapshot.guestParties.map((item) => item.id).sort(),
      before.guestParties.map((item) => item.id).sort(),
    );
    assert.equal(rolled.snapshot.guestPartyMembers.length, before.guestPartyMembers.length);
  });

  it("rollback never clears unrelated S04A collections", () => {
    const fixtures = applyS04AFixtures(emptySnapshot());
    const before = structuredClone(fixtures);
    const rolled = rollbackEosS04A(fixtures);
    assert.equal(rolled.status, "REFUSED");
    assert.equal(rolled.reason?.code, "NO_APPLIED_RECEIPT");
    assert.deepEqual(businessS04A(rolled.snapshot), businessS04A(before));
    assert.equal(rolled.snapshot.companionEntitlements.length, 1);
    assert.equal(rolled.snapshot.responsibleAdultLinks.length, 2);
  });

  it("does not create an empty party when a household has no valid same-event members", () => {
    const household = fixtureS04AHousehold();
    const guest = {
      ...fixtureS04AGuests()[0]!,
      householdId: household.id,
      eventId: FIXTURE_IDS.eventAlphaTwo,
    };
    const result = migrateEosS04A(
      compatibleLegacySnapshot({ guestHouseholds: [household], operationalGuests: [guest] }),
      NOW,
    );
    assert.equal(result.status, "APPLIED");
    assert.equal(result.snapshot.guestParties.length, 0);
    assert.equal(result.created.length, 0);
    assert.ok(result.warnings.some((item) => item.code === "HOUSEHOLD_HAS_NO_VALID_MEMBERS"));
    assert.ok(result.warnings.some((item) => item.code === "GUEST_HOUSEHOLD_EVENT_MISMATCH"));
    assert.ok(result.warnings.every((item) => !("name" in item)));
  });

  it("records a missing household without creating membership", () => {
    const guest = {
      ...fixtureS04AGuests()[0]!,
      householdId: S04A_FIXTURE_IDS.householdAlakija,
    };
    const result = migrateEosS04A(compatibleLegacySnapshot({ operationalGuests: [guest] }), NOW);
    assert.equal(result.snapshot.guestParties.length, 0);
    assert.equal(result.snapshot.guestPartyMembers.length, 0);
    assert.ok(result.warnings.some((item) => item.code === "MISSING_HOUSEHOLD" && item.subjectId === guest.id));
  });

  it("reuses a matching legacy household party and refuses unsafe scope reuse", () => {
    const legacy = legacyHouseholdSnapshot();
    const validReuse = handParty({
      id: "aaaaaaaa-0000-4000-8000-000000000050",
      type: "HOUSEHOLD",
      legacyHouseholdId: S04A_FIXTURE_IDS.householdAlakija,
      label: "Alákíjà household",
    });
    legacy.guestParties.push(validReuse);
    const reused = migrateEosS04A(legacy, NOW);
    assert.equal(reused.status, "APPLIED");
    assert.equal(reused.snapshot.guestParties.length, 1);
    assert.equal(reused.reused[0]?.id, validReuse.id);
    assert.ok(reused.created.every((item) => item.collection === "guestPartyMembers"));

    const mismatched = legacyHouseholdSnapshot();
    mismatched.guestParties.push(
      handParty({
        id: "aaaaaaaa-0000-4000-8000-000000000051",
        type: "HOUSEHOLD",
        eventId: FIXTURE_IDS.eventAlphaTwo,
        legacyHouseholdId: S04A_FIXTURE_IDS.householdAlakija,
      }),
    );
    const refusedReuse = migrateEosS04A(mismatched, NOW);
    assert.equal(refusedReuse.status, "APPLIED");
    assert.equal(refusedReuse.snapshot.guestParties.length, 1);
    assert.equal(refusedReuse.snapshot.guestPartyMembers.length, 0);
    assert.ok(refusedReuse.exceptions.some((item) => item.code === "REUSE_SCOPE_MISMATCH"));
  });

  it("keeps duplicate active membership idempotent and does not resurrect historical membership", () => {
    const first = migrateEosS04A(legacyHouseholdSnapshot(), NOW);
    const again = migrateEosS04A(first.snapshot, LATER);
    assert.ok(again.skipped.some((item) => item.code === "DUPLICATE_ACTIVE_MEMBERSHIP"));
    assert.equal(again.snapshot.guestPartyMembers.length, 4);

    const historical = first.snapshot;
    const member = historical.guestPartyMembers[0]!;
    member.status = "LEFT";
    member.leftAt = LATER;
    const afterHistorical = migrateEosS04A(historical, LATER);
    assert.equal(afterHistorical.snapshot.guestPartyMembers.length, 4);
    assert.equal(afterHistorical.snapshot.guestPartyMembers.filter((item) => item.guestId === member.guestId).length, 1);
    assert.ok(afterHistorical.skipped.some((item) => item.code === "HISTORICAL_MEMBERSHIP_PRESENT"));
  });

  it("fails safely on a deterministic-id collision with an unrelated record", () => {
    const legacy = legacyHouseholdSnapshot();
    const collisionId = deterministicUuid(`party:${S04A_FIXTURE_IDS.householdAlakija}`);
    legacy.guestParties.push(
      handParty({
        id: collisionId,
        legacyHouseholdId: undefined,
        label: "Unrelated collision",
      }),
    );
    const before = structuredClone(legacy);
    const result = migrateEosS04A(legacy, NOW);
    assert.equal(result.status, "FAILED");
    assert.equal(result.error?.code, "DETERMINISTIC_ID_COLLISION");
    assert.equal(result.snapshot.guestParties.length, 1);
    assert.equal(result.snapshot.guestParties[0]?.id, collisionId);
    assert.equal(result.snapshot.guestPartyMembers.length, 0);
    assert.deepEqual(businessS04A(result.snapshot), businessS04A(before));
  });

  it("round-trips valid S04A records through memory and postgres document stores", async () => {
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
    assert.equal(after.operationalGuests.find((item) => item.id === S04A_FIXTURE_IDS.guestAdesina)?.id, S04A_FIXTURE_IDS.guestAdesina);
  });

  it("rejects invalid S04A records at the persistence boundary without partial hydration", () => {
    assert.equal(S04A_UNKNOWN_FIELDS_POLICY, "REJECT");
    const valid = applyS04AFixtures(emptySnapshot());
    const store = new MemoryPlatformStore();
    store.replace(valid);
    const invalidEnum = structuredClone(valid);
    (invalidEnum.guestParties[0] as { status: string }).status = "NOT_A_STATUS";
    assert.throws(() => store.replace(invalidEnum), (error: unknown) => {
      assertPersistenceError(error);
      return true;
    });
    assert.deepEqual(store.snapshot().guestParties, valid.guestParties);

    const missingEventId = structuredClone(valid);
    delete (missingEventId.guestPartyMembers[0] as { eventId?: string }).eventId;
    assert.throws(() => validateS04APersistedCollections(missingEventId), (error: unknown) => {
      assertPersistenceError(error);
      return true;
    });

    const badSchemaVersion = structuredClone(valid);
    (badSchemaVersion.guestParties[0] as { schemaVersion: number }).schemaVersion = 99;
    assert.throws(() => validateS04APersistedCollections(badSchemaVersion), (error: unknown) => {
      assertPersistenceError(error);
      return true;
    });

    const badVersion = structuredClone(valid);
    badVersion.guestParties[0]!.version = 0;
    assert.throws(() => validateS04APersistedCollections(badVersion), (error: unknown) => {
      assertPersistenceError(error);
      return true;
    });

    const malformedMembership = structuredClone(valid);
    malformedMembership.guestPartyMembers[0] = handMember({
      id: malformedMembership.guestPartyMembers[0]!.id,
      partyId: malformedMembership.guestPartyMembers[0]!.guestId,
      guestId: malformedMembership.guestPartyMembers[0]!.guestId,
    });
    assert.throws(() => validateS04APersistedCollections(malformedMembership), (error: unknown) => {
      assertPersistenceError(error);
      return true;
    });

    const namedUnnamed = structuredClone(valid);
    namedUnnamed.companionEntitlements[0] = {
      ...namedUnnamed.companionEntitlements[0]!,
      nominatedGuestId: S04A_FIXTURE_IDS.guestAdesina,
    };
    assert.throws(() => validateS04APersistedCollections(namedUnnamed), (error: unknown) => {
      assertPersistenceError(error);
      return true;
    });

    const materialised = structuredClone(valid);
    materialised.companionNominations.push({
      id: "aaaaaaaa-0000-4000-8000-000000000060",
      organisationId: FIXTURE_IDS.orgMaison,
      clientId: FIXTURE_IDS.clientAlpha,
      eventId: FIXTURE_IDS.eventAlphaOne,
      entitlementId: S04A_FIXTURE_IDS.entitlementPlusOne,
      state: "MATERIALISED",
      reason: "missing guest",
      ...versioned(),
    });
    assert.throws(() => validateS04APersistedCollections(materialised), (error: unknown) => {
      assertPersistenceError(error);
      return true;
    });

    const extraIdentity = structuredClone(valid);
    (extraIdentity.guestParties[0] as { personId?: string }).personId = S04A_FIXTURE_IDS.guestEbunoluwa;
    assert.throws(() => validateS04APersistedCollections(extraIdentity), (error: unknown) => {
      assertPersistenceError(error);
      return true;
    });
  });

  it("does not persist invalid S04A JSON through postgres hydrate", async () => {
    const valid = applyS04AFixtures(emptySnapshot());
    const db = new MemoryPlatformPg();
    const first = await PostgresPlatformStore.open(db);
    await first.replaceAsync(valid);
    const partyDoc = db.documents.find((row) => row.collection === "guestParties");
    assert.ok(partyDoc);
    (partyDoc.body as { status: string }).status = "CORRUPT";
    await assert.rejects(() => PostgresPlatformStore.open(db), (error: unknown) => {
      assertPersistenceError(error);
      return true;
    });
  });

  it("loads a valid legacy guest without S04A fields and a valid Yorùbá addressing guest", () => {
    const [legacy] = fixtureS04AGuests();
    assert.ok(legacy);
    const { addressing: _addressing, ageBand: _ageBand, childReadiness: _childReadiness, ...legacyGuest } = legacy;
    const store = new MemoryPlatformStore();
    store.replace(compatibleLegacySnapshot({ operationalGuests: [legacyGuest] }));
    const loaded = store.snapshot().operationalGuests[0];
    assert.equal(loaded?.id, S04A_FIXTURE_IDS.guestEbunoluwa);
    assert.equal(loaded?.addressing, undefined);
    assert.equal(loaded?.ageBand, undefined);
    assert.equal(loaded?.childReadiness, undefined);

    const titled = applyS04AFixtures(emptySnapshot());
    store.replace(titled);
    const ebun = store.snapshot().operationalGuests.find((item) => item.id === S04A_FIXTURE_IDS.guestEbunoluwa);
    assert.equal(ebun?.addressing?.honorific, "Dr (Mrs)");
    assert.equal(ebun?.addressing?.addressingStatus, "HOST_CONFIRMED");
    assert.match(ebun?.givenName.value ?? "", /Ẹ̀bùnolúwa/);
    assert.doesNotMatch(JSON.stringify(store.snapshot().operationalGuests[0]?.addressing), /inferred/);
  });

  it("rejects invalid OperationalGuest S04A extensions without a partial snapshot", () => {
    const valid = applyS04AFixtures(emptySnapshot());
    const store = new MemoryPlatformStore();
    store.replace(valid);
    const before = store.snapshot();

    const unsourcedTitle = structuredClone(valid);
    unsourcedTitle.operationalGuests[0] = {
      ...unsourcedTitle.operationalGuests[0]!,
      addressing: {
        professionalTitle: "Barrister",
        addressingStatus: "UNVERIFIED",
        addressingSource: "STAFF",
      },
    };
    assert.throws(() => store.replace(unsourcedTitle), (error: unknown) => {
      assertPersistenceError(error);
      assert.ok((error.details ?? []).some((item) => item.startsWith("operationalGuests[0].addressing")));
      return true;
    });
    assert.deepEqual(store.snapshot(), before);

    const badEnum = structuredClone(valid);
    (badEnum.operationalGuests[0] as { addressing: { addressingStatus: string } }).addressing = {
      ...(badEnum.operationalGuests[0]!.addressing ?? {
        addressingStatus: "UNVERIFIED",
        addressingSource: "STAFF",
      }),
      addressingStatus: "GUESSED",
    };
    assert.throws(() => validateS04APersistedCollections(badEnum), (error: unknown) => {
      assertPersistenceError(error);
      assert.ok((error.details ?? []).some((item) => item.includes("addressingStatus") && item.includes("invalid_enum_value")));
      return true;
    });

    const badAge = structuredClone(valid);
    (badAge.operationalGuests[0] as { ageBand: string }).ageBand = "TODDLER";
    assert.throws(() => validateS04APersistedCollections(badAge), (error: unknown) => {
      assertPersistenceError(error);
      assert.ok((error.details ?? []).some((item) => item.startsWith("operationalGuests[0].ageBand")));
      return true;
    });

    const badReadiness = structuredClone(valid);
    (badReadiness.operationalGuests[2] as { childReadiness: string }).childReadiness = "READY_ENOUGH";
    assert.throws(() => validateS04APersistedCollections(badReadiness), (error: unknown) => {
      assertPersistenceError(error);
      assert.ok((error.details ?? []).some((item) => item.includes("childReadiness")));
      return true;
    });

    const unknownAddressingField = structuredClone(valid);
    (unknownAddressingField.operationalGuests[0] as { addressing: Record<string, unknown> }).addressing = {
      ...unknownAddressingField.operationalGuests[0]!.addressing,
      personId: S04A_FIXTURE_IDS.guestEbunoluwa,
    };
    assert.throws(() => validateS04APersistedCollections(unknownAddressingField), (error: unknown) => {
      assertPersistenceError(error);
      assert.ok((error.details ?? []).some((item) => item.includes("unrecognized_keys")));
      return true;
    });

    const mixed = structuredClone(valid);
    (mixed.operationalGuests[1] as { ageBand: string }).ageBand = "NOT_AN_AGE";
    assert.throws(() => store.replace(mixed), (error: unknown) => {
      assertPersistenceError(error);
      return true;
    });
    assert.deepEqual(store.snapshot(), before);
    assert.equal(store.snapshot().operationalGuests[1]?.ageBand, "ADULT");
  });
});
