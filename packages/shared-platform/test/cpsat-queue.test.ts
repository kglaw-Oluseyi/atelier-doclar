import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CPSAT_CLAIM_SQL,
  CPSAT_FAIR_CLAIM_SQL,
  CPSAT_FENCED_SETTLE_SQL,
  CPSAT_HEARTBEAT_SQL,
  CPSAT_PRIORITY_ORDER,
  fenceToken,
  newWorkerLeaseOwner,
} from "../src/cpsat/queue.js";
import { CPSAT_SOLVER_QUEUE_POSTGRES_SCHEMA, EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID } from "../src/cpsat/postgres-schema.js";
import { PLATFORM_MIGRATIONS } from "../src/migrations.js";

test("queue migration is registered", () => {
  assert.ok(PLATFORM_MIGRATIONS.some((m) => m.id === EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID));
  assert.match(CPSAT_SOLVER_QUEUE_POSTGRES_SCHEMA, /FOR UPDATE SKIP LOCKED|cpsat_solver_runs/);
});

test("claim SQL uses SKIP LOCKED and priority ordering", () => {
  assert.match(CPSAT_CLAIM_SQL, /FOR UPDATE SKIP LOCKED/);
  assert.match(CPSAT_CLAIM_SQL, /EVENT_DAY_REPAIR/);
  assert.match(CPSAT_FAIR_CLAIM_SQL, /running_count/);
});

test("heartbeat and fenced settle require lease owner + epoch", () => {
  assert.match(CPSAT_HEARTBEAT_SQL, /lease_owner/);
  assert.match(CPSAT_HEARTBEAT_SQL, /lease_epoch/);
  assert.match(CPSAT_FENCED_SETTLE_SQL, /lease_owner/);
  assert.match(CPSAT_FENCED_SETTLE_SQL, /lease_epoch/);
});

test("priority order is stable", () => {
  assert.deepEqual([...CPSAT_PRIORITY_ORDER], ["EVENT_DAY_REPAIR", "PLANNING", "SHADOW", "QUALIFICATION"]);
});

test("lease owner and fence token are deterministic for inputs", () => {
  const owner = newWorkerLeaseOwner("test-host");
  assert.match(owner, /^worker:test-host:/);
  const a = fenceToken(owner, 3);
  const b = fenceToken(owner, 3);
  const c = fenceToken(owner, 4);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(a.length, 32);
});
