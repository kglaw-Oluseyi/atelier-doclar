import { z } from "zod";
import { PlatformError } from "./errors.js";
import type { PlatformSnapshot } from "./store.js";
import {
  EventVenueFactSchema,
  EventVenueSchema,
  LayoutEditorLeaseSchema,
  LayoutRevisionSchema,
  LayoutSchema,
  S05_CANONICAL_COLLECTIONS,
  S05MigrationReceiptSchema,
  VenueEvidenceAssetSchema,
  VenueFactSchema,
  VenueSchema,
} from "./venue-schemas.js";

export const S05_UNKNOWN_FIELDS_POLICY = "REJECT" as const;
export const S05_JOURNAL_COLLECTION = "s05MigrationReceipts" as const;
export const S05_STORE_COLLECTIONS = [...S05_CANONICAL_COLLECTIONS, S05_JOURNAL_COLLECTION] as const;
export type S05StoreCollection = (typeof S05_STORE_COLLECTIONS)[number];

const S05_COLLECTION_SCHEMAS = {
  venues: z.array(VenueSchema),
  venueFacts: z.array(VenueFactSchema),
  eventVenues: z.array(EventVenueSchema),
  eventVenueFacts: z.array(EventVenueFactSchema),
  layouts: z.array(LayoutSchema),
  layoutRevisions: z.array(LayoutRevisionSchema),
  layoutEditorLeases: z.array(LayoutEditorLeaseSchema),
  venueEvidenceAssets: z.array(VenueEvidenceAssetSchema),
  s05MigrationReceipts: z.array(S05MigrationReceiptSchema),
} as const;

function issuePath(path: ReadonlyArray<PropertyKey>): string {
  return path.map((part) => (typeof part === "number" ? `[${part}]` : `.${String(part)}`)).join("");
}

export function validateS05PersistedCollections(snapshot: PlatformSnapshot): void {
  const details: string[] = [];
  for (const collection of S05_STORE_COLLECTIONS) {
    const parsed = S05_COLLECTION_SCHEMAS[collection].safeParse(snapshot[collection] ?? []);
    if (parsed.success) continue;
    for (const issue of parsed.error.issues) {
      details.push(`${collection}${issuePath(issue.path)}:${issue.code}`);
    }
  }
  if (details.length > 0) {
    throw new PlatformError("VALIDATION_FAILED", "S05 collections failed persistence validation", { details });
  }
}
