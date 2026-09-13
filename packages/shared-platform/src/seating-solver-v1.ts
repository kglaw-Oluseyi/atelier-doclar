import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import {
  DEFAULT_SOLVER_CONFIG,
  PROHIBITED_SOLVER_FIELD_NAMES,
  SEATING_SOLVER_VERSION,
  SolverRequestSchema,
  type LexicographicScore,
  type SeatingReasonCode,
  type SolverAlternative,
  type SolverAssignment,
  type SolverConstraint,
  type SolverFinding,
  type SolverGuestToken,
  type SolverPositionToken,
  type SolverRequest,
  type SolverReservation,
  type SolverResult,
} from "./seating-solver-types.js";

const PROHIBITED = new Set<string>(PROHIBITED_SOLVER_FIELD_NAMES);
const EXPRESSION_MARKERS = ["SELECT ", "INSERT ", "function(", "=>", "${", "{{", "eval(", "new Function"];

type Domain = Set<string>;

type SearchState = {
  seated: Map<string, string>;
  occupied: Set<string>;
};

function rejectProhibited(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectProhibited(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string") {
      const upper = value.toUpperCase();
      if (EXPRESSION_MARKERS.some((marker) => upper.includes(marker.toUpperCase()))) {
        throw new PlatformError("VALIDATION_FAILED", "free-text/prompt injection rejected/inert", {
          field: path,
          publicMessage: "The solver rejects names, contact details and free-text predicates.",
        });
      }
    }
    return;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (PROHIBITED.has(key)) {
      throw new PlatformError("VALIDATION_FAILED", `prohibited solver field ${key}`, {
        field: key,
        publicMessage: "The solver rejects names, contact details and free-text predicates.",
      });
    }
    rejectProhibited(nested, `${path}.${key}`);
  }
}

export function assertSolverRequest(input: unknown): SolverRequest {
  rejectProhibited(input, "request");
  const parsed = SolverRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new PlatformError("VALIDATION_FAILED", parsed.error.issues.map((issue) => issue.message).join("; "), {
      publicMessage: "The solver request is not valid.",
    });
  }
  const tokens = new Set<string>();
  for (const guest of parsed.data.guests) {
    if (tokens.has(guest.token)) throw new PlatformError("VALIDATION_FAILED", `duplicate guest token ${guest.token}`);
    tokens.add(guest.token);
  }
  const positions = new Set<string>();
  for (const position of parsed.data.positions) {
    if (positions.has(position.token)) throw new PlatformError("VALIDATION_FAILED", `duplicate position token ${position.token}`);
    positions.add(position.token);
  }
  return parsed.data;
}

export function compareLexicographic(left: LexicographicScore, right: LexicographicScore): number {
  if (left.hardViolations !== right.hardViolations) return left.hardViolations - right.hardViolations;
  if (left.seatedEligible !== right.seatedEligible) return right.seatedEligible - left.seatedEligible;
  if (left.reservationCommitments !== right.reservationCommitments) {
    return right.reservationCommitments - left.reservationCommitments;
  }
  if (left.protocolPriority !== right.protocolPriority) return right.protocolPriority - left.protocolPriority;
  if (left.accessibilityPriority !== right.accessibilityPriority) {
    return right.accessibilityPriority - left.accessibilityPriority;
  }
  if (left.safetyPriority !== right.safetyPriority) return right.safetyPriority - left.safetyPriority;
  if (left.preferenceCost !== right.preferenceCost) return left.preferenceCost - right.preferenceCost;
  if (left.disruption !== right.disruption) return left.disruption - right.disruption;
  return left.tieBreak.localeCompare(right.tieBreak);
}

function guestHardCount(guest: string, constraints: SolverConstraint[]): number {
  return constraints.filter((constraint) => {
    if (constraint.kind !== "HARD") return false;
    const payload = constraint.payload as { guestToken?: string; guestTokens?: string[] };
    return payload.guestToken === guest || payload.guestTokens?.includes(guest);
  }).length;
}

function reservationPriority(guest: string, reservations: SolverReservation[]): number {
  return reservations
    .filter((block) => !block.released && block.eligibleGuestTokens.includes(guest))
    .reduce((max, block) => Math.max(max, block.priority), 0);
}

function lockedGuest(guest: string, constraints: SolverConstraint[]): boolean {
  return constraints.some(
    (constraint) =>
      constraint.kind === "HARD" &&
      constraint.predicateType === "LOCK_ASSIGNMENT" &&
      constraint.payload.predicateType === "LOCK_ASSIGNMENT" &&
      constraint.payload.guestToken === guest,
  );
}

function positionByToken(positions: SolverPositionToken[]): Map<string, SolverPositionToken> {
  return new Map(positions.map((position) => [position.token, position]));
}

function buildDomains(
  guests: SolverGuestToken[],
  positions: SolverPositionToken[],
  constraints: SolverConstraint[],
): Map<string, Domain> {
  const byPosition = positionByToken(positions);
  const all = new Set(positions.map((position) => position.token));
  const domains = new Map<string, Domain>();
  for (const guest of guests) {
    if (!guest.eligible) {
      domains.set(guest.token, new Set());
      continue;
    }
    let domain = new Set(all);
    if (guest.capabilityCodes.length > 0) {
      domain = new Set(
        [...domain].filter((token) => {
          const position = byPosition.get(token);
          return position ? guest.capabilityCodes.every((code) => position.capabilityCodes.includes(code)) : false;
        }),
      );
    }
    for (const constraint of constraints) {
      if (constraint.kind !== "HARD") continue;
      const payload = constraint.payload;
      if (payload.predicateType === "LOCK_ASSIGNMENT" && payload.guestToken === guest.token) {
        domain = domain.has(payload.positionToken) ? new Set([payload.positionToken]) : new Set();
      }
      if (payload.predicateType === "REQUIRE_TABLE" && payload.guestTokens.includes(guest.token)) {
        domain = new Set(
          [...domain].filter((token) => payload.tableTokens.includes(byPosition.get(token)?.tableToken ?? "")),
        );
      }
      if (payload.predicateType === "FORBID_TABLE" && payload.guestTokens.includes(guest.token)) {
        domain = new Set(
          [...domain].filter((token) => !payload.tableTokens.includes(byPosition.get(token)?.tableToken ?? "")),
        );
      }
      if (payload.predicateType === "REQUIRE_ZONE" && payload.guestTokens.includes(guest.token)) {
        domain = new Set(
          [...domain].filter((token) => {
            const zones = byPosition.get(token)?.zoneCodes ?? [];
            return payload.zoneCodes.some((code) => zones.includes(code));
          }),
        );
      }
      if (payload.predicateType === "FORBID_ZONE" && payload.guestTokens.includes(guest.token)) {
        domain = new Set(
          [...domain].filter((token) => {
            const zones = byPosition.get(token)?.zoneCodes ?? [];
            return !payload.zoneCodes.some((code) => zones.includes(code));
          }),
        );
      }
      if (payload.predicateType === "REQUIRE_POSITION_CAPABILITY" && payload.guestTokens.includes(guest.token)) {
        domain = new Set(
          [...domain].filter((token) => {
            const caps = byPosition.get(token)?.capabilityCodes ?? [];
            return payload.capabilityCodes.every((code) => caps.includes(code));
          }),
        );
      }
    }
    domains.set(guest.token, domain);
  }
  return domains;
}

function reservationSeats(
  reservation: SolverReservation,
  positions: SolverPositionToken[],
): SolverPositionToken[] {
  return positions.filter((position) => {
    const tableOk = !reservation.tableTokens?.length || reservation.tableTokens.includes(position.tableToken);
    const zoneOk = !reservation.zoneCodes?.length || reservation.zoneCodes.some((code) => position.zoneCodes.includes(code));
    return tableOk && zoneOk;
  });
}

function hardFindings(
  guests: SolverGuestToken[],
  positions: SolverPositionToken[],
  constraints: SolverConstraint[],
  reservations: SolverReservation[],
  domains: Map<string, Domain>,
): SolverFinding[] {
  const findings: SolverFinding[] = [];
  const guestByToken = new Map(guests.map((guest) => [guest.token, guest]));
  for (const guest of guests) {
    if (!guest.eligible) continue;
    if ((domains.get(guest.token)?.size ?? 0) === 0) {
      findings.push({
        severity: "BLOCKER",
        code: guest.capabilityCodes.length ? "REQUIRED_CAPABILITY" : "NO_FEASIBLE_POSITION",
        affectedTokens: [guest.token],
        message: "No safe seating plan satisfies every hard rule.",
      });
    }
  }
  for (const constraint of constraints) {
    if (constraint.kind !== "HARD") continue;
    const payload = constraint.payload;
    if (payload.predicateType === "KEEP_TOGETHER") {
      const needed = payload.guestTokens.filter((token) => guestByToken.get(token)?.eligible);
      const tableCaps = new Map<string, number>();
      for (const position of positions) {
        tableCaps.set(position.tableToken, (tableCaps.get(position.tableToken) ?? 0) + 1);
      }
      if (needed.length > 0 && [...tableCaps.values()].every((size) => size < needed.length)) {
        findings.push({
          severity: "BLOCKER",
          code: "HARD_GROUP",
          ruleRef: constraint.id,
          affectedTokens: needed,
          message: "No safe seating plan satisfies every hard rule.",
        });
      }
    }
    if (payload.predicateType === "KEEP_TOGETHER" || payload.predicateType === "KEEP_APART") {
      const other = constraints.find(
        (candidate) =>
          candidate.id !== constraint.id &&
          candidate.kind === "HARD" &&
          candidate.predicateType === (payload.predicateType === "KEEP_TOGETHER" ? "KEEP_APART" : "KEEP_TOGETHER") &&
          candidate.payload.predicateType === candidate.predicateType &&
          "guestTokens" in candidate.payload &&
          payload.guestTokens.every((token) => candidate.payload.predicateType !== "KEEP_TOGETHER" && candidate.payload.predicateType !== "KEEP_APART"
            ? false
            : candidate.payload.guestTokens.includes(token)) &&
          payload.guestTokens.length === ("guestTokens" in candidate.payload ? candidate.payload.guestTokens.length : 0),
      );
      if (other) {
        findings.push({
          severity: "BLOCKER",
          code: "CONTRADICTION",
          ruleRef: constraint.id,
          affectedTokens: payload.guestTokens,
          message: "No safe seating plan satisfies every hard rule.",
        });
      }
    }
    if (payload.predicateType === "LOCK_ASSIGNMENT") {
      const domain = domains.get(payload.guestToken);
      if (!domain?.has(payload.positionToken)) {
        findings.push({
          severity: "BLOCKER",
          code: "LOCKED",
          ruleRef: constraint.id,
          affectedTokens: [payload.guestToken, payload.positionToken],
          message: "No safe seating plan satisfies every hard rule.",
        });
      }
    }
  }
  const lockByPosition = new Map<string, string>();
  for (const constraint of constraints) {
    if (constraint.payload.predicateType !== "LOCK_ASSIGNMENT" || constraint.kind !== "HARD") continue;
    const existing = lockByPosition.get(constraint.payload.positionToken);
    if (existing && existing !== constraint.payload.guestToken) {
      findings.push({
        severity: "BLOCKER",
        code: "CONTRADICTION",
        ruleRef: constraint.id,
        affectedTokens: [existing, constraint.payload.guestToken, constraint.payload.positionToken],
        message: "No safe seating plan satisfies every hard rule.",
      });
    }
    lockByPosition.set(constraint.payload.positionToken, constraint.payload.guestToken);
  }
  for (const reservation of reservations) {
    if (reservation.released) continue;
    const seats = reservationSeats(reservation, positions);
    const required = reservation.exact ?? reservation.min ?? 0;
    if (required > seats.length || required > reservation.eligibleGuestTokens.length) {
      findings.push({
        severity: "BLOCKER",
        code: "OVER_RESERVATION",
        ruleRef: reservation.id,
        affectedTokens: reservation.eligibleGuestTokens,
        message: "No safe seating plan satisfies every hard rule.",
      });
    }
  }
  return findings;
}

function connectedComponents(
  guests: SolverGuestToken[],
  constraints: SolverConstraint[],
  reservations: SolverReservation[],
): string[][] {
  const parent = new Map<string, string>();
  const find = (token: string): string => {
    const current = parent.get(token) ?? token;
    if (current === token) return token;
    const root = find(current);
    parent.set(token, root);
    return root;
  };
  const union = (left: string, right: string) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(a, b);
  };
  for (const guest of guests) parent.set(guest.token, guest.token);
  const link = (tokens: string[]) => {
    const first = tokens[0];
    if (!first) return;
    for (let index = 1; index < tokens.length; index += 1) {
      const next = tokens[index];
      if (next) union(first, next);
    }
  };
  for (const constraint of constraints) {
    if (constraint.kind !== "HARD") continue;
    const payload = constraint.payload;
    if ("guestTokens" in payload) link(payload.guestTokens);
  }
  for (const reservation of reservations) {
    if (reservation.released) continue;
    if ((reservation.exact ?? reservation.min ?? 0) > 0) link(reservation.eligibleGuestTokens);
  }
  const groups = new Map<string, string[]>();
  for (const guest of guests) {
    const root = find(guest.token);
    const list = groups.get(root) ?? [];
    list.push(guest.token);
    groups.set(root, list);
  }
  return [...groups.values()].map((tokens) => [...tokens].sort((left, right) => left.localeCompare(right)));
}

function assignmentList(state: SearchState, guests: SolverGuestToken[], reasons: Map<string, SeatingReasonCode[]>): SolverAssignment[] {
  return [...guests]
    .sort((left, right) => left.token.localeCompare(right.token))
    .map((guest) => {
      const positionToken = state.seated.get(guest.token);
      return {
        guestToken: guest.token,
        positionToken,
        state: positionToken ? "SEATED" : "UNSEATED",
        reasonCodes: reasons.get(guest.token) ?? (positionToken ? [] : (["NO_FEASIBLE_POSITION"] as SeatingReasonCode[])),
      };
    });
}

function scoreOf(
  state: SearchState,
  guests: SolverGuestToken[],
  positions: SolverPositionToken[],
  constraints: SolverConstraint[],
  reservations: SolverReservation[],
  complete = true,
): { score: LexicographicScore; hardDetail: string[] } {
  const byPosition = positionByToken(positions);
  const guestByToken = new Map(guests.map((guest) => [guest.token, guest]));
  const tableOf = (guest: string): string | undefined => {
    const token = state.seated.get(guest);
    return token ? byPosition.get(token)?.tableToken : undefined;
  };
  let hardViolations = 0;
  const hardDetail: string[] = [];
  for (const constraint of constraints) {
    if (constraint.kind !== "HARD") continue;
    const payload = constraint.payload;
    if (payload.predicateType === "KEEP_TOGETHER") {
      const seated = payload.guestTokens.filter((token) => state.seated.has(token));
      const tables = new Set(seated.map((token) => tableOf(token)));
      if (seated.length >= 2 && tables.size > 1) {
        hardViolations += 1;
        hardDetail.push(constraint.id);
      }
    }
    if (payload.predicateType === "KEEP_APART") {
      const seated = payload.guestTokens.filter((token) => state.seated.has(token));
      const tables = seated.map((token) => tableOf(token));
      if (new Set(tables).size !== tables.length) {
        hardViolations += 1;
        hardDetail.push(constraint.id);
      }
    }
    if (payload.predicateType === "LOCK_ASSIGNMENT") {
      const seatedAt = state.seated.get(payload.guestToken);
      if (seatedAt && seatedAt !== payload.positionToken) {
        hardViolations += 1;
        hardDetail.push(constraint.id);
      } else if (complete && guestByToken.get(payload.guestToken)?.eligible && !seatedAt) {
        hardViolations += 1;
        hardDetail.push(constraint.id);
      }
    }
    if (payload.predicateType === "REQUIRE_TABLE" || payload.predicateType === "FORBID_TABLE") {
      for (const guest of payload.guestTokens) {
        if (!guestByToken.get(guest)?.eligible) continue;
        const table = tableOf(guest);
        if (payload.predicateType === "FORBID_TABLE") {
          if (table && payload.tableTokens.includes(table)) {
            hardViolations += 1;
            hardDetail.push(constraint.id);
          }
          continue;
        }
        if (table && !payload.tableTokens.includes(table)) {
          hardViolations += 1;
          hardDetail.push(constraint.id);
        } else if (complete && !table) {
          hardViolations += 1;
          hardDetail.push(constraint.id);
        }
      }
    }
    if (payload.predicateType === "REQUIRE_ZONE" || payload.predicateType === "FORBID_ZONE") {
      for (const guest of payload.guestTokens) {
        if (!guestByToken.get(guest)?.eligible) continue;
        const token = state.seated.get(guest);
        const zones = token ? byPosition.get(token)?.zoneCodes ?? [] : [];
        if (payload.predicateType === "FORBID_ZONE") {
          if (token && payload.zoneCodes.some((code) => zones.includes(code))) {
            hardViolations += 1;
            hardDetail.push(constraint.id);
          }
          continue;
        }
        if (token && !payload.zoneCodes.some((code) => zones.includes(code))) {
          hardViolations += 1;
          hardDetail.push(constraint.id);
        } else if (complete && !token) {
          hardViolations += 1;
          hardDetail.push(constraint.id);
        }
      }
    }
    if (payload.predicateType === "REQUIRE_POSITION_CAPABILITY") {
      for (const guest of payload.guestTokens) {
        if (!guestByToken.get(guest)?.eligible) continue;
        const token = state.seated.get(guest);
        const caps = token ? byPosition.get(token)?.capabilityCodes ?? [] : [];
        if (token && !payload.capabilityCodes.every((code) => caps.includes(code))) {
          hardViolations += 1;
          hardDetail.push(constraint.id);
        } else if (complete && !token) {
          hardViolations += 1;
          hardDetail.push(constraint.id);
        }
      }
    }
  }
  for (const [guest, position] of state.seated) {
    const need = guestByToken.get(guest)?.capabilityCodes ?? [];
    const have = byPosition.get(position)?.capabilityCodes ?? [];
    if (!need.every((code) => have.includes(code))) {
      hardViolations += 1;
      hardDetail.push(`capability:${guest}`);
    }
  }
  const occupied = [...state.seated.values()];
  if (new Set(occupied).size !== occupied.length) {
    hardViolations += occupied.length - new Set(occupied).size;
    hardDetail.push("unique-position");
  }
  const tableFill = new Map<string, number>();
  const tableCap = new Map<string, number>();
  for (const position of positions) tableCap.set(position.tableToken, (tableCap.get(position.tableToken) ?? 0) + 1);
  for (const positionToken of state.seated.values()) {
    const table = byPosition.get(positionToken)?.tableToken;
    if (!table) continue;
    tableFill.set(table, (tableFill.get(table) ?? 0) + 1);
  }
  for (const [table, fill] of tableFill) {
    if (fill > (tableCap.get(table) ?? 0)) {
      hardViolations += fill - (tableCap.get(table) ?? 0);
      hardDetail.push(`capacity:${table}`);
    }
  }
  let reservationCommitments = 0;
  for (const reservation of reservations) {
    if (reservation.released) continue;
    const seatedIn = reservation.eligibleGuestTokens.filter((guest) => {
      const token = state.seated.get(guest);
      if (!token) return false;
      const position = byPosition.get(token);
      if (!position) return false;
      const tableOk = !reservation.tableTokens?.length || reservation.tableTokens.includes(position.tableToken);
      const zoneOk = !reservation.zoneCodes?.length || reservation.zoneCodes.some((code) => position.zoneCodes.includes(code));
      return tableOk && zoneOk;
    }).length;
    const exactOk = reservation.exact === undefined || seatedIn === reservation.exact;
    const minOk = reservation.min === undefined || seatedIn >= reservation.min;
    const maxOk = reservation.max === undefined || seatedIn <= reservation.max;
    if (exactOk && minOk && maxOk) reservationCommitments += 1;
    else if (complete && (reservation.exact !== undefined || reservation.min !== undefined)) {
      hardViolations += 1;
      hardDetail.push(`reservation:${reservation.id}`);
    }
  }
  let protocolPriority = 0;
  let accessibilityPriority = 0;
  let safetyPriority = 0;
  for (const guest of guests) {
    if (!state.seated.has(guest.token)) continue;
    if (guest.protocolCodes.length) protocolPriority += 1;
    if (guest.capabilityCodes.some((code) => code.startsWith("A11Y") || code.includes("ACCESS"))) accessibilityPriority += 1;
    if (guest.capabilityCodes.some((code) => code.startsWith("SAFE") || code.includes("SECURITY"))) safetyPriority += 1;
  }
  let preferenceCost = 0;
  let disruption = 0;
  for (const constraint of constraints) {
    if (constraint.kind !== "WEIGHTED") continue;
    const weight = constraint.weight ?? 1;
    const payload = constraint.payload;
    if (payload.predicateType === "PREFER_TOGETHER") {
      const tables = new Set(payload.guestTokens.map((token) => tableOf(token)).filter(Boolean));
      if (tables.size > 1) preferenceCost += weight;
    }
    if (payload.predicateType === "PREFER_APART") {
      const tables = payload.guestTokens.map((token) => tableOf(token)).filter(Boolean);
      if (new Set(tables).size !== tables.length) preferenceCost += weight;
    }
    if (payload.predicateType === "PREFER_TABLE") {
      for (const guest of payload.guestTokens) {
        const table = tableOf(guest);
        if (table && !payload.tableTokens.includes(table)) preferenceCost += weight;
      }
    }
    if (payload.predicateType === "PREFER_ZONE") {
      for (const guest of payload.guestTokens) {
        const token = state.seated.get(guest);
        if (!token) continue;
        const zones = byPosition.get(token)?.zoneCodes ?? [];
        if (!payload.zoneCodes.some((code) => zones.includes(code))) preferenceCost += weight;
      }
    }
    if (payload.predicateType === "MINIMIZE_CHANGE") {
      for (const previous of payload.previous) {
        const current = state.seated.get(previous.guestToken);
        if (current && current !== previous.positionToken) {
          preferenceCost += weight;
          disruption += 1;
        }
        if (!current) disruption += 1;
      }
    }
  }
  const seatedEligible = guests.filter((guest) => guest.eligible && state.seated.has(guest.token)).length;
  const tieBreak = [...state.seated.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([guest, position]) => `${guest}:${position}`)
    .join("|");
  return {
    score: {
      hardViolations,
      seatedEligible,
      reservationCommitments,
      protocolPriority,
      accessibilityPriority,
      safetyPriority,
      preferenceCost,
      disruption,
      tieBreak,
    },
    hardDetail,
  };
}

function cloneState(state: SearchState): SearchState {
  return { seated: new Map(state.seated), occupied: new Set(state.occupied) };
}

function remainingDomain(domain: Domain, occupied: Set<string>): string[] {
  return [...domain].filter((token) => !occupied.has(token)).sort((left, right) => left.localeCompare(right));
}

function reasonFor(guest: SolverGuestToken, constraints: SolverConstraint[], seated: boolean): SeatingReasonCode[] {
  if (!seated && !guest.eligible) return ["NO_FEASIBLE_POSITION"];
  const codes: SeatingReasonCode[] = [];
  for (const constraint of constraints) {
    if (constraint.payload.predicateType === "LOCK_ASSIGNMENT" && constraint.payload.guestToken === guest.token) {
      codes.push("LOCKED");
    }
    if (constraint.kind === "HARD" && "guestTokens" in constraint.payload && constraint.payload.guestTokens.includes(guest.token)) {
      if (constraint.predicateType === "KEEP_TOGETHER") codes.push("HARD_GROUP");
      if (constraint.predicateType === "KEEP_APART") codes.push("HARD_SEPARATION");
      if (constraint.predicateType === "REQUIRE_POSITION_CAPABILITY") codes.push("REQUIRED_CAPABILITY");
    }
  }
  if (guest.protocolCodes.length) codes.push("PROTOCOL_PRIORITY");
  if (guest.capabilityCodes.some((code) => code.startsWith("A11Y") || code.includes("ACCESS"))) {
    codes.push("ACCESSIBILITY_PRIORITY");
  }
  if (!seated && codes.length === 0) codes.push("NO_FEASIBLE_POSITION");
  return [...new Set(codes)];
}

function hashResult(input: {
  status: SolverResult["status"];
  assignments: SolverAssignment[];
  findings: SolverFinding[];
  score: LexicographicScore;
  configHash: string;
  seed: string;
}): string {
  return exactHash({
    solverVersion: SEATING_SOLVER_VERSION,
    status: input.status,
    assignments: input.assignments,
    findings: input.findings,
    score: input.score,
    configHash: input.configHash,
    seed: input.seed,
  });
}

function searchComponent(
  orderedGuests: SolverGuestToken[],
  domains: Map<string, Domain>,
  positions: SolverPositionToken[],
  constraints: SolverConstraint[],
  reservations: SolverReservation[],
  seed: SearchState,
  deadline: number,
  limits: { nodes: number; memoryLimitMb: number },
): { state: SearchState; timedOut: boolean; nodes: number } {
  let best = cloneState(seed);
  let bestScore = scoreOf(best, orderedGuests, positions, constraints, reservations).score;
  let timedOut = false;
  const assignable = orderedGuests.filter((guest) => guest.eligible);
  const visit = (index: number, state: SearchState) => {
    limits.nodes += 1;
    if (Date.now() > deadline) {
      timedOut = true;
      return;
    }
    if (process.memoryUsage().heapUsed > limits.memoryLimitMb * 1024 * 1024) {
      timedOut = true;
      return;
    }
    if (index >= assignable.length) {
      const current = scoreOf(state, orderedGuests, positions, constraints, reservations, true).score;
      if (compareLexicographic(current, bestScore) < 0) {
        best = cloneState(state);
        bestScore = current;
      }
      return;
    }
    const remainingSeats = Math.max(0, positions.length - state.occupied.size);
    const remainingGuests = assignable.length - index;
    const optimisticSeated = state.seated.size + Math.min(remainingSeats, remainingGuests);
    if (bestScore.hardViolations === 0 && optimisticSeated < bestScore.seatedEligible) return;
    const guest = assignable[index];
    if (!guest) return;
    const options = remainingDomain(domains.get(guest.token) ?? new Set(), state.occupied);
    const choices: Array<string | undefined> = options.length > 16 ? options.slice(0, 16) : [...options];
    choices.push(undefined);
    for (const position of choices) {
      if (timedOut) return;
      const next = cloneState(state);
      if (position) {
        next.seated.set(guest.token, position);
        next.occupied.add(position);
        const probe = scoreOf(next, orderedGuests, positions, constraints, reservations, false).score;
        if (probe.hardViolations > 0) continue;
      }
      visit(index + 1, next);
    }
  };
  visit(0, seed);
  return { state: best, timedOut, nodes: limits.nodes };
}

function seatIfFeasible(
  state: SearchState,
  guest: SolverGuestToken,
  options: string[],
  guests: SolverGuestToken[],
  positions: SolverPositionToken[],
  constraints: SolverConstraint[],
  reservations: SolverReservation[],
): boolean {
  const byPosition = positionByToken(positions);
  let chosen: string | undefined;
  let bestScore: LexicographicScore | undefined;
  let considered = 0;
  const scarce = options.filter((token) => {
    const caps = byPosition.get(token)?.capabilityCodes ?? [];
    return caps.some((code) => !guest.capabilityCodes.includes(code));
  });
  const preferred = options.filter((token) => !scarce.includes(token));
  const orderedOptions = preferred.length ? [...preferred, ...scarce] : options;
  for (const option of orderedOptions) {
    const probe = cloneState(state);
    probe.seated.set(guest.token, option);
    probe.occupied.add(option);
    const scored = scoreOf(probe, guests, positions, constraints, reservations, false).score;
    if (scored.hardViolations > 0) continue;
    considered += 1;
    if (!bestScore || compareLexicographic(scored, bestScore) < 0) {
      bestScore = scored;
      chosen = option;
    }
    if (considered >= 8) break;
  }
  if (chosen && byPosition.has(chosen)) {
    state.seated.set(guest.token, chosen);
    state.occupied.add(chosen);
    return true;
  }
  return false;
}

function constructiveSeed(
  guests: SolverGuestToken[],
  domains: Map<string, Domain>,
  positions: SolverPositionToken[],
  constraints: SolverConstraint[],
  reservations: SolverReservation[],
): SearchState {
  const state: SearchState = { seated: new Map(), occupied: new Set() };
  const guestByToken = new Map(guests.map((guest) => [guest.token, guest]));
  const reservedSeatsFor = (reservation: SolverReservation): string[] =>
    reservationSeats(reservation, positions).map((position) => position.token).sort((left, right) => left.localeCompare(right));

  for (const reservation of [...reservations].sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))) {
    if (reservation.released) continue;
    const need = reservation.exact ?? reservation.min ?? 0;
    const seats = reservedSeatsFor(reservation);
    const candidates = reservation.eligibleGuestTokens
      .map((token) => guestByToken.get(token))
      .filter((guest): guest is SolverGuestToken => Boolean(guest?.eligible))
      .sort((left, right) => left.token.localeCompare(right.token));
    let seated = 0;
    for (const guest of candidates) {
      if (seated >= (reservation.exact ?? reservation.max ?? need) && reservation.exact !== undefined) break;
      if (seated >= (reservation.max ?? Number.POSITIVE_INFINITY)) break;
      if (state.seated.has(guest.token)) {
        seated += 1;
        continue;
      }
      const options = remainingDomain(domains.get(guest.token) ?? new Set(), state.occupied).filter((token) => seats.includes(token));
      if (seatIfFeasible(state, guest, options, guests, positions, constraints, reservations)) seated += 1;
      if (reservation.exact !== undefined && seated >= reservation.exact) break;
      if (reservation.min !== undefined && reservation.exact === undefined && seated >= Math.max(need, reservation.min)) {
        if (reservation.max === undefined) continue;
      }
    }
  }

  const order = [...guests].sort((left, right) => {
    const lockDelta = Number(lockedGuest(right.token, constraints)) - Number(lockedGuest(left.token, constraints));
    if (lockDelta) return lockDelta;
    const hardDelta = guestHardCount(right.token, constraints) - guestHardCount(left.token, constraints);
    if (hardDelta) return hardDelta;
    const reserveDelta = reservationPriority(right.token, reservations) - reservationPriority(left.token, reservations);
    if (reserveDelta) return reserveDelta;
    return left.token.localeCompare(right.token);
  });
  for (const guest of order) {
    if (!guest.eligible || state.seated.has(guest.token)) continue;
    const options = remainingDomain(domains.get(guest.token) ?? new Set(), state.occupied);
    seatIfFeasible(state, guest, options, guests, positions, constraints, reservations);
  }
  return state;
}

function generateAlternatives(
  request: SolverRequest,
  primary: SearchState,
  domains: Map<string, Domain>,
  deadline: number,
): { alternatives: SolverAlternative[]; timedOut: boolean; nodes: number } {
  const alternatives: SolverAlternative[] = [];
  let timedOut = false;
  let nodes = 0;
  const primaryPairs = new Map(primary.seated);
  for (let index = 0; index < request.config.alternativeCount; index += 1) {
    const forbidden = new Set(
      [...primaryPairs.entries()].map(([guest, position]) => `${guest}:${position}`),
    );
    const adjusted = new Map(domains);
    for (const guest of request.guests) {
      const domain = new Set(adjusted.get(guest.token) ?? []);
      for (const position of [...domain]) {
        if (forbidden.has(`${guest.token}:${position}`) && domain.size > 1) domain.delete(position);
      }
      adjusted.set(guest.token, domain);
    }
    const seed = constructiveSeed(request.guests, adjusted, request.positions, request.constraints, request.reservations);
    const useSearch = request.guests.length <= 40 && Date.now() < deadline;
    const searched = useSearch
      ? searchComponent(
          request.guests,
          adjusted,
          request.positions,
          request.constraints,
          request.reservations,
          seed,
          deadline,
          { nodes: 0, memoryLimitMb: request.config.memoryLimitMb },
        )
      : { state: seed, timedOut: false, nodes: 0 };
    nodes += searched.nodes;
    timedOut = timedOut || searched.timedOut;
    const scored = scoreOf(searched.state, request.guests, request.positions, request.constraints, request.reservations);
    if (scored.score.hardViolations > 0) continue;
    let differed = 0;
    for (const [guest, position] of primaryPairs) {
      if (searched.state.seated.get(guest) !== position) differed += 1;
    }
    for (const guest of searched.state.seated.keys()) {
      if (!primaryPairs.has(guest)) differed += 1;
    }
    if (differed < request.config.materialityThreshold) continue;
    const reasons = new Map(
      request.guests.map((guest) => [guest.token, reasonFor(guest, request.constraints, searched.state.seated.has(guest.token))]),
    );
    const assignments = assignmentList(searched.state, request.guests, reasons);
    const configHash = exactHash(request.config);
    alternatives.push({
      assignments,
      score: scored.score,
      resultHash: hashResult({
        status: "FEASIBLE",
        assignments,
        findings: [],
        score: scored.score,
        configHash,
        seed: `${request.config.seed}:alt:${index}`,
      }),
      differedAssignments: differed,
    });
  }
  return { alternatives, timedOut, nodes };
}

export function solveSeatingV1(input: unknown): SolverResult {
  const started = Date.now();
  const request = assertSolverRequest(input);
  const deadline = started + request.config.timeLimitMs;
  const configHash = exactHash(request.config);
  const guests = [...request.guests].sort((left, right) => {
    const lockDelta = Number(lockedGuest(right.token, request.constraints)) - Number(lockedGuest(left.token, request.constraints));
    if (lockDelta) return lockDelta;
    const hardDelta = guestHardCount(right.token, request.constraints) - guestHardCount(left.token, request.constraints);
    if (hardDelta) return hardDelta;
    const reserveDelta =
      reservationPriority(right.token, request.reservations) - reservationPriority(left.token, request.reservations);
    if (reserveDelta) return reserveDelta;
    return left.token.localeCompare(right.token);
  });
  const positions = [...request.positions].sort((left, right) => {
    const table = left.tableToken.localeCompare(right.tableToken);
    return table !== 0 ? table : left.token.localeCompare(right.token);
  });
  const domains = buildDomains(guests, positions, request.constraints);
  const findings = hardFindings(guests, positions, request.constraints, request.reservations, domains);
  const components = connectedComponents(guests, request.constraints, request.reservations);
  const seed = constructiveSeed(guests, domains, positions, request.constraints, request.reservations);
  const seedScore = scoreOf(seed, guests, positions, request.constraints, request.reservations, true).score;
  let merged = cloneState(seed);
  let searchNodes = 0;
  let timedOut = false;
  let searchIncomplete = false;
  const guestByToken = new Map(guests.map((guest) => [guest.token, guest]));
  if (seedScore.hardViolations > 0) {
    for (const component of [...components].sort((left, right) => (left[0] ?? "").localeCompare(right[0] ?? ""))) {
      if (Date.now() > deadline) {
        timedOut = true;
        break;
      }
      const members = component
        .map((token) => guestByToken.get(token))
        .filter((guest): guest is SolverGuestToken => Boolean(guest));
      if (members.length < 2) continue;
      if (members.length > 8) {
        if (seedScore.hardViolations > 0) searchIncomplete = true;
        continue;
      }
      const componentSeed: SearchState = {
        seated: new Map([...merged.seated].filter(([guest]) => !component.includes(guest))),
        occupied: new Set(
          [...merged.seated.entries()].filter(([guest]) => !component.includes(guest)).map(([, position]) => position),
        ),
      };
      const searchedComponent = searchComponent(
        members,
        domains,
        positions,
        request.constraints,
        request.reservations,
        componentSeed,
        deadline,
        { nodes: 0, memoryLimitMb: request.config.memoryLimitMb },
      );
      searchNodes += searchedComponent.nodes;
      timedOut = timedOut || searchedComponent.timedOut;
      for (const member of members) merged.seated.delete(member.token);
      merged.occupied = new Set(merged.seated.values());
      for (const [guest, position] of searchedComponent.state.seated) {
        if (!component.includes(guest)) continue;
        merged.seated.set(guest, position);
        merged.occupied.add(position);
      }
    }
  }
  const searched = { state: merged, timedOut: timedOut || searchIncomplete, nodes: searchNodes };
  const scored = scoreOf(searched.state, guests, positions, request.constraints, request.reservations);
  const reasons = new Map(
    guests.map((guest) => [guest.token, reasonFor(guest, request.constraints, searched.state.seated.has(guest.token))]),
  );
  for (const guest of guests) {
    if (!guest.eligible) reasons.set(guest.token, ["NO_FEASIBLE_POSITION"]);
    else if (!searched.state.seated.has(guest.token) && (domains.get(guest.token)?.size ?? 0) === 0) {
      reasons.set(guest.token, guest.capabilityCodes.length ? ["REQUIRED_CAPABILITY"] : ["CAPACITY"]);
    }
  }
  const assignments = assignmentList(searched.state, guests, reasons);
  const contradiction = findings.some((finding) => finding.code === "CONTRADICTION" || finding.code === "OVER_RESERVATION");
  let status: SolverResult["status"] = "FEASIBLE";
  if (scored.score.hardViolations === 0 && !contradiction) status = "FEASIBLE";
  else if (searched.timedOut) status = "TIMED_OUT";
  else status = "INFEASIBLE";
  const alternatives =
    status === "FEASIBLE"
      ? generateAlternatives(request, searched.state, domains, deadline)
      : { alternatives: [] as SolverAlternative[], timedOut: false, nodes: 0 };
  if (alternatives.timedOut && status === "FEASIBLE") {
    // alternatives may time out without invalidating a feasible primary
  }
  const resultHash = hashResult({
    status,
    assignments,
    findings,
    score: scored.score,
    configHash,
    seed: request.config.seed,
  });
  return {
    status,
    assignments,
    findings,
    score: scored.score,
    alternatives: alternatives.alternatives,
    resultHash,
    configHash,
    solverVersion: SEATING_SOLVER_VERSION,
    metrics: {
      elapsedMs: Date.now() - started,
      heapUsedBytes: process.memoryUsage().heapUsed,
      nodes: searched.nodes + alternatives.nodes,
      components: components.length,
    },
  };
}

export function defaultSolverConfig(overrides?: Partial<SolverRequest["config"]>): SolverRequest["config"] {
  return { ...DEFAULT_SOLVER_CONFIG, ...overrides, objectiveOrder: DEFAULT_SOLVER_CONFIG.objectiveOrder };
}
