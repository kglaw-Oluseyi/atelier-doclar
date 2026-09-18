/**
 * CAP1000 B_TYPICAL focused feasibility diagnosis.
 * Read-only corpus + one solve + one traced solve. No live DB. No corpus mutation.
 * Expected duration: ≤3 min. Hard stop: 15 min.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildCapacity1000Corpus,
  capacity1000CorpusHash,
  CAPACITY_1000_SCENARIO_SEEDS,
} from "../src/seating-capacity-1000-corpus.js";
import { solveSeatingV1, assertSolverRequest } from "../src/seating-solver-v1.js";
import type {
  SolverConstraint,
  SolverGuestToken,
  SolverPositionToken,
  SolverRequest,
  SolverReservation,
  SolverResult,
} from "../src/seating-solver-types.js";
import { evaluateCapacityInvariants } from "../test/seating-capacity-invariants.js";

const OUT_DIR = join(process.cwd(), "../../docs/control/evidence/eos-s06-capacity-1000");
const started = Date.now();
const HARD_STOP_MS = 15 * 60_000;

function progress(msg: string) {
  console.log(`[B-DIAG +${Date.now() - started}ms] ${msg}`);
  if (Date.now() - started > HARD_STOP_MS) throw new Error("DIAGNOSTIC HARD STOP 15m");
}

function guestTokensOf(constraint: SolverConstraint): string[] {
  const payload = constraint.payload as {
    guestToken?: string;
    guestTokens?: string[];
  };
  if (payload.guestToken) return [payload.guestToken];
  return payload.guestTokens ?? [];
}

function tableTokensOf(constraint: SolverConstraint): string[] {
  const payload = constraint.payload as { tableTokens?: string[]; positionToken?: string };
  if (payload.positionToken) return [payload.positionToken.split(":")[0]!];
  return payload.tableTokens ?? [];
}

/** Mirror solver connectedComponents linkage (HARD edges + reservation membership). */
function connectedComponents(request: SolverRequest): string[][] {
  const parent = new Map<string, string>();
  const find = (token: string): string => {
    const current = parent.get(token) ?? token;
    if (current !== token) {
      const root = find(current);
      parent.set(token, root);
      return root;
    }
    return current;
  };
  const union = (left: string, right: string) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(a, b);
  };
  for (const guest of request.guests) parent.set(guest.token, guest.token);
  for (const constraint of request.constraints) {
    if (constraint.kind !== "HARD") continue;
    const tokens = guestTokensOf(constraint);
    for (let index = 1; index < tokens.length; index += 1) union(tokens[0]!, tokens[index]!);
    if (constraint.predicateType === "LOCK_ASSIGNMENT") {
      /* single guest — alone unless linked elsewhere */
    }
  }
  for (const reservation of request.reservations) {
    const tokens = reservation.eligibleGuestTokens;
    for (let index = 1; index < tokens.length; index += 1) union(tokens[0]!, tokens[index]!);
  }
  const groups = new Map<string, string[]>();
  for (const guest of request.guests) {
    const root = find(guest.token);
    const list = groups.get(root) ?? [];
    list.push(guest.token);
    groups.set(root, list);
  }
  return [...groups.values()].map((list) => list.sort((a, b) => a.localeCompare(b)));
}

type HardDetail = { id: string; reason: string };

function scoreHardDetails(
  state: Map<string, string>,
  request: SolverRequest,
  complete: boolean,
): { hardViolations: number; details: HardDetail[] } {
  const byPosition = new Map(request.positions.map((item) => [item.token, item]));
  const guestByToken = new Map(request.guests.map((item) => [item.token, item]));
  const tableOf = (guest: string) => {
    const token = state.get(guest);
    return token ? byPosition.get(token)?.tableToken : undefined;
  };
  let hardViolations = 0;
  const details: HardDetail[] = [];
  const push = (id: string, reason: string) => {
    hardViolations += 1;
    details.push({ id, reason });
  };
  for (const constraint of request.constraints) {
    if (constraint.kind !== "HARD") continue;
    const payload = constraint.payload;
    if (payload.predicateType === "KEEP_TOGETHER") {
      const seated = payload.guestTokens.filter((token) => state.has(token));
      const tables = new Set(seated.map((token) => tableOf(token)));
      if (seated.length >= 2 && tables.size > 1) push(constraint.id, "KEEP_TOGETHER split tables");
    }
    if (payload.predicateType === "KEEP_APART") {
      const seated = payload.guestTokens.filter((token) => state.has(token));
      const tables = seated.map((token) => tableOf(token));
      if (new Set(tables).size !== tables.length) push(constraint.id, "KEEP_APART same table");
    }
    if (payload.predicateType === "LOCK_ASSIGNMENT") {
      const seatedAt = state.get(payload.guestToken);
      if (seatedAt && seatedAt !== payload.positionToken) push(constraint.id, "LOCK wrong seat");
      else if (complete && guestByToken.get(payload.guestToken)?.eligible && !seatedAt) push(constraint.id, "LOCK unseated");
    }
    if (payload.predicateType === "REQUIRE_TABLE" || payload.predicateType === "FORBID_TABLE") {
      for (const guest of payload.guestTokens) {
        if (!guestByToken.get(guest)?.eligible) continue;
        const table = tableOf(guest);
        if (payload.predicateType === "FORBID_TABLE") {
          if (table && payload.tableTokens.includes(table)) push(constraint.id, `FORBID_TABLE ${guest}@${table}`);
          continue;
        }
        if (table && !payload.tableTokens.includes(table)) push(constraint.id, `REQUIRE_TABLE miss ${guest}@${table}`);
        else if (complete && !table) push(constraint.id, `REQUIRE_TABLE unseated ${guest}`);
      }
    }
    if (payload.predicateType === "REQUIRE_ZONE" || payload.predicateType === "FORBID_ZONE") {
      for (const guest of payload.guestTokens) {
        if (!guestByToken.get(guest)?.eligible) continue;
        const token = state.get(guest);
        const zones = token ? byPosition.get(token)?.zoneCodes ?? [] : [];
        if (payload.predicateType === "FORBID_ZONE") {
          if (token && payload.zoneCodes.some((code) => zones.includes(code))) push(constraint.id, `FORBID_ZONE ${guest}`);
          continue;
        }
        if (token && !payload.zoneCodes.some((code) => zones.includes(code))) push(constraint.id, `REQUIRE_ZONE miss ${guest}`);
        else if (complete && !token) push(constraint.id, `REQUIRE_ZONE unseated ${guest}`);
      }
    }
  }
  for (const [guest, position] of state) {
    const need = guestByToken.get(guest)?.capabilityCodes ?? [];
    const have = byPosition.get(position)?.capabilityCodes ?? [];
    if (!need.every((code) => have.includes(code))) push(`capability:${guest}`, `capability mismatch at ${position}`);
  }
  const occupied = [...state.values()];
  if (new Set(occupied).size !== occupied.length) push("unique-position", "duplicate seats");
  const tableFill = new Map<string, number>();
  const tableCap = new Map<string, number>();
  for (const position of request.positions) tableCap.set(position.tableToken, (tableCap.get(position.tableToken) ?? 0) + 1);
  for (const positionToken of state.values()) {
    const table = byPosition.get(positionToken)?.tableToken;
    if (!table) continue;
    tableFill.set(table, (tableFill.get(table) ?? 0) + 1);
  }
  for (const [table, fill] of tableFill) {
    if (fill > (tableCap.get(table) ?? 0)) push(`capacity:${table}`, `over capacity ${fill}>${tableCap.get(table)}`);
  }
  for (const reservation of request.reservations) {
    if (reservation.released) continue;
    const seatedIn = reservation.eligibleGuestTokens.filter((guest) => {
      const token = state.get(guest);
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
    if (!(exactOk && minOk && maxOk) && complete && (reservation.exact !== undefined || reservation.min !== undefined)) {
      push(`reservation:${reservation.id}`, `reservation unmet seatedIn=${seatedIn} min=${reservation.min} max=${reservation.max} exact=${reservation.exact}`);
    }
  }
  if (complete) {
    for (const guest of request.guests) {
      if (!guest.eligible || state.has(guest.token)) continue;
      push(`unseated-required:${guest.token}`, "eligible unseated");
    }
  }
  return { hardViolations, details };
}

function staticCorpusValidation(request: SolverRequest) {
  const issues: string[] = [];
  const hard = request.constraints.filter((item) => item.kind === "HARD");
  const ids = hard.map((item) => item.id);
  if (new Set(ids).size !== ids.length) issues.push("duplicate HARD rule ids");

  // together/apart contradictions on same guest pair
  const togetherPairs = new Set<string>();
  const apartPairs = new Set<string>();
  const pairKey = (tokens: string[]) => [...tokens].sort().join("|");
  for (const constraint of hard) {
    if (constraint.payload.predicateType === "KEEP_TOGETHER") togetherPairs.add(pairKey(constraint.payload.guestTokens));
    if (constraint.payload.predicateType === "KEEP_APART") apartPairs.add(pairKey(constraint.payload.guestTokens));
  }
  for (const key of togetherPairs) {
    if (apartPairs.has(key)) issues.push(`together/apart contradiction on ${key}`);
  }

  // require + forbid same table for same guest
  for (const guest of request.guests) {
    const requires = hard.filter(
      (item) =>
        item.payload.predicateType === "REQUIRE_TABLE" && item.payload.guestTokens.includes(guest.token),
    );
    const forbids = hard.filter(
      (item) => item.payload.predicateType === "FORBID_TABLE" && item.payload.guestTokens.includes(guest.token),
    );
    for (const req of requires) {
      for (const forbid of forbids) {
        const overlap = req.payload.tableTokens.filter((token) => forbid.payload.tableTokens.includes(token));
        if (overlap.length) issues.push(`require+forbid same table for ${guest.token}: ${overlap.join(",")}`);
      }
    }
  }

  // incompatible locks (two guests same seat)
  const locks = hard.filter((item) => item.payload.predicateType === "LOCK_ASSIGNMENT");
  const bySeat = new Map<string, string[]>();
  for (const lock of locks) {
    const list = bySeat.get(lock.payload.positionToken) ?? [];
    list.push(lock.payload.guestToken);
    bySeat.set(lock.payload.positionToken, list);
  }
  for (const [seat, guests] of bySeat) {
    if (guests.length > 1) issues.push(`incompatible locks on ${seat}: ${guests.join(",")}`);
  }

  // together group larger than any allowed table capacity (considering require-table)
  for (const constraint of hard) {
    if (constraint.payload.predicateType !== "KEEP_TOGETHER") continue;
    const size = constraint.payload.guestTokens.length;
    const maxCap = Math.max(...[...new Set(request.positions.map((item) => item.tableToken))].map((table) =>
      request.positions.filter((item) => item.tableToken === table).length,
    ));
    if (size > maxCap) issues.push(`together group ${constraint.id} size ${size} > max table ${maxCap}`);
  }

  // reservation capacity vs min
  for (const reservation of request.reservations) {
    const tables = reservation.tableTokens ?? [];
    const seats = request.positions.filter((item) => tables.includes(item.tableToken)).length;
    if (reservation.min !== undefined && seats < reservation.min) {
      issues.push(`reservation ${reservation.id} min ${reservation.min} > table seat count ${seats}`);
    }
    // wheelchair reservation: capability seats
    if (reservation.id === "res-access-1000") {
      const a11ySeats = request.positions.filter(
        (item) => tables.includes(item.tableToken) && item.capabilityCodes.includes("A11Y_WHEELCHAIR"),
      ).length;
      const need = reservation.eligibleGuestTokens.filter((token) =>
        request.guests.find((guest) => guest.token === token)?.capabilityCodes.includes("A11Y_WHEELCHAIR"),
      ).length;
      if (need > a11ySeats) issues.push(`res-access needs ${need} a11y seats but only ${a11ySeats} on reserved tables`);
      if (reservation.min !== undefined && reservation.min > a11ySeats) {
        issues.push(`res-access min ${reservation.min} exceeds a11y seat supply ${a11ySeats}`);
      }
    }
  }

  // domain emptiness for locks/zones
  for (const lock of locks) {
    if (!request.positions.some((item) => item.token === lock.payload.positionToken)) {
      issues.push(`lock ${lock.id} targets missing position ${lock.payload.positionToken}`);
    }
  }

  return issues;
}

/** Independent component feasibility: brute-force assign component guests to remaining seats under HARD only. */
function independentComponentFeasibility(
  request: SolverRequest,
  component: string[],
  fixedOutside: Map<string, string>,
): { feasible: boolean; reason: string; explored: number; timedOut: boolean } {
  const byPosition = new Map(request.positions.map((item) => [item.token, item]));
  const occupied = new Set(fixedOutside.values());
  const members = component
    .map((token) => request.guests.find((guest) => guest.token === token)!)
    .filter((guest) => guest.eligible)
    .sort((left, right) => left.token.localeCompare(right.token));

  // Candidate seats: all free seats that appear in member domains after HARD filters
  const hard = request.constraints.filter((item) => item.kind === "HARD");
  const domain = (guest: SolverGuestToken): string[] => {
    let seats = request.positions.filter((item) => !occupied.has(item.token));
    for (const constraint of hard) {
      const payload = constraint.payload;
      if (payload.predicateType === "LOCK_ASSIGNMENT" && payload.guestToken === guest.token) {
        seats = seats.filter((item) => item.token === payload.positionToken);
      }
      if (payload.predicateType === "REQUIRE_TABLE" && payload.guestTokens.includes(guest.token)) {
        seats = seats.filter((item) => payload.tableTokens.includes(item.tableToken));
      }
      if (payload.predicateType === "FORBID_TABLE" && payload.guestTokens.includes(guest.token)) {
        seats = seats.filter((item) => !payload.tableTokens.includes(item.tableToken));
      }
      if (payload.predicateType === "REQUIRE_ZONE" && payload.guestTokens.includes(guest.token)) {
        seats = seats.filter((item) => payload.zoneCodes.some((code) => item.zoneCodes.includes(code)));
      }
      if (guest.capabilityCodes.length) {
        seats = seats.filter((item) => guest.capabilityCodes.every((code) => item.capabilityCodes.includes(code)));
      }
    }
    return seats.map((item) => item.token).sort();
  };

  if (members.length > 10) {
    return { feasible: false, reason: `component too large for exhaustive independent check (${members.length})`, explored: 0, timedOut: true };
  }

  let explored = 0;
  const deadline = Date.now() + 60_000;
  let found = false;
  const visit = (index: number, seated: Map<string, string>, used: Set<string>) => {
    if (found || Date.now() > deadline) return;
    explored += 1;
    if (index >= members.length) {
      const merged = new Map([...fixedOutside, ...seated]);
      const scored = scoreHardDetails(merged, request, true);
      // Only care about HARD involving component + global consistency for component guests
      const relevant = scored.details.filter(
        (detail) =>
          component.some((token) => detail.id.includes(token) || detail.reason.includes(token)) ||
          detail.id.startsWith("reservation:") ||
          detail.id.startsWith("capacity:") ||
          detail.id.startsWith("capability:") ||
          detail.id.startsWith("unseated-required:") && component.includes(detail.id.split(":")[1]!),
      );
      // Full complete score on merged state for component-affecting rules
      const full = scoreHardDetails(merged, request, true);
      const componentUnseated = members.some((guest) => !merged.has(guest.token));
      const hardOnComponent = full.details.filter((detail) => {
        if (detail.id.startsWith("unseated-required:")) return component.includes(detail.id.slice("unseated-required:".length));
        if (detail.id.startsWith("capability:")) return component.includes(detail.id.slice("capability:".length));
        if (detail.id.startsWith("reservation:")) return true;
        const constraint = request.constraints.find((item) => item.id === detail.id);
        if (!constraint) return detail.id.startsWith("capacity:");
        return guestTokensOf(constraint).some((token) => component.includes(token));
      });
      if (!componentUnseated && hardOnComponent.length === 0) {
        // Also ensure no KEEP_TOGETHER/APART etc among component with zero hard
        if (full.hardViolations === 0 || hardOnComponent.length === 0) {
          // Accept if no hard details touch this component and all members seated
          const touching = full.details.filter((detail) => {
            if (detail.id.startsWith("unseated-required:")) return component.includes(detail.id.slice("unseated-required:".length));
            const constraint = request.constraints.find((item) => item.id === detail.id);
            if (constraint) return guestTokensOf(constraint).some((token) => component.includes(token));
            if (detail.id.startsWith("capability:")) return component.includes(detail.id.slice("capability:".length));
            if (detail.id.startsWith("reservation:")) {
              const reservation = request.reservations.find((item) => `reservation:${item.id}` === detail.id);
              return reservation?.eligibleGuestTokens.some((token) => component.includes(token));
            }
            return false;
          });
          if (touching.length === 0) found = true;
        }
      }
      void relevant;
      return;
    }
    const guest = members[index]!;
    const options = domain(guest).filter((token) => !used.has(token));
    // Also try leaving unseated last — but we need all seated for feasibility
    for (const position of options.slice(0, 24)) {
      seated.set(guest.token, position);
      used.add(position);
      const probe = scoreHardDetails(new Map([...fixedOutside, ...seated]), request, false);
      const touching = probe.details.filter((detail) => {
        const constraint = request.constraints.find((item) => item.id === detail.id);
        if (constraint) return guestTokensOf(constraint).some((token) => component.includes(token));
        if (detail.id.startsWith("capability:")) return component.includes(detail.id.slice("capability:".length));
        return false;
      });
      if (touching.length === 0) visit(index + 1, seated, used);
      used.delete(position);
      seated.delete(guest.token);
      if (found) return;
    }
  };
  visit(0, new Map(), new Set(occupied));
  if (Date.now() > deadline && !found) return { feasible: false, reason: "independent search timed out (60s)", explored, timedOut: true };
  return {
    feasible: found,
    reason: found ? "found HARD-valid full seating for component against fixed exterior" : "no HARD-valid seating found in bounded independent search",
    explored,
    timedOut: false,
  };
}

function constraintsAffecting(request: SolverRequest, guestToken: string) {
  return request.constraints.filter((item) => guestTokensOf(item).includes(guestToken) || (item.payload.predicateType === "LOCK_ASSIGNMENT" && item.payload.guestToken === guestToken));
}

function compareWithHeavy() {
  const b = buildCapacity1000Corpus("B_TYPICAL");
  const c = buildCapacity1000Corpus("C_HEAVY");
  const bComponents = connectedComponents(b);
  const cComponents = connectedComponents(c);
  const sizeHist = (components: string[][]) => {
    const hist = new Map<number, number>();
    for (const component of components) hist.set(component.length, (hist.get(component.length) ?? 0) + 1);
    return [...hist.entries()].sort((left, right) => left[0] - right[0]);
  };
  return {
    B: {
      hard: b.constraints.filter((item) => item.kind === "HARD").length,
      components: bComponents.length,
      maxComponent: Math.max(...bComponents.map((item) => item.length)),
      componentsGt8: bComponents.filter((item) => item.length > 8).map((item) => ({ size: item.length, sample: item.slice(0, 12) })),
      sizeHist: sizeHist(bComponents),
      reservations: b.reservations.map((item) => ({
        id: item.id,
        eligible: item.eligibleGuestTokens.length,
        tables: item.tableTokens?.length ?? 0,
        min: item.min,
        max: item.max,
      })),
    },
    C: {
      hard: c.constraints.filter((item) => item.kind === "HARD").length,
      components: cComponents.length,
      maxComponent: Math.max(...cComponents.map((item) => item.length)),
      componentsGt8: cComponents.filter((item) => item.length > 8).map((item) => ({ size: item.length, sample: item.slice(0, 12) })),
      sizeHist: sizeHist(cComponents),
      reservations: c.reservations.map((item) => ({
        id: item.id,
        eligible: item.eligibleGuestTokens.length,
        tables: item.tableTokens?.length ?? 0,
        min: item.min,
        max: item.max,
      })),
    },
  };
}

progress("build B_TYPICAL corpus");
const request = buildCapacity1000Corpus("B_TYPICAL");
const hash = capacity1000CorpusHash("B_TYPICAL");
progress(`hash=${hash} seed=${CAPACITY_1000_SCENARIO_SEEDS.B_TYPICAL}`);

progress("static corpus validation");
const staticIssues = staticCorpusValidation(request);
progress(`static issues=${staticIssues.length}`);

progress("component graph analysis");
const components = connectedComponents(request);
const large = components.filter((item) => item.length > 8).sort((left, right) => right.length - left.length);
progress(`components=${components.length} max=${Math.max(...components.map((item) => item.length))} gt8=${large.length}`);

progress("one normal B_TYPICAL reproduction");
const result = solveSeatingV1(request);
const invariants = evaluateCapacityInvariants(request, result);
const seated = new Map(
  result.assignments.filter((item) => item.state === "SEATED" && item.positionToken).map((item) => [item.guestToken, item.positionToken!]),
);
const unseated = result.assignments.filter((item) => item.state === "UNSEATED").map((item) => item.guestToken);
progress(`status=${result.status} elapsed=${result.metrics.elapsedMs} unseated=${unseated.join(",")} hard=${result.score.hardViolations} nodes=${result.metrics.nodes} components=${result.metrics.components}`);

const incomplete = scoreHardDetails(seated, request, false);
const complete = scoreHardDetails(seated, request, true);
progress(`hardDetail incomplete=${incomplete.details.map((item) => item.id).join("|")}`);
progress(`hardDetail complete=${complete.details.map((item) => `${item.id}:${item.reason}`).join(" || ")}`);

const focusGuest = unseated[0] ?? complete.details.find((item) => item.id.startsWith("unseated-required:"))?.id.split(":")[1];
if (!focusGuest) throw new Error("no unseated guest identified");
const affecting = constraintsAffecting(request, focusGuest);
const component = components.find((item) => item.includes(focusGuest)) ?? [focusGuest];
progress(`focusGuest=${focusGuest} componentSize=${component.length}`);

// Reservation / table capacity context for component
const tableCaps = new Map<string, number>();
for (const position of request.positions) tableCaps.set(position.tableToken, (tableCaps.get(position.tableToken) ?? 0) + 1);
const componentConstraints = request.constraints.filter((item) => guestTokensOf(item).some((token) => component.includes(token)));
const componentReservations = request.reservations.filter((item) =>
  item.eligibleGuestTokens.some((token) => component.includes(token)),
);

progress("independent feasibility on affected component");
const fixedOutside = new Map([...seated].filter(([guest]) => !component.includes(guest)));
const independent = independentComponentFeasibility(request, component, fixedOutside);
progress(`independent feasible=${independent.feasible} explored=${independent.explored} reason=${independent.reason}`);

// If component huge due to reservation union, also try a11y-only subcomponent feasibility explanation
const a11yOnly = component.filter((token) =>
  request.guests.find((guest) => guest.token === token)?.capabilityCodes.includes("A11Y_WHEELCHAIR"),
);

const comparison = compareWithHeavy();

// Explain TIMED_OUT semantics from product code path
const timedOutMeaning = {
  configuredTimeLimitMs: request.config.timeLimitMs,
  observedElapsedMs: result.metrics.elapsedMs,
  wallUnderLimit: result.metrics.elapsedMs < request.config.timeLimitMs,
  productRule:
    "Outside exhaustive bounds, status TIMED_OUT when final hardViolations>0 and not certifiedInfeasible. searchIncomplete is set when any connected component has >8 members while seed still has HARD violations — those components are skipped without search, forcing TIMED_OUT even if wall clock << timeLimitMs.",
  largeComponentsSkipped: large.map((item) => item.length),
  classification:
    result.metrics.elapsedMs < request.config.timeLimitMs && large.length > 0
      ? "search/iteration incompleteness (component size >8 skip → searchIncomplete → TIMED_OUT), not elapsed-time exhaustion"
      : result.metrics.elapsedMs >= request.config.timeLimitMs
        ? "elapsed time exhaustion"
        : "generic unresolved-result (hard violations remain, not certified infeasible)",
};

const report = {
  at: new Date().toISOString(),
  datasetHash: hash,
  seed: CAPACITY_1000_SCENARIO_SEEDS.B_TYPICAL,
  reproduction: {
    status: result.status,
    elapsedMs: result.metrics.elapsedMs,
    hardViolations: result.score.hardViolations,
    nodes: result.metrics.nodes,
    components: result.metrics.components,
    seated: invariants.seatedCount,
    unseated: unseated,
    findings: result.findings,
  },
  unseatedGuest: focusGuest,
  constraintsAffectingUnseated: affecting.map((item) => ({
    id: item.id,
    kind: item.kind,
    predicateType: item.predicateType,
    payload: item.payload,
  })),
  hardDetailsIncompleteScoring: incomplete,
  hardDetailsCompleteScoring: complete,
  exactViolatedHardRules: complete.details.filter((item) => !item.id.startsWith("unseated-required:") || item.id === `unseated-required:${focusGuest}`),
  component: {
    size: component.length,
    members: component,
    exceedsSearchLimit8: component.length > 8,
    constraints: componentConstraints.map((item) => ({
      id: item.id,
      kind: item.kind,
      predicateType: item.predicateType,
      guests: guestTokensOf(item),
      tables: tableTokensOf(item),
    })),
    reservations: componentReservations,
    a11yMembers: a11yOnly,
    relevantTableCaps: Object.fromEntries(
      [...new Set(componentConstraints.flatMap((item) => tableTokensOf(item)).concat(componentReservations.flatMap((item) => item.tableTokens ?? [])))].map(
        (table) => [table, tableCaps.get(table) ?? 0],
      ),
    ),
  },
  staticCorpusValidation: staticIssues,
  contradictionLikely: staticIssues.length > 0,
  independentFeasibility: independent,
  comparisonBC: comparison,
  timedOutMeaning,
  wallMs: Date.now() - started,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "B_TYPICAL_DIAGNOSIS.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
