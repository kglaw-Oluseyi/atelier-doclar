import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateSeatingV2 } from "../src/seating-v2-validator.js";
import { seatingV2AssignmentsHash } from "../src/seating-v2-hash.js";
import type { SeatingV2Assignment, SeatingV2CompiledRequest } from "../src/seating-v2-schemas.js";

export const S075_DIFFERENTIAL_SEED = "s075-oracle-v1";
export const S075_DIFFERENTIAL_SAMPLE_COUNT = 12;
export const S075_ORACLE_MAX_GUESTS = 5;
export const S075_ORACLE_MAX_POSITIONS = 12;

export type SeatingV2OracleResult = {
  kind: "WITNESS" | "NONE" | "UNKNOWN";
  reason?: "BOUNDS_EXCEEDED";
  witness?: SeatingV2Assignment[];
  examined: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function seatingV2ExhaustiveOracle(
  request: SeatingV2CompiledRequest,
  packageContentHash: string,
  now = "2026-09-13T14:00:00.000Z",
): SeatingV2OracleResult {
  const eligible = (request.guests ?? []).filter((item) => item.eligible);
  const positions = request.positions ?? [];
  if (eligible.length > S075_ORACLE_MAX_GUESTS || positions.length > S075_ORACLE_MAX_POSITIONS) {
    return { kind: "UNKNOWN", reason: "BOUNDS_EXCEEDED", examined: 0 };
  }
  if (eligible.length > positions.length) {
    return { kind: "NONE", examined: 0 };
  }
  let examined = 0;
  let witness: SeatingV2Assignment[] | undefined;
  const used = new Set<string>();
  const seated = new Map<string, string>();
  const ineligible: SeatingV2Assignment[] = (request.guests ?? [])
    .filter((item) => !item.eligible)
    .map((item) => ({
      guestToken: item.token,
      state: "UNSEATED" as const,
      positionToken: null,
      typedReasonCodes: ["INELIGIBLE"],
    }));

  function finish(): void {
    examined += 1;
    const assignments: SeatingV2Assignment[] = [
      ...eligible.map((guest) => ({
        guestToken: guest.token,
        state: "SEATED" as const,
        positionToken: seated.get(guest.token) ?? null,
        typedReasonCodes: [],
      })),
      ...ineligible,
    ];
    const report = validateSeatingV2({ contentHash: packageContentHash, compiledRequest: request }, assignments, [], now);
    if (report.verdict === "FEASIBLE") witness = assignments;
  }

  function assign(index: number): void {
    if (witness) return;
    if (index === eligible.length) {
      finish();
      return;
    }
    const guest = eligible[index]!;
    for (const position of positions) {
      if (used.has(position.token)) continue;
      used.add(position.token);
      seated.set(guest.token, position.token);
      assign(index + 1);
      seated.delete(guest.token);
      used.delete(position.token);
      if (witness) return;
    }
  }

  assign(0);
  return witness ? { kind: "WITNESS", witness, examined } : { kind: "NONE", examined };
}

export type S075DifferentialObservation = {
  kind: "oracle" | "solver" | "validator" | "compiled" | "mutation";
  name: string;
  value: unknown;
};

export function collectS075DifferentialObservations(input: {
  request: SeatingV2CompiledRequest;
  packageContentHash: string;
  solverClaim: string;
  solverAssignments: readonly SeatingV2Assignment[];
  validatorVerdict: string;
  oracle: SeatingV2OracleResult;
  assignmentsHash?: string;
}): S075DifferentialObservation[] {
  const tableTokens = new Set((input.request.positions ?? []).map((item) => item.tableToken));
  const rawIdentity = walkRawIdentity(input.request);
  const ruleTokens = (input.request.rules ?? []).flatMap((item) => item.tableTokens);
  const reservationTokens = (input.request.reservations ?? []).flatMap((item) => item.tableTokens);
  const unknownTableTarget = [...ruleTokens, ...reservationTokens].some((token) => !tableTokens.has(token));
  const unseatedRequired = input.solverAssignments.filter(
    (item) =>
      item.state === "UNSEATED" &&
      input.request.guests.some((guest) => guest.token === item.guestToken && guest.eligible) &&
      !(item.typedReasonCodes ?? []).includes("GOVERNED_UNSEATED"),
  );
  return [
    { kind: "compiled", name: "rawIdentityPresent", value: rawIdentity },
    { kind: "compiled", name: "unknownTableTarget", value: unknownTableTarget },
    { kind: "compiled", name: "guestCount", value: input.request.guests.length },
    { kind: "compiled", name: "positionCount", value: input.request.positions.length },
    { kind: "oracle", name: "oracleKind", value: input.oracle.kind },
    { kind: "oracle", name: "oracleExamined", value: input.oracle.examined },
    { kind: "solver", name: "solverClaim", value: input.solverClaim },
    { kind: "solver", name: "unseatedRequiredWithoutException", value: unseatedRequired.length > 0 },
    { kind: "validator", name: "validatorVerdict", value: input.validatorVerdict },
    { kind: "validator", name: "assignmentsHash", value: input.assignmentsHash ?? seatingV2AssignmentsHash(input.solverAssignments) },
    {
      kind: "solver",
      name: "invalidFeasibleClaim",
      value: input.solverClaim === "FEASIBLE" && input.validatorVerdict !== "FEASIBLE",
    },
    {
      kind: "solver",
      name: "falseInfeasibleClaim",
      value: input.solverClaim === "INFEASIBLE" && input.oracle.kind === "WITNESS",
    },
    {
      kind: "solver",
      name: "guessedInfeasibility",
      value: input.solverClaim === "INFEASIBLE" && (input.oracle.kind === "UNKNOWN" || input.oracle.kind === "WITNESS"),
    },
    {
      kind: "solver",
      name: "oracleWitnessUnsolved",
      value: input.oracle.kind === "WITNESS" && input.solverClaim !== "FEASIBLE",
    },
    {
      kind: "solver",
      name: "timedOutPresentedAsInfeasible",
      value: input.solverClaim === "INFEASIBLE" && input.oracle.kind === "UNKNOWN",
    },
  ];
}

export function detectS075DifferentialMutation(observations: readonly S075DifferentialObservation[]): string | undefined {
  const value = (name: string) => observations.find((item) => item.name === name)?.value;
  if (value("rawIdentityPresent") === true) return "RAW_TABLE_IDENTITY";
  if (value("unknownTableTarget") === true) return "MISSING_OR_MISMATCHED_TABLE_TOKEN";
  if (value("reservationIgnored") === true) return "IGNORED_RESERVATION";
  if (value("unseatedRequiredWithoutException") === true) return "SILENT_UNSEATED_REQUIRED";
  if (value("invalidFeasibleClaim") === true) return "INVALID_FEASIBLE_CLAIM";
  if (value("falseInfeasibleClaim") === true) return "FALSE_INFEASIBLE_CLAIM";
  if (value("guessedInfeasibility") === true) return "GUESSED_INFEASIBILITY";
  if (value("forbidTableOmitted") === true) return "OMITTED_FORBID_TABLE";
  if (value("keepApartInverted") === true) return "INVERTED_KEEP_APART";
  if (value("positionNamespaceDrift") === true) return "POSITION_TOKEN_NAMESPACE_DRIFT";
  if (value("validatorBypassed") === true) return "TRUSTED_SOLVER_CLAIM";
  if (value("validatorVersionDrift") === true) return "VALIDATOR_VERSION_REUSE";
  if (value("declaredUsedDespitePhysical") === true) return "DECLARED_CAPACITY_OVER_PHYSICAL";
  return undefined;
}

export function walkRawIdentity(value: unknown): boolean {
  if (typeof value === "string") return UUID_RE.test(value);
  if (Array.isArray(value)) return value.some((item) => walkRawIdentity(item));
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some((item) => walkRawIdentity(item));
}

export function recordS075OracleCounterexample(payload: Record<string, unknown>): void {
  const latest = fileURLToPath(new URL("./seating-v2-s075-oracle-counterexample.json", import.meta.url));
  writeFileSync(latest, `${JSON.stringify(payload, null, 2)}\n`);
  const specId = typeof payload.specId === "string" ? payload.specId.replace(/[^a-z0-9-]/gi, "") : "";
  if (specId) {
    const named = fileURLToPath(new URL(`./seating-v2-s075-oracle-counterexample-${specId}.json`, import.meta.url));
    writeFileSync(named, `${JSON.stringify(payload, null, 2)}\n`);
  }
}

export function assertS075DifferentialAgreement(input: {
  specId: string;
  seed: string;
  request: SeatingV2CompiledRequest;
  packageContentHash: string;
  solverClaim: string;
  solverAssignments: readonly SeatingV2Assignment[];
  validatorVerdict: string;
  oracle: SeatingV2OracleResult;
}): S075DifferentialObservation[] {
  const observations = collectS075DifferentialObservations(input);
  const disagreement =
    observations.find((item) => item.name === "invalidFeasibleClaim")?.value === true ||
    observations.find((item) => item.name === "falseInfeasibleClaim")?.value === true ||
    observations.find((item) => item.name === "oracleWitnessUnsolved")?.value === true ||
    observations.find((item) => item.name === "timedOutPresentedAsInfeasible")?.value === true ||
    (input.solverClaim === "FEASIBLE" && input.oracle.kind === "NONE");
  if (disagreement) {
    recordS075OracleCounterexample({
      specId: input.specId,
      seed: input.seed,
      packageContentHash: input.packageContentHash,
      solverClaim: input.solverClaim,
      validatorVerdict: input.validatorVerdict,
      oracleKind: input.oracle.kind,
      examined: input.oracle.examined,
      guests: input.request.guests.map((item) => ({ token: item.token, eligible: item.eligible })),
      positions: input.request.positions.map((item) => ({ token: item.token, tableToken: item.tableToken })),
      rules: input.request.rules.map((item) => ({
        kind: item.kind,
        hardness: item.hardness,
        tableTokens: item.tableTokens,
        subjectTokens: item.subjectTokens,
      })),
      reservations: input.request.reservations,
      solverAssignments: input.solverAssignments,
    });
    throw new Error(
      `S075 oracle counterexample ${input.specId} seed=${input.seed} solver=${input.solverClaim} validator=${input.validatorVerdict} oracle=${input.oracle.kind}`,
    );
  }
  return observations;
}
