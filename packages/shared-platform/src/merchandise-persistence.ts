import { z } from "zod";
import { PlatformError } from "./errors.js";
import {
  CapMeasurementSchema,
  ExternalContactLinkSchema,
  FulfilmentSchema,
  GuestOfferSchema,
  GuestParticipationSchema,
  HostOfferRuleSchema,
  ItemVariantSchema,
  MerchandiseCohortMemberSchema,
  MerchandiseCohortSchema,
  MerchandiseCollectionSchema,
  MerchandiseExceptionSchema,
  MerchandiseItemSchema,
  S04C_CANONICAL_COLLECTIONS,
  S04CMigrationReceiptSchema,
  VendorAssignmentSchema,
  VendorSessionSchema,
  VendorUpdateSchema,
  MerchandiseGuestGrantSchema,
  MerchandiseGuestSessionSchema,
} from "./merchandise-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export const S04C_UNKNOWN_FIELDS_POLICY = "REJECT" as const;
export const S04C_JOURNAL_COLLECTION = "s04cMigrationReceipts" as const;
export const S04C_STORE_COLLECTIONS = [...S04C_CANONICAL_COLLECTIONS, S04C_JOURNAL_COLLECTION] as const;
export type S04CStoreCollection = (typeof S04C_STORE_COLLECTIONS)[number];

const S04C_COLLECTION_SCHEMAS = {
  merchandiseCollections: z.array(MerchandiseCollectionSchema),
  merchandiseItems: z.array(MerchandiseItemSchema),
  merchandiseItemVariants: z.array(ItemVariantSchema),
  merchandiseCohorts: z.array(MerchandiseCohortSchema),
  merchandiseCohortMembers: z.array(MerchandiseCohortMemberSchema),
  hostOfferRules: z.array(HostOfferRuleSchema),
  guestOffers: z.array(GuestOfferSchema),
  guestParticipations: z.array(GuestParticipationSchema),
  capMeasurements: z.array(CapMeasurementSchema),
  merchandiseFulfilments: z.array(FulfilmentSchema),
  vendorAssignments: z.array(VendorAssignmentSchema),
  vendorUpdates: z.array(VendorUpdateSchema),
  vendorSessions: z.array(VendorSessionSchema),
  merchandiseGuestGrants: z.array(MerchandiseGuestGrantSchema),
  merchandiseGuestSessions: z.array(MerchandiseGuestSessionSchema),
  externalContactLinks: z.array(ExternalContactLinkSchema),
  merchandiseExceptions: z.array(MerchandiseExceptionSchema),
  s04cMigrationReceipts: z.array(S04CMigrationReceiptSchema),
} as const;

function issuePath(path: ReadonlyArray<PropertyKey>): string {
  return path.map((part) => (typeof part === "number" ? `[${part}]` : `.${String(part)}`)).join("");
}

export function validateS04CPersistedCollections(snapshot: PlatformSnapshot): void {
  const details: string[] = [];
  for (const collection of S04C_STORE_COLLECTIONS) {
    const parsed = S04C_COLLECTION_SCHEMAS[collection].safeParse(snapshot[collection] ?? []);
    if (parsed.success) continue;
    for (const issue of parsed.error.issues) {
      details.push(`${collection}${issuePath(issue.path)}:${issue.code}`);
      if (details.length >= 32) break;
    }
    if (details.length >= 32) break;
  }
  if (details.length > 0) {
    throw new PlatformError("VALIDATION_FAILED", "S04C persisted collections failed schema validation", { details });
  }
}
