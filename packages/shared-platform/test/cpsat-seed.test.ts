import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  assertCpsatWireSeed,
  CPSAT_SEED_INT32_MAX,
  CPSAT_SEED_INT32_MIN,
  CPSAT_SEED_POSITIVE_MAX,
  CpsatSeedError,
  foldToPositiveInt32,
  fnv1a32Unsigned,
  SEED_OVERFLOW_DEFECT,
  toCpsatWireSeed,
} from "../src/cpsat/seed.js";
import { toChildPayload } from "../src/cpsat/child-payload.js";
import { compileV2ToCpsatRequest } from "../src/cpsat/compiler.js";
import { SEATING_V2_SOLVER_CONTRACT, SEATING_V2_SOLVER_VERSION } from "../src/seating-v2-schemas.js";
import { exactHash } from "../src/eec-hash.js";
import { encodeFrameHelper, FrameDecoderHelper } from "./cpsat-frame-helpers.js";

test("defect identity: scale-2000 unsigned seed exceeds signed int32", () => {
  assert.equal(fnv1a32Unsigned(SEED_OVERFLOW_DEFECT.authoredSeedString), SEED_OVERFLOW_DEFECT.failingUnsignedSeed);
  assert.equal(SEED_OVERFLOW_DEFECT.failingUnsignedSeed > CPSAT_SEED_POSITIVE_MAX, true);
  assert.equal(SEED_OVERFLOW_DEFECT.failingUnsignedSeed, 3959095606);
});

test("correction folds scale-2000 into signed int32 wire seed", () => {
  const converted = toCpsatWireSeed(SEED_OVERFLOW_DEFECT.authoredSeedString);
  assert.equal(converted.source, "hash_fnv1a32");
  assert.equal(converted.rawUnsigned, 3959095606);
  assert.equal(converted.normalisedFromOversized, true);
  assertCpsatWireSeed(converted.seed);
  assert.equal(converted.seed, foldToPositiveInt32(3959095606));
  assert.equal(converted.seed, 3959095606 % 2147483647);
});

test("minimum signed int32 folds to positive domain", () => {
  const c = toCpsatWireSeed(CPSAT_SEED_INT32_MIN);
  assertCpsatWireSeed(c.seed);
  assert.equal(c.seed >= 1 && c.seed <= CPSAT_SEED_POSITIVE_MAX, true);
});

test("maximum signed int32 is accepted on the wire", () => {
  const c = toCpsatWireSeed(CPSAT_SEED_INT32_MAX);
  assert.equal(c.seed, CPSAT_SEED_INT32_MAX);
  assertCpsatWireSeed(c.seed);
});

test("zero folds to 1", () => {
  assert.equal(toCpsatWireSeed(0).seed, 1);
  assert.equal(toCpsatWireSeed("0").seed, 1);
  assert.equal(foldToPositiveInt32(0), 1);
});

test("negative seed is allowed and folded deterministically", () => {
  const a = toCpsatWireSeed(-1);
  const b = toCpsatWireSeed("-1");
  assert.equal(a.seed, b.seed);
  assertCpsatWireSeed(a.seed);
  assert.equal(a.normalisedFromOversized, true);
});

test("oversized unsigned decimal string is folded without JS Number drift", () => {
  const c = toCpsatWireSeed("3959095606");
  assert.equal(c.source, "decimal_string");
  assertCpsatWireSeed(c.seed);
  assert.equal(c.seed, foldToPositiveInt32(3959095606));
});

test("assertCpsatWireSeed rejects unsigned overflow and non-integers", () => {
  assert.throws(() => assertCpsatWireSeed(3959095606), CpsatSeedError);
  assert.throws(() => assertCpsatWireSeed(1.5), CpsatSeedError);
  assert.throws(() => assertCpsatWireSeed(0), CpsatSeedError);
  assert.throws(() => assertCpsatWireSeed(-7), CpsatSeedError);
});

test("hash-derived conversion is stable across repeated calls", () => {
  const a = toCpsatWireSeed("eos-s06-cap-B-typical-1000-v2");
  const b = toCpsatWireSeed("eos-s06-cap-B-typical-1000-v2");
  assert.deepEqual(a, b);
});

test("JSON / TypeScript / Python round-trip accepts corrected wire seed", async () => {
  const wire = toCpsatWireSeed("scale-2000").seed;
  const body = JSON.parse(JSON.stringify({ seed: wire }));
  assert.equal(typeof body.seed, "number");
  assertCpsatWireSeed(body.seed);

  const workerRoot = join(process.cwd(), "../../apps/event-os-solver-worker");
  const python = join(workerRoot, ".venv/bin/python");
  const child = spawn(python, ["-c", "from model.seed import assert_wire_seed; import json,sys; print(assert_wire_seed(json.load(sys.stdin)['seed']))"], {
    env: { ...process.env, PYTHONPATH: join(workerRoot, "python") },
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdin?.write(JSON.stringify({ seed: wire }));
  child.stdin?.end();
  let out = "";
  child.stdout?.on("data", (c) => {
    out += c.toString();
  });
  const code = await new Promise<number | null>((r) => child.on("exit", (c) => r(c)));
  assert.equal(code, 0);
  assert.equal(Number(out.trim()), wire);
});

test("Python rejects the historic oversized seed (defect replay)", async () => {
  const workerRoot = join(process.cwd(), "../../apps/event-os-solver-worker");
  const python = join(workerRoot, ".venv/bin/python");
  const child = spawn(
    python,
    [
      "-c",
      "from model.seed import assert_wire_seed\ntry:\n assert_wire_seed(3959095606)\n print('ACCEPTED')\nexcept Exception as e:\n print(type(e).__name__, getattr(e,'code',''))",
    ],
    { env: { ...process.env, PYTHONPATH: join(workerRoot, "python") }, stdio: ["ignore", "pipe", "pipe"] },
  );
  let out = "";
  child.stdout?.on("data", (c) => {
    out += c.toString();
  });
  await new Promise<void>((r) => child.on("exit", () => r()));
  assert.match(out, /SeedError SEED_NOT_INT32/);
});

test("compile + child payload never emits unsigned overflow seed", () => {
  const compiled = {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: exactHash({ k: "seed-defect" }),
    seed: "scale-2000",
    guests: [
      { token: "g0001", eligible: true, capabilityCodes: [], groupTokens: [] },
      { token: "g0002", eligible: true, capabilityCodes: [], groupTokens: [] },
    ],
    positions: [
      { token: "t0001:01", tableToken: "t0001", zoneCodes: [], capabilityCodes: [] },
      { token: "t0001:02", tableToken: "t0001", zoneCodes: [], capabilityCodes: [] },
    ],
    rules: [],
    reservations: [],
  };
  const req = compileV2ToCpsatRequest(compiled, { runId: "seed-reg", maxTimeSeconds: 1 });
  const payload = toChildPayload(req);
  assert.notEqual(payload.seed, 3959095606);
  assertCpsatWireSeed(payload.seed as number);
});

test("Replay equality: identical authored seed → identical wire seed twice", () => {
  const first = toCpsatWireSeed("scale-2000").seed;
  const second = toCpsatWireSeed("scale-2000").seed;
  assert.equal(first, second);
  const again = toCpsatWireSeed(String(first)).seed;
  // Decimal string of already-folded seed must round-trip unchanged.
  assert.equal(again, first);
});
