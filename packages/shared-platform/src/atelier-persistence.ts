import { z } from "zod";
import { PlatformError } from "./errors.js";
import {
  ApprovedAssetEditionSchema,
  AtelierAccessGrantSchema,
  AtelierChapterSchema,
  AtelierSessionSchema,
  BlueprintGenesisSchema,
  BudgetAssuranceProjectionSchema,
  ContingencyAssuranceProjectionSchema,
  CuratedMediaSetSchema,
  CuratedUpdateSchema,
  EventAtelierSchema,
  EventNarrativeEditionSchema,
  GuestJourneyProjectionSchema,
  HostDecisionReceiptSchema,
  HostDecisionRequestSchema,
  HostMilestoneProjectionSchema,
  MagicLinkChallengeSchema,
  S04E_CANONICAL_COLLECTIONS,
  S04EMigrationReceiptSchema,
  VendorEnsembleProjectionSchema,
} from "./atelier-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export const S04E_UNKNOWN_FIELDS_POLICY = "REJECT" as const;
export const S04E_JOURNAL_COLLECTION = "s04eMigrationReceipts" as const;
export const S04E_STORE_COLLECTIONS = [...S04E_CANONICAL_COLLECTIONS, S04E_JOURNAL_COLLECTION] as const;
export type S04EStoreCollection = (typeof S04E_STORE_COLLECTIONS)[number];

const S04E_COLLECTION_SCHEMAS = {
  eventAteliers: z.array(EventAtelierSchema),
  blueprintGenesises: z.array(BlueprintGenesisSchema),
  atelierChapters: z.array(AtelierChapterSchema),
  eventNarrativeEditions: z.array(EventNarrativeEditionSchema),
  curatedMediaSets: z.array(CuratedMediaSetSchema),
  approvedAssetEditions: z.array(ApprovedAssetEditionSchema),
  guestJourneyProjections: z.array(GuestJourneyProjectionSchema),
  hostMilestoneProjections: z.array(HostMilestoneProjectionSchema),
  budgetAssuranceProjections: z.array(BudgetAssuranceProjectionSchema),
  vendorEnsembleProjections: z.array(VendorEnsembleProjectionSchema),
  contingencyAssuranceProjections: z.array(ContingencyAssuranceProjectionSchema),
  hostDecisionRequests: z.array(HostDecisionRequestSchema),
  hostDecisionReceipts: z.array(HostDecisionReceiptSchema),
  curatedUpdates: z.array(CuratedUpdateSchema),
  atelierAccessGrants: z.array(AtelierAccessGrantSchema),
  magicLinkChallenges: z.array(MagicLinkChallengeSchema),
  atelierSessions: z.array(AtelierSessionSchema),
  s04eMigrationReceipts: z.array(S04EMigrationReceiptSchema),
} as const;

function issuePath(path: ReadonlyArray<PropertyKey>): string {
  return path.map((part) => (typeof part === "number" ? `[${part}]` : `.${String(part)}`)).join("");
}

export function validateS04EPersistedCollections(snapshot: PlatformSnapshot): void {
  const details: string[] = [];
  for (const collection of S04E_STORE_COLLECTIONS) {
    const parsed = S04E_COLLECTION_SCHEMAS[collection].safeParse(snapshot[collection] ?? []);
    if (parsed.success) continue;
    for (const issue of parsed.error.issues) {
      details.push(`${collection}${issuePath(issue.path)}:${issue.code}`);
    }
  }
  if (details.length > 0) {
    throw new PlatformError("VALIDATION_FAILED", "S04E collections failed persistence validation", { details });
  }
}
