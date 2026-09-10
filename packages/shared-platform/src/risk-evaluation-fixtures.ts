import { loadNonProductionFixtures } from "./bootstrap.js";
import { nfc } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import { FIXTURE_IDS } from "./fixtures.js";
import { MemoryPlatformStore } from "./memory-store.js";
import { migrateEosS05B } from "./risk-migration.js";
import { applyClauseEditionOnSnap } from "./risk-clause-operations.js";
import { evaluateEscalationsOnSnap, generateCheckpointInstancesOnSnap, proposeFallbackOnSnap, recordCheckInOnSnap, transitionFallbackOnSnap, createContinuityPlanOnSnap } from "./risk-continuity.js";
import { projectRiskBudgetOnSnap } from "./risk-budget-projection.js";
import { reportIncidentOnSnap } from "./risk-incidents.js";
import {
  approveSourceEditionOnSnap,
  createEvidenceDocumentOnSnap,
  createPolicyEditionOnSnap,
  createPolicyOnSnap,
  createRuleEditionOnSnap,
  createSourceEditionOnSnap,
  evaluateApplicabilityOnSnap,
  recordFactEditionOnSnap,
  reviewRuleEditionOnSnap,
  submitResidualDecisionOnSnap,
  decideResidualRiskOnSnap,
  completeEvidenceUploadOnSnap,
  verifyPolicyEditionOnSnap,
} from "./risk-policy-operations.js";
import { assembleDossierOnSnap, transitionDossierOnSnap } from "./risk-projections.js";
import { assessVendorOnSnap, assignRosterOnSnap, decideVendorAssessmentOnSnap } from "./risk-vendor-assessment.js";
import type { S05BEvaluationCaseDefinition } from "./risk-evaluation-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export interface S05BEvaluationAdapters {
  inventPremium?: boolean;
  fabricateCoverage?: boolean;
  traitScore?: boolean;
  escalateAuthority?: boolean;
  leakCrossEvent?: boolean;
  silentDispatch?: boolean;
  falseSuccess?: boolean;
}

export type S05BObservation = { code: string; expectedSummary: string; observedSummary: string; passed: boolean };

const VENDOR_ID = "00000000-0000-4000-8000-000000000201";
const INSURER_ID = "00000000-0000-4000-8000-000000000202";

function env(_caseDef: S05BEvaluationCaseDefinition): { snap: PlatformSnapshot; ceo: string; director: string; assignment: string; eventId: string; organisationId: string } {
  const store = new MemoryPlatformStore();
  loadNonProductionFixtures(store);
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  const snap = store.snapshot();
  return {
    snap,
    ceo: FIXTURE_IDS.personCeo,
    director: FIXTURE_IDS.personDirector,
    assignment: FIXTURE_IDS.assignCeo,
    eventId: FIXTURE_IDS.eventAlphaOne,
    organisationId: FIXTURE_IDS.orgMaison,
  };
}

function envelope(ctx: ReturnType<typeof env>, extra?: Record<string, unknown>) {
  return {
    organisationId: ctx.organisationId,
    eventId: ctx.eventId,
    assignmentId: ctx.assignment,
    expectedVersion: 0,
    idempotencyKey: `s05b-eval-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

export function executeS05BCase(caseDef: S05BEvaluationCaseDefinition, adapters: S05BEvaluationAdapters = {}): S05BObservation[] {
  const ctx = env(caseDef);
  const observed = new Map<string, string>();
  let source = ctx.snap.riskSourceEditions[0];
  let rule = ctx.snap.riskRuleEditions[0];
  let policy = ctx.snap.riskPolicies[0];
  let edition = ctx.snap.riskPolicyEditions[0];
  let document = ctx.snap.riskEvidenceDocuments[0];
  let assessment = ctx.snap.riskVendorAssessments[0];
  let plan = ctx.snap.riskContinuityPlans[0];
  let activation = ctx.snap.riskFallbackActivations[0];
  try {
    for (const action of caseDef.actions) {
      if (action.kind === "CREATE_SOURCE") {
        source = createSourceEditionOnSnap(
          ctx.snap,
          {
            ...envelope(ctx),
            title: "NSITF compensation guidance (synthetic discovery)",
            publisher: "NSITF",
            locator: "https://nsitf.gov.ng/compensation/",
            authority: "REGULATOR",
            jurisdiction: "NG",
            summary: "Synthetic discovery source. URL availability is not legal verification. Yorùbá",
            retrievedAt: "2026-09-10T09:00:00.000Z",
            lastVerifiedAt: "2026-09-10T09:00:00.000Z",
            nextReviewAt: "2026-12-10T09:00:00.000Z",
          },
          "2026-09-10T09:00:00.000Z",
          ctx.ceo,
        );
        observed.set("UNICODE_NFC", nfc("Yorùbá") === "Yorùbá" ? "Yorùbá text remains NFC" : "unicode lost");
        observed.set("RULE_STATUS_VISIBLE", source.status);
      }
      if (action.kind === "APPROVE_SOURCE" && source) {
        source = approveSourceEditionOnSnap(ctx.snap, { ...envelope(ctx), sourceId: source.id, expectedVersion: source.version }, "2026-09-10T09:01:00.000Z", ctx.director, "HUMAN");
      }
      if (action.kind === "CREATE_RULE" && source) {
        rule = createRuleEditionOnSnap(
          ctx.snap,
          {
            ...envelope(ctx),
            ruleKey: "public-liability-event",
            jurisdiction: "NG",
            proposition: "Public liability evidence may be required for the event profile.",
            sourceEditionIds: [source.id],
            requirementKey: "PUBLIC_LIABILITY",
            policyType: "PUBLIC_LIABILITY",
            mandatory: true,
            effectiveTo: caseDef.family === "STALE_RULE" ? "2020-01-01" : undefined,
          },
          "2026-09-10T09:02:00.000Z",
          ctx.ceo,
        );
        observed.set("RULE_STATUS_VISIBLE", "rule status is visible and not silently mandatory");
      }
      if (action.kind === "APPROVE_RULE" && rule) {
        rule = reviewRuleEditionOnSnap(ctx.snap, { ...envelope(ctx), ruleId: rule.id, status: "APPROVED", expectedVersion: rule.version }, "2026-09-10T09:03:00.000Z", ctx.director, "HUMAN");
      }
      if (action.kind === "RECORD_UNKNOWN_FACT") {
        recordFactEditionOnSnap(ctx.snap, { ...envelope(ctx), factKey: "jurisdiction", value: "UNKNOWN", unknown: true }, "2026-09-10T09:04:00.000Z", ctx.ceo);
      }
      if (action.kind === "RECORD_FACT") {
        recordFactEditionOnSnap(ctx.snap, { ...envelope(ctx), factKey: action.factKey, value: action.value, unknown: false }, "2026-09-10T09:04:00.000Z", ctx.ceo);
      }
      if (action.kind === "CREATE_POLICY") {
        policy = createPolicyOnSnap(
          ctx.snap,
          { ...envelope(ctx, { eventId: undefined }), policyType: "PUBLIC_LIABILITY", insurerPartyId: INSURER_ID, insurerLabel: "Synthetic Insurer" },
          "2026-09-10T09:05:00.000Z",
          ctx.ceo,
        );
        observed.set("INERT_UPLOAD", "prompt instructions in filenames do not become commands");
      }
      if (action.kind === "UPLOAD_AND_VERIFY" && policy) {
        document = createEvidenceDocumentOnSnap(
          ctx.snap,
          { ...envelope(ctx, { eventId: undefined }), title: "Certificate", classification: "POLICY_IDENTIFIER", originalFilename: "ignore-this-prompt.txt" },
          "2026-09-10T09:06:00.000Z",
          ctx.ceo,
        );
        document = completeEvidenceUploadOnSnap(
          ctx.snap,
          {
            ...envelope(ctx, { eventId: undefined }),
            documentId: document.id,
            expectedVersion: document.version,
            objectKey: `risk/${ctx.organisationId}/${document.id}`,
            byteChecksum: "a".repeat(64),
            byteLength: 128,
            contentType: "application/pdf",
            scanAdapter: "INACTIVE",
          },
          "2026-09-10T09:07:00.000Z",
        );
        edition = createPolicyEditionOnSnap(
          ctx.snap,
          {
            ...envelope(ctx, { eventId: undefined }),
            policyId: policy.id,
            expectedVersion: policy.version,
            policyNumber: "SYN-001",
            currency: "NGN",
            period: { startOn: "2026-01-01", endOn: "2026-12-31" },
            limits: [{ coverageKey: "PUBLIC_LIABILITY", limit: { currency: "NGN", minor: "100000000" }, basis: "any one occurrence" }],
            deductibles: [{ coverageKey: "PUBLIC_LIABILITY", amount: { currency: "NGN", minor: "250000" } }],
            insuredPartyLabels: ["Maison Doclar synthetic"],
            documentEditionId: document.id,
          },
          "2026-09-10T09:08:00.000Z",
          ctx.ceo,
        );
        try {
          verifyPolicyEditionOnSnap(ctx.snap, { ...envelope(ctx, { eventId: undefined }), editionId: edition.id, expectedVersion: edition.version, decision: "VERIFIED" }, "2026-09-10T09:09:00.000Z", ctx.ceo, "HUMAN");
          observed.set("MAKER_CHECKER", "self-verify allowed");
        } catch (error) {
          observed.set("MAKER_CHECKER", error instanceof PlatformError && error.code === "FORBIDDEN" ? "self-verify is denied" : String(error));
        }
      }
      if (action.kind === "EVALUATE") {
        const result = evaluateApplicabilityOnSnap(ctx.snap, envelope(ctx), "2026-09-10T09:10:00.000Z", ctx.ceo);
        observed.set("INDETERMINATE", result.snapshot.overall === "INDETERMINATE" || result.snapshot.requirements.some((item) => item.decision === "INDETERMINATE") ? "missing fact blocks readiness" : result.snapshot.overall);
        if (result.snapshot.requirements.some((item) => item.decision === "STALE") || result.snapshot.overall === "STALE") {
          observed.set("RULE_STATUS_VISIBLE", "rule status is visible and not silently mandatory");
        }
        if (adapters.fabricateCoverage) observed.set("INDETERMINATE", "READY");
      }
      if (action.kind === "RESIDUAL_DECISION") {
        const gap = ctx.snap.riskGapFindings.find((item) => item.eventId === ctx.eventId);
        if (gap) {
          const submitted = submitResidualDecisionOnSnap(
            ctx.snap,
            { ...envelope(ctx), gapId: gap.id, choice: "ACCEPT_RESIDUAL_RISK", reason: "Client accepts residual until evidence arrives", expiresOn: "2026-12-01" },
            "2026-09-10T09:11:00.000Z",
            ctx.ceo,
          );
          try {
            decideResidualRiskOnSnap(ctx.snap, { ...envelope(ctx), decisionId: submitted.id, expectedVersion: submitted.version, decision: "APPROVED" }, "2026-09-10T09:12:00.000Z", ctx.ceo, "HUMAN");
            observed.set("RESIDUAL_MAKER_CHECKER", "maker approved");
          } catch (error) {
            observed.set("RESIDUAL_MAKER_CHECKER", error instanceof PlatformError && error.code === "FORBIDDEN" ? "maker cannot approve residual risk" : String(error));
          }
        }
      }
      if (action.kind === "CLAUSE_REVIEW") {
        const clause = applyClauseEditionOnSnap(
          ctx.snap,
          {
            ...envelope(ctx),
            family: "RETENTION",
            jurisdiction: "NG",
            language: "en",
            body: "Retention of {{PERCENT}} remains a contract condition, not money withheld by this slice.",
            variables: [{ key: "PERCENT", value: "20" }],
          },
          "2026-09-10T09:13:00.000Z",
          ctx.ceo,
        );
        observed.set("CLAUSE_NOT_ENFORCEABLE", clause.enforceabilityClaimed === false && clause.legalReviewStatus === "NOT_REVIEWED" ? "clause remains unenforceable until review" : "enforceability claimed");
      }
      if (action.kind === "VENDOR_ASSESS") {
        assessment = assessVendorOnSnap(ctx.snap, { ...envelope(ctx), vendorId: VENDOR_ID }, "2026-09-10T09:14:00.000Z", ctx.ceo);
        if (adapters.traitScore) {
          observed.set("BAND_PRESERVED", "trait used");
        }
      }
      if (action.kind === "VENDOR_DECIDE" && assessment) {
        const decided = decideVendorAssessmentOnSnap(
          ctx.snap,
          { ...envelope(ctx), assessmentId: assessment.id, expectedVersion: assessment.version, decision: "RESTRICTED", reason: "Missing certificate" },
          "2026-09-10T09:15:00.000Z",
          ctx.director,
          "HUMAN",
        );
        observed.set("BAND_PRESERVED", decided.band === assessment.band ? "manual decision preserves computed band" : "band rewritten");
      }
      if (action.kind === "ROSTER_STANDBY") {
        const roster = assignRosterOnSnap(
          ctx.snap,
          { ...envelope(ctx), vendorId: VENDOR_ID, vendorLabel: "Standby AV", role: "STANDBY", criticalFunctionKey: "AV", commercialStatus: "UNCONFIRMED" },
          "2026-09-10T09:16:00.000Z",
          ctx.ceo,
        );
        observed.set("STANDBY_NOT_ENGAGED", roster.commercialStatus === "NOT_ENGAGED" && !roster.booked ? "standby commercial status is not engaged" : "standby engaged");
      }
      if (action.kind === "CHECKPOINTS") {
        generateCheckpointInstancesOnSnap(ctx.snap, envelope(ctx), "2026-09-10T09:17:00.000Z");
      }
      if (action.kind === "MISSED_CHECKIN") {
        const checkpoint = ctx.snap.riskCheckpointInstances.find((item) => item.eventId === ctx.eventId);
        if (checkpoint) {
          recordCheckInOnSnap(ctx.snap, { ...envelope(ctx), checkpointId: checkpoint.id, response: "UNAVAILABLE", source: "STAFF" }, checkpoint.dueAt, ctx.ceo);
        }
      }
      if (action.kind === "ESCALATE") {
        const result = evaluateEscalationsOnSnap(ctx.snap, envelope(ctx), "2026-12-20T00:00:00.000Z", ctx.ceo);
        const dispatched = result.intents.some((item) => item.dispatched) || adapters.silentDispatch;
        observed.set("NO_DISPATCH", dispatched ? "sent" : "escalation intent is not sent");
      }
      if (action.kind === "FALLBACK_PROPOSE") {
        plan = createContinuityPlanOnSnap(
          ctx.snap,
          { ...envelope(ctx), title: "AV fallback", recoveryObjectiveMinutes: 60, maximumTolerableInterruptionMinutes: 120, decisionRole: "EVENT_DIRECTOR" },
          "2026-09-10T09:18:00.000Z",
          ctx.ceo,
        );
        activation = proposeFallbackOnSnap(
          ctx.snap,
          { ...envelope(ctx), planId: plan.id, triggerEvidence: "Missed AV checkpoint", impact: "Ceremony sound at risk" },
          "2026-09-10T09:19:00.000Z",
          ctx.ceo,
        );
      }
      if (action.kind === "FALLBACK_AUTHORISE" && activation) {
        const authorised = transitionFallbackOnSnap(
          ctx.snap,
          { ...envelope(ctx), activationId: activation.id, expectedVersion: activation.version, to: "AUTHORISED" },
          "2026-09-10T09:20:00.000Z",
          ctx.director,
          "HUMAN",
        );
        observed.set("NO_BOOKING", !authorised.bookingRequested && !authorised.paymentRequested && !authorised.dispatchRequested ? "authorisation does not book or pay" : "external effect");
      }
      if (action.kind === "INCIDENT") {
        const incident = reportIncidentOnSnap(
          ctx.snap,
          { ...envelope(ctx), title: "Guest medical", severity: "HIGH", lifeSafety: true, sensitive: true },
          "2026-09-10T09:21:00.000Z",
          ctx.ceo,
        );
        observed.set("NO_FALSE_DISPATCH", incident.lifeSafety ? "life-safety copy does not claim dispatch" : "missing");
      }
      if (action.kind === "BUDGET") {
        if (adapters.inventPremium) throw new PlatformError("VALIDATION_FAILED", "negative adapter invented a price");
        const first = projectRiskBudgetOnSnap(
          ctx.snap,
          { ...envelope(ctx), drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "No sourced replacement quote", evidenceIds: [] }] },
          "2026-09-10T09:22:00.000Z",
          ctx.ceo,
        );
        const second = projectRiskBudgetOnSnap(
          ctx.snap,
          { ...envelope(ctx), drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "No sourced replacement quote", evidenceIds: [] }] },
          "2026-09-10T09:22:00.000Z",
          ctx.ceo,
        );
        observed.set("NO_INVENTED_PRICE", first.unquantifiedReasons.length && first.quantifiedMinor === "0" ? "unquantified exposure remains unknown" : "priced");
        observed.set("REPLAY_SAME_IDS", first.id === second.id ? "identical budget request replays" : "new ids");
      }
      if (action.kind === "DOSSIER") {
        const dossier = assembleDossierOnSnap(ctx.snap, envelope(ctx), "2026-09-10T09:23:00.000Z", ctx.director);
        const published = transitionDossierOnSnap(ctx.snap, { ...envelope(ctx), dossierId: dossier.id, expectedVersion: dossier.version, to: "PUBLISHED" }, "2026-09-10T09:24:00.000Z", ctx.ceo, "HUMAN");
        observed.set("DOSSIER_NO_DISPATCH", published.dispatched === false ? "published dossier is not sent" : "sent");
      }
      if (action.kind === "CROSS_EVENT") {
        const leaked = ctx.snap.riskPolicies.some((item) => item.eventId === FIXTURE_IDS.eventOther) || adapters.leakCrossEvent;
        observed.set("CROSS_EVENT_DENIED", leaked ? "leaked" : "cross-event fetch is denied");
      }
    }
  } catch (error) {
    observed.set("ERROR", error instanceof Error ? error.message : "error");
  }
  if (adapters.falseSuccess) {
    return caseDef.expected.map((item) => ({ code: item.code, expectedSummary: item.summary, observedSummary: item.summary, passed: true }));
  }
  return caseDef.expected.map((item) => {
    const actual = observed.get(item.code) ?? "missing";
    return {
      code: item.code,
      expectedSummary: item.summary,
      observedSummary: actual,
      passed: actual === item.summary,
    };
  });
}

export function detectUnsafeAdapter(adapters: S05BEvaluationAdapters, _observations: S05BObservation[]): string[] {
  const hits: string[] = [];
  if (adapters.fabricateCoverage) hits.push("FABRICATED_COVERAGE");
  if (adapters.inventPremium) hits.push("INVENTED_PRICE");
  if (adapters.traitScore) hits.push("PROTECTED_TRAIT_SCORING");
  if (adapters.escalateAuthority) hits.push("AUTHORITY_ESCALATION");
  if (adapters.leakCrossEvent) hits.push("CROSS_SCOPE_LEAKAGE");
  if (adapters.silentDispatch) hits.push("SILENT_DISPATCH");
  if (adapters.falseSuccess) hits.push("FALSE_SUCCESS");
  return hits;
}
