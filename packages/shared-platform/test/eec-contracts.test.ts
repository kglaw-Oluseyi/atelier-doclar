import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { permissionsForRole } from "../src/catalog.js";
import { addMoney, exactHash, moneyFromDto, moneyToDto, nfc } from "../src/eec-hash.js";
import { CONFIRMATION_STATES } from "../src/constants.js";

test("EEC-02 role grants stay least-privilege", () => {
  const ceo = permissionsForRole("CEO");
  const planner = permissionsForRole("PLANNER");
  const director = permissionsForRole("EVENT_DIRECTOR");
  const auditor = permissionsForRole("READ_ONLY_AUDITOR");
  const admin = permissionsForRole("SYSTEM_ADMINISTRATOR");
  const author = [
    "engagement.view",
    "engagement.create",
    "engagement.update",
    "discovery.session.view",
    "discovery.session.manage",
    "discovery.source.view",
    "discovery.source.manage",
    "discovery.assertion.review",
  ] as const;
  const decide = ["brief.decide", "investment.decide", "roadmap.decide", "change.decide"] as const;
  const forbiddenToAuthor = ["engagement.convert", "executiveCommand.view", ...decide] as const;
  for (const key of author) {
    assert.ok(ceo.includes(key), `CEO missing ${key}`);
    assert.ok(planner.includes(key), `Planner missing ${key}`);
    assert.ok(director.includes(key), `Director missing ${key}`);
    assert.ok(auditor.includes(key) === key.endsWith(".view"), `Auditor grant for ${key}`);
    assert.equal(admin.includes(key), false, `Sysadmin must not receive ${key}`);
  }
  for (const key of forbiddenToAuthor) {
    assert.ok(ceo.includes(key), `CEO missing ${key}`);
    assert.equal(planner.includes(key), false, `Planner must not receive ${key}`);
    assert.equal(auditor.includes(key), false, `Auditor must not receive ${key}`);
    assert.equal(admin.includes(key), false, `Sysadmin must not receive ${key}`);
  }
  assert.equal(director.includes("engagement.convert"), false);
  assert.equal(director.includes("executiveCommand.view"), false);
  assert.ok(director.includes("brief.decide"));
  assert.ok(auditor.includes("engagement.view"));
});

test("EEC-03 money never uses floating point and hashes stay stable", () => {
  const dto = { currency: "NGN", minor: "150000" };
  const money = moneyFromDto(dto);
  assert.equal(typeof money.minor, "bigint");
  assert.deepEqual(moneyToDto(addMoney(money, moneyFromDto({ currency: "NGN", minor: "50" }))), {
    currency: "NGN",
    minor: "150050",
  });
  assert.throws(() => addMoney(money, moneyFromDto({ currency: "USD", minor: "1" })));
  const first = exactHash({ topicKey: "guest.target_count", value: { count: "320" } });
  const second = exactHash({ value: { count: "320" }, topicKey: "guest.target_count" });
  assert.equal(first, second);
  assert.equal(nfc("Yorùbá"), "Yorùbá");
  assert.ok(!CONFIRMATION_STATES.includes("AI_CONFIRMED" as never));
});

test("EEC-01 AI assistance module does not import persistence adapters", () => {
  const source = readFileSync(new URL("../src/ai-assistance/index.ts", import.meta.url), "utf8");
  assert.equal(source.includes("postgres-store"), false);
  assert.equal(source.includes("memory-store"), false);
  assert.equal(source.includes("eec-persistence"), false);
  assert.equal(source.includes("eec-operations"), false);
});
