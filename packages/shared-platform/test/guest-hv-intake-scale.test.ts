import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { actor, fixtureService, people } from "./helpers.js";

function csvFor(count: number, seed: string): { csv: string; hash: string } {
  const header = "givenName,familyName,preferredName,email,phone,householdKey,dietary,accessibility,note";
  const lines = [header];
  for (let i = 0; i < count; i += 1) {
    const household = `HH-${seed}-${Math.floor(i / 4)}`;
    lines.push(
      [
        `Syn${i}`,
        `Guest${seed}`,
        "",
        `syn${i}.${seed}.s06c@example.test`,
        `+1555${String(1000000 + i).slice(0, 7)}`,
        household,
        i % 17 === 0 ? "vegetarian" : "",
        i % 23 === 0 ? "wheelchair access" : "",
        `SYNTHETIC S06C ${seed}`,
      ].join(","),
    );
  }
  const csv = `${lines.join("\n")}\n`;
  return { csv, hash: createHash("sha256").update(csv).digest("hex") };
}

async function runIntake(count: number, seed: string) {
  const { service } = fixtureService();
  const maker = actor(people.personPlanner);
  const checker = actor(people.personDirector);
  const started = Date.now();
  const job = service.createGuestIntakeJob(maker, {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    name: `S06C-${count}-${seed}`,
    reason: "synthetic scale qualification",
    expectedScale: count,
  });
  const { csv, hash } = csvFor(count, seed);
  const uploaded = service.uploadGuestIntakeSource(maker, {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    jobId: job.id,
    filename: `${seed}.csv`,
    contentType: "text/csv",
    contentBase64: Buffer.from(csv, "utf8").toString("base64"),
    expectedVersion: job.version,
  });
  const afterUpload = Date.now();
  let current = service.validateGuestIntake(maker, {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    jobId: job.id,
    expectedVersion: uploaded.job.version,
  });
  const afterValidate = Date.now();
  if (current.status === "NEEDS_REVIEW") {
    const bundle = service.getGuestIntakeJob(maker, people.orgMaison, people.eventAlphaOne, job.id);
    const decisions = bundle.candidates
      .filter((item) => item.status !== "READY" && item.status !== "INVALID")
      .slice(0, 500)
      .map((item) => ({ candidateId: item.id, decision: "CREATE" as const }));
    if (decisions.length) {
      current = service.applyGuestIntakeDecisions(maker, {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        jobId: job.id,
        expectedVersion: current.version,
        decisions,
      });
    }
  }
  current = service.submitGuestIntake(maker, {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    jobId: job.id,
    expectedVersion: current.version,
    reason: "scale submit",
  });
  current = service.approveGuestIntake(checker, {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    jobId: job.id,
    expectedVersion: current.version,
    reason: "scale approve",
  });
  const promoteStarted = Date.now();
  let receipt;
  for (let i = 0; i < 80; i += 1) {
    const advanced = service.advanceGuestIntakePromotion(checker, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      jobId: job.id,
      expectedVersion: current.version,
      maxChunks: 8,
    });
    current = advanced.job;
    receipt = advanced.receipt;
    if (current.status === "COMPLETED" || current.status === "COMPLETED_WITH_EXCEPTIONS") break;
  }
  const ended = Date.now();
  return {
    hash,
    status: current.status,
    created: receipt?.totals.createdGuests ?? 0,
    guestTotalAfter: receipt?.totals.guestTotalAfter ?? 0,
    uploadMs: afterUpload - started,
    validateMs: afterValidate - afterUpload,
    promoteMs: ended - promoteStarted,
    totalMs: ended - started,
  };
}

describe("EOS-S06C scale qualification", () => {
  it(
    "promotes 1000 clean synthetic rows within hard ceiling",
    { timeout: 240_000 },
    async () => {
      console.error("S06C-1000 start; expected duration <= 120s target / 240s ceiling");
      const result = await runIntake(1000, "1000TYPICAL");
      console.error(JSON.stringify({ corpus: "S06C-1000-TYPICAL", ...result }));
      assert.equal(result.status === "COMPLETED" || result.status === "COMPLETED_WITH_EXCEPTIONS", true);
      assert.equal(result.created, 1000);
      assert.equal(result.guestTotalAfter, 1000);
      assert.ok(result.totalMs <= 240_000, `1000-row machine time ${result.totalMs}ms exceeded 240s ceiling`);
    },
  );

  it(
    "promotes 2000 clean synthetic rows within hard ceiling",
    { timeout: 480_000 },
    async () => {
      console.error("S06C-2000 start; expected duration <= 240s target / 480s ceiling");
      const result = await runIntake(2000, "2000SCALE");
      console.error(JSON.stringify({ corpus: "S06C-2000-SCALE", ...result }));
      assert.equal(result.status === "COMPLETED" || result.status === "COMPLETED_WITH_EXCEPTIONS", true);
      assert.equal(result.created, 2000);
      assert.equal(result.guestTotalAfter, 2000);
      assert.ok(result.totalMs <= 480_000, `2000-row machine time ${result.totalMs}ms exceeded 480s ceiling`);
    },
  );
});
