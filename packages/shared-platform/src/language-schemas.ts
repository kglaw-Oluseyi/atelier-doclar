import { z } from "zod";
import {
  ASSEMBLY_STATUSES,
  CONTENT_BLOCK_PURPOSES,
  CONTENT_EDITION_KINDS,
  CONTENT_EDITION_STATES,
  CONTENT_WORK_PURPOSES,
  CULTURAL_TEXT_STATES,
  ENGLISH_CONVENTIONS,
  FALLBACK_REASONS,
  LANGUAGE_PREFERENCE_SOURCES,
  LANGUAGE_PRESENTATION_MODES,
  LANGUAGE_TAGS,
  REVIEW_DECISIONS,
  REVIEW_KINDS,
  SCHEMA_VERSION,
  TERMINOLOGY_POLICIES,
  TRANSLATION_COVERAGE_STATES,
  TRANSLATION_REVIEW_STATUSES,
  TRANSLATION_SOURCE_TYPES,
} from "./constants.js";
import { canonicalDisplayText } from "./language-unicode.js";
import {
  ClientIdSchema,
  EventIdSchema,
  IsoDatetimeSchema,
  NonEmptySchema,
  OrganisationIdSchema,
  PersonIdSchema,
  UuidSchema,
} from "./schemas.js";

export const LanguageTagSchema = z.enum(LANGUAGE_TAGS);
export const LanguageProfileIdSchema = UuidSchema;
export const LanguagePreferenceHistoryIdSchema = UuidSchema;
export const CulturalSourceTextIdSchema = UuidSchema;
export const ContentWorkIdSchema = UuidSchema;
export const ContentEditionIdSchema = UuidSchema;
export const ContentBlockIdSchema = UuidSchema;
export const TranslationLinkIdSchema = UuidSchema;
export const TerminologyEntryIdSchema = UuidSchema;
export const ReviewAssignmentIdSchema = UuidSchema;
export const RecipientEditionRuleIdSchema = UuidSchema;
export const RecipientAssemblyIdSchema = UuidSchema;
export const LanguageCoverageSnapshotIdSchema = UuidSchema;
export const GuestIdRefSchema = UuidSchema;

const versioned = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
  nonProductionFixture: z.boolean().optional(),
};

const scoped = {
  organisationId: OrganisationIdSchema,
  clientId: ClientIdSchema,
  eventId: EventIdSchema,
};

const mutationBase = {
  organisationId: OrganisationIdSchema,
  eventId: EventIdSchema,
  reason: NonEmptySchema.max(400),
  idempotencyKey: NonEmptySchema.max(120).optional(),
};

const CanonicalTextSchema = NonEmptySchema.max(8000).transform(canonicalDisplayText);
const OptionalCanonicalTextSchema = z
  .string()
  .max(8000)
  .transform((value) => (value.length === 0 ? value : canonicalDisplayText(value)));

export const S04F_CANONICAL_COLLECTIONS = [
  "languageProfiles",
  "languagePreferenceHistories",
  "culturalSourceTexts",
  "contentWorks",
  "contentEditions",
  "contentBlocks",
  "translationLinks",
  "terminologyEntries",
  "reviewAssignments",
  "recipientEditionRules",
  "recipientAssemblies",
  "languageCoverageSnapshots",
] as const;

export const LanguageProfileSchema = z
  .object({
    id: LanguageProfileIdSchema,
    ...scoped,
    guestId: GuestIdRefSchema,
    preferredLanguageTag: LanguageTagSchema.optional(),
    additionalUnderstoodLanguageTags: z.array(LanguageTagSchema).max(7).default([]),
    englishAcceptable: z.boolean().optional(),
    translationRequired: z.boolean().optional(),
    preferredPresentationMode: z.enum(LANGUAGE_PRESENTATION_MODES).optional(),
    source: z.enum(LANGUAGE_PREFERENCE_SOURCES),
    unknown: z.boolean(),
    confirmedAt: IsoDatetimeSchema.optional(),
    confirmedByPersonId: PersonIdSchema.optional(),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict()
  .refine((value) => value.unknown === !value.preferredLanguageTag, "unknown preference cannot invent a language tag")
  .refine((value) => value.source !== "UNKNOWN" || value.unknown, "UNKNOWN source requires unknown preference");

export const LanguagePreferenceHistorySchema = z
  .object({
    id: LanguagePreferenceHistoryIdSchema,
    ...scoped,
    guestId: GuestIdRefSchema,
    profileId: LanguageProfileIdSchema,
    previousLanguageTag: LanguageTagSchema.optional(),
    nextLanguageTag: LanguageTagSchema.optional(),
    previousUnknown: z.boolean(),
    nextUnknown: z.boolean(),
    source: z.enum(LANGUAGE_PREFERENCE_SOURCES),
    actorPersonId: PersonIdSchema,
    reason: NonEmptySchema.max(400),
    ...versioned,
  })
  .strict();

export const CulturalSourceTextSchema = z
  .object({
    id: CulturalSourceTextIdSchema,
    ...scoped,
    exactText: CanonicalTextSchema,
    languageTag: LanguageTagSchema,
    purpose: NonEmptySchema.max(160),
    culturalMeaning: NonEmptySchema.max(800),
    usageNote: NonEmptySchema.max(800),
    provenance: NonEmptySchema.max(400),
    authorPersonId: PersonIdSchema,
    reviewerPersonId: PersonIdSchema.optional(),
    specialistReviewerPersonId: PersonIdSchema.optional(),
    specialistValidated: z.literal(false).or(z.boolean()),
    status: z.enum(CULTURAL_TEXT_STATES),
    culturallyAuthoritative: z.boolean(),
    syntheticUnvalidated: z.boolean(),
    searchKey: NonEmptySchema.max(8000),
    supersededById: CulturalSourceTextIdSchema.optional(),
    approvedAt: IsoDatetimeSchema.optional(),
    approvedByPersonId: PersonIdSchema.optional(),
    ...versioned,
  })
  .strict()
  .refine((value) => !(value.syntheticUnvalidated && value.culturallyAuthoritative), "synthetic fixtures cannot be culturally authoritative")
  .refine((value) => value.status !== "APPROVED" || Boolean(value.approvedByPersonId), "approved cultural text requires a reviewer");

export const ContentWorkSchema = z
  .object({
    id: ContentWorkIdSchema,
    ...scoped,
    title: NonEmptySchema.max(160),
    purpose: z.enum(CONTENT_WORK_PURPOSES),
    englishConvention: z.enum(ENGLISH_CONVENTIONS),
    primaryLanguageTag: LanguageTagSchema,
    primaryEditionId: ContentEditionIdSchema.optional(),
    currentEditionId: ContentEditionIdSchema.optional(),
    hostFacing: z.boolean().default(false),
    ownerPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const ContentEditionSchema = z
  .object({
    id: ContentEditionIdSchema,
    ...scoped,
    workId: ContentWorkIdSchema,
    languageTag: LanguageTagSchema,
    kind: z.enum(CONTENT_EDITION_KINDS),
    status: z.enum(CONTENT_EDITION_STATES),
    sourceEditionId: ContentEditionIdSchema.optional(),
    glossaryVersionId: TerminologyEntryIdSchema.optional(),
    authorPersonId: PersonIdSchema,
    reviewerPersonId: PersonIdSchema.optional(),
    approvedByPersonId: PersonIdSchema.optional(),
    approvedAt: IsoDatetimeSchema.optional(),
    supersedesEditionId: ContentEditionIdSchema.optional(),
    reviewRequired: z.boolean().default(false),
    coverageStatus: z.enum(TRANSLATION_COVERAGE_STATES),
    culturallyAuthoritative: z.boolean().default(false),
    syntheticUnvalidated: z.boolean().default(false),
    changeSummary: NonEmptySchema.max(400).optional(),
    purposeContext: NonEmptySchema.max(400).optional(),
    ...versioned,
  })
  .strict()
  .refine((value) => value.status !== "APPROVED" || Boolean(value.approvedByPersonId), "approved editions require a reviewer");

export const ContentBlockSchema = z
  .object({
    id: ContentBlockIdSchema,
    ...scoped,
    workId: ContentWorkIdSchema,
    editionId: ContentEditionIdSchema,
    languageTag: LanguageTagSchema,
    purpose: z.enum(CONTENT_BLOCK_PURPOSES),
    sortOrder: z.number().int().nonnegative(),
    exactText: CanonicalTextSchema,
    culturalSourceTextId: CulturalSourceTextIdSchema.optional(),
    placeholderNames: z.array(NonEmptySchema.max(40)).default([]),
    ...versioned,
  })
  .strict();

export const TranslationLinkSchema = z
  .object({
    id: TranslationLinkIdSchema,
    ...scoped,
    workId: ContentWorkIdSchema,
    sourceEditionId: ContentEditionIdSchema,
    sourceBlockId: ContentBlockIdSchema,
    sourceLanguageTag: LanguageTagSchema,
    targetEditionId: ContentEditionIdSchema,
    targetBlockId: ContentBlockIdSchema,
    targetLanguageTag: LanguageTagSchema,
    translatorPersonId: PersonIdSchema,
    sourceType: z.enum(TRANSLATION_SOURCE_TYPES),
    reviewStatus: z.enum(TRANSLATION_REVIEW_STATUSES),
    reviewerPersonId: PersonIdSchema.optional(),
    approvedByPersonId: PersonIdSchema.optional(),
    approvedAt: IsoDatetimeSchema.optional(),
    stale: z.boolean(),
    supersededById: TranslationLinkIdSchema.optional(),
    ...versioned,
  })
  .strict();

export const TerminologyEntrySchema = z
  .object({
    id: TerminologyEntryIdSchema,
    ...scoped,
    term: CanonicalTextSchema,
    languageTag: LanguageTagSchema,
    approvedDisplayForm: CanonicalTextSchema,
    searchKey: NonEmptySchema.max(400),
    meaning: NonEmptySchema.max(400),
    policy: z.enum(TERMINOLOGY_POLICIES),
    context: NonEmptySchema.max(400),
    ownerPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const ReviewAssignmentSchema = z
  .object({
    id: ReviewAssignmentIdSchema,
    ...scoped,
    kind: z.enum(REVIEW_KINDS),
    subjectType: z.enum(["CULTURAL_SOURCE_TEXT", "CONTENT_EDITION", "TRANSLATION_LINK"]),
    subjectId: UuidSchema,
    reviewerPersonId: PersonIdSchema,
    proposerPersonId: PersonIdSchema,
    decision: z.enum(REVIEW_DECISIONS).optional(),
    decidedAt: IsoDatetimeSchema.optional(),
    notes: OptionalCanonicalTextSchema.optional(),
    ...versioned,
  })
  .strict()
  .refine((value) => value.reviewerPersonId !== value.proposerPersonId, "maker cannot check the same review");

export const RecipientEditionRuleSchema = z
  .object({
    id: RecipientEditionRuleIdSchema,
    ...scoped,
    workId: ContentWorkIdSchema,
    fallbackLanguageTag: z.literal("en-GB"),
    allowPartialFallback: z.boolean(),
    explanation: NonEmptySchema.max(400),
    ownerPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const AssemblyUnitDecisionSchema = z
  .object({
    blockId: ContentBlockIdSchema,
    requestedLanguageTag: LanguageTagSchema.optional(),
    selectedLanguageTag: LanguageTagSchema,
    selectedEditionId: ContentEditionIdSchema,
    selectedBlockId: ContentBlockIdSchema,
    fallbackUsed: z.boolean(),
    fallbackReason: z.enum(FALLBACK_REASONS).optional(),
    approvalStatus: z.enum(CONTENT_EDITION_STATES),
    renderedText: CanonicalTextSchema,
  })
  .strict();

export const RecipientAssemblySchema = z
  .object({
    id: RecipientAssemblyIdSchema,
    ...scoped,
    guestId: GuestIdRefSchema,
    workId: ContentWorkIdSchema,
    contentPurpose: z.enum(CONTENT_WORK_PURPOSES),
    requestedLanguageTag: LanguageTagSchema.optional(),
    selectedLanguageTag: LanguageTagSchema,
    editionId: ContentEditionIdSchema,
    units: z.array(AssemblyUnitDecisionSchema).min(1),
    addressingDisplayName: NonEmptySchema.max(200),
    assemblyHash: NonEmptySchema.max(128),
    readyForCommsReview: z.literal(true),
    dispatched: z.literal(false),
    providerInvoked: z.literal(false),
    status: z.enum(ASSEMBLY_STATUSES),
    assembledByPersonId: PersonIdSchema,
    placeholdersValid: z.boolean(),
    supersededById: RecipientAssemblyIdSchema.optional(),
    ...versioned,
  })
  .strict();

export const LanguageCoverageSnapshotSchema = z
  .object({
    id: LanguageCoverageSnapshotIdSchema,
    ...scoped,
    workId: ContentWorkIdSchema,
    coverageStatus: z.enum(TRANSLATION_COVERAGE_STATES),
    unresolvedPreferenceCount: z.number().int().nonnegative(),
    englishOnlyCount: z.number().int().nonnegative(),
    mixedFallbackCount: z.number().int().nonnegative(),
    blockedCount: z.number().int().nonnegative(),
    targetCounts: z.record(LanguageTagSchema, z.number().int().nonnegative()),
    explanation: NonEmptySchema.max(400),
    ...versioned,
  })
  .strict();

export const S04FMigrationReceiptSchema = z
  .object({
    id: UuidSchema,
    migrationId: z.literal("EOS-S04F-LANGUAGE-V1"),
    checksum: NonEmptySchema.max(128),
    status: z.enum(["APPLIED", "REPLAYED", "ROLLED_BACK"]),
    createdRecords: z.array(z.object({ collection: NonEmptySchema.max(80), id: UuidSchema }).strict()),
    notes: z.array(z.object({ code: NonEmptySchema.max(80), subjectType: NonEmptySchema.max(80), subjectId: UuidSchema }).strict()),
    ...versioned,
  })
  .strict();

export const RecordLanguagePreferenceInputSchema = z
  .object({
    ...mutationBase,
    guestId: GuestIdRefSchema,
    preferredLanguageTag: LanguageTagSchema.optional(),
    additionalUnderstoodLanguageTags: z.array(LanguageTagSchema).max(7).optional(),
    englishAcceptable: z.boolean().optional(),
    translationRequired: z.boolean().optional(),
    preferredPresentationMode: z.enum(LANGUAGE_PRESENTATION_MODES).optional(),
    source: z.enum(["GUEST_SUPPLIED", "HOST_SUPPLIED", "STAFF_RECORDED", "UNKNOWN"]),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();

export const CreateCulturalSourceTextInputSchema = z
  .object({
    ...mutationBase,
    exactText: CanonicalTextSchema,
    languageTag: LanguageTagSchema,
    purpose: NonEmptySchema.max(160),
    culturalMeaning: NonEmptySchema.max(800),
    usageNote: NonEmptySchema.max(800),
    provenance: NonEmptySchema.max(400),
    specialistReviewerPersonId: PersonIdSchema.optional(),
  })
  .strict();

export const DecideCulturalTextInputSchema = z
  .object({
    ...mutationBase,
    culturalSourceTextId: CulturalSourceTextIdSchema,
    decision: z.enum(REVIEW_DECISIONS),
    expectedVersion: z.number().int().positive(),
    notes: OptionalCanonicalTextSchema.optional(),
  })
  .strict();

export const CreateContentWorkInputSchema = z
  .object({
    ...mutationBase,
    title: NonEmptySchema.max(160),
    purpose: z.enum(CONTENT_WORK_PURPOSES),
    englishConvention: z.enum(ENGLISH_CONVENTIONS).default("en-GB"),
    primaryLanguageTag: LanguageTagSchema.default("en-GB"),
    primaryText: CanonicalTextSchema,
    hostFacing: z.boolean().optional(),
  })
  .strict();

export const CreateDependentEditionInputSchema = z
  .object({
    ...mutationBase,
    workId: ContentWorkIdSchema,
    sourceEditionId: ContentEditionIdSchema,
    targetLanguageTag: LanguageTagSchema,
    kind: z.enum(["PARTIAL", "SUMMARY", "BILINGUAL", "COMPLETE"]),
    sourceType: z.enum(TRANSLATION_SOURCE_TYPES),
    blocks: z
      .array(
        z
          .object({
            sourceBlockId: ContentBlockIdSchema,
            exactText: CanonicalTextSchema,
            purpose: z.enum(CONTENT_BLOCK_PURPOSES).optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const DecideTranslationInputSchema = z
  .object({
    ...mutationBase,
    editionId: ContentEditionIdSchema,
    decision: z.enum(REVIEW_DECISIONS),
    expectedVersion: z.number().int().positive(),
    notes: OptionalCanonicalTextSchema.optional(),
  })
  .strict();

export const CreateTerminologyEntryInputSchema = z
  .object({
    ...mutationBase,
    term: CanonicalTextSchema,
    languageTag: LanguageTagSchema,
    approvedDisplayForm: CanonicalTextSchema,
    meaning: NonEmptySchema.max(400),
    policy: z.enum(TERMINOLOGY_POLICIES),
    context: NonEmptySchema.max(400),
  })
  .strict();

export const CreateSourceRevisionInputSchema = z
  .object({
    ...mutationBase,
    workId: ContentWorkIdSchema,
    sourceEditionId: ContentEditionIdSchema,
    primaryText: CanonicalTextSchema,
    purposeContext: NonEmptySchema.max(400),
    changeSummary: NonEmptySchema.max(400),
    submitForReview: z.boolean().default(false),
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const SubmitSourceRevisionInputSchema = z
  .object({
    ...mutationBase,
    editionId: ContentEditionIdSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const DecideSourceEditionInputSchema = z
  .object({
    ...mutationBase,
    editionId: ContentEditionIdSchema,
    decision: z.enum(REVIEW_DECISIONS),
    expectedVersion: z.number().int().positive(),
    notes: OptionalCanonicalTextSchema.optional(),
  })
  .strict();

export const SupersedeSourceEditionInputSchema = CreateSourceRevisionInputSchema;

export const AssembleRecipientContentInputSchema = z
  .object({
    ...mutationBase,
    guestId: GuestIdRefSchema,
    workId: ContentWorkIdSchema,
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();

export type LanguageTag = z.infer<typeof LanguageTagSchema>;
export type LanguageProfile = z.infer<typeof LanguageProfileSchema>;
export type LanguagePreferenceHistory = z.infer<typeof LanguagePreferenceHistorySchema>;
export type CulturalSourceText = z.infer<typeof CulturalSourceTextSchema>;
export type ContentWork = z.infer<typeof ContentWorkSchema>;
export type ContentEdition = z.infer<typeof ContentEditionSchema>;
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export type TranslationLink = z.infer<typeof TranslationLinkSchema>;
export type TerminologyEntry = z.infer<typeof TerminologyEntrySchema>;
export type ReviewAssignment = z.infer<typeof ReviewAssignmentSchema>;
export type RecipientEditionRule = z.infer<typeof RecipientEditionRuleSchema>;
export type RecipientAssembly = z.infer<typeof RecipientAssemblySchema>;
export type LanguageCoverageSnapshot = z.infer<typeof LanguageCoverageSnapshotSchema>;
export type S04FMigrationReceipt = z.infer<typeof S04FMigrationReceiptSchema>;
export type RecordLanguagePreferenceInput = z.infer<typeof RecordLanguagePreferenceInputSchema>;
export type CreateCulturalSourceTextInput = z.infer<typeof CreateCulturalSourceTextInputSchema>;
export type DecideCulturalTextInput = z.infer<typeof DecideCulturalTextInputSchema>;
export type CreateContentWorkInput = z.infer<typeof CreateContentWorkInputSchema>;
export type CreateDependentEditionInput = z.infer<typeof CreateDependentEditionInputSchema>;
export type DecideTranslationInput = z.infer<typeof DecideTranslationInputSchema>;
export type CreateTerminologyEntryInput = z.infer<typeof CreateTerminologyEntryInputSchema>;
export type CreateSourceRevisionInput = z.infer<typeof CreateSourceRevisionInputSchema>;
export type SubmitSourceRevisionInput = z.infer<typeof SubmitSourceRevisionInputSchema>;
export type DecideSourceEditionInput = z.infer<typeof DecideSourceEditionInputSchema>;
export type SupersedeSourceEditionInput = z.infer<typeof SupersedeSourceEditionInputSchema>;
export type AssembleRecipientContentInput = z.infer<typeof AssembleRecipientContentInputSchema>;
