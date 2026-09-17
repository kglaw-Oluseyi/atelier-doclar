/**
 * Canonical CP-SAT seed contract.
 *
 * Child / OR-Tools boundary: signed int32 in [1, 2147483647].
 * Authoritative V2 seed remains a string; conversion is explicit and deterministic.
 * Never pass unsigned uint32 or JS Number values outside int32 to the child.
 */
export const CPSAT_SEED_INT32_MIN = -2147483648;
export const CPSAT_SEED_INT32_MAX = 2147483647;
/** Inclusive positive domain accepted by OR-Tools random_seed after normalisation. */
export const CPSAT_SEED_POSITIVE_MIN = 1;
export const CPSAT_SEED_POSITIVE_MAX = CPSAT_SEED_INT32_MAX;

export type CpsatSeedSource =
  | "literal_int"
  | "decimal_string"
  | "hash_fnv1a32"
  | "default";

export type CpsatSeedConversion = {
  /** Signed int32 in [1, INT32_MAX] — the only value permitted on the child wire. */
  seed: number;
  source: CpsatSeedSource;
  /** Pre-normalisation integer when known (may exceed int32). */
  rawUnsigned?: number;
  /** True when an oversized/unsigned value was reduced into the signed domain. */
  normalisedFromOversized: boolean;
};

export class CpsatSeedError extends Error {
  constructor(
    message: string,
    readonly code: "SEED_NOT_INT32" | "SEED_INVALID" | "SEED_UNSIGNED_DRIFT",
  ) {
    super(message);
    this.name = "CpsatSeedError";
  }
}

export function isSignedInt32(value: number): boolean {
  return Number.isInteger(value) && value >= CPSAT_SEED_INT32_MIN && value <= CPSAT_SEED_INT32_MAX;
}

/** Assert a wire seed is a safe positive signed int32. */
export function assertCpsatWireSeed(seed: number): number {
  if (!Number.isInteger(seed)) {
    throw new CpsatSeedError(`seed must be an integer, got ${seed}`, "SEED_NOT_INT32");
  }
  if (seed < CPSAT_SEED_POSITIVE_MIN || seed > CPSAT_SEED_POSITIVE_MAX) {
    throw new CpsatSeedError(
      `seed ${seed} outside signed int32 positive domain [${CPSAT_SEED_POSITIVE_MIN}, ${CPSAT_SEED_POSITIVE_MAX}]`,
      "SEED_NOT_INT32",
    );
  }
  return seed;
}

/**
 * FNV-1a 32-bit as unsigned (0..2^32-1). Exposed for defect replay only —
 * must not be sent to OR-Tools without {@link toCpsatWireSeed}.
 */
export function fnv1a32Unsigned(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Map any integer into the positive signed int32 domain used on the wire.
 * Deterministic; never uses unsigned→signed bit reinterpretation.
 * Values already in [1, INT32_MAX] pass through unchanged.
 */
export function foldToPositiveInt32(n: number): number {
  if (!Number.isFinite(n)) {
    throw new CpsatSeedError("seed is not finite", "SEED_INVALID");
  }
  const trunc = Math.trunc(n);
  if (trunc >= CPSAT_SEED_POSITIVE_MIN && trunc <= CPSAT_SEED_POSITIVE_MAX) {
    return trunc;
  }
  // Euclidean modulo into [0, INT32_MAX).
  const mod = CPSAT_SEED_POSITIVE_MAX; // 2147483647
  let x = trunc % mod;
  if (x < 0) x += mod;
  return x === 0 ? 1 : x;
}

/**
 * Convert authored / compiled seed into the canonical child wire seed.
 *
 * - Number: must be finite; negative allowed and folded; oversized folded.
 * - Decimal string: parsed as integer (may be oversized) then folded.
 * - Other string: FNV-1a32 unsigned then folded (never send unsigned raw).
 */
export function toCpsatWireSeed(seed: string | number | undefined | null): CpsatSeedConversion {
  if (seed == null || seed === "") {
    return { seed: 1, source: "default", normalisedFromOversized: false };
  }
  if (typeof seed === "number") {
    if (!Number.isFinite(seed)) {
      throw new CpsatSeedError("numeric seed is not finite", "SEED_INVALID");
    }
    const trunc = Math.trunc(seed);
    const oversized = trunc < CPSAT_SEED_INT32_MIN || trunc > CPSAT_SEED_INT32_MAX;
    const wire = foldToPositiveInt32(trunc);
    return {
      seed: assertCpsatWireSeed(wire),
      source: "literal_int",
      normalisedFromOversized: oversized || trunc <= 0,
    };
  }
  if (typeof seed === "string" && /^-?\d+$/.test(seed)) {
    // Parse via BigInt to avoid JS Number precision loss above 2^53.
    const big = BigInt(seed);
    if (big >= BigInt(CPSAT_SEED_POSITIVE_MIN) && big <= BigInt(CPSAT_SEED_POSITIVE_MAX)) {
      return {
        seed: assertCpsatWireSeed(Number(big)),
        source: "decimal_string",
        normalisedFromOversized: false,
      };
    }
    const oversized = big < BigInt(CPSAT_SEED_INT32_MIN) || big > BigInt(CPSAT_SEED_INT32_MAX);
    const mod = BigInt(CPSAT_SEED_POSITIVE_MAX);
    let rem = big % mod;
    if (rem < 0n) rem += mod;
    const wire = rem === 0n ? 1 : Number(rem);
    return {
      seed: assertCpsatWireSeed(wire),
      source: "decimal_string",
      rawUnsigned: oversized && big > 0n && big <= 0xffffffffn ? Number(big) : undefined,
      normalisedFromOversized: true,
    };
  }
  if (typeof seed === "string") {
    const rawUnsigned = fnv1a32Unsigned(seed);
    const wire = foldToPositiveInt32(rawUnsigned);
    return {
      seed: assertCpsatWireSeed(wire),
      source: "hash_fnv1a32",
      rawUnsigned,
      normalisedFromOversized: rawUnsigned > CPSAT_SEED_POSITIVE_MAX,
    };
  }
  throw new CpsatSeedError(`unsupported seed type ${typeof seed}`, "SEED_INVALID");
}

/** Historic defect: hash("scale-2000") as unsigned uint32 before fold. */
export const SEED_OVERFLOW_DEFECT = {
  id: "CPSAT-SEED-OVERFLOW-UINT32",
  authoredSeedString: "scale-2000",
  failingUnsignedSeed: 3959095606,
  failingHex: "0xebfb0136",
  ortoolsBoundary: "SatParameters.random_seed (signed int32)",
  exceptionType: "TypeError",
  exceptionMessage:
    "(): incompatible function arguments. The following argument types are supported: (arg0: SatParameters, arg1: int) -> None; Invoked with: ..., 3959095606",
  productFault: "SOLVER_FAULT(CHILD_RESPONSE)",
  rootCause:
    "FNV-1a hash was zero-filled to uint32 (>>> 0) and passed to OR-Tools without folding into signed int32 [1, 2147483647].",
  correction: "toCpsatWireSeed / foldToPositiveInt32 + Python assert_wire_seed",
} as const;
