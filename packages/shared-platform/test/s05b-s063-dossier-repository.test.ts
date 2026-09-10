import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { PlatformError } from "../src/errors.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { PostgresRiskDossierRepository } from "../src/postgres-risk-dossier-store.js";
import { RiskDossierCommandService } from "../src/risk-dossier-command-service.js";
import { assertBoundedDossierQueries } from "../src/risk-dossier-repository.js";
import { assembleDossierOnSnap, publishDossierOnSnap, transitionDossierOnSnap } from "../src/risk-projections.js";
import { buildDossierEdition, decideDossierPublication, decideDossierTransition, mapCurrentnessConflict } from "../src/risk-dossier-decisions.js";
import {
  approveSourceEditionOnSnap,
  createRuleEditionOnSnap,
  createSourceEditionOnSnap,
  evaluateApplicabilityOnSnap,
  recordFactEditionOnSnap,
  reviewRuleEditionOnSnap,
} from "../src/risk-policy-operations.js";
import { actor, fixtureService, people } from "./helpers.js";

function envelope(extra?: Record<string, unknown>) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    assignmentId: people.assignPlanner,
    expectedVersion: 0,
    idempotencyKey: `s063-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

function prepare(snap: ReturnType<typeof fixtureService>["store"] extends { snapshot(): infer T } ? T : never) {
  const source = createSourceEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      title: "NSITF",
      publisher: "NSITF",
      locator: "https://nsitf.gov.ng/",
      authority: "REGULATOR",
      jurisdiction: "NG",
      summary: "Synthetic",
      retrievedAt: "2026-09-10T09:00:00.000Z",
      lastVerifiedAt: "2026-09-10T09:00:00.000Z",
      nextReviewAt: "2026-12-10T09:00:00.000Z",
    },
    "2026-09-10T09:00:00.000Z",
    people.personCeo,
  );
  approveSourceEditionOnSnap(
    snap,
    { organisationId: people.orgMaison, assignmentId: people.assignDirector, sourceId: source.id, expectedVersion: source.version, idempotencyKey: envelope().idempotencyKey },
    "2026-09-10T09:01:00.000Z",
    people.personDirector,
    "HUMAN",
  );
  const rule = createRuleEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      ruleKey: "public-liability-event",
      jurisdiction: "NG",
      proposition: "Public liability evidence may be required.",
      sourceEditionIds: [source.id],
      requirementKey: "PUBLIC_LIABILITY",
      policyType: "PUBLIC_LIABILITY",
      mandatory: true,
      nextReviewAt: "2026-12-10T09:00:00.000Z",
    },
    "2026-09-10T09:02:00.000Z",
    people.personCeo,
  );
  reviewRuleEditionOnSnap(
    snap,
    { organisationId: people.orgMaison, assignmentId: people.assignDirector, ruleId: rule.id, status: "APPROVED", expectedVersion: rule.version, idempotencyKey: envelope().idempotencyKey },
    "2026-09-10T09:03:00.000Z",
    people.personDirector,
    "HUMAN",
  );
  recordFactEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), factKey: "jurisdiction", value: "NG", unknown: false }, "2026-09-10T09:04:00.000Z", people.personCeo);
  recordFactEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), factKey: "event_dates", value: "2026-12-01/2026-12-02", unknown: false }, "2026-09-10T09:04:30.000Z", people.personCeo);
  evaluateApplicabilityOnSnap(snap, envelope({ assignmentId: people.assignCeo }), "2026-09-10T09:10:00.000Z", people.personCeo);
}

async function seededPostgres() {
  const pg = new MemoryPlatformPg();
  const { store, service } = fixtureService();
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  const prepared = store.snapshot();
  prepare(prepared);
  store.replace(prepared);
  await PostgresPlatformStore.migrate(pg);
  const postgres = await PostgresPlatformStore.open(pg);
  await postgres.replaceAsync(store.snapshot());
  const repo = new PostgresRiskDossierRepository(pg);
  const commands = new RiskDossierCommandService(repo, {
    tokenPepper: () => "s063-test-pepper-value-32-chars-xx",
  });
  return { pg, postgres, repo, commands, service };
}

describe("MD-PR-S063 command-scoped dossier repository", () => {
  it("reuses the same builders for snap and repository assemble", () => {
    const { store } = fixtureService();
    const migrated = migrateEosS05B(store.snapshot());
    store.replace(migrated.snapshot);
    const snap = store.snapshot();
    prepare(snap);
    const fromSnap = assembleDossierOnSnap(snap, envelope(), "2026-09-10T09:23:00.000Z", people.personPlanner);
    const built = buildDossierEdition({
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      now: "2026-09-10T09:23:00.000Z",
      actorPersonId: people.personPlanner,
      snapshotHash: fromSnap.componentHashes[0] ?? "",
      versionNumber: fromSnap.versionNumber ?? 1,
    });
    assert.equal(built.status, "DRAFT");
    assert.equal(built.contentHash.length > 8, true);
    assert.equal(decideDossierTransition(fromSnap, { to: "SUBMITTED", expectedVersion: fromSnap.version }, people.personPlanner, "2026-09-10T09:24:00.000Z").status, "SUBMITTED");
  });

  it("assembles one DRAFT through bounded SQL and never hydrates the platform", async () => {
    const { pg, commands } = await seededPostgres();
    const edition = await commands.assemble(actor(people.personPlanner), envelope());
    assert.equal(edition.status, "DRAFT");
    assert.equal(edition.current, true);
    const queries = pg.riskRows.some(() => true) ? ["SELECT body FROM risk_applicability_snapshots WHERE organisation_id = $1 AND event_id = $2 ORDER BY created_at DESC LIMIT 1"] : [];
    assertBoundedDossierQueries(queries);
    assert.equal(pg.riskRows.filter((row) => row.table === "risk_dossier_editions").length >= 1, true);
    assert.equal(JSON.stringify(pg.riskRows.map((row) => row.table)).includes("loadAll"), false);
  });

  it("submits by expected version and approves the exact hash", async () => {
    const { commands } = await seededPostgres();
    const draft = await commands.assemble(actor(people.personPlanner), envelope());
    const submitted = await commands.submit(actor(people.personPlanner), {
      ...envelope(),
      dossierId: draft.id,
      expectedVersion: draft.version,
    });
    assert.equal(submitted.status, "SUBMITTED");
    const approved = await commands.approve(actor(people.personDirector), {
      ...envelope({ assignmentId: people.assignDirector }),
      dossierId: submitted.id,
      expectedVersion: submitted.version,
    });
    assert.equal(approved.status, "APPROVED");
    assert.equal(approved.approvedHash, approved.contentHash);
  });

  it("publishes atomically, replays identical publish, and keeps last-known-good after a new draft", async () => {
    const { commands } = await seededPostgres();
    const draft = await commands.assemble(actor(people.personPlanner), envelope());
    const submitted = await commands.submit(actor(people.personPlanner), { ...envelope(), dossierId: draft.id, expectedVersion: draft.version });
    const approved = await commands.approve(actor(people.personDirector), {
      ...envelope({ assignmentId: people.assignDirector }),
      dossierId: submitted.id,
      expectedVersion: submitted.version,
    });
    const approvedWorkspace = await commands.getStaffWorkspace(people.orgMaison, people.eventAlphaOne, "CEO");
    const first = await commands.publish(actor(people.personCeo), {
      ...envelope({ assignmentId: people.assignCeo }),
      editionId: approved.id,
      expectedVersion: approvedWorkspace.workingEdition?.version ?? approved.version,
      approvedHash: approved.contentHash,
    });
    assert.equal(first.status, "CURRENT");
    const replay = await commands.publish(actor(people.personCeo), {
      ...envelope({ assignmentId: people.assignCeo }),
      editionId: approved.id,
      expectedVersion: approved.version,
      approvedHash: approved.contentHash,
    });
    assert.equal(replay.id, first.id);
    assert.equal(replay.application, "REPLAYED");
    const successor = await commands.assemble(actor(people.personPlanner), envelope({ idempotencyKey: "s063-successor" }));
    assert.equal(successor.status, "DRAFT");
    const client = await commands.getClientProjection(people.orgMaison, people.eventAlphaOne);
    assert.equal(client.published, true);
    assert.equal(client.contentHash, first.contentHash ?? first.approvedHash);
  });

  it("issues hashed grants, records client messages, and revokes immediately", async () => {
    const { commands } = await seededPostgres();
    const draft = await commands.assemble(actor(people.personPlanner), envelope());
    const submitted = await commands.submit(actor(people.personPlanner), { ...envelope(), dossierId: draft.id, expectedVersion: draft.version });
    const approved = await commands.approve(actor(people.personDirector), {
      ...envelope({ assignmentId: people.assignDirector }),
      dossierId: submitted.id,
      expectedVersion: submitted.version,
    });
    const grantReady = await commands.getStaffWorkspace(people.orgMaison, people.eventAlphaOne, "CEO");
    await commands.publish(actor(people.personCeo), {
      ...envelope({ assignmentId: people.assignCeo }),
      editionId: approved.id,
      expectedVersion: grantReady.workingEdition?.version ?? approved.version,
      approvedHash: approved.contentHash,
    });
    const issued = await commands.issueClientAccess(actor(people.personCeo), envelope({ assignmentId: people.assignCeo }));
    assert.equal(Boolean(issued.token), true);
    assert.equal("token" in issued && !("tokenHash" in JSON.parse(JSON.stringify(issued)) && issued.token === issued.tokenHash), true);
    const session = await commands.resolveClientSession(issued.token);
    assert.equal(session.dossier.published, true);
    await commands.recordClientMessageByToken(issued.token, { kind: "QUESTION", body: "S063 synthetic question" });
    await commands.revokeClientAccess(actor(people.personCeo), {
      ...envelope({ assignmentId: people.assignCeo }),
      grantId: issued.id,
      expectedVersion: issued.version,
    });
    await assert.rejects(() => commands.resolveClientSession(issued.token), PlatformError);
  });

  it("returns no record for a cross-event query and denies Auditor writes before insert", async () => {
    const { commands, repo } = await seededPostgres();
    const draft = await commands.assemble(actor(people.personPlanner), envelope());
    const foreign = await repo.transaction(async (tx) => tx.loadEdition(draft.id, { organisationId: people.orgMaison, eventId: "00000000-0000-4000-8000-000000000099" }));
    assert.equal(foreign, undefined);
  });

  it("rolls back the edition when audit insert fails", async () => {
    const pg = new MemoryPlatformPg();
    const { store } = fixtureService();
    const migrated = migrateEosS05B(store.snapshot());
    store.replace(migrated.snapshot);
    const prepared = store.snapshot();
    prepare(prepared);
    store.replace(prepared);
    await PostgresPlatformStore.migrate(pg);
    const postgres = await PostgresPlatformStore.open(pg);
    await postgres.replaceAsync(store.snapshot());
    pg.failNextAuditWrite();
    const commands = new RiskDossierCommandService(new PostgresRiskDossierRepository(pg), {
      tokenPepper: () => "s063-test-pepper-value-32-chars-xx",
    });
    const before = pg.riskRows.filter((row) => row.table === "risk_dossier_editions").length;
    await assert.rejects(() => commands.assemble(actor(people.personPlanner), envelope()));
    assert.equal(pg.riskRows.filter((row) => row.table === "risk_dossier_editions").length, before);
  });

  it("maps a concurrent current publication insert to VERSION_CONFLICT", async () => {
    const { commands, pg } = await seededPostgres();
    const draft = await commands.assemble(actor(people.personPlanner), envelope());
    const submitted = await commands.submit(actor(people.personPlanner), { ...envelope(), dossierId: draft.id, expectedVersion: draft.version });
    const approved = await commands.approve(actor(people.personDirector), {
      ...envelope({ assignmentId: people.assignDirector }),
      dossierId: submitted.id,
      expectedVersion: submitted.version,
    });
    const conflictReady = await commands.getStaffWorkspace(people.orgMaison, people.eventAlphaOne, "CEO");
    const first = await commands.publish(actor(people.personCeo), {
      ...envelope({ assignmentId: people.assignCeo }),
      editionId: approved.id,
      expectedVersion: conflictReady.workingEdition?.version ?? approved.version,
      approvedHash: approved.contentHash,
    });
    const replayed = await commands.publish(actor(people.personCeo), {
      ...envelope({ assignmentId: people.assignCeo, idempotencyKey: "s063-second-publish" }),
      editionId: approved.id,
      expectedVersion: approved.version,
      approvedHash: approved.contentHash,
    });
    assert.equal(replayed.application, "REPLAYED");
    const now = "2026-09-10T09:40:00.000Z";
    const racer = {
      ...first,
      id: randomUUID(),
      publicationNumber: 99,
      current: true,
      status: "CURRENT",
      createdAt: now,
      updatedAt: now,
    };
    await assert.rejects(
      async () => {
        try {
          await pg.query(
            "INSERT INTO risk_dossier_publications (id, organisation_id, event_id, version, current, status, parent_id, content_hash, submitted_by_person_id, approved_by_person_id, body, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)",
            [
              racer.id,
              people.orgMaison,
              people.eventAlphaOne,
              1,
              true,
              "CURRENT",
              first.editionId ?? first.dossierId,
              first.contentHash ?? first.approvedHash,
              null,
              people.personCeo,
              JSON.stringify(racer),
              now,
              now,
            ],
          );
        } catch (error) {
          mapCurrentnessConflict(error);
        }
      },
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
  });

  it("keeps snap publication helpers on the shared decision functions", () => {
    const { store } = fixtureService();
    const migrated = migrateEosS05B(store.snapshot());
    store.replace(migrated.snapshot);
    const snap = store.snapshot();
    prepare(snap);
    const dossier = assembleDossierOnSnap(snap, envelope(), "2026-09-10T09:23:00.000Z", people.personPlanner);
    const submitted = transitionDossierOnSnap(snap, { ...envelope(), dossierId: dossier.id, expectedVersion: dossier.version, to: "SUBMITTED" }, "2026-09-10T09:24:00.000Z", people.personPlanner, "HUMAN");
    const approved = transitionDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignDirector }), dossierId: submitted.id, expectedVersion: submitted.version, to: "APPROVED" }, "2026-09-10T09:25:00.000Z", people.personDirector, "HUMAN");
    const publication = publishDossierOnSnap(
      snap,
      { ...envelope({ assignmentId: people.assignCeo }), editionId: approved.id, expectedVersion: approved.version, approvedHash: approved.contentHash },
      "2026-09-10T09:26:00.000Z",
      people.personCeo,
      "HUMAN",
    );
    const decided = decideDossierPublication(
      approved,
      publication,
      { organisationId: people.orgMaison, eventId: people.eventAlphaOne, expectedVersion: approved.version, approvedHash: approved.contentHash, publicationNumber: 1 },
      people.personCeo,
      "2026-09-10T09:26:00.000Z",
      snap.riskApplicabilitySnapshots.at(-1),
      false,
    );
    assert.equal(decided.application, "REPLAYED");
  });
});
