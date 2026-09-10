import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import {
  APPLICABILITY_TRANSITIONS,
  CHECKIN_TRANSITIONS,
  CLAUSE_TRANSITIONS,
  FALLBACK_TRANSITIONS,
  GAP_TRANSITIONS,
  INCIDENT_TRANSITIONS,
  POLICY_EVIDENCE_TRANSITIONS,
  VENDOR_ASSESSMENT_TRANSITIONS,
  assertLegalTransition,
} from "../src/risk-transitions.js";
import { applyClauseEditionOnSnap, reviewClauseEditionOnSnap } from "../src/risk-clause-operations.js";
import { assessVendorOnSnap, decideVendorAssessmentOnSnap } from "../src/risk-vendor-assessment.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { fixtureService, people } from "./helpers.js";

describe("EOS-S05B aggregate transitions", () => {
  it("rejects illegal policy, gap, clause, vendor, fallback and incident jumps", () => {
    assert.throws(() => assertLegalTransition(POLICY_EVIDENCE_TRANSITIONS, "DRAFT", "VERIFIED", "policy"), PlatformError);
    assert.throws(() => assertLegalTransition(GAP_TRANSITIONS, "RESOLVED", "ACCEPTED_RISK", "gap"), PlatformError);
    assert.throws(() => assertLegalTransition(CLAUSE_TRANSITIONS, "DRAFT", "APPROVED", "clause"), PlatformError);
    assert.throws(() => assertLegalTransition(VENDOR_ASSESSMENT_TRANSITIONS, "INCOMPLETE", "APPROVED", "vendor"), PlatformError);
    assert.throws(() => assertLegalTransition(CHECKIN_TRANSITIONS, "CLOSED", "CONFIRMED", "check-in"), PlatformError);
    assert.throws(() => assertLegalTransition(FALLBACK_TRANSITIONS, "PROPOSED", "CONFIRMED", "fallback"), PlatformError);
    assert.throws(() => assertLegalTransition(INCIDENT_TRANSITIONS, "OPEN", "POST_INCIDENT_REVIEWED", "incident"), PlatformError);
    assert.throws(() => assertLegalTransition(APPLICABILITY_TRANSITIONS, "APPLIES", "INDETERMINATE", "applicability"), PlatformError);
  });

  it("keeps clause maker-checker and vendor band intact", () => {
    const { store } = fixtureService();
    const migrated = migrateEosS05B(store.snapshot());
    store.replace(migrated.snapshot);
    const snap = store.snapshot();
    const clause = applyClauseEditionOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "clause-edition-01",
        family: "RETENTION",
        jurisdiction: "NG",
        language: "en",
        body: "Retention of {{PERCENT}} remains a contract condition.",
        variables: [{ key: "PERCENT", value: "20" }],
      },
      "2026-09-10T09:13:00.000Z",
      people.personCeo,
    );
    assert.equal(clause.enforceabilityClaimed, false);
    assert.throws(
      () =>
        reviewClauseEditionOnSnap(
          snap,
          {
            organisationId: people.orgMaison,
            assignmentId: people.assignCeo,
            expectedVersion: clause.version,
            idempotencyKey: "clause-self-01",
            editionId: clause.id,
            gate: "LEGAL",
            decision: "APPROVED",
          },
          "2026-09-10T09:14:00.000Z",
          people.personCeo,
          "HUMAN",
        ),
      PlatformError,
    );
    const assessment = assessVendorOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "vendor-assess-01",
        vendorId: "00000000-0000-4000-8000-000000000201",
      },
      "2026-09-10T09:14:00.000Z",
      people.personCeo,
    );
    const band = assessment.band;
    const decided = decideVendorAssessmentOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignDirector,
        expectedVersion: assessment.version,
        idempotencyKey: "vendor-decide-01",
        assessmentId: assessment.id,
        decision: "RESTRICTED",
        reason: "Missing certificate",
      },
      "2026-09-10T09:15:00.000Z",
      people.personDirector,
      "HUMAN",
    );
    assert.equal(decided.band, band);
  });
});
