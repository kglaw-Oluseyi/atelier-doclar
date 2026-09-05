import { z } from "zod";
import { RESERVED_ACCEPTANCE_AUTHORITIES, SUPPORTED_EVENT_SCHEMA_VERSION } from "./constants.js";
import { ProgrammeEventError } from "./event-errors.js";
import {
  CheckSchema,
  CommitShaSchema,
  DecisionSchema,
  EvidenceRefSchema,
  GateStatusSchema,
  IsoDatetimeSchema,
  OpenItemSchema,
  OpenItemStatusSchema,
  ProductCodeSchema,
  SliceIdSchema,
} from "./schemas.js";

export const PROGRAMME_EVENT_TYPES = [
  "SLICE_IMPLEMENTATION_OBSERVED",
  "COMMIT_LINKED",
  "CHECK_RECORDED",
  "EVIDENCE_ATTACHED",
  "OPEN_ITEM_CREATED",
  "OPEN_ITEM_STATUS_CHANGED",
  "REVIEW_REQUESTED",
  "ACCEPTANCE_RECORDED",
  "GATE_STATUS_CHANGED",
  "DECISION_RECORDED",
  "SNAPSHOT_PRODUCED",
  "CORRECTION_APPENDED",
  "SLICE_SUPERSEDED",
] as const;

export const AGGREGATE_TYPES = ["slice", "open_item", "gate", "decision", "programme"] as const;

export const ACTOR_ROLES = [
  "IMPLEMENTER",
  "REVIEWER",
  "CEO",
  "SPECIALIST",
  "INDEPENDENT",
  "VENUE",
  "SYSTEM",
] as const;

export const ACCEPTANCE_AUTHORITY_ROLES = ["REVIEWER", "CEO", "SPECIALIST", "INDEPENDENT"] as const;

export const ActorSchema = z
  .object({
    id: z.string().min(1),
    role: z.enum(ACTOR_ROLES),
  })
  .strict();

const reserved = new Set<string>(RESERVED_ACCEPTANCE_AUTHORITIES);

function eventObject<Type extends (typeof PROGRAMME_EVENT_TYPES)[number], Payload extends z.ZodTypeAny>(
  type: Type,
  payload: Payload,
) {
  return z
    .object({
      eventId: z.string().min(1),
      eventType: z.literal(type),
      schemaVersion: z.literal(SUPPORTED_EVENT_SCHEMA_VERSION),
      aggregateType: z.enum(AGGREGATE_TYPES),
      aggregateId: z.string().min(1),
      product: ProductCodeSchema,
      sliceId: SliceIdSchema.optional(),
      occurredAt: IsoDatetimeSchema,
      recordedAt: IsoDatetimeSchema,
      actor: ActorSchema,
      source: z.string().min(1),
      idempotencyKey: z.string().min(1),
      expectedRevision: z.number().int().nonnegative().optional(),
      causationId: z.string().min(1).optional(),
      correlationId: z.string().min(1).optional(),
      payload,
    })
    .strict();
}

export const ProgrammeEventSchema = z.discriminatedUnion("eventType", [
  eventObject(
    "SLICE_IMPLEMENTATION_OBSERVED",
    z.object({ summary: z.string().min(1) }).strict(),
  ),
  eventObject("COMMIT_LINKED", z.object({ sha: CommitShaSchema }).strict()),
  eventObject("CHECK_RECORDED", z.object({ check: CheckSchema }).strict()),
  eventObject("EVIDENCE_ATTACHED", z.object({ evidence: EvidenceRefSchema }).strict()),
  eventObject("OPEN_ITEM_CREATED", z.object({ openItem: OpenItemSchema }).strict()),
  eventObject(
    "OPEN_ITEM_STATUS_CHANGED",
    z
      .object({
        openItemId: z.string().min(1),
        status: OpenItemStatusSchema,
        blocker: z.boolean().optional(),
      })
      .strict(),
  ),
  eventObject("REVIEW_REQUESTED", z.object({ summary: z.string().min(1) }).strict()),
  eventObject(
    "ACCEPTANCE_RECORDED",
    z
      .object({
        acceptedAt: IsoDatetimeSchema,
        acceptedBy: z.string().min(1),
        authorityRole: z.enum(ACCEPTANCE_AUTHORITY_ROLES),
      })
      .strict(),
  ),
  eventObject(
    "GATE_STATUS_CHANGED",
    z
      .object({
        gateId: z.string().min(1),
        status: GateStatusSchema,
        authority: z.string().min(1),
        approvedAt: IsoDatetimeSchema.optional(),
        evidenceIds: z.array(z.string().min(1)),
      })
      .strict(),
  ),
  eventObject("DECISION_RECORDED", z.object({ decision: DecisionSchema }).strict()),
  eventObject(
    "SNAPSHOT_PRODUCED",
    z
      .object({
        snapshotId: z.string().min(1),
        sourceEventPosition: z.number().int().nonnegative(),
      })
      .strict(),
  ),
  eventObject(
    "CORRECTION_APPENDED",
    z
      .object({
        correctsEventId: z.string().min(1),
        reason: z.string().min(1),
      })
      .strict(),
  ),
  eventObject(
    "SLICE_SUPERSEDED",
    z
      .object({
        decisionId: z.string().min(1),
        reason: z.string().min(1),
        supersededBy: z.string().min(1).optional(),
      })
      .strict(),
  ),
]);

export type ProgrammeEvent = z.infer<typeof ProgrammeEventSchema>;
export type ProgrammeEventType = (typeof PROGRAMME_EVENT_TYPES)[number];
export type ActorRole = (typeof ACTOR_ROLES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseProgrammeEvent(input: unknown): ProgrammeEvent {
  if (!isRecord(input)) {
    throw new ProgrammeEventError("SCHEMA_INVALID", "event must be an object");
  }
  if (typeof input.schemaVersion === "number" && input.schemaVersion !== SUPPORTED_EVENT_SCHEMA_VERSION) {
    throw new ProgrammeEventError(
      "UNSUPPORTED_EVENT_VERSION",
      `unsupported event schema version ${input.schemaVersion}`,
      "schemaVersion",
      String(input.schemaVersion),
    );
  }
  if (typeof input.eventType === "string" && !PROGRAMME_EVENT_TYPES.includes(input.eventType as ProgrammeEventType)) {
    throw new ProgrammeEventError(
      "UNKNOWN_EVENT_TYPE",
      `unknown event type ${input.eventType}`,
      "eventType",
      input.eventType,
    );
  }

  const parsed = ProgrammeEventSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ProgrammeEventError(
      "SCHEMA_INVALID",
      first?.message ?? "event schema invalid",
      first?.path.map(String).join("."),
    );
  }

  const event = parsed.data;
  if (event.eventType === "ACCEPTANCE_RECORDED") {
    if (reserved.has(event.payload.acceptedBy)) {
      throw new ProgrammeEventError(
        "SCHEMA_INVALID",
        "acceptedBy must be a named reviewer; UNKNOWN/Cursor are forbidden",
        "payload.acceptedBy",
        event.payload.acceptedBy,
      );
    }
    if (event.actor.role === "IMPLEMENTER" || event.actor.role === "SYSTEM") {
      throw new ProgrammeEventError(
        "SCHEMA_INVALID",
        "acceptance cannot be recorded by an implementer or system actor as protected authority",
        "actor.role",
        event.actor.role,
      );
    }
  }
  if (event.eventType === "GATE_STATUS_CHANGED" && event.payload.status === "APPROVED") {
    if (reserved.has(event.payload.authority) || event.payload.authority === "Cursor") {
      throw new ProgrammeEventError(
        "SCHEMA_INVALID",
        "APPROVED requires a named protected authority; UNKNOWN/Cursor are forbidden",
        "payload.authority",
        event.payload.authority,
      );
    }
    if (!event.payload.approvedAt) {
      throw new ProgrammeEventError("SCHEMA_INVALID", "APPROVED requires approvedAt", "payload.approvedAt");
    }
    if (event.payload.evidenceIds.length === 0) {
      throw new ProgrammeEventError(
        "SCHEMA_INVALID",
        "APPROVED requires at least one evidence id",
        "payload.evidenceIds",
      );
    }
    if (event.actor.role === "IMPLEMENTER" || event.actor.role === "SYSTEM") {
      throw new ProgrammeEventError(
        "SCHEMA_INVALID",
        "protected gate approval cannot be assigned by implementer or system actors",
        "actor.role",
        event.actor.role,
      );
    }
  }
  return event;
}

export function eventsEquivalent(left: ProgrammeEvent, right: ProgrammeEvent): boolean {
  return canonicalizeEvent(left) === canonicalizeEvent(right);
}

function canonicalizeEvent(event: ProgrammeEvent): string {
  const { expectedRevision, ...rest } = event;
  void expectedRevision;
  return JSON.stringify(rest);
}
