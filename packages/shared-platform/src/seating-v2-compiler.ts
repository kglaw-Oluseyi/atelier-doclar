import { PlatformError } from "./errors.js";
import { seatingV2CompiledRequestHash, seatingV2SolverToken, seatingV2TableToken } from "./seating-v2-hash.js";
import {
  SEATING_V2_FORBIDDEN_FIELD_NAMES,
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  SeatingV2CompiledRequestSchema,
  type SeatingV2CompiledRequest,
  type SeatingV2CompiledReservation,
  type SeatingV2CompiledRule,
  type SeatingV2RuleContent,
  type SeatingV2Subject,
  type SeatingV2Target,
} from "./seating-v2-schemas.js";

export type SeatingV2CompileGuest = {
  eventGuestId: string;
  eligible: boolean;
  groupTokens?: string[];
  capabilityCodes?: string[];
};

export type SeatingV2CompilePosition = {
  positionToken: string;
  tableToken: string;
  zoneCodes?: string[];
  capabilityCodes?: string[];
};

export type SeatingV2CompileRule = {
  editionId: string;
  contentHash: string;
  lifecycle: "DRAFT" | "ACTIVE" | "WITHDRAWN" | "SUPERSEDED";
  content: SeatingV2RuleContent;
};

export type SeatingV2CompileReservation = {
  editionId: string;
  contentHash: string;
  lifecycle: "DRAFT" | "ACTIVE" | "RELEASED" | "WITHDRAWN" | "SUPERSEDED";
  eligibleMemberIds: string[];
  targets: SeatingV2Target[];
  min: number | null;
  max: number | null;
  exact: number | null;
};

export type SeatingV2CompileInput = {
  organisationId: string;
  eventId: string;
  semanticHash: string;
  pepper: string;
  configHash: string;
  seed: string;
  guests: SeatingV2CompileGuest[];
  positions: SeatingV2CompilePosition[];
  rules: SeatingV2CompileRule[];
  reservations: SeatingV2CompileReservation[];
};

const FORBIDDEN = new Set<string>(SEATING_V2_FORBIDDEN_FIELD_NAMES);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TABLE_TARGET_KINDS = new Set(["REQUIRE_TABLE", "FORBID_TABLE", "PREFER_TABLE"]);

type CompiledTableIndex = {
  byToken: ReadonlyMap<string, { tableToken: string; positionTokens: readonly string[] }>;
  tableTokens: ReadonlySet<string>;
};

function buildCompiledTableIndex(positions: readonly SeatingV2CompilePosition[]): CompiledTableIndex {
  const byToken = new Map<string, { tableToken: string; positionTokens: string[] }>();
  const seenPositions = new Set<string>();
  for (const position of positions) {
    if (seenPositions.has(position.positionToken)) {
      throw new PlatformError("VALIDATION_FAILED", "duplicate compiled position token", {
        publicMessage: "The compiled seating request rejected a malformed layout.",
      });
    }
    seenPositions.add(position.positionToken);
    const current = byToken.get(position.tableToken) ?? { tableToken: position.tableToken, positionTokens: [] };
    current.positionTokens.push(position.positionToken);
    byToken.set(position.tableToken, current);
  }
  return { byToken, tableTokens: new Set(byToken.keys()) };
}

function resolveTableTarget(rawObjectId: string, index: CompiledTableIndex): string {
  const tableToken = seatingV2TableToken(rawObjectId);
  const table = index.byToken.get(tableToken);
  if (!table || table.positionTokens.length === 0) {
    throw new PlatformError(
      "VALIDATION_FAILED",
      "A governing seating rule targets a table that is not usable in the current published layout.",
      {
        publicMessage: "A governing seating rule targets a table that is not usable in the current published layout.",
      },
    );
  }
  return table.tableToken;
}

function assertNoForbiddenFields(value: unknown, path = "compiledRequest"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenFields(item, `${path}[${index}]`));
    return;
  }
  if (typeof value === "string") {
    if (UUID_RE.test(value)) {
      throw new PlatformError("VALIDATION_FAILED", `raw identity at ${path} cannot enter the solver`, {
        publicMessage: "The compiled seating request rejected a raw identity.",
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN.has(key)) {
      throw new PlatformError("VALIDATION_FAILED", `forbidden solver field ${key}`, {
        publicMessage: "The compiled seating request rejected a forbidden field.",
      });
    }
    assertNoForbiddenFields(nested, `${path}.${key}`);
  }
}

function assertCompiledInvariants(request: SeatingV2CompiledRequest, index: CompiledTableIndex): void {
  const positionTokens = request.positions.map((item) => item.token);
  if (new Set(positionTokens).size !== positionTokens.length) {
    throw new PlatformError("VALIDATION_FAILED", "duplicate compiled position token", {
      publicMessage: "The compiled seating request rejected a malformed layout.",
    });
  }
  for (const position of request.positions) {
    if (!index.tableTokens.has(position.tableToken)) {
      throw new PlatformError("VALIDATION_FAILED", "compiled position references an unknown table token", {
        publicMessage: "The compiled seating request rejected a malformed layout.",
      });
    }
  }
  for (const rule of request.rules) {
    for (const tableToken of rule.tableTokens) {
      const table = index.byToken.get(tableToken);
      if (!table || table.positionTokens.length === 0) {
        throw new PlatformError("VALIDATION_FAILED", "compiled table target is not usable", {
          publicMessage: "A governing seating rule targets a table that is not usable in the current published layout.",
        });
      }
    }
  }
  for (const reservation of request.reservations) {
    for (const tableToken of reservation.tableTokens) {
      const table = index.byToken.get(tableToken);
      if (!table || table.positionTokens.length === 0) {
        throw new PlatformError("VALIDATION_FAILED", "compiled reservation table target is not usable", {
          publicMessage: "A governing seating reservation targets a table that is not usable in the current published layout.",
        });
      }
    }
  }
}

function subjectToken(
  subject: SeatingV2Subject,
  tokensByGuestId: Map<string, string>,
  groupTokensById: Map<string, string>,
): string | undefined {
  if (subject.type === "EVENT_GUEST") return tokensByGuestId.get(subject.id);
  return groupTokensById.get(subject.id);
}

function compileRule(
  rule: SeatingV2CompileRule,
  tokensByGuestId: Map<string, string>,
  groupTokensById: Map<string, string>,
  index: CompiledTableIndex,
): SeatingV2CompiledRule {
  const subjectTokens = rule.content.subjects
    .map((subject) => subjectToken(subject, tokensByGuestId, groupTokensById))
    .filter((token): token is string => Boolean(token))
    .sort((left, right) => left.localeCompare(right));
  if (rule.content.subjects.length > 0 && subjectTokens.length !== rule.content.subjects.length) {
    throw new PlatformError("VALIDATION_FAILED", "compiled rule omitted a subject token", {
      publicMessage: "A governing seating rule could not be compiled.",
    });
  }
  const tableTargets = TABLE_TARGET_KINDS.has(rule.content.kind)
    ? rule.content.targets.filter((item) => item.type === "TABLE")
    : [];
  if (TABLE_TARGET_KINDS.has(rule.content.kind) && tableTargets.length !== 1) {
    throw new PlatformError("VALIDATION_FAILED", "table-targeted rule requires exactly one usable table", {
      publicMessage: "A governing seating rule targets a table that is not usable in the current published layout.",
    });
  }
  return {
    contentHash: rule.contentHash,
    kind: rule.content.kind,
    hardness: rule.content.hardness,
    weight: rule.content.hardness === "SOFT" ? rule.content.weight : null,
    scope: rule.content.scope,
    subjectTokens,
    tableTokens: tableTargets
      .map((item) => resolveTableTarget(item.idOrCode, index))
      .sort((left, right) => left.localeCompare(right)),
    zoneCodes: rule.content.targets
      .filter((item) => item.type === "ZONE")
      .map((item) => item.idOrCode)
      .sort((left, right) => left.localeCompare(right)),
    capabilityCodes: rule.content.targets
      .filter((item) => item.type === "POSITION_CAPABILITY")
      .map((item) => item.idOrCode)
      .sort((left, right) => left.localeCompare(right)),
    positionToken: rule.content.kind === "LOCK_ASSIGNMENT" ? (rule.content.targets[0]?.idOrCode ?? null) : null,
  };
}

function compileReservation(
  reservation: SeatingV2CompileReservation,
  tokensByGuestId: Map<string, string>,
  index: CompiledTableIndex,
): SeatingV2CompiledReservation {
  const eligibleGuestTokens = reservation.eligibleMemberIds
    .map((id) => tokensByGuestId.get(id))
    .filter((token): token is string => Boolean(token))
    .sort((left, right) => left.localeCompare(right));
  if (eligibleGuestTokens.length !== reservation.eligibleMemberIds.length) {
    throw new PlatformError("VALIDATION_FAILED", "compiled reservation omitted a member token", {
      publicMessage: "A governing seating reservation could not be compiled.",
    });
  }
  return {
    contentHash: reservation.contentHash,
    eligibleGuestTokens,
    tableTokens: reservation.targets
      .filter((item) => item.type === "TABLE")
      .map((item) => resolveTableTarget(item.idOrCode, index))
      .sort((left, right) => left.localeCompare(right)),
    zoneCodes: reservation.targets
      .filter((item) => item.type === "ZONE")
      .map((item) => item.idOrCode)
      .sort((left, right) => left.localeCompare(right)),
    min: reservation.min,
    max: reservation.max,
    exact: reservation.exact,
  };
}

export function compileSeatingV2Request(input: SeatingV2CompileInput): {
  request: SeatingV2CompiledRequest;
  compiledRequestHash: string;
} {
  const activeRules = input.rules.filter((item) => item.lifecycle === "ACTIVE");
  const activeReservations = input.reservations.filter((item) => item.lifecycle === "ACTIVE");
  const tokensByGuestId = new Map(
    input.guests.map((guest) => [
      guest.eventGuestId,
      seatingV2SolverToken(input.pepper, input.organisationId, input.eventId, input.semanticHash, guest.eventGuestId),
    ]),
  );
  const groupTokensById = new Map<string, string>();
  const index = buildCompiledTableIndex(input.positions);
  const request: SeatingV2CompiledRequest = {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: input.configHash,
    seed: input.seed,
    guests: input.guests
      .map((guest) => ({
        token: tokensByGuestId.get(guest.eventGuestId)!,
        eligible: guest.eligible,
        groupTokens: [...(guest.groupTokens ?? [])].sort((left, right) => left.localeCompare(right)),
        capabilityCodes: [...(guest.capabilityCodes ?? [])].sort((left, right) => left.localeCompare(right)),
      }))
      .sort((left, right) => left.token.localeCompare(right.token)),
    positions: input.positions
      .map((position) => ({
        token: position.positionToken,
        tableToken: position.tableToken,
        zoneCodes: [...(position.zoneCodes ?? [])].sort((left, right) => left.localeCompare(right)),
        capabilityCodes: [...(position.capabilityCodes ?? [])].sort((left, right) => left.localeCompare(right)),
      }))
      .sort((left, right) => left.token.localeCompare(right.token)),
    rules: activeRules
      .map((rule) => compileRule(rule, tokensByGuestId, groupTokensById, index))
      .sort((left, right) => left.contentHash.localeCompare(right.contentHash)),
    reservations: activeReservations
      .map((reservation) => compileReservation(reservation, tokensByGuestId, index))
      .sort((left, right) => left.contentHash.localeCompare(right.contentHash)),
  };
  assertCompiledInvariants(request, index);
  assertNoForbiddenFields(request);
  const parsed = SeatingV2CompiledRequestSchema.parse(request);
  return { request: parsed, compiledRequestHash: seatingV2CompiledRequestHash(parsed) };
}

export function assertSeatingV2CompiledRequest(value: unknown): SeatingV2CompiledRequest {
  const parsed = SeatingV2CompiledRequestSchema.parse(value);
  assertNoForbiddenFields(parsed);
  return parsed;
}
