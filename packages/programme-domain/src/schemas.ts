import { z } from "zod";
import {
  CHECK_RESULTS,
  COMMIT_SHA_PATTERN,
  DECISION_DISPOSITIONS,
  EVIDENCE_KINDS,
  GATE_STATUSES,
  OPEN_ITEM_STATUSES,
  PRODUCT_CODES,
  RESERVED_ACCEPTANCE_AUTHORITIES,
  SEVERITIES,
  SHA256_PATTERN,
  SLICE_ID_PATTERN,
  TIMELINE_EVENT_KINDS,
  WORK_STATUSES,
} from "./constants.js";

export const ProductCodeSchema = z.enum(PRODUCT_CODES);
export const WorkStatusSchema = z.enum(WORK_STATUSES);
export const GateStatusSchema = z.enum(GATE_STATUSES);
export const SeveritySchema = z.enum(SEVERITIES);
export const EvidenceKindSchema = z.enum(EVIDENCE_KINDS);
export const OpenItemStatusSchema = z.enum(OPEN_ITEM_STATUSES);
export const CheckResultSchema = z.enum(CHECK_RESULTS);
export const DecisionDispositionSchema = z.enum(DECISION_DISPOSITIONS);
export const TimelineEventKindSchema = z.enum(TIMELINE_EVENT_KINDS);

export const SliceIdSchema = z.string().regex(SLICE_ID_PATTERN, {
  message: "Slice ID must match ^[A-Z]+-[A-Z0-9-]+$",
});

export const CommitShaSchema = z.string().regex(COMMIT_SHA_PATTERN, {
  message: "Commit SHA must be 40 lowercase hexadecimal characters",
});

export const Sha256Schema = z.string().regex(SHA256_PATTERN, {
  message: "Evidence hash must be 64 lowercase hexadecimal characters",
});

export const IsoDatetimeSchema = z.string().datetime({
  message: "Timestamp must be an ISO-8601 datetime with timezone",
});

const reservedAcceptance = new Set<string>(RESERVED_ACCEPTANCE_AUTHORITIES);

function uniqueItems(field: string) {
  return (items: string[], ctx: z.RefinementCtx): void => {
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate ${field} value: ${item}`,
        });
      }
      seen.add(item);
    }
  };
}

/** JSON null on optional fields is treated as absent. Not a domain coercion. */
function optionalPresent<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value: unknown) => (value === null ? undefined : value), schema.optional());
}

export const ProductSchema = z
  .object({
    code: ProductCodeSchema,
    name: z.string().min(1),
    route: z.string().min(1),
    programmePurpose: z.string().min(1),
    canonicalSources: z.array(z.string().min(1)).min(1),
    dependencies: z.array(ProductCodeSchema),
    statusSource: z.string().min(1),
    externalAuthorityRequirements: z.array(z.string().min(1)),
    implementationReality: z.string().min(1),
    currentProjection: z.string().min(1).optional(),
    notes: z.string().min(1).optional(),
  })
  .strict();

export const PhaseSchema = z
  .object({
    id: z.string().min(1),
    order: z.number().int().nonnegative(),
    title: z.string().min(1),
    products: z.array(ProductCodeSchema).min(1),
    intent: z.string().min(1),
    executiveCriticalPath: z.boolean(),
    slices: z.array(SliceIdSchema).optional(),
    notes: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.slices) uniqueItems("slices")(value.slices, ctx);
    uniqueItems("products")(value.products, ctx);
  });

/**
 * Declarative slice work contract.
 * Authoritative shape: slice-manifest.schema.json (additionalProperties: false).
 */
export const SliceManifestSchema = z
  .object({
    id: SliceIdSchema,
    product: ProductCodeSchema,
    title: z.string().min(1),
    phaseId: z.string().min(1),
    order: z.number().int().nonnegative(),
    dependsOn: z.array(z.string()),
    canonicalRefs: z.array(z.string()).min(1),
    outcome: z.string().min(1),
    entryCriteria: z.array(z.string()),
    exitCriteria: z.array(z.string()).min(1),
    expectedFiles: z.array(z.string()),
    verification: z.array(z.string()).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    uniqueItems("dependsOn")(value.dependsOn, ctx);
    for (const [index, dep] of value.dependsOn.entries()) {
      if (!SLICE_ID_PATTERN.test(dep)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dependsOn", index],
          message: `dependency ID is syntactically invalid: ${dep}`,
        });
      }
    }
  });

export const EvidenceRefSchema = z
  .object({
    id: z.string().min(1),
    kind: EvidenceKindSchema,
    uri: z.string().min(1),
    sha256: Sha256Schema.optional(),
    createdAt: IsoDatetimeSchema,
    sourceSystem: z.string().min(1),
    immutable: z.boolean(),
    summary: z.string().min(1),
  })
  .strict();

export const CommitRefSchema = z
  .object({
    sha: CommitShaSchema,
  })
  .strict();

export const CheckSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    result: CheckResultSchema,
    sha: CommitShaSchema.optional(),
    recordedAt: IsoDatetimeSchema,
    evidenceIds: z.array(z.string().min(1)),
  })
  .strict();

export const OpenItemSchema = z
  .object({
    id: z.string().min(1),
    product: ProductCodeSchema,
    sliceId: z.string().min(1),
    title: z.string().min(1),
    severity: SeveritySchema,
    owner: z.string().min(1),
    status: OpenItemStatusSchema,
    decisionAuthority: z.string().min(1).optional(),
    dueAt: IsoDatetimeSchema.optional(),
    blocker: z.boolean(),
    evidence: z.array(EvidenceRefSchema),
    notes: z.string().min(1).optional(),
  })
  .strict();

export const DecisionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    severity: SeveritySchema,
    owner: z.string().min(1),
    authority: z.string().min(1),
    disposition: DecisionDispositionSchema,
    affectedIds: z.array(z.string().min(1)),
    blocker: z.boolean(),
    dueAt: IsoDatetimeSchema.optional(),
  })
  .strict();

export const GateSchema = z
  .object({
    id: z.string().min(1),
    product: ProductCodeSchema,
    title: z.string().min(1),
    status: GateStatusSchema,
    authority: z.string().min(1),
    requiredEvidenceIds: z.array(z.string()),
    expiresAt: IsoDatetimeSchema.optional(),
    notes: z.string().min(1).optional(),
  })
  .strict();

/**
 * Approval metadata only. This package never assigns APPROVED.
 * Protected authority cannot be inferred from executor identity.
 */
export const ApprovalSchema = z
  .object({
    id: z.string().min(1),
    gateId: z.string().min(1),
    authority: z.string().min(1),
    status: GateStatusSchema,
    approvedAt: IsoDatetimeSchema.optional(),
    evidenceIds: z.array(z.string().min(1)),
    conditions: z.array(z.string().min(1)).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === "APPROVED") {
      if (reservedAcceptance.has(value.authority)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["authority"],
          message: "APPROVED must name a real authority; UNKNOWN/Cursor are forbidden",
        });
      }
      if (!value.approvedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["approvedAt"],
          message: "APPROVED requires approvedAt",
        });
      }
      if (value.evidenceIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidenceIds"],
          message: "APPROVED requires at least one evidence id",
        });
      }
    }
  });

export const DependencySchema = z
  .object({
    from: SliceIdSchema,
    to: z.string().min(1),
  })
  .strict();

export const TimelineEventSchema = z
  .object({
    id: z.string().min(1),
    kind: TimelineEventKindSchema,
    at: IsoDatetimeSchema,
    entityType: z.string().min(1),
    entityId: z.string().min(1),
    sourceCommit: CommitShaSchema.optional(),
  })
  .strict();

export const SliceRecordSchema = z
  .object({
    id: SliceIdSchema,
    product: ProductCodeSchema,
    title: z.string().min(1),
    phaseId: z.string().min(1),
    order: z.number().int().nonnegative(),
    status: WorkStatusSchema,
    dependsOn: z.array(z.string()),
    canonicalRefs: z.array(z.string()).min(1),
    outcome: z.string().min(1),
    entryCriteria: z.array(z.string()),
    exitCriteria: z.array(z.string()).min(1),
    expectedFiles: z.array(z.string()),
    commits: z.array(CommitShaSchema),
    evidence: z.array(EvidenceRefSchema),
    openItems: z.array(z.string()),
    acceptedAt: optionalPresent(IsoDatetimeSchema),
    acceptedBy: optionalPresent(z.string().min(1)),
    updatedAt: IsoDatetimeSchema,
    version: z.string().min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    uniqueItems("dependsOn")(value.dependsOn, ctx);
    uniqueItems("openItems")(value.openItems, ctx);
    uniqueItems("commits")(value.commits, ctx);

    if (value.acceptedBy !== undefined && reservedAcceptance.has(value.acceptedBy)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptedBy"],
        message: "acceptedBy must be a named reviewer; UNKNOWN/Cursor are forbidden",
      });
    }

    if (value.status !== "ACCEPTED") {
      return;
    }

    if (!value.acceptedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptedAt"],
        message: "ACCEPTED requires acceptedAt",
      });
    }
    if (!value.acceptedBy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptedBy"],
        message: "ACCEPTED requires acceptedBy",
      });
    }
    if (value.commits.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["commits"],
        message: "ACCEPTED requires at least one immutable commit SHA",
      });
    }
    if (value.evidence.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidence"],
        message: "ACCEPTED requires at least one evidence record",
      });
    }
    if (value.exitCriteria.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["exitCriteria"],
        message: "ACCEPTED requires exit criteria",
      });
    }

    const immutableCommitEvidence = value.evidence.filter(
      (item) => item.kind === "COMMIT" && item.immutable,
    );
    if (value.evidence.length > 0 && immutableCommitEvidence.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidence"],
        message: "ACCEPTED requires at least one immutable COMMIT evidence record",
      });
    }

    const commitSet = new Set(value.commits);
    const evidenceRefsCommit = immutableCommitEvidence.some((item) =>
      [...commitSet].some((sha) => item.uri.includes(sha) || item.id.includes(sha) || item.summary.includes(sha)),
    );
    if (value.commits.length > 0 && immutableCommitEvidence.length > 0 && !evidenceRefsCommit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidence"],
        message: "ACCEPTED COMMIT evidence must reference at least one listed commit SHA",
      });
    }
  });

export const ProgrammeSnapshotSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    generatedAt: IsoDatetimeSchema,
    sourceCommit: CommitShaSchema,
    products: z.array(
      z
        .object({
          code: ProductCodeSchema,
          name: z.string(),
          route: z.string(),
          order: z.number().int(),
        })
        .strict(),
    ),
    slices: z.array(SliceRecordSchema),
    openItems: z.array(OpenItemSchema),
    gates: z.array(
      z
        .object({
          id: z.string(),
          product: ProductCodeSchema,
          title: z.string(),
          status: GateStatusSchema,
          authority: z.string(),
          requiredEvidenceIds: z.array(z.string()),
          expiresAt: IsoDatetimeSchema.optional(),
        })
        .strict(),
    ),
  })
  .strict();

export const CatalogFileSchema = z
  .object({
    slice_id: z.string().min(1),
    model: z.string().min(1),
    count: z.number().int().nonnegative(),
    slices: z.array(z.unknown()),
    prompt_attachments: z.record(
      z.string(),
      z
        .object({
          prompt_control_ids: z.array(z.string()),
          notes: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

export const StateProjectionFileSchema = z
  .object({
    slice_id: z.string().min(1),
    model: z.string().min(1),
    generatedAt: IsoDatetimeSchema,
    sourceCommit: CommitShaSchema,
    records: z.array(z.unknown()),
  })
  .strict();

export type ProductCode = z.infer<typeof ProductCodeSchema>;
export type WorkStatus = z.infer<typeof WorkStatusSchema>;
export type GateStatus = z.infer<typeof GateStatusSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type SliceManifest = z.infer<typeof SliceManifestSchema>;
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;
export type CommitRef = z.infer<typeof CommitRefSchema>;
export type Check = z.infer<typeof CheckSchema>;
export type OpenItem = z.infer<typeof OpenItemSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type Gate = z.infer<typeof GateSchema>;
export type Approval = z.infer<typeof ApprovalSchema>;
export type Dependency = z.infer<typeof DependencySchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type SliceRecord = z.infer<typeof SliceRecordSchema>;
export type ProgrammeSnapshot = z.infer<typeof ProgrammeSnapshotSchema>;
