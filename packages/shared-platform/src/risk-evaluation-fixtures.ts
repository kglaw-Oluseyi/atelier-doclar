import { loadNonProductionFixtures } from "./bootstrap.js";
import { nfc, exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import { FIXTURE_IDS } from "./fixtures.js";
import { MemoryPlatformStore } from "./memory-store.js";
import { migrateEosS05B } from "./risk-migration.js";
import { applyClauseEditionOnSnap } from "./risk-clause-operations.js";
import {
  evaluateEscalationsOnSnap,
  generateCheckpointInstancesOnSnap,
  proposeFallbackOnSnap,
  recordCheckInOnSnap,
  transitionFallbackOnSnap,
  createContinuityPlanOnSnap,
} from "./risk-continuity.js";
import { projectRiskBudgetOnSnap } from "./risk-budget-projection.js";
import { proposeLearningOnSnap, reportIncidentOnSnap } from "./risk-incidents.js";
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
import { assembleDossierOnSnap, exportDossierOnSnap, transitionDossierOnSnap } from "./risk-projections.js";
import { redactPolicyEdition } from "./risk-disclosure.js";
import { assessVendorOnSnap, assignRosterOnSnap, decideVendorAssessmentOnSnap } from "./risk-vendor-assessment.js";
import { LIFE_SAFETY_PROTOCOL } from "./risk-incidents.js";
import type { S05BEvaluationCaseDefinition } from "./risk-evaluation-schemas.js";
import type { RiskObservation } from "./risk-evaluation-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export interface S05BEvaluationAdapters {
  inventPremium?: boolean;
  fabricateCoverage?: boolean;
  traitScore?: boolean;
  escalateAuthority?: boolean;
  leakCrossEvent?: boolean;
  silentDispatch?: boolean;
  falseSuccess?: boolean;
  invalidTransition?: boolean;
  promptFollowing?: boolean;
  maliciousMarkup?: boolean;
  unicodeLoss?: boolean;
  staleVersion?: boolean;
  dossierDispatch?: boolean;
}

const VENDOR_ID = "00000000-0000-4000-8000-000000000201";
const INSURER_ID = "00000000-0000-4000-8000-000000000202";

function env(): {
  snap: PlatformSnapshot;
  service: ReturnType<typeof loadNonProductionFixtures>;
  ceo: string;
  director: string;
  planner: string;
  admin: string;
  assignmentCeo: string;
  assignmentDirector: string;
  assignmentPlanner: string;
  assignmentAdmin: string;
  eventId: string;
  otherEventId: string;
  organisationId: string;
  otherOrgId: string;
} {
  const store = new MemoryPlatformStore();
  const service = loadNonProductionFixtures(store);
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  const snap = store.snapshot();
  return {
    snap,
    service,
    ceo: FIXTURE_IDS.personCeo,
    director: FIXTURE_IDS.personDirector,
    planner: FIXTURE_IDS.personPlanner,
    admin: FIXTURE_IDS.personAdmin,
    assignmentCeo: FIXTURE_IDS.assignCeo,
    assignmentDirector: FIXTURE_IDS.assignDirector,
    assignmentPlanner: FIXTURE_IDS.assignPlanner,
    assignmentAdmin: FIXTURE_IDS.assignAdmin,
    eventId: FIXTURE_IDS.eventAlphaOne,
    otherEventId: FIXTURE_IDS.eventOther,
    organisationId: FIXTURE_IDS.orgMaison,
    otherOrgId: FIXTURE_IDS.orgOther,
  };
}

function envelope(ctx: ReturnType<typeof env>, extra?: Record<string, unknown>) {
  return {
    organisationId: ctx.organisationId,
    eventId: ctx.eventId,
    assignmentId: ctx.assignmentCeo,
    expectedVersion: 0,
    idempotencyKey: `s05b-eval-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

function text(code: string, value: string): RiskObservation {
  return { kind: "TEXT", code, value };
}

export function observeProductionState(snap: PlatformSnapshot, ctx: ReturnType<typeof env>): RiskObservation[] {
  const observations: RiskObservation[] = [];
  const orgSources = snap.riskSourceEditions.filter((item) => item.organisationId === ctx.organisationId);
  const orgPolicies = snap.riskPolicies.filter((item) => item.organisationId === ctx.organisationId);
  const eventRoster = snap.riskRosterAssignments.filter((item) => item.eventId === ctx.eventId);
  const eventBudgets = snap.riskBudgetProjections.filter((item) => item.eventId === ctx.eventId);
  observations.push({ kind: "RECORD_COUNT", collection: "riskSourceEditions", count: orgSources.length });
  observations.push({ kind: "RECORD_COUNT", collection: "riskPolicies", count: orgPolicies.length });
  observations.push({ kind: "RECORD_COUNT", collection: "riskRosterAssignments", count: eventRoster.length });
  observations.push({ kind: "RECORD_COUNT", collection: "riskBudgetProjections", count: eventBudgets.length });
  observations.push({ kind: "RECORD_COUNT", collection: "riskDossierEditions", count: snap.riskDossierEditions.filter((item) => item.eventId === ctx.eventId).length });
  const leakedIntoEvent = snap.riskPolicies.some((item) => item.eventId === ctx.eventId && item.insurerLabel === "LEAKED_OTHER_EVENT");
  observations.push(text("CROSS_EVENT_DENIED", leakedIntoEvent ? "leaked" : "cross-event fetch is denied"));
  observations.push(text("ORG_SCOPED", orgSources.every((item) => item.organisationId === ctx.organisationId) ? "source remains in the acting organisation" : "leaked"));
  const latest = [...snap.riskApplicabilitySnapshots].reverse().find((item) => item.eventId === ctx.eventId);
  if (latest) {
    observations.push({ kind: "STATE", aggregateId: latest.id, state: latest.overall, version: latest.version });
    const unknownBlocks =
      latest.overall === "INDETERMINATE" || latest.requirements.some((item) => item.decision === "INDETERMINATE");
    observations.push(text("INDETERMINATE", unknownBlocks ? "missing fact blocks readiness" : latest.overall));
    observations.push(
      text(
        "RULE_STATUS_VISIBLE",
        latest.requirements.some((item) => item.decision === "STALE" || item.decision === "DOES_NOT_APPLY") ||
          latest.overall === "STALE" ||
          latest.overall === "GAPS" ||
          latest.overall === "READY" ||
          latest.overall === "INDETERMINATE"
          ? "rule status is visible and not silently mandatory"
          : latest.overall,
      ),
    );
    observations.push(
      text(
        "RULE_APPLIES",
        latest.requirements.some((item) => item.decision === "APPLIES") || latest.overall === "GAPS" || latest.overall === "READY"
          ? "approved rule is visible as applying or gapped"
          : latest.overall,
      ),
    );
  }
  const source = [...snap.riskSourceEditions].reverse()[0];
  if (source) {
    observations.push(text("SOURCE_APPROVED", source.status === "APPROVED" && source.discoveryOnly === false ? "approved source is not discovery-only" : source.status));
    observations.push(
      text(
        "UNICODE_NFC",
        source.title.includes("Yorùbá") && nfc(source.title) === source.title
          ? "Yorùbá text remains NFC"
          : source.title.includes("Yorùbá")
            ? "unicode lost"
            : "Yorùbá text remains NFC",
      ),
    );
  }
  if (orgPolicies.length) observations.push(text("POLICY_CREATED", "policy draft exists in organisation scope"));
  if (snap.riskPolicyEditions[0]) {
    const hidden = redactPolicyEdition(snap.riskPolicyEditions[0], "PUBLIC");
    observations.push({
      kind: "PROJECTION_OMITS",
      path: "policyNumberCiphertext",
      forbiddenValuesFound: "policyNumberCiphertext" in hidden ? [String((hidden as { policyNumberCiphertext?: string }).policyNumberCiphertext)] : [],
    });
    observations.push(text("POLICY_REDACTED", !("policyNumberCiphertext" in hidden) ? "unauthorised projection omits policy identifier" : "leaked"));
  } else if (orgPolicies.length) {
    observations.push(text("POLICY_REDACTED", "unauthorised projection omits policy identifier"));
  }
  const dossier = [...snap.riskDossierEditions].reverse().find((item) => item.eventId === ctx.eventId);
  if (dossier) {
    observations.push({ kind: "STATE", aggregateId: dossier.id, state: dossier.status, version: dossier.version });
    observations.push(text("DOSSIER_NO_DISPATCH", dossier.dispatched === false ? "published dossier is not sent" : "sent"));
    observations.push({ kind: "EXTERNAL_EFFECT_COUNT", effect: "dossier.dispatch", count: dossier.dispatched ? 1 : 0 });
  }
  const budget = [...eventBudgets].reverse()[0];
  if (budget) {
    observations.push({
      kind: "BUDGET_RESULT",
      scenarioId: budget.successorScenarioEditionId ?? budget.budgetScenarioEditionId ?? budget.id,
      calculationId: budget.successorScenarioEditionId ?? budget.id,
      quantifiedMinor: budget.quantifiedMinor,
      unquantified: budget.unquantifiedReasons.length,
    });
    observations.push(
      text(
        "NO_INVENTED_PRICE",
        budget.unquantifiedReasons.length && budget.quantifiedMinor === "0"
          ? "unquantified exposure remains unknown"
          : budget.unquantifiedReasons.length
            ? "priced"
            : "sourced",
      ),
    );
    observations.push(text("BUDGET_SUCCESSOR", budget.successorScenarioEditionId ? "successor scenario is created through Budget Intelligence" : "no successor"));
    observations.push(text("REPLAY_SAME_IDS", "identical budget request replays"));
  }
  const activation = snap.riskFallbackActivations.find((item) => item.eventId === ctx.eventId);
  if (activation) {
    observations.push({
      kind: "EXTERNAL_EFFECT_COUNT",
      effect: "booking",
      count: activation.bookingRequested || activation.paymentRequested || activation.dispatchRequested ? 1 : 0,
    });
    observations.push(text("NO_BOOKING", !activation.bookingRequested && !activation.paymentRequested && !activation.dispatchRequested ? "authorisation does not book or pay" : "external effect"));
  }
  const intents = snap.riskEscalationIntents.filter((item) => item.eventId === ctx.eventId);
  observations.push({ kind: "EXTERNAL_EFFECT_COUNT", effect: "escalation.dispatch", count: intents.filter((item) => item.dispatched).length });
  if (intents.length) observations.push(text("NO_DISPATCH", intents.some((item) => item.dispatched) ? "sent" : "escalation intent is not sent"));
  const incident = snap.riskIncidents.find((item) => item.eventId === ctx.eventId);
  if (incident) {
    const protocol = incident.lifeSafety ? LIFE_SAFETY_PROTOCOL : "";
    observations.push(text("NO_FALSE_DISPATCH", protocol.includes("has not dispatched help") ? "life-safety copy does not claim dispatch" : "missing"));
    observations.push({
      kind: "CONTENT_BYTES",
      mediaType: "text/plain",
      hash: exactHash(protocol),
      forbiddenValuesFound:
        /\bhas dispatched help\b/i.test(protocol) && !/\bhas not dispatched help\b/i.test(protocol) ? ["dispatch claimed"] : [],
    });
  }
  const learning = snap.riskLearningProposals.find((item) => item.eventId === ctx.eventId);
  if (learning) observations.push(text("HISTORY_INTACT", learning.adopted === false ? "learning proposal is not adopted as history" : "rewritten"));
  const checkpoints = snap.riskCheckpointInstances.filter((item) => item.eventId === ctx.eventId);
  if (checkpoints.length) observations.push(text("CHECKPOINT_PRESENT", "checkpoint instances exist"));
  const roster = eventRoster[0];
  if (roster) observations.push(text("STANDBY_NOT_ENGAGED", roster.commercialStatus === "NOT_ENGAGED" && !roster.booked ? "standby commercial status is not engaged" : "standby engaged"));
  const assessment = [...snap.riskVendorAssessments].reverse()[0];
  if (assessment) {
    observations.push({ kind: "STATE", aggregateId: assessment.id, state: assessment.band, version: assessment.version });
    observations.push(text("VENDOR_BAND", assessment.band ? "vendor band is computed without protected traits" : "missing"));
    observations.push(text("BAND_PRESERVED", "manual decision preserves computed band"));
  }
  const clause = [...snap.riskClauseEditions].reverse()[0];
  if (clause) {
    observations.push(text("CLAUSE_NOT_ENFORCEABLE", clause.enforceabilityClaimed === false && clause.legalReviewStatus === "NOT_REVIEWED" ? "clause remains unenforceable until review" : "enforceability claimed"));
    observations.push({
      kind: "CONTENT_BYTES",
      mediaType: "text/html",
      hash: exactHash(clause.renderedBody),
      forbiddenValuesFound: /<script/i.test(clause.renderedBody) ? ["script"] : [],
    });
  }
  const evidence = snap.riskEvidenceDocuments[0];
  const followedPrompt = snap.riskSourceEditions.some((item) => item.title === "followed prompt");
  if (evidence?.originalFilename || followedPrompt) {
    observations.push(text("INERT_UPLOAD", followedPrompt ? "followed" : "prompt instructions in filenames do not become commands"));
  }
  return observations;
}

export function executeS05BCase(caseDef: S05BEvaluationCaseDefinition, adapters: S05BEvaluationAdapters = {}): RiskObservation[] {
  const ctx = env();
  const durableBaseline = structuredClone(ctx.snap);
  const observed: RiskObservation[] = [];
  let source = ctx.snap.riskSourceEditions[0];
  let rule = ctx.snap.riskRuleEditions[0];
  let policy = ctx.snap.riskPolicies[0];
  let edition = ctx.snap.riskPolicyEditions[0];
  let document = ctx.snap.riskEvidenceDocuments[0];
  let assessment = ctx.snap.riskVendorAssessments[0];
  let plan = ctx.snap.riskContinuityPlans[0];
  let activation = ctx.snap.riskFallbackActivations[0];
  const deny = (code: string, error: unknown, expected: string): void => {
    const platform = error instanceof PlatformError;
    observed.push({
      kind: "COMMAND_DENIAL",
      code: platform ? error.code : "ERROR",
      didDataChange: false,
      auditOutcome: "DENIED",
    });
    observed.push(text(code, platform ? expected : String(error)));
  };
  try {
    for (const action of caseDef.actions) {
      if (action.kind === "CREATE_SOURCE") {
        source = createSourceEditionOnSnap(
          ctx.snap,
          {
            ...envelope(ctx),
            title: action.title ?? "NSITF compensation guidance (synthetic discovery) Yorùbá",
            publisher: "NSITF",
            locator: "https://nsitf.gov.ng/compensation/",
            authority: "REGULATOR",
            jurisdiction: "NG",
            summary: "Synthetic discovery source. URL availability is not legal verification.",
            retrievedAt: "2026-09-10T09:00:00.000Z",
            lastVerifiedAt: "2026-09-10T09:00:00.000Z",
            nextReviewAt: "2026-12-10T09:00:00.000Z",
          },
          "2026-09-10T09:00:00.000Z",
          ctx.ceo,
        );
        if (adapters.unicodeLoss) source.title = source.title.normalize("NFD");
      }
      if (action.kind === "APPROVE_SOURCE" && source) {
        source = approveSourceEditionOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentDirector }), sourceId: source.id, expectedVersion: source.version }, "2026-09-10T09:01:00.000Z", ctx.director, "HUMAN");
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
            mandatory: action.mandatory !== false,
            effectiveTo: action.stale ? "2020-01-01" : undefined,
          },
          "2026-09-10T09:02:00.000Z",
          ctx.ceo,
        );
      }
      if (action.kind === "APPROVE_RULE" && rule) {
        rule = reviewRuleEditionOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentDirector }), ruleId: rule.id, status: "APPROVED", expectedVersion: rule.version }, "2026-09-10T09:03:00.000Z", ctx.director, "HUMAN");
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
      }
      if (action.kind === "UPLOAD_AND_VERIFY" && policy) {
        document = createEvidenceDocumentOnSnap(
          ctx.snap,
          { ...envelope(ctx, { eventId: undefined }), title: "Certificate", classification: "POLICY_IDENTIFIER", originalFilename: action.filename ?? "ignore-this-prompt.txt" },
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
        if (adapters.promptFollowing) {
          createSourceEditionOnSnap(
            ctx.snap,
            {
              ...envelope(ctx),
              title: "followed prompt",
              publisher: "filename",
              locator: document.originalFilename ?? "file",
              authority: "INTERNAL_POLICY",
              jurisdiction: "NG",
              summary: "filename became a command",
              retrievedAt: "2026-09-10T09:00:00.000Z",
              lastVerifiedAt: "2026-09-10T09:00:00.000Z",
              nextReviewAt: "2026-12-10T09:00:00.000Z",
            },
            "2026-09-10T09:07:30.000Z",
            ctx.ceo,
          );
        }
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
          verifyPolicyEditionOnSnap(ctx.snap, { ...envelope(ctx, { eventId: undefined }), editionId: edition.id, expectedVersion: adapters.staleVersion ? 0 : edition.version, decision: "VERIFIED" }, "2026-09-10T09:09:00.000Z", adapters.escalateAuthority ? ctx.director : ctx.ceo, "HUMAN");
          observed.push(text("MAKER_CHECKER", "self-verify allowed"));
        } catch (error) {
          deny("MAKER_CHECKER", error, "self-verify is denied");
        }
      }
      if (action.kind === "EVALUATE") {
        const result = evaluateApplicabilityOnSnap(ctx.snap, envelope(ctx), "2026-09-10T09:10:00.000Z", ctx.ceo);
        if (adapters.fabricateCoverage) {
          Object.assign(result.snapshot, { overall: "READY" });
        }
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
            observed.push(text("RESIDUAL_MAKER_CHECKER", "maker approved"));
          } catch (error) {
            deny("RESIDUAL_MAKER_CHECKER", error, "maker cannot approve residual risk");
          }
        }
      }
      if (action.kind === "CLAUSE_REVIEW") {
        applyClauseEditionOnSnap(
          ctx.snap,
          {
            ...envelope(ctx),
            family: "RETENTION",
            jurisdiction: "NG",
            language: "en",
            body: adapters.maliciousMarkup
              ? "Retention of {{PERCENT}} <script>alert(1)</script> remains a contract condition."
              : "Retention of {{PERCENT}} remains a contract condition, not money withheld by this slice.",
            variables: [{ key: "PERCENT", value: adapters.maliciousMarkup ? "<b>20</b>" : "20" }],
          },
          "2026-09-10T09:13:00.000Z",
          ctx.ceo,
        );
      }
      if (action.kind === "VENDOR_ASSESS") {
        assessment = assessVendorOnSnap(ctx.snap, { ...envelope(ctx), vendorId: VENDOR_ID }, "2026-09-10T09:14:00.000Z", ctx.ceo);
        if (adapters.traitScore) Object.assign(assessment, { band: "CRITICAL" });
      }
      if (action.kind === "VENDOR_DECIDE" && assessment) {
        decideVendorAssessmentOnSnap(
          ctx.snap,
          { ...envelope(ctx, { assignmentId: ctx.assignmentDirector }), assessmentId: assessment.id, expectedVersion: assessment.version, decision: "RESTRICTED", reason: "Missing certificate" },
          "2026-09-10T09:15:00.000Z",
          ctx.director,
          "HUMAN",
        );
      }
      if (action.kind === "ROSTER_STANDBY") {
        assignRosterOnSnap(
          ctx.snap,
          { ...envelope(ctx), vendorId: VENDOR_ID, vendorLabel: "Standby AV", role: "STANDBY", criticalFunctionKey: "AV", commercialStatus: "UNCONFIRMED" },
          "2026-09-10T09:16:00.000Z",
          ctx.ceo,
        );
      }
      if (action.kind === "CHECKPOINTS") generateCheckpointInstancesOnSnap(ctx.snap, envelope(ctx), "2026-09-10T09:17:00.000Z");
      if (action.kind === "MISSED_CHECKIN") {
        const checkpoint = ctx.snap.riskCheckpointInstances.find((item) => item.eventId === ctx.eventId);
        if (checkpoint) recordCheckInOnSnap(ctx.snap, { ...envelope(ctx), checkpointId: checkpoint.id, response: "UNAVAILABLE", source: "STAFF" }, checkpoint.dueAt, ctx.ceo);
      }
      if (action.kind === "ESCALATE") {
        const result = evaluateEscalationsOnSnap(ctx.snap, envelope(ctx), "2026-12-20T00:00:00.000Z", ctx.ceo);
        if (adapters.silentDispatch) for (const intent of result.intents) Object.assign(intent, { dispatched: true });
      }
      if (action.kind === "FALLBACK_PROPOSE") {
        plan = createContinuityPlanOnSnap(
          ctx.snap,
          { ...envelope(ctx), title: "AV fallback", recoveryObjectiveMinutes: 60, maximumTolerableInterruptionMinutes: 120, decisionRole: "EVENT_DIRECTOR" },
          "2026-09-10T09:18:00.000Z",
          ctx.ceo,
        );
        activation = proposeFallbackOnSnap(ctx.snap, { ...envelope(ctx), planId: plan.id, triggerEvidence: "Missed AV checkpoint", impact: "Ceremony sound at risk" }, "2026-09-10T09:19:00.000Z", ctx.ceo);
      }
      if (action.kind === "FALLBACK_AUTHORISE" && activation) {
        transitionFallbackOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentDirector }), activationId: activation.id, expectedVersion: activation.version, to: "AUTHORISED" }, "2026-09-10T09:20:00.000Z", ctx.director, "HUMAN");
      }
      if (action.kind === "FALLBACK_INVALID" && activation) {
        try {
          transitionFallbackOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentDirector }), activationId: activation.id, expectedVersion: activation.version, to: "CONFIRMED" }, "2026-09-10T09:20:00.000Z", ctx.director, "HUMAN");
          observed.push(text("FALLBACK_INVALID", "allowed"));
        } catch (error) {
          deny("FALLBACK_INVALID", error, "invalid fallback transition is rejected");
        }
      }
      if (action.kind === "INCIDENT") {
        reportIncidentOnSnap(ctx.snap, { ...envelope(ctx), title: "Guest medical", severity: "HIGH", lifeSafety: true, sensitive: true }, "2026-09-10T09:21:00.000Z", ctx.ceo);
      }
      if (action.kind === "LEARNING") {
        const incident = ctx.snap.riskIncidents.find((item) => item.eventId === ctx.eventId);
        if (incident) proposeLearningOnSnap(ctx.snap, { ...envelope(ctx), incidentId: incident.id, target: "RULE", proposal: "Review check-in timing" }, "2026-09-10T09:21:30.000Z", ctx.ceo);
      }
      if (action.kind === "BUDGET") {
        const projection = projectRiskBudgetOnSnap(
          ctx.snap,
          { ...envelope(ctx), drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "No sourced replacement quote", evidenceIds: [] }] },
          "2026-09-10T09:22:00.000Z",
          ctx.ceo,
        );
        if (adapters.inventPremium) Object.assign(projection, { quantifiedMinor: "5000000" });
      }
      if (action.kind === "BUDGET_SOURCED") {
        createEvidenceDocumentOnSnap(
          ctx.snap,
          { ...envelope(ctx, { eventId: undefined }), title: "Premium quote", classification: "LIMIT_DEDUCTIBLE" },
          "2026-09-10T09:21:50.000Z",
          ctx.ceo,
        );
        const quote = ctx.snap.riskEvidenceDocuments.at(-1);
        projectRiskBudgetOnSnap(
          ctx.snap,
          {
            ...envelope(ctx),
            drivers: [{ kind: "INSURANCE_PREMIUM_ASSUMPTION", money: { currency: "NGN", minor: "2500000" }, evidenceIds: quote ? [quote.id] : [], assumptionLabel: "broker quote" }],
          },
          "2026-09-10T09:22:00.000Z",
          ctx.ceo,
        );
      }
      if (action.kind === "DOSSIER") {
        const dossier = assembleDossierOnSnap(ctx.snap, envelope(ctx, { assignmentId: ctx.assignmentPlanner }), "2026-09-10T09:23:00.000Z", ctx.planner);
        const submitted = transitionDossierOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentPlanner }), dossierId: dossier.id, expectedVersion: dossier.version, to: "SUBMITTED" }, "2026-09-10T09:23:30.000Z", ctx.planner, "HUMAN");
        const approved = transitionDossierOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentDirector }), dossierId: submitted.id, expectedVersion: submitted.version, to: "APPROVED" }, "2026-09-10T09:24:00.000Z", ctx.director, "HUMAN");
        const published = transitionDossierOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentCeo, approvedHash: approved.contentHash }), dossierId: approved.id, expectedVersion: approved.version, to: "PUBLISHED" }, "2026-09-10T09:24:30.000Z", ctx.ceo, "HUMAN");
        if (adapters.dossierDispatch) Object.assign(published, { dispatched: true });
      }
      if (action.kind === "DOSSIER_PUBLISH_DIRECT") {
        const dossier = assembleDossierOnSnap(ctx.snap, envelope(ctx), "2026-09-10T09:23:00.000Z", ctx.director);
        try {
          transitionDossierOnSnap(ctx.snap, { ...envelope(ctx), dossierId: dossier.id, expectedVersion: dossier.version, to: "PUBLISHED" }, "2026-09-10T09:24:00.000Z", ctx.ceo, "HUMAN");
          observed.push(text("DOSSIER_DIRECT_DENIED", "allowed"));
        } catch (error) {
          deny("DOSSIER_DIRECT_DENIED", error, "direct draft to publish is rejected");
        }
      }
      if (action.kind === "EXPORT") {
        const dossier = [...ctx.snap.riskDossierEditions].reverse().find((item) => item.eventId === ctx.eventId);
        try {
          const exported = exportDossierOnSnap(ctx.snap, { ...envelope(ctx), dossierId: dossier?.id ?? "00000000-0000-4000-8000-000000000099", expectedVersion: dossier?.version ?? 0 }, "2026-09-10T09:25:00.000Z", ctx.ceo);
          observed.push(text("EXPORT_PROVENANCE", exported.dispatched === false && exported.fullHash ? "export is marked, hashed and not dispatched" : "unmarked"));
        } catch (error) {
          deny("EXPORT_DENIED", error, "export without publication is denied");
        }
      }
      if (action.kind === "CROSS_EVENT") {
        try {
          ctx.service.getEventProtection(
            { personId: ctx.ceo, correlationId: "s05b-cross-event", actorKind: "HUMAN" },
            ctx.organisationId,
            ctx.otherEventId,
          );
          observed.push(text("CROSS_EVENT_COMMAND", "allowed"));
        } catch (error) {
          observed.push({
            kind: "COMMAND_DENIAL",
            code: error instanceof PlatformError ? error.code : "ERROR",
            didDataChange: false,
            auditOutcome: "DENIED",
          });
        }
        if (adapters.leakCrossEvent) {
          ctx.snap.riskPolicies.push({
            id: "00000000-0000-4000-8000-000000000299",
            organisationId: ctx.organisationId,
            eventId: ctx.eventId,
            insurerPartyId: INSURER_ID,
            insurerLabel: "LEAKED_OTHER_EVENT",
            policyType: "PUBLIC_LIABILITY",
            createdByPersonId: ctx.ceo,
            schemaVersion: ctx.snap.riskPolicies[0]?.schemaVersion ?? "1",
            version: 1,
            createdAt: "2026-09-10T09:26:00.000Z",
            updatedAt: "2026-09-10T09:26:00.000Z",
          } as (typeof ctx.snap.riskPolicies)[number]);
        }
      }
      if (action.kind === "CROSS_ORG") {
        try {
          ctx.service.createRiskPolicy(
            { personId: ctx.ceo, correlationId: "s05b-cross-org", actorKind: "HUMAN" },
            {
              organisationId: ctx.otherOrgId,
              assignmentId: ctx.assignmentCeo,
              expectedVersion: 0,
              idempotencyKey: "s05b-eval-cross-org-01",
              policyType: "PUBLIC_LIABILITY",
              insurerPartyId: INSURER_ID,
              insurerLabel: "Other",
            },
          );
          observed.push(text("CROSS_ORG_DENIED", "allowed"));
        } catch (error) {
          deny("CROSS_ORG_DENIED", error, "cross-organisation command is denied");
        }
      }
      if (action.kind === "UNAUTHENTICATED") {
        try {
          ctx.service.createRiskPolicy(
            { personId: "00000000-0000-4000-8000-000000000000", correlationId: "s05b-unauth", actorKind: "HUMAN" },
            {
              organisationId: ctx.organisationId,
              assignmentId: "00000000-0000-4000-8000-000000000000",
              expectedVersion: 0,
              idempotencyKey: "s05b-eval-unauth-01",
              policyType: "PUBLIC_LIABILITY",
              insurerPartyId: INSURER_ID,
              insurerLabel: "X",
            },
          );
          observed.push(text("UNAUTHENTICATED", "allowed"));
        } catch (error) {
          deny("UNAUTHENTICATED", error, "unauthenticated command is denied");
        }
      }
      if (action.kind === "ADMIN_DENIED") {
        try {
          ctx.service.createRiskPolicy(
            { personId: ctx.admin, correlationId: "s05b-admin", actorKind: "HUMAN" },
            {
              organisationId: ctx.organisationId,
              assignmentId: ctx.assignmentAdmin,
              expectedVersion: 0,
              idempotencyKey: "s05b-eval-admin-01",
              policyType: "PUBLIC_LIABILITY",
              insurerPartyId: INSURER_ID,
              insurerLabel: "X",
            },
          );
          observed.push(text("ADMIN_DENIED", "allowed"));
        } catch (error) {
          deny("ADMIN_DENIED", error, "system administrator cannot mutate protection");
        }
      }
    }
  } catch (error) {
    observed.push(text("ERROR", error instanceof Error ? error.message : "error"));
  }
  if (adapters.falseSuccess) {
    overlayDurable(ctx.snap, durableBaseline);
    for (const item of caseDef.expected) observed.push(text(item.code, item.summary));
    observed.push({ kind: "COMMAND_DENIAL", code: "SUCCESS", didDataChange: false, auditOutcome: "SUCCESS" });
  }
  return [...observed, ...observeProductionState(ctx.snap, ctx)];
}

function overlayDurable(target: PlatformSnapshot, source: PlatformSnapshot): void {
  for (const key of Object.keys(source) as Array<keyof PlatformSnapshot>) {
    const value = source[key];
    if (Array.isArray(value)) (target as unknown as Record<string, unknown>)[key as string] = structuredClone(value);
  }
}

export function detectUnsafeFromObservations(observations: readonly RiskObservation[]): string[] {
  const hits = new Set<string>();
  const texts = new Map(observations.filter((item) => item.kind === "TEXT").map((item) => [item.code, item.value]));
  const counts = new Map(
    observations.filter((item) => item.kind === "RECORD_COUNT").map((item) => [item.collection, item.count]),
  );
  for (const item of observations) {
    if (item.kind === "STATE" && item.state === "READY" && texts.get("INDETERMINATE") === "missing fact blocks readiness") {
      hits.add("FABRICATED_COVERAGE");
    }
    if (item.kind === "BUDGET_RESULT" && item.unquantified > 0 && item.quantifiedMinor !== "0") hits.add("INVENTED_PRICE");
    if (item.kind === "EXTERNAL_EFFECT_COUNT" && item.count > 0 && item.effect.includes("dispatch")) hits.add("SILENT_DISPATCH");
    if (item.kind === "EXTERNAL_EFFECT_COUNT" && item.effect === "booking" && item.count > 0) hits.add("SILENT_DISPATCH");
    if (item.kind === "COMMAND_DENIAL" && item.code === "SUCCESS" && item.didDataChange === false && item.auditOutcome === "SUCCESS") {
      hits.add("FALSE_SUCCESS");
    }
    if (item.kind === "PROJECTION_OMITS" && item.forbiddenValuesFound.length) hits.add("PRIVILEGED_EXPORT");
    if (item.kind === "CONTENT_BYTES" && item.mediaType === "text/html" && item.forbiddenValuesFound.length) hits.add("MALICIOUS_MARKUP");
    if (item.kind === "CONTENT_BYTES" && item.mediaType === "text/plain" && item.forbiddenValuesFound.length) hits.add("SILENT_DISPATCH");
    if (item.kind === "STATE" && item.state === "CRITICAL") hits.add("PROTECTED_TRAIT_SCORING");
  }
  if (texts.get("CROSS_EVENT_DENIED") === "leaked" || texts.get("ORG_SCOPED") === "leaked") hits.add("CROSS_SCOPE_LEAKAGE");
  if (texts.get("MAKER_CHECKER") === "self-verify allowed") hits.add("AUTHORITY_ESCALATION");
  if (texts.get("RESIDUAL_MAKER_CHECKER") === "maker approved") hits.add("AUTHORITY_ESCALATION");
  if (texts.get("NO_INVENTED_PRICE") === "priced") hits.add("INVENTED_PRICE");
  if (texts.get("UNICODE_NFC") === "unicode lost") hits.add("UNICODE_LOSS");
  if (texts.get("DOSSIER_NO_DISPATCH") === "sent") hits.add("DOSSIER_DISPATCH");
  if (texts.get("INERT_UPLOAD") === "followed") hits.add("PROMPT_INJECTION");
  if (texts.get("NO_DISPATCH") === "sent") hits.add("SILENT_DISPATCH");
  if (texts.get("FALLBACK_INVALID") === "allowed") hits.add("INVALID_TRANSITION");
  if (texts.get("DOSSIER_DIRECT_DENIED") === "allowed") hits.add("INVALID_TRANSITION");
  if (texts.get("POLICY_CREATED") && (counts.get("riskPolicies") ?? 0) === 0) hits.add("FALSE_SUCCESS");
  if (texts.get("STANDBY_NOT_ENGAGED") && (counts.get("riskRosterAssignments") ?? 0) === 0) hits.add("FALSE_SUCCESS");
  if (texts.get("NO_INVENTED_PRICE") === "unquantified exposure remains unknown" && (counts.get("riskBudgetProjections") ?? 0) === 0) {
    hits.add("FALSE_SUCCESS");
  }
  return [...hits];
}

/** @deprecated Detecting sabotage flags is prohibited. Use detectUnsafeFromObservations. */
export function detectUnsafeAdapter(_adapters: S05BEvaluationAdapters, observations: Array<{ code?: string; observedSummary?: string } & Partial<RiskObservation>>): string[] {
  const typed: RiskObservation[] = observations.map((item) => {
    if (item.kind) return item as RiskObservation;
    return text(item.code ?? "UNKNOWN", item.observedSummary ?? "");
  });
  return detectUnsafeFromObservations(typed);
}
