import { z } from "zod";
import {
  ATELIER_CHAPTER_TYPES,
  ATELIER_GRANT_STATUSES,
  ATELIER_HOST_ROLES,
  ATELIER_LIFECYCLE_STATES,
  ATELIER_PUBLICATION_STATES,
  ATELIER_SESSION_STATUSES,
  HOST_DECISION_KINDS,
  HOST_DECISION_STATUSES,
  MAGIC_LINK_PURPOSES,
  MAGIC_LINK_STATUSES,
  SCHEMA_VERSION,
} from "./constants.js";
import {
  ClientIdSchema,
  EventIdSchema,
  IsoDatetimeSchema,
  NonEmptySchema,
  OrganisationIdSchema,
  PersonIdSchema,
  UuidSchema,
} from "./schemas.js";

export const EventAtelierIdSchema = UuidSchema;
export const BlueprintGenesisIdSchema = UuidSchema;
export const AtelierChapterIdSchema = UuidSchema;
export const EventNarrativeEditionIdSchema = UuidSchema;
export const CuratedMediaSetIdSchema = UuidSchema;
export const ApprovedAssetEditionIdSchema = UuidSchema;
export const GuestJourneyProjectionIdSchema = UuidSchema;
export const HostMilestoneProjectionIdSchema = UuidSchema;
export const BudgetAssuranceProjectionIdSchema = UuidSchema;
export const VendorEnsembleProjectionIdSchema = UuidSchema;
export const ContingencyAssuranceProjectionIdSchema = UuidSchema;
export const HostDecisionRequestIdSchema = UuidSchema;
export const HostDecisionReceiptIdSchema = UuidSchema;
export const CuratedUpdateIdSchema = UuidSchema;
export const AtelierAccessGrantIdSchema = UuidSchema;
export const MagicLinkChallengeIdSchema = UuidSchema;
export const AtelierSessionIdSchema = UuidSchema;

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

export const S04E_CANONICAL_COLLECTIONS = [
  "eventAteliers",
  "blueprintGenesises",
  "atelierChapters",
  "eventNarrativeEditions",
  "curatedMediaSets",
  "approvedAssetEditions",
  "guestJourneyProjections",
  "hostMilestoneProjections",
  "budgetAssuranceProjections",
  "vendorEnsembleProjections",
  "contingencyAssuranceProjections",
  "hostDecisionRequests",
  "hostDecisionReceipts",
  "curatedUpdates",
  "atelierAccessGrants",
  "magicLinkChallenges",
  "atelierSessions",
] as const;

export const EventAtelierSchema = z
  .object({
    id: EventAtelierIdSchema,
    ...scoped,
    lifecycleState: z.enum(ATELIER_LIFECYCLE_STATES),
    publicationState: z.enum(ATELIER_PUBLICATION_STATES),
    currentNarrativeEditionId: EventNarrativeEditionIdSchema.optional(),
    themeLabel: NonEmptySchema.max(120),
    publishedAt: IsoDatetimeSchema.optional(),
    publishedByPersonId: PersonIdSchema.optional(),
    ownerPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const BlueprintGenesisSchema = z
  .object({
    id: BlueprintGenesisIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    acceptedSourceRef: NonEmptySchema.max(200),
    capturedIntent: NonEmptySchema.max(2000),
    originEditionLabel: NonEmptySchema.max(120),
    acceptedByPersonId: PersonIdSchema,
    acceptedAt: IsoDatetimeSchema,
    importStatus: z.enum(["IMPORTED", "WITHDRAWN"]),
    ...versioned,
  })
  .strict();

export const AtelierChapterSchema = z
  .object({
    id: AtelierChapterIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    chapterType: z.enum(ATELIER_CHAPTER_TYPES),
    order: z.number().int().nonnegative(),
    publicationState: z.enum(ATELIER_PUBLICATION_STATES),
    currentEditionId: UuidSchema.optional(),
    visibilityPolicy: z.enum(["HOST_VISIBLE", "STAFF_ONLY", "ABSENT_UNTIL_PREPARED"]),
    ...versioned,
  })
  .strict();

export const EventNarrativeEditionSchema = z
  .object({
    id: EventNarrativeEditionIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    story: NonEmptySchema.max(4000),
    atmosphere: NonEmptySchema.max(800),
    pillars: z.array(NonEmptySchema.max(160)).max(8),
    culturalIntent: NonEmptySchema.max(800),
    designDirection: NonEmptySchema.max(800),
    authorPersonId: PersonIdSchema,
    approvedByPersonId: PersonIdSchema.optional(),
    publicationState: z.enum(ATELIER_PUBLICATION_STATES),
    publishedAt: IsoDatetimeSchema.optional(),
    supersedesEditionId: EventNarrativeEditionIdSchema.optional(),
    provenance: NonEmptySchema.max(400),
    effectiveAt: IsoDatetimeSchema,
    ...versioned,
  })
  .strict();

export const CuratedMediaSetSchema = z
  .object({
    id: CuratedMediaSetIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    editionId: EventNarrativeEditionIdSchema.optional(),
    caption: NonEmptySchema.max(240),
    altText: NonEmptySchema.max(240),
    purpose: NonEmptySchema.max(80),
    safeHref: z.string().max(400),
    rightsNote: NonEmptySchema.max(240),
    publicationState: z.enum(ATELIER_PUBLICATION_STATES),
    approvedByPersonId: PersonIdSchema.optional(),
    ...versioned,
  })
  .strict()
  .refine((value) => value.safeHref.startsWith("/") || value.safeHref.startsWith("#"), "media href must be repository-controlled");

export const ApprovedAssetEditionSchema = z
  .object({
    id: ApprovedAssetEditionIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    category: z.enum(["INVITE", "MENU", "PLAN", "MOOD", "FLOOR"]),
    title: NonEmptySchema.max(160),
    summary: NonEmptySchema.max(800),
    publicationState: z.enum(ATELIER_PUBLICATION_STATES),
    approvedByPersonId: PersonIdSchema.optional(),
    publishedAt: IsoDatetimeSchema.optional(),
    supersedesEditionId: ApprovedAssetEditionIdSchema.optional(),
    ...versioned,
  })
  .strict();

export const GuestJourneyProjectionSchema = z
  .object({
    id: GuestJourneyProjectionIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    hostWording: NonEmptySchema.max(2000),
    phaseRefs: z.array(UuidSchema).max(12),
    sourceVersions: z.array(NonEmptySchema.max(80)).max(12),
    freshnessAt: IsoDatetimeSchema,
    publicationState: z.enum(ATELIER_PUBLICATION_STATES),
    ...versioned,
  })
  .strict();

export const HostMilestoneProjectionSchema = z
  .object({
    id: HostMilestoneProjectionIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    title: NonEmptySchema.max(160),
    meaning: NonEmptySchema.max(400),
    occursOn: NonEmptySchema.max(40),
    assuranceState: z.enum(["SETTLED", "WATCHED", "BEING_PREPARED"]),
    hostAction: NonEmptySchema.max(240).optional(),
    sourceRef: NonEmptySchema.max(120),
    freshnessAt: IsoDatetimeSchema,
    publicationState: z.enum(ATELIER_PUBLICATION_STATES),
    ...versioned,
  })
  .strict();

export const BudgetAssuranceProjectionSchema = z
  .object({
    id: BudgetAssuranceProjectionIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    available: z.literal(false),
    unavailableReason: z.literal("FINANCE_AUTHORITY_ABSENT"),
    publicationState: z.enum(ATELIER_PUBLICATION_STATES),
    ...versioned,
  })
  .strict();

export const VendorEnsembleProjectionSchema = z
  .object({
    id: VendorEnsembleProjectionIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    serviceLabel: NonEmptySchema.max(160),
    attribution: NonEmptySchema.max(240),
    verified: z.boolean(),
    publicationState: z.enum(ATELIER_PUBLICATION_STATES),
    ...versioned,
  })
  .strict();

export const ContingencyAssuranceProjectionSchema = z
  .object({
    id: ContingencyAssuranceProjectionIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    hostStatement: NonEmptySchema.max(800),
    materialAction: NonEmptySchema.max(240).optional(),
    sourceRef: NonEmptySchema.max(120),
    publicationState: z.enum(ATELIER_PUBLICATION_STATES),
    ...versioned,
  })
  .strict();

export const HostDecisionRequestSchema = z
  .object({
    id: HostDecisionRequestIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    kind: z.enum(HOST_DECISION_KINDS),
    title: NonEmptySchema.max(160),
    question: NonEmptySchema.max(800),
    consequence: NonEmptySchema.max(800),
    options: z.array(NonEmptySchema.max(160)).min(1).max(6),
    deadlineAt: IsoDatetimeSchema,
    status: z.enum(HOST_DECISION_STATUSES),
    requiresReview: z.boolean(),
    requiresStepUp: z.boolean(),
    publishedByPersonId: PersonIdSchema,
    expectedVersion: z.number().int().positive(),
    canonicalTarget: z.literal("ATELIER_DECISION_ONLY"),
    ...versioned,
  })
  .strict();

export const HostDecisionReceiptSchema = z
  .object({
    id: HostDecisionReceiptIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    requestId: HostDecisionRequestIdSchema,
    grantId: AtelierAccessGrantIdSchema,
    submittedByPersonId: PersonIdSchema,
    submittedChoice: NonEmptySchema.max(160),
    submittedAt: IsoDatetimeSchema,
    changedCanonicalData: z.literal(false),
    reviewStatus: z.enum(["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED"]),
    nextOwner: NonEmptySchema.max(120),
    finalOutcome: NonEmptySchema.max(240),
    reviewedByPersonId: PersonIdSchema.optional(),
    requestVersion: z.number().int().positive(),
    ...versioned,
  })
  .strict();

export const CuratedUpdateSchema = z
  .object({
    id: CuratedUpdateIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    title: NonEmptySchema.max(160),
    body: NonEmptySchema.max(1200),
    importance: z.enum(["MATERIAL", "QUIET"]),
    authorPersonId: PersonIdSchema,
    publishedAt: IsoDatetimeSchema,
    publicationState: z.enum(ATELIER_PUBLICATION_STATES),
    ...versioned,
  })
  .strict();

export const AtelierAccessGrantSchema = z
  .object({
    id: AtelierAccessGrantIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    personId: PersonIdSchema,
    hostRole: z.enum(ATELIER_HOST_ROLES),
    chapters: z.array(z.enum(ATELIER_CHAPTER_TYPES)).min(1),
    canDecide: z.boolean(),
    canExport: z.boolean(),
    status: z.enum(ATELIER_GRANT_STATUSES),
    issuedByPersonId: PersonIdSchema,
    expiresAt: IsoDatetimeSchema,
    revokedAt: IsoDatetimeSchema.optional(),
    failedExchangeCount: z.number().int().nonnegative(),
    ...versioned,
  })
  .strict();

export const MagicLinkChallengeSchema = z
  .object({
    id: MagicLinkChallengeIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    grantId: AtelierAccessGrantIdSchema,
    purpose: z.enum(MAGIC_LINK_PURPOSES),
    tokenHash: NonEmptySchema.max(200),
    tokenPrefix: NonEmptySchema.max(8),
    status: z.enum(MAGIC_LINK_STATUSES),
    expiresAt: IsoDatetimeSchema,
    redeemedAt: IsoDatetimeSchema.optional(),
    issuedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const AtelierSessionSchema = z
  .object({
    id: AtelierSessionIdSchema,
    ...scoped,
    atelierId: EventAtelierIdSchema,
    grantId: AtelierAccessGrantIdSchema,
    personId: PersonIdSchema,
    hostRole: z.enum(ATELIER_HOST_ROLES),
    status: z.enum(ATELIER_SESSION_STATUSES),
    issuedAt: IsoDatetimeSchema,
    lastSeenAt: IsoDatetimeSchema,
    idleExpiresAt: IsoDatetimeSchema,
    absoluteExpiresAt: IsoDatetimeSchema,
    elevatedUntil: IsoDatetimeSchema.optional(),
    revokedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const S04EMigrationReceiptSchema = z
  .object({
    id: UuidSchema,
    migrationId: z.literal("EOS-S04E-ATELIER-V1"),
    checksum: NonEmptySchema,
    status: z.enum(["APPLIED", "REPLAYED", "ROLLED_BACK"]),
    createdRecords: z.array(
      z
        .object({
          collection: NonEmptySchema,
          id: UuidSchema,
          version: z.number().int().positive(),
        })
        .strict(),
    ),
    notes: z.array(
      z
        .object({
          code: NonEmptySchema,
          subjectType: NonEmptySchema,
          subjectId: UuidSchema,
        })
        .strict(),
    ),
    ...versioned,
  })
  .strict();

export const PublishAtelierInputSchema = z.object({ ...mutationBase }).strict();
export const PublishNarrativeEditionInputSchema = z
  .object({
    ...mutationBase,
    story: NonEmptySchema.max(4000),
    atmosphere: NonEmptySchema.max(800),
    pillars: z.array(NonEmptySchema.max(160)).min(1).max(8),
    culturalIntent: NonEmptySchema.max(800),
    designDirection: NonEmptySchema.max(800),
    provenance: NonEmptySchema.max(400),
  })
  .strict();
export const PublishDecisionRequestInputSchema = z
  .object({
    ...mutationBase,
    kind: z.enum(HOST_DECISION_KINDS),
    title: NonEmptySchema.max(160),
    question: NonEmptySchema.max(800),
    consequence: NonEmptySchema.max(800),
    options: z.array(NonEmptySchema.max(160)).min(1).max(6),
    deadlineAt: IsoDatetimeSchema,
    requiresReview: z.boolean(),
    requiresStepUp: z.boolean(),
  })
  .strict();
export const IssueAtelierAccessInputSchema = z
  .object({
    ...mutationBase,
    personId: PersonIdSchema,
    hostRole: z.enum(ATELIER_HOST_ROLES),
    chapters: z.array(z.enum(ATELIER_CHAPTER_TYPES)).min(1),
    canDecide: z.boolean(),
    canExport: z.boolean(),
    ttlSeconds: z.number().int().positive().max(14 * 24 * 60 * 60).optional(),
    purpose: z.enum(MAGIC_LINK_PURPOSES).optional(),
  })
  .strict();
export const RevokeAtelierAccessInputSchema = z
  .object({
    ...mutationBase,
    grantId: AtelierAccessGrantIdSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();
export const SubmitHostDecisionInputSchema = z
  .object({
    requestId: HostDecisionRequestIdSchema,
    choice: NonEmptySchema.max(160),
    expectedVersion: z.number().int().positive(),
    idempotencyKey: NonEmptySchema.max(120).optional(),
  })
  .strict();
export const ReviewHostDecisionInputSchema = z
  .object({
    ...mutationBase,
    requestId: HostDecisionRequestIdSchema,
    receiptId: HostDecisionReceiptIdSchema,
    expectedVersion: z.number().int().positive(),
    approve: z.boolean(),
  })
  .strict();
export const PublishCuratedUpdateInputSchema = z
  .object({
    ...mutationBase,
    title: NonEmptySchema.max(160),
    body: NonEmptySchema.max(1200),
    importance: z.enum(["MATERIAL", "QUIET"]),
  })
  .strict();

export type EventAtelier = z.infer<typeof EventAtelierSchema>;
export type BlueprintGenesis = z.infer<typeof BlueprintGenesisSchema>;
export type AtelierChapter = z.infer<typeof AtelierChapterSchema>;
export type EventNarrativeEdition = z.infer<typeof EventNarrativeEditionSchema>;
export type CuratedMediaSet = z.infer<typeof CuratedMediaSetSchema>;
export type ApprovedAssetEdition = z.infer<typeof ApprovedAssetEditionSchema>;
export type GuestJourneyProjection = z.infer<typeof GuestJourneyProjectionSchema>;
export type HostMilestoneProjection = z.infer<typeof HostMilestoneProjectionSchema>;
export type BudgetAssuranceProjection = z.infer<typeof BudgetAssuranceProjectionSchema>;
export type VendorEnsembleProjection = z.infer<typeof VendorEnsembleProjectionSchema>;
export type ContingencyAssuranceProjection = z.infer<typeof ContingencyAssuranceProjectionSchema>;
export type HostDecisionRequest = z.infer<typeof HostDecisionRequestSchema>;
export type HostDecisionReceipt = z.infer<typeof HostDecisionReceiptSchema>;
export type CuratedUpdate = z.infer<typeof CuratedUpdateSchema>;
export type AtelierAccessGrant = z.infer<typeof AtelierAccessGrantSchema>;
export type MagicLinkChallenge = z.infer<typeof MagicLinkChallengeSchema>;
export type AtelierSession = z.infer<typeof AtelierSessionSchema>;
export type S04EMigrationReceipt = z.infer<typeof S04EMigrationReceiptSchema>;
export type PublishAtelierInput = z.infer<typeof PublishAtelierInputSchema>;
export type PublishNarrativeEditionInput = z.infer<typeof PublishNarrativeEditionInputSchema>;
export type PublishDecisionRequestInput = z.infer<typeof PublishDecisionRequestInputSchema>;
export type IssueAtelierAccessInput = z.infer<typeof IssueAtelierAccessInputSchema>;
export type RevokeAtelierAccessInput = z.infer<typeof RevokeAtelierAccessInputSchema>;
export type SubmitHostDecisionInput = z.infer<typeof SubmitHostDecisionInputSchema>;
export type ReviewHostDecisionInput = z.infer<typeof ReviewHostDecisionInputSchema>;
export type PublishCuratedUpdateInput = z.infer<typeof PublishCuratedUpdateInputSchema>;
