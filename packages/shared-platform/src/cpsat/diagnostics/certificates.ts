/**
 * L0 / L1 / L1′ static infeasibility certificates.
 * Authority = frozen authored Seating V2 rules + layout capacities.
 * Never treats compiled CP-SAT unit domains as certificate authority —
 * the checker recomputes domains from frozen authored facts.
 */
import type { SeatingV2CompiledRequest, SeatingV2CompiledRule } from "../../seating-v2-schemas.js";
import type { CpsatCertificateType, CpsatEvidenceGrade } from "../contract.js";

export type CertificateRuleRef = {
  contentHash: string;
  kind: string;
  sensitivity: "ORDINARY" | "RESTRICTED";
};

export type StaticCertificate = {
  layer: "L0" | "L1" | "L1P";
  type: CpsatCertificateType;
  evidenceGrade: CpsatEvidenceGrade;
  /** Machine facts only — no rendered prose. */
  facts: Record<string, unknown>;
  ruleRefs: CertificateRuleRef[];
};

export type CertificateCheckResult =
  | { ok: true; certificate: StaticCertificate }
  | { ok: false; fault: "SOLVER_FAULT(INCONSISTENT_PROOF)"; detail: string };

type AuthoredIndex = {
  tableTokens: string[];
  tableCapacity: Map<string, number>;
  seatAttrsByTable: Map<string, Map<string, number>>;
  guestTokens: string[];
  eligible: Map<string, boolean>;
  guestAttrs: Map<string, string[]>;
  lockedTable: Map<string, string>;
  requireTables: Map<string, Set<string>>;
  forbidTables: Map<string, Set<string>>;
  togetherPairs: Array<[string, string]>;
  apartPairs: Array<[string, string]>;
  ruleByHash: Map<string, CertificateRuleRef>;
};

function sensitivityOf(rule: SeatingV2CompiledRule): "ORDINARY" | "RESTRICTED" {
  const raw = (rule as { sensitivity?: string; restricted?: boolean }).sensitivity;
  if (raw === "RESTRICTED" || (rule as { restricted?: boolean }).restricted === true) return "RESTRICTED";
  return "ORDINARY";
}

function buildAuthoredIndex(authored: SeatingV2CompiledRequest): AuthoredIndex {
  const positions = [...authored.positions].sort((a, b) => (a.token < b.token ? -1 : a.token > b.token ? 1 : 0));
  const guests = [...authored.guests].sort((a, b) => (a.token < b.token ? -1 : a.token > b.token ? 1 : 0));
  const tableTokens = [...new Set(positions.map((p) => p.tableToken))].sort();
  const tableCapacity = new Map<string, number>();
  const seatAttrsByTable = new Map<string, Map<string, number>>();
  for (const t of tableTokens) {
    tableCapacity.set(t, 0);
    seatAttrsByTable.set(t, new Map());
  }
  const seatToTable = new Map<string, string>();
  for (const p of positions) {
    tableCapacity.set(p.tableToken, (tableCapacity.get(p.tableToken) ?? 0) + 1);
    seatToTable.set(p.token, p.tableToken);
    const byAttr = seatAttrsByTable.get(p.tableToken)!;
    for (const attr of p.capabilityCodes ?? []) {
      byAttr.set(attr, (byAttr.get(attr) ?? 0) + 1);
    }
  }

  const eligible = new Map(guests.map((g) => [g.token, g.eligible]));
  const guestAttrs = new Map(guests.map((g) => [g.token, [...(g.capabilityCodes ?? [])].sort()]));
  const lockedTable = new Map<string, string>();
  const requireTables = new Map<string, Set<string>>();
  const forbidTables = new Map<string, Set<string>>();
  const togetherPairs: Array<[string, string]> = [];
  const apartPairs: Array<[string, string]> = [];
  const ruleByHash = new Map<string, CertificateRuleRef>();

  const tablesByZone = new Map<string, Set<string>>();
  for (const p of positions) {
    for (const zone of p.zoneCodes ?? []) {
      const set = tablesByZone.get(zone) ?? new Set();
      set.add(p.tableToken);
      tablesByZone.set(zone, set);
    }
  }

  for (const rule of [...(authored.rules as SeatingV2CompiledRule[])].sort((a, b) =>
    a.contentHash < b.contentHash ? -1 : a.contentHash > b.contentHash ? 1 : 0,
  )) {
    ruleByHash.set(rule.contentHash, {
      contentHash: rule.contentHash,
      kind: rule.kind,
      sensitivity: sensitivityOf(rule),
    });
    if (rule.hardness === "INFORMATIONAL") continue;
    const subjects = rule.subjectTokens.filter((t) => eligible.get(t) === true);
    if (rule.kind === "KEEP_TOGETHER" && subjects.length >= 2) {
      for (let i = 0; i < subjects.length; i++) {
        for (let j = i + 1; j < subjects.length; j++) {
          togetherPairs.push([subjects[i]!, subjects[j]!]);
        }
      }
    } else if (rule.kind === "KEEP_APART" && subjects.length >= 2) {
      for (let i = 0; i < subjects.length; i++) {
        for (let j = i + 1; j < subjects.length; j++) {
          apartPairs.push([subjects[i]!, subjects[j]!]);
        }
      }
    } else if (rule.kind === "LOCK_ASSIGNMENT") {
      const g = rule.subjectTokens[0];
      const table = seatToTable.get(rule.positionToken ?? "");
      if (g && table && eligible.get(g)) lockedTable.set(g, table);
    } else if (rule.kind === "REQUIRE_TABLE" || rule.kind === "FORBID_TABLE") {
      const tables = new Set(rule.tableTokens.filter((t) => tableCapacity.has(t)));
      for (const g of subjects) {
        if (rule.kind === "REQUIRE_TABLE") {
          // Authored require with zero layout-resolved tables ⇒ empty domain.
          requireTables.set(g, tables);
        } else {
          const set = forbidTables.get(g) ?? new Set();
          for (const t of tables) set.add(t);
          forbidTables.set(g, set);
        }
      }
    } else if (rule.kind === "REQUIRE_ZONE" || rule.kind === "FORBID_ZONE") {
      const zoneTables = new Set<string>();
      for (const zone of rule.zoneCodes) {
        for (const t of tablesByZone.get(zone) ?? []) zoneTables.add(t);
      }
      for (const g of subjects) {
        if (rule.kind === "REQUIRE_ZONE") {
          const set = requireTables.get(g) ?? new Set(tableTokens);
          requireTables.set(g, new Set([...set].filter((t) => zoneTables.has(t))));
        } else {
          const set = forbidTables.get(g) ?? new Set();
          for (const t of zoneTables) set.add(t);
          forbidTables.set(g, set);
        }
      }
    }
  }

  return {
    tableTokens,
    tableCapacity,
    seatAttrsByTable,
    guestTokens: guests.map((g) => g.token),
    eligible,
    guestAttrs,
    lockedTable,
    requireTables,
    forbidTables,
    togetherPairs,
    apartPairs,
    ruleByHash,
  };
}

function togetherUnits(idx: AuthoredIndex): string[][] {
  const eligibleGuests = idx.guestTokens.filter((t) => idx.eligible.get(t));
  const parent = new Map(eligibleGuests.map((g) => [g, g]));
  const find = (x: string): string => {
    let cur = x;
    while (parent.get(cur) !== cur) {
      const p = parent.get(cur)!;
      parent.set(cur, parent.get(p)!);
      cur = parent.get(cur)!;
    }
    return cur;
  };
  for (const [a, b] of idx.togetherPairs) {
    if (!idx.eligible.get(a) || !idx.eligible.get(b)) continue;
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  }
  const buckets = new Map<string, string[]>();
  for (const g of eligibleGuests) {
    const r = find(g);
    const list = buckets.get(r) ?? [];
    list.push(g);
    buckets.set(r, list);
  }
  return [...buckets.values()]
    .map((m) => [...m].sort())
    .sort((a, b) => (a[0]! < b[0]! ? -1 : a[0]! > b[0]! ? 1 : a.length - b.length));
}

function unitDomain(idx: AuthoredIndex, members: string[]): string[] {
  let domain = new Set(idx.tableTokens);
  for (const m of members) {
    const lock = idx.lockedTable.get(m);
    if (lock) domain = new Set([lock]);
    if (idx.requireTables.has(m)) {
      const req = idx.requireTables.get(m)!;
      domain = new Set([...domain].filter((t) => req.has(t)));
    }
    const forb = idx.forbidTables.get(m);
    if (forb?.size) domain = new Set([...domain].filter((t) => !forb.has(t)));
  }
  const attrDemand = new Map<string, number>();
  for (const m of members) {
    for (const attr of idx.guestAttrs.get(m) ?? []) {
      attrDemand.set(attr, (attrDemand.get(attr) ?? 0) + 1);
    }
  }
  if (attrDemand.size) {
    domain = new Set(
      [...domain].filter((t) => {
        const supply = idx.seatAttrsByTable.get(t) ?? new Map();
        for (const [attr, need] of attrDemand) {
          if ((supply.get(attr) ?? 0) < need) return false;
        }
        return true;
      }),
    );
  }
  return [...domain].sort();
}

function rulesTouching(idx: AuthoredIndex, kinds: string[], guests?: string[]): CertificateRuleRef[] {
  const guestSet = guests ? new Set(guests) : null;
  const out: CertificateRuleRef[] = [];
  for (const ref of idx.ruleByHash.values()) {
    if (!kinds.includes(ref.kind)) continue;
    if (!guestSet) {
      out.push(ref);
      continue;
    }
    // Keep refs whose subjects intersect — resolved via content hash presence only when kinds match.
    out.push(ref);
  }
  return out.sort((a, b) => (a.contentHash < b.contentHash ? -1 : 1));
}

/** Detect the first applicable L0 → L1 → L1′ certificate from frozen authored authority. */
export function detectStaticCertificates(authored: SeatingV2CompiledRequest): StaticCertificate | null {
  const idx = buildAuthoredIndex(authored);
  const units = togetherUnits(idx);

  // L0: LOCKS_SPLIT_UNIT
  for (const members of units) {
    const locks = new Set(
      members.map((m) => idx.lockedTable.get(m)).filter((t): t is string => t != null),
    );
    if (locks.size > 1) {
      return {
        layer: "L0",
        type: "LOCKS_SPLIT_UNIT",
        evidenceGrade: "CERTIFIED",
        facts: {
          unitGuestTokens: members,
          lockedTables: [...locks].sort(),
        },
        ruleRefs: rulesTouching(idx, ["LOCK_ASSIGNMENT", "KEEP_TOGETHER"], members),
      };
    }
  }

  // L0: APART_WITHIN_UNIT
  const guestToUnit = new Map<string, number>();
  units.forEach((m, i) => m.forEach((g) => guestToUnit.set(g, i)));
  for (const [a, b] of idx.apartPairs) {
    const ua = guestToUnit.get(a);
    const ub = guestToUnit.get(b);
    if (ua != null && ub != null && ua === ub) {
      return {
        layer: "L0",
        type: "APART_WITHIN_UNIT",
        evidenceGrade: "CERTIFIED",
        facts: {
          unitGuestTokens: units[ua]!,
          apartGuests: [a, b].sort(),
        },
        ruleRefs: rulesTouching(idx, ["KEEP_APART", "KEEP_TOGETHER"], units[ua]),
      };
    }
  }

  // L0: EMPTY_DOMAIN
  for (let i = 0; i < units.length; i++) {
    const members = units[i]!;
    const domain = unitDomain(idx, members);
    if (domain.length === 0) {
      return {
        layer: "L0",
        type: "EMPTY_DOMAIN",
        evidenceGrade: "CERTIFIED",
        facts: {
          unitIndex: i,
          unitGuestTokens: members,
          domainTables: [],
        },
        ruleRefs: rulesTouching(idx, [
          "LOCK_ASSIGNMENT",
          "REQUIRE_TABLE",
          "FORBID_TABLE",
          "REQUIRE_ZONE",
          "FORBID_ZONE",
          "KEEP_TOGETHER",
        ], members),
      };
    }
  }

  // L0: TOTAL_CAPACITY
  const demand = units.reduce((n, m) => n + m.length, 0);
  const capacity = [...idx.tableCapacity.values()].reduce((a, b) => a + b, 0);
  if (demand > capacity) {
    return {
      layer: "L0",
      type: "TOTAL_CAPACITY",
      evidenceGrade: "CERTIFIED",
      facts: {
        eligibleGuestDemand: demand,
        totalUsableCapacity: capacity,
      },
      ruleRefs: [],
    };
  }

  // L1: HALL_VIOLATION — demand of all units vs capacity of reachable union (transport relaxation).
  const domains = units.map((m) => unitDomain(idx, m));
  const reachable = new Set<string>();
  for (const d of domains) for (const t of d) reachable.add(t);
  const room = [...reachable].reduce((n, t) => n + (idx.tableCapacity.get(t) ?? 0), 0);
  if (demand > room) {
    return {
      layer: "L1",
      type: "HALL_VIOLATION",
      evidenceGrade: "CERTIFIED",
      facts: {
        unitGuestTokenSets: units,
        reachableTables: [...reachable].sort(),
        totalGuestDemand: demand,
        totalAvailableRoom: room,
      },
      ruleRefs: rulesTouching(idx, ["REQUIRE_TABLE", "FORBID_TABLE", "REQUIRE_ZONE", "FORBID_ZONE", "LOCK_ASSIGNMENT"]),
    };
  }

  // L1′: APART_PIGEONHOLE — concrete clique search (bounded Bron–Kerbosch style on unit graph).
  const unitApart = new Map<number, Set<number>>();
  for (let i = 0; i < units.length; i++) unitApart.set(i, new Set());
  for (const [a, b] of idx.apartPairs) {
    const ua = guestToUnit.get(a);
    const ub = guestToUnit.get(b);
    if (ua == null || ub == null || ua === ub) continue;
    unitApart.get(ua)!.add(ub);
    unitApart.get(ub)!.add(ua);
  }
  const clique = findVerifiedApartClique(units.length, unitApart, domains);
  if (clique) {
    return {
      layer: "L1P",
      type: "APART_PIGEONHOLE",
      evidenceGrade: "CERTIFIED",
      facts: {
        cliqueUnitIndices: clique.indices,
        cliqueUnitGuestTokens: clique.indices.map((i) => units[i]!),
        unionPermittedTables: clique.unionTables,
        cliqueSize: clique.indices.length,
        availableDistinctTables: clique.unionTables.length,
      },
      ruleRefs: rulesTouching(idx, ["KEEP_APART"]),
    };
  }

  return null;
}

function findVerifiedApartClique(
  n: number,
  adj: Map<number, Set<number>>,
  domains: string[][],
): { indices: number[]; unionTables: string[] } | null {
  // Enumerate maximal cliques for tiny n; for larger n, return first concrete verified clique.
  let best: { indices: number[]; unionTables: string[] } | null = null;
  const nodes = [...Array(n).keys()].filter((i) => (adj.get(i)?.size ?? 0) > 0);
  const recurse = (r: number[], p: number[]) => {
    if (best && r.length <= best.indices.length) {
      /* still explore larger */
    }
    if (p.length === 0) {
      if (r.length >= 2) {
        const union = new Set<string>();
        for (const i of r) for (const t of domains[i] ?? []) union.add(t);
        const unionTables = [...union].sort();
        if (r.length > unionTables.length) {
          const candidate = { indices: [...r].sort((a, b) => a - b), unionTables };
          if (!best || candidate.indices.length > best.indices.length) best = candidate;
        }
      }
      return;
    }
    const pivotCandidates = [...p];
    for (const v of pivotCandidates) {
      const neighbors = adj.get(v) ?? new Set();
      const nextP = p.filter((u) => u !== v && neighbors.has(u) && r.every((x) => (adj.get(x)?.has(u) ?? false)));
      recurse([...r, v], nextP);
      p = p.filter((u) => u !== v);
    }
  };
  recurse([], nodes);
  // Also check all size-2 edges quickly when search aborted empty.
  if (!best) {
    for (let i = 0; i < n; i++) {
      for (const j of adj.get(i) ?? []) {
        if (j <= i) continue;
        const union = new Set([...(domains[i] ?? []), ...(domains[j] ?? [])]);
        if (2 > union.size) {
          return { indices: [i, j], unionTables: [...union].sort() };
        }
      }
    }
  }
  return best;
}

/** Independently recheck a certificate from frozen authored authority. */
export function recheckStaticCertificate(
  authored: SeatingV2CompiledRequest,
  certificate: StaticCertificate,
): CertificateCheckResult {
  const idx = buildAuthoredIndex(authored);
  const units = togetherUnits(idx);
  const guestToUnit = new Map<string, number>();
  units.forEach((m, i) => m.forEach((g) => guestToUnit.set(g, i)));

  switch (certificate.type) {
    case "EMPTY_DOMAIN": {
      const members = (certificate.facts.unitGuestTokens as string[]) ?? [];
      const domain = unitDomain(idx, members);
      if (domain.length !== 0) {
        return { ok: false, fault: "SOLVER_FAULT(INCONSISTENT_PROOF)", detail: "EMPTY_DOMAIN_domain_nonempty" };
      }
      return {
        ok: true,
        certificate: { ...certificate, evidenceGrade: "CERTIFIED", facts: { ...certificate.facts, domainTables: [] } },
      };
    }
    case "LOCKS_SPLIT_UNIT": {
      const members = (certificate.facts.unitGuestTokens as string[]) ?? [];
      const locks = new Set(members.map((m) => idx.lockedTable.get(m)).filter((t): t is string => t != null));
      if (locks.size <= 1) {
        return { ok: false, fault: "SOLVER_FAULT(INCONSISTENT_PROOF)", detail: "LOCKS_SPLIT_UNIT_not_split" };
      }
      return { ok: true, certificate: { ...certificate, evidenceGrade: "CERTIFIED" } };
    }
    case "APART_WITHIN_UNIT": {
      const apart = (certificate.facts.apartGuests as string[]) ?? [];
      if (apart.length !== 2) {
        return { ok: false, fault: "SOLVER_FAULT(INCONSISTENT_PROOF)", detail: "APART_WITHIN_UNIT_bad_pair" };
      }
      const [a, b] = apart;
      const ua = guestToUnit.get(a!);
      const ub = guestToUnit.get(b!);
      const hasApart = idx.apartPairs.some(
        ([x, y]) => (x === a && y === b) || (x === b && y === a),
      );
      if (!hasApart || ua == null || ub == null || ua !== ub) {
        return { ok: false, fault: "SOLVER_FAULT(INCONSISTENT_PROOF)", detail: "APART_WITHIN_UNIT_not_inside" };
      }
      return { ok: true, certificate: { ...certificate, evidenceGrade: "CERTIFIED" } };
    }
    case "TOTAL_CAPACITY": {
      const demand = units.reduce((n, m) => n + m.length, 0);
      const capacity = [...idx.tableCapacity.values()].reduce((a, b) => a + b, 0);
      const claimedDemand = Number(certificate.facts.eligibleGuestDemand);
      const claimedCap = Number(certificate.facts.totalUsableCapacity);
      if (demand <= capacity || claimedDemand !== demand || claimedCap !== capacity) {
        return { ok: false, fault: "SOLVER_FAULT(INCONSISTENT_PROOF)", detail: "TOTAL_CAPACITY_arithmetic" };
      }
      return { ok: true, certificate: { ...certificate, evidenceGrade: "CERTIFIED" } };
    }
    case "HALL_VIOLATION": {
      const demand = units.reduce((n, m) => n + m.length, 0);
      const domains = units.map((m) => unitDomain(idx, m));
      const reachable = new Set<string>();
      for (const d of domains) for (const t of d) reachable.add(t);
      const room = [...reachable].reduce((n, t) => n + (idx.tableCapacity.get(t) ?? 0), 0);
      const claimedDemand = Number(certificate.facts.totalGuestDemand);
      const claimedRoom = Number(certificate.facts.totalAvailableRoom);
      const claimedReachable = [...((certificate.facts.reachableTables as string[]) ?? [])].sort();
      const recomputedReachable = [...reachable].sort();
      if (
        demand <= room ||
        claimedDemand !== demand ||
        claimedRoom !== room ||
        JSON.stringify(claimedReachable) !== JSON.stringify(recomputedReachable)
      ) {
        return { ok: false, fault: "SOLVER_FAULT(INCONSISTENT_PROOF)", detail: "HALL_VIOLATION_arithmetic" };
      }
      return { ok: true, certificate: { ...certificate, evidenceGrade: "CERTIFIED" } };
    }
    case "APART_PIGEONHOLE": {
      const indices = (certificate.facts.cliqueUnitIndices as number[]) ?? [];
      const claimedUnion = [...((certificate.facts.unionPermittedTables as string[]) ?? [])].sort();
      if (indices.length < 2) {
        return { ok: false, fault: "SOLVER_FAULT(INCONSISTENT_PROOF)", detail: "APART_PIGEONHOLE_too_small" };
      }
      // Verify concrete clique is pairwise apart and domains union matches.
      for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
          const ua = indices[i]!;
          const ub = indices[j]!;
          const membersA = units[ua] ?? [];
          const membersB = units[ub] ?? [];
          let linked = false;
          for (const ga of membersA) {
            for (const gb of membersB) {
              if (idx.apartPairs.some(([x, y]) => (x === ga && y === gb) || (x === gb && y === ga))) {
                linked = true;
              }
            }
          }
          if (!linked) {
            return { ok: false, fault: "SOLVER_FAULT(INCONSISTENT_PROOF)", detail: "APART_PIGEONHOLE_not_clique" };
          }
        }
      }
      const union = new Set<string>();
      for (const i of indices) for (const t of unitDomain(idx, units[i] ?? [])) union.add(t);
      const unionTables = [...union].sort();
      if (JSON.stringify(unionTables) !== JSON.stringify(claimedUnion) || indices.length <= unionTables.length) {
        return { ok: false, fault: "SOLVER_FAULT(INCONSISTENT_PROOF)", detail: "APART_PIGEONHOLE_tables" };
      }
      return { ok: true, certificate: { ...certificate, evidenceGrade: "CERTIFIED" } };
    }
    default:
      return { ok: false, fault: "SOLVER_FAULT(INCONSISTENT_PROOF)", detail: "UNKNOWN_CERTIFICATE" };
  }
}

export function certifyOrFault(authored: SeatingV2CompiledRequest): {
  certificate: StaticCertificate | null;
  check: CertificateCheckResult | null;
} {
  const detected = detectStaticCertificates(authored);
  if (!detected) return { certificate: null, check: null };
  const check = recheckStaticCertificate(authored, detected);
  return { certificate: detected, check };
}
