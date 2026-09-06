import { z } from "zod";
import {
  AddressingReconciliationItemSchema,
  CompanionEntitlementSchema,
  CompanionNominationSchema,
  EventSeriesMemberSchema,
  EventSeriesSchema,
  GuestPartyMemberSchema,
  GuestPartySchema,
  GuestRelationshipSchema,
  ResponsibleAdultLinkSchema,
  S04A_CANONICAL_COLLECTIONS,
  S04AMigrationReceiptSchema,
} from "./addressing-schemas.js";
import { PlatformError } from "./errors.js";
import type { PlatformSnapshot } from "./store.js";

/**
 * Unknown fields on S04A canonical records are rejected. The runtime schemas
 * are `.strict()`, and persistence uses those schemas without strip or coerce.
 */
export const S04A_UNKNOWN_FIELDS_POLICY = "REJECT" as const;

export const S04A_JOURNAL_COLLECTION = "s04aMigrationReceipts" as const;

export const S04A_STORE_COLLECTIONS = [
  ...S04A_CANONICAL_COLLECTIONS,
  S04A_JOURNAL_COLLECTION,
] as const;

export type S04AStoreCollection = (typeof S04A_STORE_COLLECTIONS)[number];

const S04A_COLLECTION_SCHEMAS = {
  guestParties: z.array(GuestPartySchema),
  guestPartyMembers: z.array(GuestPartyMemberSchema),
  guestRelationships: z.array(GuestRelationshipSchema),
  companionEntitlements: z.array(CompanionEntitlementSchema),
  companionNominations: z.array(CompanionNominationSchema),
  responsibleAdultLinks: z.array(ResponsibleAdultLinkSchema),
  eventSeries: z.array(EventSeriesSchema),
  eventSeriesMembers: z.array(EventSeriesMemberSchema),
  addressingReconciliationItems: z.array(AddressingReconciliationItemSchema),
  s04aMigrationReceipts: z.array(S04AMigrationReceiptSchema),
} as const;

function issuePath(path: ReadonlyArray<PropertyKey>): string {
  return path
    .map((part) => (typeof part === "number" ? `[${part}]` : `.${String(part)}`))
    .join("");
}

/**
 * Validates the nine S04A collections plus the migration journal.
 * Reports collection path and Zod issue code only — never record bodies.
 */
export function validateS04APersistedCollections(snapshot: PlatformSnapshot): void {
  const details: string[] = [];
  for (const collection of S04A_STORE_COLLECTIONS) {
    const parsed = S04A_COLLECTION_SCHEMAS[collection].safeParse(snapshot[collection]);
    if (parsed.success) continue;
    for (const issue of parsed.error.issues) {
      details.push(`${collection}${issuePath(issue.path)}:${issue.code}`);
      if (details.length >= 32) break;
    }
    if (details.length >= 32) break;
  }
  if (details.length === 0) return;
  throw new PlatformError("VALIDATION_FAILED", "S04A persisted collections failed validation.", {
    publicMessage: "The submitted information is not valid.",
    details,
  });
}
