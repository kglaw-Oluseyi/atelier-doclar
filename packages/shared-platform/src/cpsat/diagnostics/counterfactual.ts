/**
 * Counterfactual “Why not this table?” — diagnostic only, never mutates candidate.
 */
import { createHash, randomUUID } from "node:crypto";
import { PlatformError } from "../../errors.js";
import type { PgQueryable } from "../../postgres-schema.js";
import type { SeatingV2CompiledRequest, SeatingV2CompiledRule } from "../../seating-v2-schemas.js";
import { CPSAT_DIAGNOSTIC_BUDGET_EDITION, type CpsatCounterfactualResultCode } from "../contract.js";
import { CPSAT_ENGINE_EXPECTATION } from "../durable-launch.js";
import { compileV2ToCpsatRequest } from "../compiler.js";
import { exactHash } from "../../eec-hash.js";
import type { FeasibilityProbe } from "./models.js";

export type CounterfactualActor = {
  personId: string;
  roleKey: string;
  permissions: readonly string[];
};

export type CounterfactualRequest = {
  eventId: string;
  organisationId: string;
  runId: string;
  candidateId: string;
  guestToken: string;
  tableToken: string;
  actor: CounterfactualActor;
  sealedAssignmentHash: string;
  layoutHash: string;
  rulesHash: string;
  guestEditionHash: string;
  objectiveEditionHash: string;
  authored: SeatingV2CompiledRequest;
  /** Current governed hashes — mismatch ⇒ stale. */
  currentLayoutHash: string;
  currentRulesHash: string;
  currentGuestEditionHash: string;
  currentObjectiveEditionHash: string;
};

export type CounterfactualResult = {
  id: string;
  resultCode: CpsatCounterfactualResultCode;
  conflictRefs: Array<{ contentHash: string; kind: string; sensitivity: "ORDINARY" | "RESTRICTED" }>;
  tierDeltas: { movement: number | null; preference: number | null } | null;
  cacheKey: string;
  diagnosticOnly: true;
  stale: boolean;
};

function canLaunchCounterfactual(actor: CounterfactualActor): boolean {
  if (actor.roleKey === "READ_ONLY_AUDITOR" || actor.roleKey === "AUDITOR") return false;
  return actor.permissions.includes("seating.view");
}

function canSeeRestricted(actor: CounterfactualActor): boolean {
  return actor.roleKey === "CEO" || actor.roleKey === "EVENT_DIRECTOR";
}

export function counterfactualCacheKey(input: {
  candidateHash: string;
  layoutHash: string;
  rulesHash: string;
  guestHash: string;
  objectiveHash: string;
  guestToken: string;
  tableToken: string;
  engineBuild: string;
  budgetEdition: string;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        c: input.candidateHash,
        l: input.layoutHash,
        r: input.rulesHash,
        g: input.guestHash,
        o: input.objectiveHash,
        guest: input.guestToken,
        table: input.tableToken,
        e: input.engineBuild,
        b: input.budgetEdition,
      }),
    )
    .digest("hex");
}

function findVisibleProhibition(
  authored: SeatingV2CompiledRequest,
  guestToken: string,
  tableToken: string,
): { contentHash: string; kind: string; sensitivity: "ORDINARY" | "RESTRICTED" } | null {
  for (const rule of authored.rules as SeatingV2CompiledRule[]) {
    if (rule.hardness !== "HARD") continue;
    if (!rule.subjectTokens.includes(guestToken)) continue;
    const sensitivity =
      (rule as { sensitivity?: string }).sensitivity === "RESTRICTED" ? "RESTRICTED" : "ORDINARY";
    if (rule.kind === "FORBID_TABLE" && rule.tableTokens.includes(tableToken)) {
      return { contentHash: rule.contentHash, kind: rule.kind, sensitivity };
    }
    if (rule.kind === "REQUIRE_TABLE" && rule.tableTokens.length && !rule.tableTokens.includes(tableToken)) {
      return { contentHash: rule.contentHash, kind: rule.kind, sensitivity };
    }
    if (rule.kind === "LOCK_ASSIGNMENT") {
      const pos = authored.positions.find((p) => p.token === rule.positionToken);
      if (pos && pos.tableToken !== tableToken) {
        return { contentHash: rule.contentHash, kind: rule.kind, sensitivity };
      }
    }
  }
  return null;
}

export async function executeCounterfactualWhyNot(
  client: PgQueryable,
  input: CounterfactualRequest,
  probe: FeasibilityProbe,
): Promise<CounterfactualResult> {
  if (!canLaunchCounterfactual(input.actor)) {
    throw new PlatformError("FORBIDDEN", "counterfactual not permitted for role", {
      publicMessage: "You cannot run this diagnostic.",
    });
  }

  const stale =
    input.layoutHash !== input.currentLayoutHash ||
    input.rulesHash !== input.currentRulesHash ||
    input.guestEditionHash !== input.currentGuestEditionHash ||
    input.objectiveEditionHash !== input.currentObjectiveEditionHash;

  if (stale) {
    const id = randomUUID();
    const cacheKey = counterfactualCacheKey({
      candidateHash: input.sealedAssignmentHash,
      layoutHash: input.layoutHash,
      rulesHash: input.rulesHash,
      guestHash: input.guestEditionHash,
      objectiveHash: input.objectiveEditionHash,
      guestToken: input.guestToken,
      tableToken: input.tableToken,
      engineBuild: CPSAT_ENGINE_EXPECTATION,
      budgetEdition: CPSAT_DIAGNOSTIC_BUDGET_EDITION,
    });
    await persistCounterfactual(client, {
      id,
      runId: input.runId,
      candidateId: input.candidateId,
      eventId: input.eventId,
      organisationId: input.organisationId,
      guestToken: input.guestToken,
      tableToken: input.tableToken,
      actor: input.actor,
      resultCode: "CANDIDATE_STALE",
      conflictRefs: [],
      tierDeltas: null,
      hashes: input,
      cacheKey,
      stale: true,
    });
    return {
      id,
      resultCode: "CANDIDATE_STALE",
      conflictRefs: [],
      tierDeltas: null,
      cacheKey,
      diagnosticOnly: true,
      stale: true,
    };
  }

  const cacheKey = counterfactualCacheKey({
    candidateHash: input.sealedAssignmentHash,
    layoutHash: input.layoutHash,
    rulesHash: input.rulesHash,
    guestHash: input.guestEditionHash,
    objectiveHash: input.objectiveEditionHash,
    guestToken: input.guestToken,
    tableToken: input.tableToken,
    engineBuild: CPSAT_ENGINE_EXPECTATION,
    budgetEdition: CPSAT_DIAGNOSTIC_BUDGET_EDITION,
  });

  const cached = await client.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_counterfactuals WHERE cache_key = $1 LIMIT 1`,
    [cacheKey],
  );
  if (cached.rows[0]) {
    const row = cached.rows[0];
    return {
      id: String(row.id),
      resultCode: String(row.result_code) as CpsatCounterfactualResultCode,
      conflictRefs: (row.conflict_refs as CounterfactualResult["conflictRefs"]) ?? [],
      tierDeltas: (row.tier_deltas as CounterfactualResult["tierDeltas"]) ?? null,
      cacheKey,
      diagnosticOnly: true,
      stale: Boolean(row.stale),
    };
  }

  const guest = input.authored.guests.find((g) => g.token === input.guestToken);
  const tableExists = input.authored.positions.some((p) => p.tableToken === input.tableToken);
  if (!guest || !tableExists) {
    throw new PlatformError("VALIDATION_FAILED", "guest or table not in event", {
      publicMessage: "That guest or table is not part of this event layout.",
    });
  }

  const prohibition = findVisibleProhibition(input.authored, input.guestToken, input.tableToken);
  if (prohibition) {
    const resultCode: CpsatCounterfactualResultCode =
      prohibition.sensitivity === "RESTRICTED" && !canSeeRestricted(input.actor)
        ? "PROHIBITED_RESTRICTED_RULE"
        : prohibition.sensitivity === "RESTRICTED"
          ? "PROHIBITED_RESTRICTED_RULE"
          : "PROHIBITED_VISIBLE_RULE";
    const conflictRefs =
      resultCode === "PROHIBITED_RESTRICTED_RULE" && !canSeeRestricted(input.actor)
        ? [{ contentHash: prohibition.contentHash, kind: prohibition.kind, sensitivity: "RESTRICTED" as const }]
        : [prohibition];
    const id = randomUUID();
    await persistCounterfactual(client, {
      id,
      runId: input.runId,
      candidateId: input.candidateId,
      eventId: input.eventId,
      organisationId: input.organisationId,
      guestToken: input.guestToken,
      tableToken: input.tableToken,
      actor: input.actor,
      resultCode,
      conflictRefs,
      tierDeltas: null,
      hashes: input,
      cacheKey,
      stale: false,
    });
    return { id, resultCode, conflictRefs, tierDeltas: null, cacheKey, diagnosticOnly: true, stale: false };
  }

  // Force unit onto target table via temporary REQUIRE_TABLE rule.
  const forceRule: SeatingV2CompiledRule = {
    contentHash: createHash("sha256").update(`cf-force:${input.guestToken}:${input.tableToken}`).digest("hex"),
    kind: "REQUIRE_TABLE",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    subjectTokens: [input.guestToken],
    tableTokens: [input.tableToken],
    zoneCodes: [],
    capabilityCodes: [],
    positionToken: null,
  };
  const forcedAuthored: SeatingV2CompiledRequest = {
    ...input.authored,
    rules: [...(input.authored.rules as SeatingV2CompiledRule[]), forceRule],
  };

  let request;
  try {
    request = compileV2ToCpsatRequest(forcedAuthored, {
      runId: `${input.runId}:cf`,
      purpose: "COUNTERFACTUAL",
      mode: "REPLAY",
      maxTimeSeconds: 5,
      wallSeconds: 15,
      workers: 1,
    });
  } catch {
    const id = randomUUID();
    const resultCode: CpsatCounterfactualResultCode = "COMPLETE_SEATING_IMPOSSIBLE";
    await persistCounterfactual(client, {
      id,
      runId: input.runId,
      candidateId: input.candidateId,
      eventId: input.eventId,
      organisationId: input.organisationId,
      guestToken: input.guestToken,
      tableToken: input.tableToken,
      actor: input.actor,
      resultCode,
      conflictRefs: [],
      tierDeltas: null,
      hashes: input,
      cacheKey,
      stale: false,
    });
    return { id, resultCode, conflictRefs: [], tierDeltas: null, cacheKey, diagnosticOnly: true, stale: false };
  }

  const probeResult = await probe({
    purpose: "COUNTERFACTUAL",
    authored: forcedAuthored,
    request: {
      ...request,
      purpose: "COUNTERFACTUAL",
      counterfactual: {
        guestIndex: request.guests.find((g) => g.token === input.guestToken)?.i,
        tableIndex: request.tables.find((t) => t.token === input.tableToken)?.i,
        sealedCandidateHash: input.sealedAssignmentHash,
        comparisonTier: true,
      },
    },
    maxTimeSeconds: 5,
  });

  let resultCode: CpsatCounterfactualResultCode;
  let tierDeltas: CounterfactualResult["tierDeltas"] = null;
  if (probeResult.status === "INFEASIBLE") {
    resultCode = "COMPLETE_SEATING_IMPOSSIBLE";
  } else if (probeResult.status === "FEASIBLE" || probeResult.status === "OPTIMAL") {
    resultCode = "FEASIBLE_WITH_TIER_DELTAS";
    tierDeltas = { movement: null, preference: null };
  } else {
    resultCode = "SEARCH_INCOMPLETE";
  }

  const id = randomUUID();
  await persistCounterfactual(client, {
    id,
    runId: input.runId,
    candidateId: input.candidateId,
    eventId: input.eventId,
    organisationId: input.organisationId,
    guestToken: input.guestToken,
    tableToken: input.tableToken,
    actor: input.actor,
    resultCode,
    conflictRefs: [],
    tierDeltas,
    hashes: input,
    cacheKey,
    stale: false,
    requestHash: exactHash(request),
    responseHash: exactHash(probeResult),
  });

  return { id, resultCode, conflictRefs: [], tierDeltas, cacheKey, diagnosticOnly: true, stale: false };
}

async function persistCounterfactual(
  client: PgQueryable,
  input: {
    id: string;
    runId: string;
    candidateId: string;
    eventId: string;
    organisationId: string;
    guestToken: string;
    tableToken: string;
    actor: CounterfactualActor;
    resultCode: string;
    conflictRefs: unknown;
    tierDeltas: unknown;
    hashes: CounterfactualRequest;
    cacheKey: string;
    stale: boolean;
    requestHash?: string;
    responseHash?: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await client.query(
    `INSERT INTO cpsat_solver_counterfactuals (
       id, run_id, candidate_id, event_id, organisation_id,
       guest_token, unit_ref, table_token, actor_person_id, actor_role,
       result_code, tier_deltas, conflict_refs,
       authority_layout_hash, authority_rules_hash, authority_guest_hash, authority_objective_hash,
       candidate_assignment_hash, engine_build, diagnostic_budget_edition, cache_key,
       request_hash, response_hash, stale, expires_at, created_at, diagnostic_only
     ) VALUES (
       $1,$2,$3,$4,$5,
       $6,NULL,$7,$8,$9,
       $10,$11::jsonb,$12::jsonb,
       $13,$14,$15,$16,
       $17,$18,$19,$20,
       $21,$22,$23,NULL,$24::timestamptz,TRUE
     )
     ON CONFLICT (cache_key) DO NOTHING`,
    [
      input.id,
      input.runId,
      input.candidateId,
      input.eventId,
      input.organisationId,
      input.guestToken,
      input.tableToken,
      input.actor.personId,
      input.actor.roleKey,
      input.resultCode,
      JSON.stringify(input.tierDeltas),
      JSON.stringify(input.conflictRefs),
      input.hashes.layoutHash,
      input.hashes.rulesHash,
      input.hashes.guestEditionHash,
      input.hashes.objectiveEditionHash,
      input.hashes.sealedAssignmentHash,
      CPSAT_ENGINE_EXPECTATION,
      CPSAT_DIAGNOSTIC_BUDGET_EDITION,
      input.cacheKey,
      input.requestHash ?? null,
      input.responseHash ?? null,
      input.stale,
      now,
    ],
  );
}

export function redactCounterfactualForRole(
  result: CounterfactualResult,
  actor: CounterfactualActor,
): CounterfactualResult {
  if (canSeeRestricted(actor)) return result;
  return {
    ...result,
    conflictRefs: result.conflictRefs.map((r) =>
      r.sensitivity === "RESTRICTED"
        ? { contentHash: r.contentHash, kind: "RESTRICTED_RULE", sensitivity: "RESTRICTED" as const }
        : r,
    ),
  };
}
