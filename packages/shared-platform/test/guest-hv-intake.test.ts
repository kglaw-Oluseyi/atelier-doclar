import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { detectFormulaInjection, parseHvCsv } from "../src/guest-hv-intake-parse.js";
import { actor, fixtureService, people } from "./helpers.js";

function csvFor(rows: Array<Record<string, string>>): string {
  const header = "givenName,familyName,preferredName,email,phone,householdKey,dietary,accessibility,note";
  const body = rows
    .map((row) =>
      [row.givenName, row.familyName, row.preferredName, row.email, row.phone, row.householdKey, row.dietary, row.accessibility, row.note]
        .map((value) => {
          const text = value ?? "";
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

describe("EOS-S06C high-volume guest intake", () => {
  it("parses unicode, quotes and detects formula injection", () => {
    const table = parseHvCsv('givenName,familyName,email\n"José","O\'Neill","jose@example.test"\n=cmd,Bad,"hack@example.test"\n');
    assert.equal(table.rows.length, 2);
    assert.equal(table.rows[0]?.[0], "José");
    assert.equal(detectFormulaInjection("=HYPERLINK()"), true);
    assert.equal(table.formulaCellCount >= 1, true);
  });

  it("rejects empty files", () => {
    assert.throws(() => parseHvCsv(""), (error: unknown) => error instanceof PlatformError);
  });

  it("stages without mutating guests until approve and promote", () => {
    const { service } = fixtureService();
    const director = actor(people.personDirector);
    const job = service.createGuestIntakeJob(director, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      name: "S06C-050-CLEAN",
      reason: "synthetic qualification",
    });
    const csv = csvFor([
      { givenName: "Ada", familyName: "Okoye", email: "ada.s06c@example.test" },
      { givenName: "Ben", familyName: "Okoye", email: "ben.s06c@example.test" },
    ]);
    const uploaded = service.uploadGuestIntakeSource(director, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      jobId: job.id,
      filename: "clean.csv",
      contentType: "text/csv",
      contentBase64: Buffer.from(csv, "utf8").toString("base64"),
      expectedVersion: job.version,
    });
    assert.equal(uploaded.job.sourceHash?.length, 64);
    const validated = service.validateGuestIntake(director, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      jobId: job.id,
      expectedVersion: uploaded.job.version,
    });
    assert.equal(["NEEDS_REVIEW", "READY_FOR_APPROVAL"].includes(validated.status), true);
    const before = service.listGuests(director, { organisationId: people.orgMaison, eventId: people.eventAlphaOne }).length;
    assert.equal(before, 0);
  });

  it("enforces maker-checker and promotes with exact reconciliation", () => {
    const { service } = fixtureService();
    const maker = actor(people.personPlanner);
    const checker = actor(people.personDirector);
    const job = service.createGuestIntakeJob(maker, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      name: "S06C-maker-checker",
      reason: "synthetic",
    });
    const rows = Array.from({ length: 50 }, (_, index) => ({
      givenName: `Guest${index}`,
      familyName: "Synthetic",
      email: `guest${index}.s06c@example.test`,
    }));
    const uploaded = service.uploadGuestIntakeSource(maker, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      jobId: job.id,
      filename: "fifty.csv",
      contentType: "text/csv",
      contentBase64: Buffer.from(csvFor(rows), "utf8").toString("base64"),
      expectedVersion: job.version,
    });
    let current = service.validateGuestIntake(maker, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      jobId: job.id,
      expectedVersion: uploaded.job.version,
    });
    if (current.status === "NEEDS_REVIEW") {
      const bundle = service.getGuestIntakeJob(maker, people.orgMaison, people.eventAlphaOne, job.id);
      current = service.applyGuestIntakeDecisions(maker, {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        jobId: job.id,
        expectedVersion: current.version,
        decisions: bundle.candidates
          .filter((item) => item.status === "WARNING" || item.status === "DUPLICATE_REVIEW")
          .map((item) => ({ candidateId: item.id, decision: "CREATE" as const })),
      });
    }
    current = service.submitGuestIntake(maker, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      jobId: job.id,
      expectedVersion: current.version,
      reason: "submit for approval",
    });
    assert.throws(
      () =>
        service.approveGuestIntake(maker, {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          jobId: job.id,
          expectedVersion: current.version,
          reason: "self approve",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    current = service.approveGuestIntake(checker, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      jobId: job.id,
      expectedVersion: current.version,
      reason: "checker approve",
    });
    let receipt;
    for (let i = 0; i < 10; i += 1) {
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
    assert.equal(current.status === "COMPLETED" || current.status === "COMPLETED_WITH_EXCEPTIONS", true);
    assert.equal(receipt?.totals.createdGuests, 50);
    assert.equal(receipt?.totals.guestTotalAfter, 50);
    const guests = service.listGuests(checker, { organisationId: people.orgMaison, eventId: people.eventAlphaOne });
    assert.equal(guests.length, 50);

    const replay = service.advanceGuestIntakePromotion(checker, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      jobId: job.id,
      expectedVersion: current.version,
    });
    assert.equal(["COMPLETED", "COMPLETED_WITH_EXCEPTIONS"].includes(replay.job.status), true);
    assert.equal(service.listGuests(checker, { organisationId: people.orgMaison, eventId: people.eventAlphaOne }).length, 50);
  });

  it("keeps two events isolated", () => {
    const { service } = fixtureService();
    const director = actor(people.personDirector);
    const ceo = actor(people.personCeo);
    const jobA = service.createGuestIntakeJob(director, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      name: "event-a",
      reason: "isolation",
    });
    const jobB = service.createGuestIntakeJob(ceo, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaTwo,
      name: "event-b",
      reason: "isolation",
    });
    for (const [actorCtx, job, eventId] of [
      [director, jobA, people.eventAlphaOne] as const,
      [ceo, jobB, people.eventAlphaTwo] as const,
    ]) {
      const uploaded = service.uploadGuestIntakeSource(actorCtx, {
        organisationId: people.orgMaison,
        eventId,
        jobId: job.id,
        filename: "iso.csv",
        contentType: "text/csv",
        contentBase64: Buffer.from(csvFor([{ givenName: "Same", familyName: "Name", email: "same@example.test" }]), "utf8").toString("base64"),
        expectedVersion: job.version,
      });
      service.validateGuestIntake(actorCtx, {
        organisationId: people.orgMaison,
        eventId,
        jobId: job.id,
        expectedVersion: uploaded.job.version,
      });
    }
    const listA = service.listGuestIntakeJobs(director, people.orgMaison, people.eventAlphaOne);
    const listB = service.listGuestIntakeJobs(ceo, people.orgMaison, people.eventAlphaTwo);
    assert.equal(listA.every((item) => item.eventId === people.eventAlphaOne), true);
    assert.equal(listB.every((item) => item.eventId === people.eventAlphaTwo), true);
    assert.equal(listA.some((item) => item.id === jobB.id), false);
  });
});
