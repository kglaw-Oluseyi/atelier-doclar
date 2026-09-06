import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import type {
  GuestParty,
  GuestPartyMember,
  S04ACanonicalCollection,
  S04ACreatedRecordRef,
  S04AMigrationNote,
  S04AMigrationReceipt,
} from "./addressing-schemas.js";
import { validateS04APersistedCollections } from "./addressing-persistence.js";
import { emptySnapshot, normalizeSnapshot, type PlatformSnapshot } from "./store.js";

export const EOS_S04A_MIGRATION_ID = "EOS-S04A-ADDRESSING-PARTIES-V1" as const;

export type S04AMigrationResult = {
  status: "APPLIED" | "FAILED";
  snapshot: PlatformSnapshot;
  created: S04ACreatedRecordRef[];
  reused: S04ACreatedRecordRef[];
  skipped: S04AMigrationNote[];
  warnings: S04AMigrationNote[];
  exceptions: S04AMigrationNote[];
  receipt?: S04AMigrationReceipt;
  error?: { code: string; message: string };
};

export type S04ARollbackResult = {
  status: "ROLLED_BACK" | "REFUSED";
  snapshot: PlatformSnapshot;
  receiptId?: string;
  removed: S04ACreatedRecordRef[];
  reason?: { code: string; message: string };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S04A_MIGRATION_ID}:${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function versioned(now: string) {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function ref(collection: S04ACanonicalCollection, id: string, version: number): S04ACreatedRecordRef {
  return { collection, id, version };
}

function note(
  code: string,
  subjectType: S04AMigrationNote["subjectType"],
  subjectId?: string,
): S04AMigrationNote {
  return subjectId ? { code, subjectType, subjectId } : { code, subjectType };
}

function failed(
  input: PlatformSnapshot,
  code: string,
  message: string,
  extras?: Pick<S04AMigrationResult, "warnings" | "exceptions" | "skipped">,
): S04AMigrationResult {
  return {
    status: "FAILED",
    snapshot: normalizeSnapshot(structuredClone(input)),
    created: [],
    reused: [],
    skipped: extras?.skipped ?? [],
    warnings: extras?.warnings ?? [],
    exceptions: extras?.exceptions ?? [],
    error: { code, message },
  };
}

function partyScopeMatchesHousehold(party: GuestParty, household: PlatformSnapshot["guestHouseholds"][number]): boolean {
  return (
    party.organisationId === household.organisationId &&
    party.clientId === household.clientId &&
    party.eventId === household.eventId &&
    party.type === "HOUSEHOLD"
  );
}

function latestAppliedReceipt(snapshot: PlatformSnapshot): S04AMigrationReceipt | undefined {
  return snapshot.s04aMigrationReceipts
    .filter((item) => item.migrationId === EOS_S04A_MIGRATION_ID && item.status === "APPLIED")
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
    .at(-1);
}

function findReceipt(snapshot: PlatformSnapshot, receiptId?: string): S04AMigrationReceipt | undefined {
  if (receiptId) {
    return snapshot.s04aMigrationReceipts.find((item) => item.id === receiptId);
  }
  return latestAppliedReceipt(snapshot);
}

function recordById<T extends { id: string }>(records: T[], id: string): T | undefined {
  return records.find((item) => item.id === id);
}

/**
 * Backfills HOUSEHOLD parties only from dedicated guestHouseholds / householdId.
 * Does not infer principals, titles, or parties from names or contact details.
 * Ownership of created records is recorded on a typed receipt — never inferred
 * from a deterministic-looking identifier.
 */
export function migrateEosS04A(input: PlatformSnapshot, now: string): S04AMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  validateS04APersistedCollections(original);

  const snap = structuredClone(original);
  const created: S04ACreatedRecordRef[] = [];
  const reused: S04ACreatedRecordRef[] = [];
  const skipped: S04AMigrationNote[] = [];
  const warnings: S04AMigrationNote[] = [];
  const exceptions: S04AMigrationNote[] = [];

  for (const guest of snap.operationalGuests) {
    if (guest.householdId && !snap.guestHouseholds.some((household) => household.id === guest.householdId)) {
      warnings.push(note("MISSING_HOUSEHOLD", "GUEST", guest.id));
    }
  }

  for (const household of snap.guestHouseholds) {
    const mismatched = snap.operationalGuests.filter(
      (guest) => guest.householdId === household.id && guest.eventId !== household.eventId,
    );
    for (const guest of mismatched) {
      warnings.push(note("GUEST_HOUSEHOLD_EVENT_MISMATCH", "GUEST", guest.id));
    }

    const validMembers = snap.operationalGuests.filter(
      (guest) => guest.householdId === household.id && guest.eventId === household.eventId,
    );
    if (validMembers.length === 0) {
      warnings.push(note("HOUSEHOLD_HAS_NO_VALID_MEMBERS", "HOUSEHOLD", household.id));
      skipped.push(note("HOUSEHOLD_HAS_NO_VALID_MEMBERS", "HOUSEHOLD", household.id));
      continue;
    }

    const existingByLegacy = snap.guestParties.find((item) => item.legacyHouseholdId === household.id);
    if (existingByLegacy) {
      if (!partyScopeMatchesHousehold(existingByLegacy, household)) {
        exceptions.push(note("REUSE_SCOPE_MISMATCH", "PARTY", existingByLegacy.id));
        skipped.push(note("REUSE_SCOPE_MISMATCH", "HOUSEHOLD", household.id));
        continue;
      }
      reused.push(ref("guestParties", existingByLegacy.id, existingByLegacy.version));
      const membershipError = addMembers(snap, existingByLegacy, validMembers, now, created, skipped);
      if (membershipError) {
        return failed(input, membershipError.code, membershipError.message, { warnings, exceptions, skipped });
      }
      continue;
    }

    const partyId = deterministicUuid(`party:${household.id}`);
    const colliding = recordById(snap.guestParties, partyId);
    if (colliding) {
      return failed(input, "DETERMINISTIC_ID_COLLISION", "A deterministic S04A identifier collided with an unrelated record.", {
        warnings,
        exceptions: [...exceptions, note("DETERMINISTIC_ID_COLLISION", "PARTY", colliding.id)],
        skipped,
      });
    }

    const party: GuestParty = {
      id: partyId,
      organisationId: household.organisationId,
      clientId: household.clientId,
      eventId: household.eventId,
      type: "HOUSEHOLD",
      label: household.label,
      status: "ACTIVE",
      legacyHouseholdId: household.id,
      ...versioned(now),
    };
    snap.guestParties.push(party);
    created.push(ref("guestParties", party.id, party.version));
    const membershipError = addMembers(snap, party, validMembers, now, created, skipped);
    if (membershipError) {
      return failed(input, membershipError.code, membershipError.message, { warnings, exceptions, skipped });
    }
  }

  let receipt: S04AMigrationReceipt | undefined;
  if (created.length > 0) {
    receipt = {
      id: deterministicUuid(`receipt:${now}:${created.map((item) => `${item.collection}:${item.id}`).sort().join(",")}`),
      migrationId: EOS_S04A_MIGRATION_ID,
      status: "APPLIED",
      createdRecords: created,
      notes: [...warnings, ...exceptions, ...skipped],
      ...versioned(now),
    };
    snap.s04aMigrationReceipts.push(receipt);
  } else {
    receipt = latestAppliedReceipt(snap);
  }

  validateS04APersistedCollections(snap);
  return {
    status: "APPLIED",
    snapshot: snap,
    created,
    reused,
    skipped,
    warnings,
    exceptions,
    receipt,
  };
}

function addMembers(
  snap: PlatformSnapshot,
  party: GuestParty,
  guests: PlatformSnapshot["operationalGuests"],
  now: string,
  created: S04ACreatedRecordRef[],
  skipped: S04AMigrationNote[],
): { code: string; message: string } | undefined {
  for (const guest of guests) {
    const existingMembership = snap.guestPartyMembers.find(
      (item) => item.partyId === party.id && item.guestId === guest.id,
    );
    if (existingMembership) {
      skipped.push(
        note(
          existingMembership.status === "ACTIVE" ? "DUPLICATE_ACTIVE_MEMBERSHIP" : "HISTORICAL_MEMBERSHIP_PRESENT",
          "PARTY_MEMBER",
          existingMembership.id,
        ),
      );
      continue;
    }

    const memberId = deterministicUuid(`member:${party.id}:${guest.id}`);
    const colliding = recordById(snap.guestPartyMembers, memberId);
    if (colliding) {
      return {
        code: "DETERMINISTIC_ID_COLLISION",
        message: "A deterministic S04A identifier collided with an unrelated record.",
      };
    }

    const member: GuestPartyMember = {
      id: memberId,
      organisationId: guest.organisationId,
      clientId: guest.clientId,
      eventId: guest.eventId,
      partyId: party.id,
      guestId: guest.id,
      role: "MEMBER",
      joinedAt: now,
      status: "ACTIVE",
      ...versioned(now),
    };
    snap.guestPartyMembers.push(member);
    created.push(ref("guestPartyMembers", member.id, member.version));
  }
  return undefined;
}

/**
 * Removes only records listed on a migration receipt, and only when each
 * listed record still has the recorded version and has not acquired unsafe
 * dependencies. Pre-existing and later legitimate S04A records are kept.
 * Rollback never clears a whole collection. Refusal leaves canonical data
 * unchanged.
 *
 * Safe when: an APPLIED receipt exists; every listed record is absent or still
 * at the recorded version; no unlisted member or later dependency references a
 * listed party. Unsafe, and therefore refused, when a listed record was
 * changed or acquired dependencies that make removal unsafe.
 */
export function rollbackEosS04A(input: PlatformSnapshot, receiptId?: string): S04ARollbackResult {
  const original = normalizeSnapshot(structuredClone(input));
  validateS04APersistedCollections(original);

  const receipt = findReceipt(original, receiptId);
  if (!receipt) {
    return {
      status: "REFUSED",
      snapshot: original,
      removed: [],
      reason: { code: "NO_APPLIED_RECEIPT", message: "No applied EOS-S04A migration receipt is available to roll back." },
    };
  }
  if (receipt.status !== "APPLIED") {
    return {
      status: "REFUSED",
      snapshot: original,
      receiptId: receipt.id,
      removed: [],
      reason: { code: "RECEIPT_NOT_APPLIED", message: "The nominated migration receipt is not in an applied state." },
    };
  }

  const createdIds = new Set(receipt.createdRecords.map((item) => `${item.collection}:${item.id}`));
  for (const listed of receipt.createdRecords) {
    const records = original[listed.collection] as Array<{ id: string; version: number }>;
    const current = recordById(records, listed.id);
    if (!current) continue;
    if (current.version !== listed.version) {
      return {
        status: "REFUSED",
        snapshot: original,
        receiptId: receipt.id,
        removed: [],
        reason: { code: "RECORD_MODIFIED", message: "A migration-created record was subsequently changed." },
      };
    }
  }

  for (const listed of receipt.createdRecords.filter((item) => item.collection === "guestParties")) {
    const extraMembers = original.guestPartyMembers.filter(
      (member) => member.partyId === listed.id && !createdIds.has(`guestPartyMembers:${member.id}`),
    );
    if (extraMembers.length > 0) {
      return {
        status: "REFUSED",
        snapshot: original,
        receiptId: receipt.id,
        removed: [],
        reason: {
          code: "UNSAFE_DEPENDENCY",
          message: "A migration-created record acquired dependencies that make removal unsafe.",
        },
      };
    }
  }

  const next = structuredClone(original);
  const removed: S04ACreatedRecordRef[] = [];
  for (const listed of receipt.createdRecords) {
    const records = next[listed.collection] as Array<{ id: string; version: number }>;
    const index = records.findIndex((item) => item.id === listed.id);
    if (index === -1) continue;
    records.splice(index, 1);
    removed.push(listed);
  }

  const receiptIndex = next.s04aMigrationReceipts.findIndex((item) => item.id === receipt.id);
  if (receiptIndex !== -1) {
    const current = next.s04aMigrationReceipts[receiptIndex]!;
    next.s04aMigrationReceipts[receiptIndex] = {
      ...current,
      status: "ROLLED_BACK",
      version: current.version + 1,
      updatedAt: current.updatedAt,
    };
  }

  validateS04APersistedCollections(next);
  return {
    status: "ROLLED_BACK",
    snapshot: next,
    receiptId: receipt.id,
    removed,
  };
}

export function compatibleLegacySnapshot(input: Partial<PlatformSnapshot>): PlatformSnapshot {
  return normalizeSnapshot({
    ...emptySnapshot(),
    ...input,
  });
}
