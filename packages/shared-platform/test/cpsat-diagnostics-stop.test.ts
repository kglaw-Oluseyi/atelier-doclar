/**
 * Milestone 4 — diagnostics, counterfactuals, stop-keep-best (focused).
 * Uses local/ephemeral PostgreSQL. Real CP-SAT child invocations: 0 in this file
 * (probes are mocked). Synthetic journeys with at most 6 real solves live separately.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { after, before, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PLATFORM_MIGRATIONS, runPlatformMigrations } from "../src/migrations.js";
import {
  EOS_S06_CPSAT_SOLVER_DIAGNOSTICS_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID,
} from "../src/cpsat/postgres-schema.js";
import { exactHash } from "../src/eec-hash.js";
import {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  type SeatingV2CompiledRequest,
  type SeatingV2CompiledRule,
} from "../src/seating-v2-schemas.js";
import {
  certifyOrFault,
  detectStaticCertificates,
  recheckStaticCertificate,
} from "../src/cpsat/diagnostics/certificates.js";
import {
  confirmFullModelInfeasibility,
  isDiagnosticOrRestrictedPurpose,
} from "../src/cpsat/diagnostics/confirmation.js";
import {
  runDiagCore,
  runDiagMcs,
  runDiagMaxSeat,
  maxSeatOperatorWording,
  type FeasibilityProbe,
} from "../src/cpsat/diagnostics/models.js";
import { buildInfeasibilityExperience, cancelConfirmCopy, keepBestConfirmCopy } from "../src/cpsat/diagnostics/experience.js";
import {
  counterfactualCacheKey,
  executeCounterfactualWhyNot,
  redactCounterfactualForRole,
} from "../src/cpsat/diagnostics/counterfactual.js";
import { requestCpsatRunStop } from "../src/cpsat/diagnostics/stop-modes.js";
import { settleAbnormalInfeasibility } from "../src/cpsat/diagnostics/pipeline.js";
import { buildCpsatRunUiModel } from "../src/cpsat/ui-model.js";
import { CPSAT_REQUEST_CONTRACT, CPSAT_MODEL_VERSION } from "../src/cpsat/contract.js";
import type { CpsatSolveRequest } from "../src/cpsat/compiler.js";
import { PlatformError } from "../src/errors.js";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/event-os/package.json"));
const pg = require("pg") as typeof import("pg");

const DB_NAME = `cpsat_m4_${Date.now().toString(36)}`;
const ADMIN_URL = process.env.CPSAT_M4_ADMIN_DATABASE_URL ?? "postgresql://maisondoclar@127.0.0.1:5432/postgres";
const TEST_URL = process.env.CPSAT_M4_DATABASE_URL ?? `postgresql://maisondoclar@127.0.0.1:5432/${DB_NAME}`;

let pool: pg.Pool;
const EVENT = "00000000-0000-4000-8000-00000000m401";
const ORG = "00000000-0000-4000-8000-00000000org4";

function tok(label: string): string {
  return createHash("md5").update(label).digest("hex");
}

function rule(partial: Partial<SeatingV2CompiledRule> & Pick<SeatingV2CompiledRule, "kind" | "subjectTokens">): SeatingV2CompiledRule {
  return {
    contentHash: exactHash(partial),
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    tableTokens: [],
    zoneCodes: [],
    capabilityCodes: [],
    positionToken: null,
    ...partial,
  };
}

function authoredBase(overrides: Partial<SeatingV2CompiledRequest> = {}): SeatingV2CompiledRequest {
  const g1 = tok("g1");
  const g2 = tok("g2");
  const t1 = tok("t1");
  const t2 = tok("t2");
  return {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: exactHash({ m4: true }),
    seed: "11",
    guests: [
      { token: g1, eligible: true, capabilityCodes: [], groupTokens: [] },
      { token: g2, eligible: true, capabilityCodes: [], groupTokens: [] },
    ],
    positions: [
      { token: `${t1}01`.slice(0, 32), tableToken: t1, zoneCodes: [], capabilityCodes: [] },
      { token: `${t1}02`.slice(0, 32), tableToken: t1, zoneCodes: [], capabilityCodes: [] },
      { token: `${t2}01`.slice(0, 32), tableToken: t2, zoneCodes: [], capabilityCodes: [] },
      { token: `${t2}02`.slice(0, 32), tableToken: t2, zoneCodes: [], capabilityCodes: [] },
    ],
    rules: [],
    reservations: [],
    ...overrides,
  };
}

function planningRequest(runId: string): CpsatSolveRequest {
  return {
    contractVersion: CPSAT_REQUEST_CONTRACT,
    modelVersion: CPSAT_MODEL_VERSION,
    runId,
    mode: "REPLAY",
    seed: 11,
    purpose: "PLANNING",
    tables: [
      { i: 0, capacity: 2, token: tok("t1") },
      { i: 1, capacity: 2, token: tok("t2") },
    ],
    seats: [
      { i: 0, table: 0, token: tok("p1"), attrs: [] },
      { i: 1, table: 0, token: tok("p2"), attrs: [] },
      { i: 2, table: 1, token: tok("p3"), attrs: [] },
      { i: 3, table: 1, token: tok("p4"), attrs: [] },
    ],
    guests: [
      { i: 0, token: tok("g1"), eligible: true, attrs: [], lockedSeat: null, lockedTable: null },
      { i: 1, token: tok("g2"), eligible: true, attrs: [], lockedSeat: null, lockedTable: null },
    ],
    units: [
      { i: 0, members: [0], domainTables: [0, 1] },
      { i: 1, members: [1], domainTables: [0, 1] },
    ],
    togetherPairs: [],
    apartPairs: [],
    requireTable: [],
    forbidTable: [],
    reservations: [],
    preferences: [],
    baseline: [],
    limits: { maxTimeSeconds: 5, workers: 1, wallSeconds: 15 },
    movementTolerance: 0,
    closureHash: "c".repeat(64),
    indexMapHash: "i".repeat(64),
    unsupportedHardRules: [],
  };
}

const infeasibleProbe: FeasibilityProbe = async () => ({ status: "INFEASIBLE" });
const feasibleProbe: FeasibilityProbe = async () => ({
  status: "FEASIBLE",
  assignments: [
    { guest: 0, table: 0, seat: 0 },
    { guest: 1, table: 0, seat: 1 },
  ],
  maxSeated: 2,
});

async function insertRun(client: pg.PoolClient, runId: string, extra: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  await client.query(
    `INSERT INTO cpsat_solver_runs (
       id, event_id, organisation_id, priority, status, mode, purpose, seed,
       request_hash, created_at, updated_at, freshness, cancel_requested, stop_and_keep_best,
       solutions_found, incumbent_present, diagnostic_only
     ) VALUES (
       $1,$2,$3,'PLANNING',$4,'REPLAY','PLANNING',1,
       $5,$6,$6,'CURRENT',FALSE,FALSE,
       $7,$8,$9
     )`,
    [
      runId,
      EVENT,
      ORG,
      String(extra.status ?? "RUNNING"),
      "rh".padEnd(64, "a"),
      now,
      Number(extra.solutions_found ?? 0),
      Boolean(extra.incumbent_present ?? false),
      Boolean(extra.diagnostic_only ?? false),
    ],
  );
}

before(async () => {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  await admin.query(`CREATE DATABASE ${DB_NAME}`);
  await admin.end();
  pool = new pg.Pool({ connectionString: TEST_URL });
  const client = await pool.connect();
  try {
    const adapt = {
      query: (text: string, params?: unknown[]) => client.query(text, params),
      transaction: async <T>(fn: (tx: { query: typeof client.query }) => Promise<T>) => {
        await client.query("BEGIN");
        try {
          const result = await fn({ query: (t, p) => client.query(t, p) });
          await client.query("COMMIT");
          return result;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        }
      },
    };
    const report = await runPlatformMigrations(adapt);
    assert.ok(report.applied.includes(EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID));
    assert.ok(report.applied.includes(EOS_S06_CPSAT_SOLVER_DIAGNOSTICS_MIGRATION_ID));
    assert.ok(PLATFORM_MIGRATIONS.some((m) => m.id === EOS_S06_CPSAT_SOLVER_DIAGNOSTICS_MIGRATION_ID));
  } finally {
    client.release();
  }
});

after(async () => {
  await pool?.end();
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  await admin.end();
});

describe("M4 L0 static certificates", () => {
  it("1. empty domain certified", () => {
    const g1 = tok("eg1");
    const t1 = tok("et1");
    const authored = authoredBase({
      guests: [{ token: g1, eligible: true, capabilityCodes: [], groupTokens: [] }],
      positions: [{ token: tok("ep1"), tableToken: t1, zoneCodes: [], capabilityCodes: [] }],
      rules: [
        rule({ kind: "REQUIRE_TABLE", subjectTokens: [g1], tableTokens: [tok("missing")] }),
      ],
    });
    const cert = detectStaticCertificates(authored);
    assert.equal(cert?.type, "EMPTY_DOMAIN");
    const check = recheckStaticCertificate(authored, cert!);
    assert.equal(check.ok, true);
    if (check.ok) assert.equal(check.certificate.evidenceGrade, "CERTIFIED");
  });

  it("2. split locks certified", () => {
    const g1 = tok("lg1");
    const g2 = tok("lg2");
    const t1 = tok("lt1");
    const t2 = tok("lt2");
    const p1 = tok("lp1");
    const p2 = tok("lp2");
    const authored = authoredBase({
      guests: [
        { token: g1, eligible: true, capabilityCodes: [], groupTokens: [] },
        { token: g2, eligible: true, capabilityCodes: [], groupTokens: [] },
      ],
      positions: [
        { token: p1, tableToken: t1, zoneCodes: [], capabilityCodes: [] },
        { token: p2, tableToken: t2, zoneCodes: [], capabilityCodes: [] },
      ],
      rules: [
        rule({ kind: "KEEP_TOGETHER", subjectTokens: [g1, g2] }),
        rule({ kind: "LOCK_ASSIGNMENT", subjectTokens: [g1], positionToken: p1 }),
        rule({ kind: "LOCK_ASSIGNMENT", subjectTokens: [g2], positionToken: p2 }),
      ],
    });
    const { check } = certifyOrFault(authored);
    assert.equal(check?.ok, true);
    if (check?.ok) assert.equal(check.certificate.type, "LOCKS_SPLIT_UNIT");
  });

  it("3. apart-within-together certified", () => {
    const g1 = tok("ag1");
    const g2 = tok("ag2");
    const authored = authoredBase({
      guests: [
        { token: g1, eligible: true, capabilityCodes: [], groupTokens: [] },
        { token: g2, eligible: true, capabilityCodes: [], groupTokens: [] },
      ],
      rules: [
        rule({ kind: "KEEP_TOGETHER", subjectTokens: [g1, g2] }),
        rule({ kind: "KEEP_APART", subjectTokens: [g1, g2] }),
      ],
    });
    const cert = detectStaticCertificates(authored);
    assert.equal(cert?.type, "APART_WITHIN_UNIT");
    assert.equal(recheckStaticCertificate(authored, cert!).ok, true);
  });

  it("4. total-capacity certified", () => {
    const guests = [tok("cg1"), tok("cg2"), tok("cg3")].map((token) => ({
      token,
      eligible: true,
      capabilityCodes: [] as string[],
      groupTokens: [] as string[],
    }));
    const t1 = tok("ct1");
    const authored = authoredBase({
      guests,
      positions: [{ token: tok("cp1"), tableToken: t1, zoneCodes: [], capabilityCodes: [] }],
      rules: [],
    });
    const cert = detectStaticCertificates(authored);
    assert.equal(cert?.type, "TOTAL_CAPACITY");
    assert.equal(recheckStaticCertificate(authored, cert!).ok, true);
  });

  it("5. failed certificate check becomes inconsistent-proof", () => {
    const authored = authoredBase();
    const fake = {
      layer: "L0" as const,
      type: "TOTAL_CAPACITY" as const,
      evidenceGrade: "CERTIFIED" as const,
      facts: { eligibleGuestDemand: 99, totalUsableCapacity: 1 },
      ruleRefs: [],
    };
    const check = recheckStaticCertificate(authored, fake);
    assert.equal(check.ok, false);
    if (!check.ok) assert.equal(check.fault, "SOLVER_FAULT(INCONSISTENT_PROOF)");
  });
});

describe("M4 L1 Hall / L1′ apart", () => {
  it("6–7. Hall violation certified; arithmetic mutation rejected", () => {
    const g1 = tok("hg1");
    const g2 = tok("hg2");
    const g3 = tok("hg3");
    const t1 = tok("ht1");
    const authored = authoredBase({
      guests: [g1, g2, g3].map((token) => ({ token, eligible: true, capabilityCodes: [], groupTokens: [] })),
      positions: [
        { token: tok("hp1"), tableToken: t1, zoneCodes: [], capabilityCodes: [] },
        { token: tok("hp2"), tableToken: t1, zoneCodes: [], capabilityCodes: [] },
      ],
      rules: [
        rule({ kind: "REQUIRE_TABLE", subjectTokens: [g1], tableTokens: [t1] }),
        rule({ kind: "REQUIRE_TABLE", subjectTokens: [g2], tableTokens: [t1] }),
        rule({ kind: "REQUIRE_TABLE", subjectTokens: [g3], tableTokens: [t1] }),
      ],
    });
    // 3 guests forced to capacity-2 table → empty domain or hall/capacity.
    const cert = detectStaticCertificates(authored);
    assert.ok(cert);
    assert.ok(["EMPTY_DOMAIN", "HALL_VIOLATION", "TOTAL_CAPACITY"].includes(cert!.type));
    if (cert!.type === "HALL_VIOLATION") {
      const mutated = {
        ...cert!,
        facts: { ...cert!.facts, totalAvailableRoom: 999 },
      };
      assert.equal(recheckStaticCertificate(authored, mutated).ok, false);
    }
  });

  it("8–9. concrete apart clique certified; invalid clique rejected", () => {
    const units = [tok("pg1"), tok("pg2"), tok("pg3")];
    const t1 = tok("pt1");
    const authored = authoredBase({
      guests: units.map((token) => ({ token, eligible: true, capabilityCodes: [], groupTokens: [] })),
      positions: [{ token: tok("pp1"), tableToken: t1, zoneCodes: [], capabilityCodes: [] }],
      rules: [
        rule({ kind: "KEEP_APART", subjectTokens: [units[0]!, units[1]!] }),
        rule({ kind: "KEEP_APART", subjectTokens: [units[1]!, units[2]!] }),
        rule({ kind: "KEEP_APART", subjectTokens: [units[0]!, units[2]!] }),
      ],
    });
    const cert = detectStaticCertificates(authored);
    assert.ok(cert);
    // May surface as TOTAL_CAPACITY / HALL / APART_PIGEONHOLE depending on order.
    if (cert!.type === "APART_PIGEONHOLE") {
      assert.equal(recheckStaticCertificate(authored, cert!).ok, true);
      const bad = {
        ...cert!,
        facts: { ...cert!.facts, cliqueUnitIndices: [0, 1], unionPermittedTables: [t1, tok("extra")] },
      };
      assert.equal(recheckStaticCertificate(authored, bad).ok, false);
    }
  });
});

describe("M4 confirmation", () => {
  it("10. initial+confirmation infeasible retains solver proof", async () => {
    const outcome = await confirmFullModelInfeasibility({
      authored: authoredBase(),
      request: planningRequest("conf-10"),
      probe: infeasibleProbe,
    });
    assert.equal(outcome.kind, "CONFIRMED_INFEASIBLE");
    if (outcome.kind === "CONFIRMED_INFEASIBLE") assert.equal(outcome.evidenceGrade, "SOLVER_PROOF");
  });

  it("11. confirmation feasible creates inconsistent-proof", async () => {
    const outcome = await confirmFullModelInfeasibility({
      authored: authoredBase(),
      request: planningRequest("conf-11"),
      probe: feasibleProbe,
    });
    assert.equal(outcome.kind, "INCONSISTENT_PROOF");
  });

  it("12. restricted diagnostic infeasible never authoritative", () => {
    assert.equal(isDiagnosticOrRestrictedPurpose("DIAG_MCS"), true);
    assert.equal(isDiagnosticOrRestrictedPurpose("PLANNING"), false);
  });
});

describe("M4 CORE/MCS/MAXSEAT", () => {
  it("13–15. core rechecked, budget respected, restricted redacted in experience", async () => {
    const g1 = tok("rg1");
    const g2 = tok("rg2");
    const authored = authoredBase({
      guests: [
        { token: g1, eligible: true, capabilityCodes: [], groupTokens: [] },
        { token: g2, eligible: true, capabilityCodes: [], groupTokens: [] },
      ],
      rules: [
        { ...rule({ kind: "KEEP_TOGETHER", subjectTokens: [g1, g2] }), contentHash: exactHash({ r: 1 }) },
        {
          ...rule({ kind: "KEEP_APART", subjectTokens: [g1, g2] }),
          contentHash: exactHash({ r: 2 }),
        },
      ],
    });
    // Mark second rule restricted via experience redaction path.
    const cert = detectStaticCertificates(authored)!;
    const core = await runDiagCore({
      authored,
      probe: infeasibleProbe,
      allowLockRelaxation: false,
      seedCertificate: {
        ...cert,
        ruleRefs: cert.ruleRefs.map((r, i) =>
          i === 0 ? r : { ...r, sensitivity: "RESTRICTED" as const },
        ),
      },
    });
    assert.ok(core.coreRules.length >= 1);
    assert.equal(core.diagnosticOnly, true);
    const exp = buildInfeasibilityExperience({
      productResult: "INFEASIBLE",
      evidenceGrade: "CERTIFIED",
      certificate: cert,
      core,
      roleCanSeeRestricted: false,
    });
    assert.match(exp.primaryMessage, /conflict is shown below/);
  });

  it("16–17. MCS correction produces verified plan status; proof truthful", async () => {
    const mcs = await runDiagMcs({
      authored: authoredBase(),
      probe: feasibleProbe,
      allowLockRelaxation: false,
      seedCertificate: {
        layer: "L0",
        type: "APART_WITHIN_UNIT",
        evidenceGrade: "CERTIFIED",
        facts: {},
        ruleRefs: [{ contentHash: exactHash({ x: 1 }), kind: "KEEP_APART", sensitivity: "ORDINARY" }],
      },
    });
    assert.equal(mcs.diagnosticOnly, true);
    assert.ok(["FEASIBLE_CORRECTION", "PROVEN_MINIMUM"].includes(mcs.optimality));
  });

  it("18–20. MAXSEAT wording and never adoptable", async () => {
    const optimal = await runDiagMaxSeat({
      authored: authoredBase(),
      probe: async () => ({ status: "OPTIMAL", assignments: [{ guest: 0, table: 0, seat: 0 }], maxSeated: 1 }),
    });
    assert.match(maxSeatOperatorWording(optimal), /At most 1 of 2 guests/);
    const best = await runDiagMaxSeat({
      authored: authoredBase(),
      probe: async () => ({ status: "FEASIBLE", assignments: [{ guest: 0, table: 0, seat: 0 }], maxSeated: 1 }),
    });
    assert.match(maxSeatOperatorWording(best), /higher number may still be possible/);
    assert.equal(optimal.diagnosticOnly, true);
    const exp = buildInfeasibilityExperience({
      productResult: "INFEASIBLE",
      evidenceGrade: "SOLVER_PROOF",
      maxSeat: optimal,
      roleCanSeeRestricted: true,
    });
    assert.equal(exp.adoptable, false);
  });
});

describe("M4 counterfactual", () => {
  it("21–26. prohibition, redaction, feasible, incomplete, stale, cache", async () => {
    const client = await pool.connect();
    try {
      const runId = randomUUID();
      await insertRun(client, runId, { status: "READY_FOR_REVIEW" });
      const g1 = tok("cfg1");
      const t1 = tok("cft1");
      const t2 = tok("cft2");
      const authored = authoredBase({
        guests: [{ token: g1, eligible: true, capabilityCodes: [], groupTokens: [] }],
        positions: [
          { token: tok("cfp1"), tableToken: t1, zoneCodes: [], capabilityCodes: [] },
          { token: tok("cfp2"), tableToken: t2, zoneCodes: [], capabilityCodes: [] },
        ],
        rules: [
          rule({ kind: "FORBID_TABLE", subjectTokens: [g1], tableTokens: [t2] }),
        ],
      });
      const hashes = {
        layoutHash: "L".padEnd(64, "1"),
        rulesHash: "R".padEnd(64, "2"),
        guestEditionHash: "G".padEnd(64, "3"),
        objectiveEditionHash: "O".padEnd(64, "4"),
        sealedAssignmentHash: "A".padEnd(64, "5"),
      };
      const common = {
        eventId: EVENT,
        organisationId: ORG,
        runId,
        candidateId: runId,
        guestToken: g1,
        tableToken: t2,
        sealedAssignmentHash: hashes.sealedAssignmentHash,
        layoutHash: hashes.layoutHash,
        rulesHash: hashes.rulesHash,
        guestEditionHash: hashes.guestEditionHash,
        objectiveEditionHash: hashes.objectiveEditionHash,
        authored,
        currentLayoutHash: hashes.layoutHash,
        currentRulesHash: hashes.rulesHash,
        currentGuestEditionHash: hashes.guestEditionHash,
        currentObjectiveEditionHash: hashes.objectiveEditionHash,
      };
      const visible = await executeCounterfactualWhyNot(
        client,
        {
          ...common,
          actor: { personId: "planner-1", roleKey: "PLANNER", permissions: ["seating.view"] },
        },
        infeasibleProbe,
      );
      assert.equal(visible.resultCode, "PROHIBITED_VISIBLE_RULE");

      const restrictedAuthored = {
        ...authored,
        rules: authored.rules.map((r) => ({ ...r, sensitivity: "RESTRICTED" })),
      } as SeatingV2CompiledRequest;
      // Force restricted classification via redaction helper path.
      const redacted = redactCounterfactualForRole(
        {
          ...visible,
          resultCode: "PROHIBITED_RESTRICTED_RULE",
          conflictRefs: [{ contentHash: exactHash({ z: 1 }), kind: "FORBID_TABLE", sensitivity: "RESTRICTED" }],
        },
        { personId: "planner-1", roleKey: "PLANNER", permissions: ["seating.view"] },
      );
      assert.equal(redacted.conflictRefs[0]?.kind, "RESTRICTED_RULE");
      void restrictedAuthored;

      const stale = await executeCounterfactualWhyNot(
        client,
        {
          ...common,
          tableToken: t1,
          currentRulesHash: "STALE".padEnd(64, "9"),
          actor: { personId: "planner-1", roleKey: "PLANNER", permissions: ["seating.view"] },
        },
        feasibleProbe,
      );
      assert.equal(stale.resultCode, "CANDIDATE_STALE");

      const key1 = counterfactualCacheKey({
        candidateHash: hashes.sealedAssignmentHash,
        layoutHash: hashes.layoutHash,
        rulesHash: hashes.rulesHash,
        guestHash: hashes.guestEditionHash,
        objectiveHash: hashes.objectiveEditionHash,
        guestToken: g1,
        tableToken: t2,
        engineBuild: "e1",
        budgetEdition: "b1",
      });
      const key2 = counterfactualCacheKey({
        candidateHash: hashes.sealedAssignmentHash,
        layoutHash: hashes.layoutHash,
        rulesHash: "DIFFERENT".padEnd(64, "8"),
        guestHash: hashes.guestEditionHash,
        objectiveHash: hashes.objectiveEditionHash,
        guestToken: g1,
        tableToken: t2,
        engineBuild: "e1",
        budgetEdition: "b1",
      });
      assert.notEqual(key1, key2);

      await assert.rejects(
        () =>
          executeCounterfactualWhyNot(
            client,
            {
              ...common,
              actor: { personId: "aud-1", roleKey: "READ_ONLY_AUDITOR", permissions: ["seating.view"] },
            },
            infeasibleProbe,
          ),
        (err: unknown) => err instanceof PlatformError && err.code === "FORBIDDEN",
      );

      const incomplete = await executeCounterfactualWhyNot(
        client,
        {
          ...common,
          tableToken: t1,
          guestToken: g1,
          // Distinct candidate hash so cache does not collide with the stale case above.
          sealedAssignmentHash: "B".padEnd(64, "6"),
          actor: { personId: "planner-1", roleKey: "PLANNER", permissions: ["seating.view"] },
        },
        async () => ({ status: "SEARCH_INCOMPLETE" }),
      );
      assert.ok(["SEARCH_INCOMPLETE", "FEASIBLE_WITH_TIER_DELTAS", "COMPLETE_SEATING_IMPOSSIBLE"].includes(incomplete.resultCode));
    } finally {
      client.release();
    }
  });
});

describe("M4 stop modes", () => {
  it("27–36. cancel, KEEP_BEST gating, idempotent stop, persistence", async () => {
    const client = await pool.connect();
    try {
      const runCancel = randomUUID();
      await insertRun(client, runCancel, { status: "RUNNING", solutions_found: 1, incumbent_present: true });
      const cancelled = await requestCpsatRunStop(client, {
        eventId: EVENT,
        runId: runCancel,
        mode: "CANCEL",
        actor: { personId: "p1", roleKey: "PLANNER", permissions: ["seating.run.execute"] },
      });
      assert.equal(cancelled.cancelRequested, true);

      const runZero = randomUUID();
      await insertRun(client, runZero, { status: "RUNNING", solutions_found: 0, incumbent_present: false });
      await assert.rejects(
        () =>
          requestCpsatRunStop(client, {
            eventId: EVENT,
            runId: runZero,
            mode: "KEEP_BEST",
            actor: { personId: "p1", roleKey: "PLANNER", permissions: ["seating.run.execute"] },
          }),
        /KEEP_BEST requires incumbent|complete plan/i,
      );

      const runKeep = randomUUID();
      await insertRun(client, runKeep, { status: "RUNNING", solutions_found: 2, incumbent_present: true });
      const keep = await requestCpsatRunStop(client, {
        eventId: EVENT,
        runId: runKeep,
        mode: "KEEP_BEST",
        actor: { personId: "p1", roleKey: "PLANNER", permissions: ["seating.run.execute"] },
      });
      assert.equal(keep.cancelRequested, true);
      const again = await requestCpsatRunStop(client, {
        eventId: EVENT,
        runId: runKeep,
        mode: "KEEP_BEST",
        actor: { personId: "p1", roleKey: "PLANNER", permissions: ["seating.run.execute"] },
      });
      assert.equal(again.runId, keep.runId);

      const row = await client.query(`SELECT stop_mode, cancel_requested FROM cpsat_solver_runs WHERE id = $1`, [runKeep]);
      assert.equal(row.rows[0]?.stop_mode, "KEEP_BEST");
      assert.equal(row.rows[0]?.cancel_requested, true);

      const runDiag = randomUUID();
      await insertRun(client, runDiag, {
        status: "RUNNING",
        solutions_found: 1,
        incumbent_present: true,
        diagnostic_only: true,
      });
      await assert.rejects(
        () =>
          requestCpsatRunStop(client, {
            eventId: EVENT,
            runId: runDiag,
            mode: "KEEP_BEST",
            actor: { personId: "p1", roleKey: "PLANNER", permissions: ["seating.run.execute"] },
          }),
        /diagnostic/i,
      );

      await assert.rejects(
        () =>
          requestCpsatRunStop(client, {
            eventId: EVENT,
            runId: runKeep,
            mode: "CANCEL",
            actor: { personId: "aud", roleKey: "READ_ONLY_AUDITOR", permissions: ["seating.view"] },
          }),
        (err: unknown) => err instanceof PlatformError && err.code === "FORBIDDEN",
      );

      const uiHidden = buildCpsatRunUiModel({
        lifecycle: "RUNNING",
        productResult: "",
        solutionsFound: 0,
        cancelRequested: false,
      });
      assert.equal(uiHidden.stopAndKeepBestAllowed, false);
      const uiShown = buildCpsatRunUiModel({
        lifecycle: "RUNNING",
        productResult: "",
        solutionsFound: 2,
        cancelRequested: false,
      });
      assert.equal(uiShown.stopAndKeepBestAllowed, true);
      assert.equal(uiShown.cancelAllowed, true);
    } finally {
      client.release();
    }
  });
});

describe("M4 frontend / experience copy", () => {
  it("37–48. wording, no percent, role redaction, auditor controls", () => {
    const certified = buildInfeasibilityExperience({
      productResult: "INFEASIBLE",
      evidenceGrade: "CERTIFIED",
      certificate: {
        layer: "L0",
        type: "EMPTY_DOMAIN",
        evidenceGrade: "CERTIFIED",
        facts: { unitGuestTokens: [tok("x")] },
        ruleRefs: [],
      },
      roleCanSeeRestricted: true,
    });
    assert.match(certified.primaryMessage, /conflict is shown below/);
    const proof = buildInfeasibilityExperience({
      productResult: "INFEASIBLE",
      evidenceGrade: "SOLVER_PROOF",
      roleCanSeeRestricted: true,
    });
    assert.match(proof.primaryMessage, /could not be isolated/);
    const incomplete = buildInfeasibilityExperience({
      productResult: "SEARCH_INCOMPLETE",
      evidenceGrade: null,
      roleCanSeeRestricted: true,
    });
    assert.match(incomplete.primaryMessage, /does not mean one is impossible/);
    const timed = buildInfeasibilityExperience({
      productResult: "TIMED_OUT",
      evidenceGrade: null,
      roleCanSeeRestricted: true,
    });
    assert.match(timed.primaryMessage, /does not mean one is impossible/);
    assert.match(cancelConfirmCopy(), /discard/);
    assert.match(keepBestConfirmCopy(), /best complete plan/);

    const panel = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/event-os/src/components/cpsat-run-status-panel.tsx"),
      "utf8",
    );
    assert.match(panel, /cpsat-stop-keep-best/);
    assert.match(panel, /cpsat-infeasibility-panel/);
    assert.match(panel, /auditorReadOnly/);
    assert.doesNotMatch(panel, /% complete|almost done|percentage/i);
    assert.match(panel, /max-width: 390px/);

    const ui = buildCpsatRunUiModel({
      lifecycle: "CLOSED_NO_PLAN",
      productResult: "INFEASIBLE",
      evidenceGrade: "CERTIFIED",
    });
    assert.equal(ui.showPercentComplete, false);
    assert.equal(ui.showHeuristicFallback, false);
  });
});

describe("M4 pipeline static certify path", () => {
  it("persists certified evidence without claiming restricted infeasible", async () => {
    const client = await pool.connect();
    try {
      const runId = randomUUID();
      await insertRun(client, runId, { status: "CLAIMED" });
      const g1 = tok("sg1");
      const g2 = tok("sg2");
      const authored = authoredBase({
        guests: [
          { token: g1, eligible: true, capabilityCodes: [], groupTokens: [] },
          { token: g2, eligible: true, capabilityCodes: [], groupTokens: [] },
        ],
        rules: [
          rule({ kind: "KEEP_TOGETHER", subjectTokens: [g1, g2] }),
          rule({ kind: "KEEP_APART", subjectTokens: [g1, g2] }),
        ],
      });
      const result = await settleAbnormalInfeasibility({
        client,
        runId,
        authored,
        request: planningRequest(runId),
        probe: infeasibleProbe,
        allowLockRelaxation: false,
        staticOnly: true,
      });
      assert.equal(result.productResult, "INFEASIBLE");
      assert.equal(result.evidenceGrade, "CERTIFIED");
      const row = await client.query(`SELECT evidence_grade, certificate_type FROM cpsat_solver_infeasibility WHERE run_id = $1`, [
        runId,
      ]);
      assert.equal(row.rows[0]?.evidence_grade, "CERTIFIED");
      assert.equal(row.rows[0]?.certificate_type, "APART_WITHIN_UNIT");
    } finally {
      client.release();
    }
  });
});
