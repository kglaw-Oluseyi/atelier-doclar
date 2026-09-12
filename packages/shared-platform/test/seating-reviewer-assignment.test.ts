import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { permissionsForRole, seededRoles } from "../src/catalog.js";
import { fixtureAssignments, fixturePersons, FIXTURE_IDS } from "../src/fixtures.js";
import { MemorySeatingRepository } from "../src/memory-seating-store.js";
import { SeatingCommandService } from "../src/seating-command-service.js";
import type { SeatingConstraintRecord, SeatingPlanEdition } from "../src/seating-schemas.js";
import { actor, fixtureService, people } from "./helpers.js";

const HASH = "8fd24f97e77f1f144f60acb0ab2fd433dbd4891778f7dff54b242503e800d8c9";
const EDITION = "00000000-0000-4000-8000-000000000801";
const NOW = "2026-09-12T12:00:00.000Z";

function service() {
  const { service: platform, store } = fixtureService();
  const repo = new MemorySeatingRepository();
  const seating = new SeatingCommandService(repo, {
    resolveActor: (personId) => platform.resolveActor(personId),
    snapshot: () => store.snapshot(),
    tokenPepper: () => "s06-test-pepper-value",
  });
  return { platform, seating, repo };
}

function envelope(assignmentId: string, key: string, eventId: string = people.eventAlphaOne) {
  return {
    organisationId: people.orgMaison,
    eventId,
    actorAssignmentId: assignmentId,
    idempotencyKey: key,
  };
}

async function seedSubmittedPlan(
  repo: MemorySeatingRepository,
  input: { reviewDomain?: "PROTOCOL" | "ACCESSIBILITY" | "SECURITY"; eventId?: string; authorId?: string; hash?: string },
) {
  const eventId = input.eventId ?? people.eventAlphaOne;
  const hash = input.hash ?? HASH;
  const edition: SeatingPlanEdition = {
    id: EDITION,
    organisationId: people.orgMaison,
    eventId,
    version: 1,
    status: "SUBMITTED",
    contentHash: hash,
    currentWorking: true,
    materialAuthorPersonId: input.authorId ?? people.personPlanner,
    createdAt: NOW,
    updatedAt: NOW,
  };
  await repo.transaction(async (tx) => {
    await tx.insert("planEditions", edition);
    if (input.reviewDomain) {
      const constraint: SeatingConstraintRecord = {
        id: "00000000-0000-4000-8000-000000000811",
        organisationId: people.orgMaison,
        eventId,
        kind: "HARD",
        predicateType: "KEEP_TOGETHER",
        payload: { predicateType: "KEEP_TOGETHER", guestTokens: ["g1", "g2"] },
        authority: "HARD_AUTHORISED",
        evidenceRefs: ["note"],
        disclosureClass: "OPERATIONAL",
        reviewDomain: input.reviewDomain,
        status: "APPROVED",
        version: 0,
        contentHash: HASH,
        createdBy: people.personPlanner,
        createdAt: NOW,
        updatedAt: NOW,
      };
      await tx.insert("constraints", constraint);
    }
  });
  return { edition, hash };
}

describe("EOS-S06 event-scoped specialist reviewer assignment", () => {
  it("keeps one reviewer person and one reviewer role while adding a separate Alpha One assignment", () => {
    const reviewers = fixturePersons().filter((item) => item.email === "reviewer@maison-doclar.test");
    assert.equal(reviewers.length, 1);
    assert.equal(seededRoles().filter((item) => item.key === "RISK_GOVERNANCE_REVIEWER").length, 1);
    const grants = fixtureAssignments().filter((item) => item.personId === people.personRiskReviewer);
    assert.equal(grants.length, 2);
    assert.ok(grants.some((item) => item.id === people.assignRiskReviewer && !item.eventId));
    assert.ok(grants.some((item) => item.id === people.assignRiskReviewerAlphaOne && item.eventId === people.eventAlphaOne));
    assert.equal(permissionsForRole("RISK_GOVERNANCE_REVIEWER").includes("seating.input.prepare"), false);
    assert.equal(permissionsForRole("RISK_GOVERNANCE_REVIEWER").includes("seating.plan.approve"), false);
    assert.equal(permissionsForRole("RISK_GOVERNANCE_REVIEWER").includes("seating.plan.publish"), false);
    assert.equal(permissionsForRole("RISK_GOVERNANCE_REVIEWER").includes("seating.evaluate"), false);
    assert.equal(permissionsForRole("SYSTEM_ADMINISTRATOR").some((key) => key.startsWith("seating.")), false);
    assert.ok(permissionsForRole("READ_ONLY_AUDITOR").includes("seating.view"));
    assert.equal(permissionsForRole("READ_ONLY_AUDITOR").includes("seating.plan.review.protocol"), false);
  });

  it("lists only Alpha One for the reviewer and denies Alpha Two", async () => {
    const { platform, seating } = service();
    const reviewer = actor(people.personRiskReviewer);
    const visible = platform.listEvents(reviewer, people.orgMaison).map((item) => item.id);
    assert.deepEqual(visible, [people.eventAlphaOne]);
    assert.throws(() => platform.getEvent(reviewer, people.orgMaison, people.eventAlphaTwo), /not found/i);
    await assert.rejects(() => seating.projectWorkspace(reviewer, people.eventAlphaTwo), /not found/i);
  });

  it("reviews the implicated domain on the exact hash and replays without a second success", async () => {
    const { seating, repo } = service();
    await seedSubmittedPlan(repo, { reviewDomain: "PROTOCOL" });
    const first = await seating.decideSeatingReview(
      actor(people.personRiskReviewer),
      envelope(people.assignRiskReviewerAlphaOne, "s071-review-01"),
      { editionId: EDITION, editionHash: HASH, domain: "PROTOCOL", decision: "APPROVED", reason: "Protocol holds" },
    );
    const replay = await seating.decideSeatingReview(
      actor(people.personRiskReviewer),
      envelope(people.assignRiskReviewerAlphaOne, "s071-review-01"),
      { editionId: EDITION, editionHash: HASH, domain: "PROTOCOL", decision: "APPROVED", reason: "Protocol holds" },
    );
    assert.equal(first.application, "APPLIED");
    assert.equal(replay.application, "REPLAYED");
    assert.equal(replay.didDataChange, false);
    await assert.rejects(
      () =>
        seating.decideSeatingReview(
          actor(people.personRiskReviewer),
          envelope(people.assignRiskReviewerAlphaOne, "s071-review-security"),
          { editionId: EDITION, editionHash: HASH, domain: "SECURITY", decision: "APPROVED", reason: "Not implicated" },
        ),
      /cannot perform this seating action/,
    );
  });

  it("denies stale hash, self-review, cross-event review, approve and publish", async () => {
    const { seating, repo } = service();
    await seedSubmittedPlan(repo, { reviewDomain: "PROTOCOL" });
    await assert.rejects(
      () =>
        seating.decideSeatingReview(
          actor(people.personRiskReviewer),
          envelope(people.assignRiskReviewerAlphaOne, "s071-stale-hash"),
          { editionId: EDITION, editionHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", domain: "PROTOCOL", decision: "APPROVED", reason: "stale" },
        ),
      /stale plan|VERSION_CONFLICT/,
    );
    await assert.rejects(
      () =>
        seating.decideSeatingReview(
          actor(people.personPlanner),
          envelope(people.assignPlanner, "s071-author-self"),
          { editionId: EDITION, editionHash: HASH, domain: "PROTOCOL", decision: "APPROVED", reason: "self" },
        ),
      /cannot perform this seating action/,
    );
    await assert.rejects(
      () =>
        seating.decideSeatingReview(
          actor(people.personRiskReviewer),
          envelope(people.assignRiskReviewerAlphaOne, "s071-cross-event", people.eventAlphaTwo),
          { editionId: EDITION, editionHash: HASH, domain: "PROTOCOL", decision: "APPROVED", reason: "cross" },
        ),
      /cannot perform this seating action/,
    );
    await assert.rejects(
      () =>
        seating.decideSeatingApproval(actor(people.personRiskReviewer), envelope(people.assignRiskReviewerAlphaOne, "s071-approve-deny"), {
          editionId: EDITION,
          editionHash: HASH,
          decision: "APPROVED",
        }),
      /cannot perform this seating action/,
    );
    await assert.rejects(
      () =>
        seating.publishSeatingPlan(actor(people.personRiskReviewer), envelope(people.assignRiskReviewerAlphaOne, "s071-publish-deny"), {
          editionId: EDITION,
          editionHash: HASH,
        }),
      /cannot perform this seating action/,
    );
    await assert.rejects(
      () => seating.freezeSeatingInputs(actor(people.personRiskReviewer), envelope(people.assignRiskReviewerAlphaOne, "s071-freeze-deny")),
      /cannot perform this seating action/,
    );
    await assert.rejects(
      () => seating.runS06Evaluation(actor(people.personRiskReviewer), envelope(people.assignRiskReviewerAlphaOne, "s071-eval-deny")),
      /cannot perform this seating action/,
    );
  });

  it("does not invent a specialist review when no constraint names a domain", async () => {
    const { seating, repo, platform } = service();
    await seedSubmittedPlan(repo, {});
    const view = await seating.projectWorkspace(actor(people.personRiskReviewer), people.eventAlphaOne);
    assert.deepEqual(view.implicatedReviewDomains, []);
    assert.match(view.reviewRequirementCopy, /no specialist review domain/i);
    await assert.rejects(
      () =>
        seating.decideSeatingReview(
          actor(people.personRiskReviewer),
          envelope(people.assignRiskReviewerAlphaOne, "s071-none-domain"),
          { editionId: EDITION, editionHash: HASH, domain: "PROTOCOL", decision: "APPROVED", reason: "invented" },
        ),
      /cannot perform this seating action/,
    );
    const approved = await seating.decideSeatingApproval(actor(people.personDirector), envelope(people.assignDirector, "s071-dir-approve"), {
      editionId: EDITION,
      editionHash: HASH,
      decision: "APPROVED",
    });
    assert.equal(approved.application, "APPLIED");
    assert.equal(platform.listEvents(actor(people.personRiskReviewer), people.orgMaison).length, 1);
    assert.equal(FIXTURE_IDS.assignRiskReviewerAlphaOne, people.assignRiskReviewerAlphaOne);
  });
});
