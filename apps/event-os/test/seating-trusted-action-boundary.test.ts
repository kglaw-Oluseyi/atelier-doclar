import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const seatingActions = readFileSync(fileURLToPath(new URL("../src/server/seating-actions.ts", import.meta.url)), "utf8");
const verifyAsAction = readFileSync(fileURLToPath(new URL("../src/server/seating-verify-as-action.ts", import.meta.url)), "utf8");
const protectionForm = readFileSync(fileURLToPath(new URL("../src/server/protection-form-action.ts", import.meta.url)), "utf8");
const protectionHelpers = readFileSync(fileURLToPath(new URL("../src/server/protection-form-helpers.ts", import.meta.url)), "utf8");
const riskActions = readFileSync(fileURLToPath(new URL("../src/server/risk-actions.ts", import.meta.url)), "utf8");
const seatingPage = readFileSync(fileURLToPath(new URL("../src/app/app/events/[eventId]/seating/page.tsx", import.meta.url)), "utf8");

const SEATING_ACTIONS = [
  "freezeSeatingInputsAction",
  "createSeatingConstraintAction",
  "activateSeatingRuleAction",
  "withdrawSeatingRuleAction",
  "createReservationBlockAction",
  "activateReservationBlockAction",
  "withdrawReservationBlockAction",
  "supersedeReservationBlockAction",
  "releaseReservationBlockAction",
  "launchSeatingRunAction",
  "cancelSeatingRunAction",
  "adoptSeatingRunAction",
  "applySeatingChangeAction",
  "submitSeatingPlanAction",
  "recallSeatingPlanAction",
  "decideSeatingReviewAction",
  "decideSeatingApprovalAction",
  "publishSeatingPlanAction",
  "requestSeatingExportAction",
  "proposeSeatingLayoutBindingAction",
  "activateSeatingLayoutBindingAction",
  "withdrawSeatingLayoutBindingAction",
  "runS06EvaluationAction",
] as const;

describe("MD-PR-S075 Packet 2 Event OS trusted action boundary (red)", () => {
  it("1/13/14. every Seating action binds route eventId and does not take authority from FormData", () => {
    assert.match(seatingActions, /boundEventId/);
    assert.match(seatingPage, /\.bind\(null, event\.id\)/);
    assert.equal(/function scopePath\(formData: FormData\)/.test(seatingActions), false);
    assert.equal(/field\(formData, "organisationId"\)/.test(seatingActions), false);
    assert.equal(/field\(formData, "eventId"\)/.test(seatingActions), false);
    for (const name of SEATING_ACTIONS) {
      assert.match(seatingActions, new RegExp(`export async function ${name}\\(\\s*boundEventId`));
    }
    assert.match(verifyAsAction, /export async function switchSeatingVerifyAsAction\(\s*boundEventId/);
    assert.equal(/const organisationId = field\(formData, "organisationId"\)/.test(seatingActions), false);
    assert.equal(/store\.snapshot\(\)\.layoutPublications\.find/.test(seatingActions), false);
    assert.equal(/store\.snapshot\(/.test(seatingActions), false);
  });

  it("13/14. seating mutations authenticate once and do not reread FormData scope after a trusted context exists", () => {
    assert.match(protectionForm, /trustedScope|trustedContext|boundEventId/);
    assert.equal(/async function sessionEnvelope\(formData: FormData\)/.test(seatingActions), false);
    assert.equal(seatingActions.includes("requireActor()"), false);
    assert.equal(verifyAsAction.includes("await requireActor()"), false);
    assert.match(seatingActions, /recoverProposeSeatingLayoutBindingAction[\s\S]*?establishTrustedSeatingContext\(/);
    assert.equal(/recoverProposeSeatingLayoutBindingAction[\s\S]*?field\(formData, "organisationId"\)/.test(seatingActions), false);
    assert.equal(/recoverProposeSeatingLayoutBindingAction[\s\S]*?field\(formData, "eventId"\)/.test(seatingActions), false);
  });

  it("16. Verify-as requires seating.fixture_verify_as, bound event and the one-way CEO fallback", () => {
    assert.match(verifyAsAction, /seating\.fixture_verify_as/);
    assert.match(verifyAsAction, /boundEventId/);
    assert.equal(/authenticateNamedStaff/.test(verifyAsAction), true);
    assert.equal(/formData\.get\("eventId"\)/.test(verifyAsAction), false);
  });

  it("20. Protection and Dossier shared-form behaviour remains FormData-scoped", () => {
    assert.match(protectionHelpers, /function scopePathFromForm\(formData: FormData/);
    assert.match(protectionHelpers, /formData\.get\("eventId"\)/);
    assert.match(riskActions, /scopePathFromForm\(formData/);
    assert.match(riskActions, /dossierScopePathFromForm\(formData/);
    assert.match(protectionForm, /eventId: String\(input\.formData\.get\("eventId"\) \?\? ""\) \|\| undefined/);
  });
});
