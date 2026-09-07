import { z } from "zod";
import { PlatformError } from "./errors.js";
import {
  ContentBlockSchema,
  ContentEditionSchema,
  ContentWorkSchema,
  CulturalSourceTextSchema,
  LanguageCoverageSnapshotSchema,
  LanguagePreferenceHistorySchema,
  LanguageProfileSchema,
  RecipientAssemblySchema,
  RecipientEditionRuleSchema,
  ReviewAssignmentSchema,
  S04F_CANONICAL_COLLECTIONS,
  S04FMigrationReceiptSchema,
  TerminologyEntrySchema,
  TranslationLinkSchema,
} from "./language-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export const S04F_UNKNOWN_FIELDS_POLICY = "REJECT" as const;
export const S04F_JOURNAL_COLLECTION = "s04fMigrationReceipts" as const;
export const S04F_STORE_COLLECTIONS = [...S04F_CANONICAL_COLLECTIONS, S04F_JOURNAL_COLLECTION] as const;
export type S04FStoreCollection = (typeof S04F_STORE_COLLECTIONS)[number];

const S04F_COLLECTION_SCHEMAS = {
  languageProfiles: z.array(LanguageProfileSchema),
  languagePreferenceHistories: z.array(LanguagePreferenceHistorySchema),
  culturalSourceTexts: z.array(CulturalSourceTextSchema),
  contentWorks: z.array(ContentWorkSchema),
  contentEditions: z.array(ContentEditionSchema),
  contentBlocks: z.array(ContentBlockSchema),
  translationLinks: z.array(TranslationLinkSchema),
  terminologyEntries: z.array(TerminologyEntrySchema),
  reviewAssignments: z.array(ReviewAssignmentSchema),
  recipientEditionRules: z.array(RecipientEditionRuleSchema),
  recipientAssemblies: z.array(RecipientAssemblySchema),
  languageCoverageSnapshots: z.array(LanguageCoverageSnapshotSchema),
  s04fMigrationReceipts: z.array(S04FMigrationReceiptSchema),
} as const;

function issuePath(path: ReadonlyArray<PropertyKey>): string {
  return path.map((part) => (typeof part === "number" ? `[${part}]` : `.${String(part)}`)).join("");
}

export function validateS04FPersistedCollections(snapshot: PlatformSnapshot): void {
  const details: string[] = [];
  for (const collection of S04F_STORE_COLLECTIONS) {
    const parsed = S04F_COLLECTION_SCHEMAS[collection].safeParse(snapshot[collection] ?? []);
    if (parsed.success) continue;
    for (const issue of parsed.error.issues) {
      details.push(`${collection}${issuePath(issue.path)}:${issue.code}`);
    }
  }
  if (details.length > 0) {
    throw new PlatformError("VALIDATION_FAILED", "S04F collections failed persistence validation", { details });
  }
}
