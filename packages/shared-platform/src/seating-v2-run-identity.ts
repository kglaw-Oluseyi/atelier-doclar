import { seatingV2PackageContentHash } from "./seating-v2-hash.js";
import { SEATING_V2_CONFIG_HASH } from "./seating-v2-package.js";
import {
  SEATING_V2_COMPILER_VERSION,
  SEATING_V2_LEGACY_COMPILER_VERSION,
  SEATING_V2_LEGACY_VALIDATOR_VERSION,
  SEATING_V2_VALIDATOR_VERSION,
} from "./seating-v2-schemas.js";
import type { SeatingV2InputPackage, SeatingV2Run } from "./seating-v2-state.js";

export type SeatingV2RunReuseIdentity = {
  packageContentHash: string;
  semanticHash: string;
  compiledRequestHash: string;
  compilerVersion: string;
  solverVersion: string;
  solverConfigurationHash: string;
  validatorVersion: string;
  seed: string;
};

const REUSABLE_SUCCESS = new Set(["FEASIBLE", "INFEASIBLE"]);
const IN_PROGRESS = new Set(["QUEUED", "RUNNING"]);

export function seatingV2CompilerVersionFromConfigHash(solverConfigHash: string): string {
  return solverConfigHash === SEATING_V2_CONFIG_HASH
    ? SEATING_V2_COMPILER_VERSION
    : SEATING_V2_LEGACY_COMPILER_VERSION;
}

export function seatingV2RequestedRunReuseIdentity(
  pkg: SeatingV2InputPackage,
  compiledRequestHash = pkg.compiledRequestHash,
): SeatingV2RunReuseIdentity {
  return {
    packageContentHash: pkg.contentHash,
    semanticHash: pkg.semanticHash,
    compiledRequestHash,
    compilerVersion: seatingV2CompilerVersionFromConfigHash(pkg.solverConfigHash),
    solverVersion: pkg.solverVersion,
    solverConfigurationHash: pkg.solverConfigHash,
    validatorVersion: SEATING_V2_VALIDATOR_VERSION,
    seed: pkg.deterministicSeed,
  };
}

export function seatingV2StoredRunReuseIdentity(run: SeatingV2Run): SeatingV2RunReuseIdentity {
  return {
    packageContentHash: run.packageHash,
    semanticHash: run.semanticHash ?? "legacy-unknown-hash",
    compiledRequestHash: run.compiledRequestHash ?? "legacy-unknown-hash",
    compilerVersion: run.compilerVersion ?? SEATING_V2_LEGACY_COMPILER_VERSION,
    solverVersion: run.solverVersion,
    solverConfigurationHash: run.solverConfigHash,
    validatorVersion: run.validatorVersion ?? SEATING_V2_LEGACY_VALIDATOR_VERSION,
    seed: run.deterministicSeed,
  };
}

export function seatingV2RunReuseIdentitiesEqual(
  left: SeatingV2RunReuseIdentity,
  right: SeatingV2RunReuseIdentity,
): boolean {
  return (
    left.packageContentHash === right.packageContentHash &&
    left.semanticHash === right.semanticHash &&
    left.compiledRequestHash === right.compiledRequestHash &&
    left.compilerVersion === right.compilerVersion &&
    left.solverVersion === right.solverVersion &&
    left.solverConfigurationHash === right.solverConfigurationHash &&
    left.validatorVersion === right.validatorVersion &&
    left.seed === right.seed
  );
}

export function seatingV2PackageIdentityIsBound(pkg: SeatingV2InputPackage, compiledRequestHash: string): boolean {
  return (
    pkg.compiledRequestHash === compiledRequestHash &&
    seatingV2PackageContentHash(pkg.semanticHash, compiledRequestHash) === pkg.contentHash
  );
}

export function seatingV2RunIsReusableSuccess(status: string): boolean {
  return REUSABLE_SUCCESS.has(status);
}

export function seatingV2RunIsInProgress(status: string): boolean {
  return IN_PROGRESS.has(status);
}

export function findSeatingV2ReusableRun(
  runs: readonly SeatingV2Run[],
  identity: SeatingV2RunReuseIdentity,
): { kind: "in-progress" | "replay"; run: SeatingV2Run } | undefined {
  const matches = runs.filter((item) => seatingV2RunReuseIdentitiesEqual(seatingV2StoredRunReuseIdentity(item), identity));
  const inProgress = matches.find((item) => seatingV2RunIsInProgress(item.status));
  if (inProgress) return { kind: "in-progress", run: inProgress };
  const completed = matches.find((item) => seatingV2RunIsReusableSuccess(item.status));
  if (completed) return { kind: "replay", run: completed };
  return undefined;
}

export function seatingV2RunUsesCurrentCompiler(run: SeatingV2Run, pkg: SeatingV2InputPackage): boolean {
  return (
    run.compilerVersion === SEATING_V2_COMPILER_VERSION &&
    seatingV2CompilerVersionFromConfigHash(pkg.solverConfigHash) === SEATING_V2_COMPILER_VERSION
  );
}
