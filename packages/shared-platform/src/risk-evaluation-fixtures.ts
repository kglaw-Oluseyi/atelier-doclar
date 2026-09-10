import { loadNonProductionFixtures } from "./bootstrap.js";
import { nfc, exactHash } from "./eec-hash.js";
import { calculateBudgetScenarioOnSnap, decideBudgetScenarioOnSnap } from "./eec-intelligence.js";
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
import { addIncidentNoteOnSnap, proposeLearningOnSnap, reportIncidentOnSnap } from "./risk-incidents.js";
import { LIFE_SAFETY_PROTOCOL } from "./risk-incidents.js";
import {
  approveSourceEditionOnSnap,
  createEvidenceDocumentOnSnap,
  createPolicyEditionOnSnap,
  createPolicyOnSnap,
  createRuleEditionOnSnap,
  createSourceEditionOnSnap,
  derivedCertificateStatus,
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
import type { S05BEvaluationCaseDefinition } from "./risk-evaluation-schemas.js";
import type { RiskObservation } from "./risk-evaluation-schemas.js";
import type { PlatformSnapshot } from "./store.js";
import type { MemoryPlatformStore as MemoryStore } from "./memory-store.js";

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
const YORUBA_NFC = "Yorùbá";

function env(): {
  snap: PlatformSnapshot;
  store: MemoryStore;
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
    store,
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
    otherEventId: FIXTURE_IDS.eventAlphaTwo,
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

function seedGoverning(snap: PlatformSnapshot): void {
  if (snap.budgetScenarioEditions.some((item) => item.current && (item.status === "APPROVED" || item.status === "PUBLISHED"))) return;
  const draft = calculateBudgetScenarioOnSnap(
    snap,
    {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      purpose: "PROTECT_INVESTMENT",
      archetype: "WEDDING",
      guests: "120",
    },
    "2026-09-10T08:00:00.000Z",
    FIXTURE_IDS.personCeo,
  );
  decideBudgetScenarioOnSnap(
    snap,
    { organisationId: FIXTURE_IDS.orgMaison, scenarioId: draft.id, expectedVersion: draft.version },
    "2026-09-10T08:05:00.000Z",
    FIXTURE_IDS.personDirector,
  );
}

function denial(error: unknown): RiskObservation {
  return {
    kind: "COMMAND_DENIAL",
    code: error instanceof PlatformError ? error.code : "ERROR",
    didDataChange: false,
    auditOutcome: "DENIED",
  };
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
  observations.push({ kind: "RECORD_COUNT", collection: "riskPolicyEditions", count: snap.riskPolicyEditions.filter((item) => item.organisationId === ctx.organisationId).length });
  observations.push({ kind: "RECORD_COUNT", collection: "riskCheckpointInstances", count: snap.riskCheckpointInstances.filter((item) => item.eventId === ctx.eventId).length });
  observations.push({
    kind: "SCOPE",
    organisationId: ctx.organisationId,
    leaked: orgSources.some((item) => item.organisationId !== ctx.organisationId) || snap.riskPolicies.some((item) => item.insurerLabel === "LEAKED_OTHER_EVENT"),
  });
  const latest = [...snap.riskApplicabilitySnapshots].reverse().find((item) => item.eventId === ctx.eventId);
  if (latest) {
    observations.push({ kind: "STATE", aggregateId: latest.id, state: latest.overall, version: latest.version });
    for (const requirement of latest.requirements) {
      observations.push({ kind: "STATE", aggregateId: requirement.ruleEditionId ?? latest.id, state: requirement.decision, version: latest.version });
    }
  }
  for (const fact of snap.riskFactEditions.filter((item) => item.eventId === ctx.eventId && item.unknown)) {
    observations.push({ kind: "CLASSIFICATION", recordId: fact.id, classification: "UNKNOWN_FACT" });
  }
  const source = [...snap.riskSourceEditions].reverse()[0];
  if (source) observations.push({ kind: "STATE", aggregateId: source.id, state: source.status, version: source.version });
  const edition = [...snap.riskPolicyEditions].reverse()[0];
  if (edition) {
    observations.push({ kind: "STATE", aggregateId: edition.id, state: derivedCertificateStatus(edition, "2026-09-10"), version: edition.version });
    const orgName = snap.organisations.find((item) => item.id === ctx.organisationId)?.displayName ?? "";
    const mismatch = (edition.insuredPartyLabels ?? []).length > 0 && !(edition.insuredPartyLabels ?? []).some((label) => label.includes("Maison") || label.includes(orgName));
    observations.push({ kind: "CLASSIFICATION", recordId: edition.id, classification: mismatch ? "PARTY_MISMATCH" : "PARTY_ALIGNED" });
    const hashes = snap.riskPolicyEditions.filter((item) => item.policyId === edition.policyId).map((item) => item.contentHash);
    observations.push({ kind: "HASH", name: "policy-editions", value: hashes.join(","), matches: hashes.length < 2 || hashes[0] === hashes[1] });
    const hidden = redactPolicyEdition(edition, "PUBLIC");
    observations.push({
      kind: "PROJECTION_OMITS",
      path: "policyNumberCiphertext",
      forbiddenValuesFound: "policyNumberCiphertext" in hidden ? [String((hidden as { policyNumberCiphertext?: string }).policyNumberCiphertext)] : [],
    });
  }
  const dossier = [...snap.riskDossierEditions].reverse().find((item) => item.eventId === ctx.eventId);
  if (dossier) {
    observations.push({ kind: "STATE", aggregateId: dossier.id, state: dossier.status, version: dossier.version });
    observations.push({ kind: "EXTERNAL_EFFECT_COUNT", effect: "dossier.dispatch", count: dossier.dispatched ? 1 : 0 });
    const publication = snap.riskDossierPublications.find((item) => item.dossierId === dossier.id);
    if (publication) {
      observations.push({ kind: "HASH", name: "publication", value: publication.approvedHash, matches: publication.approvedHash === dossier.contentHash });
    }
  }
  const exported = [...snap.riskDossierExports].reverse()[0];
  if (exported) {
    observations.push({ kind: "HASH", name: "export", value: exported.fullHash ?? "", matches: Boolean(exported.fullHash) });
    observations.push({ kind: "EXTERNAL_EFFECT_COUNT", effect: "export.dispatch", count: exported.dispatched ? 1 : 0 });
  }
  const budget = [...eventBudgets].reverse()[0];
  if (budget) {
    observations.push({
      kind: "BUDGET_RESULT",
      scenarioId: budget.successorScenarioEditionId ?? budget.budgetScenarioEditionId ?? budget.id,
      calculationId: budget.calculationResultId ?? budget.id,
      quantifiedMinor: budget.quantifiedMinor,
      unquantified: budget.unquantifiedReasons.length,
    });
  }
  const activation = snap.riskFallbackActivations.find((item) => item.eventId === ctx.eventId);
  if (activation) {
    observations.push({
      kind: "EXTERNAL_EFFECT_COUNT",
      effect: "booking",
      count: activation.bookingRequested || activation.paymentRequested || activation.dispatchRequested ? 1 : 0,
    });
  }
  const intents = snap.riskEscalationIntents.filter((item) => item.eventId === ctx.eventId);
  observations.push({ kind: "EXTERNAL_EFFECT_COUNT", effect: "escalation.dispatch", count: intents.filter((item) => item.dispatched).length });
  const incident = snap.riskIncidents.find((item) => item.eventId === ctx.eventId);
  if (incident) {
    const protocol = LIFE_SAFETY_PROTOCOL;
    observations.push({
      kind: "CONTENT_BYTES",
      mediaType: "text/plain",
      hash: exactHash(protocol),
      forbiddenValuesFound: /\bhas dispatched help\b/i.test(protocol) && !/\bhas not dispatched help\b/i.test(protocol) ? ["dispatch claimed"] : [],
    });
    observations.push({ kind: "EXTERNAL_EFFECT_COUNT", effect: "incident.dispatch", count: 0 });
    for (const note of snap.riskIncidentNotes.filter((item) => item.incidentId === incident.id)) {
      observations.push({ kind: "CLASSIFICATION", recordId: note.id, classification: note.kind });
    }
  }
  const learning = snap.riskLearningProposals.find((item) => item.eventId === ctx.eventId);
  if (learning) observations.push({ kind: "STATE", aggregateId: learning.id, state: learning.adopted ? "ADOPTED" : "PROPOSED", version: learning.version });
  const roster = eventRoster[0];
  if (roster) observations.push({ kind: "STATE", aggregateId: roster.id, state: roster.commercialStatus, version: roster.version });
  const assessment = [...snap.riskVendorAssessments].reverse()[0];
  if (assessment) {
    observations.push({
      kind: "STATE",
      aggregateId: assessment.id,
      state: assessment.humanDecision ?? assessment.band,
      version: assessment.version,
    });
  }
  const clause = [...snap.riskClauseEditions].reverse()[0];
  if (clause) {
    observations.push({ kind: "STATE", aggregateId: clause.id, state: clause.legalReviewStatus, version: clause.version });
    observations.push({
      kind: "CONTENT_BYTES",
      mediaType: "text/html",
      hash: exactHash(clause.renderedBody),
      forbiddenValuesFound: /<script/i.test(clause.renderedBody) ? ["script"] : [],
    });
  }
  const residual = [...snap.riskResidualDecisions].reverse()[0];
  const latestSnap = [...snap.riskApplicabilitySnapshots].reverse().find((item) => item.eventId === ctx.eventId);
  if (residual && latestSnap) {
    observations.push({
      kind: "HASH",
      name: "residual-snapshot",
      value: residual.snapshotHash,
      matches: residual.snapshotHash === latestSnap.contentHash,
    });
    if (residual.expiresOn && residual.expiresOn < "2026-09-10") {
      observations.push({ kind: "STATE", aggregateId: residual.id, state: "EXPIRED", version: residual.version });
    }
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
  const actor = (personId: string, correlationId: string) => ({ personId, correlationId, actorKind: "HUMAN" as const });
  try {
    for (const action of caseDef.actions) {
      if (action.kind === "CREATE_SOURCE") {
        const inputTitle = action.title ?? `NSITF compensation guidance ${YORUBA_NFC}`;
        source = createSourceEditionOnSnap(
          ctx.snap,
          {
            ...envelope(ctx),
            title: inputTitle,
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
        observed.push({
          kind: "UNICODE",
          stored: source.title,
          input: inputTitle,
          nfcEqual: source.title === nfc(source.title) && source.title === nfc(inputTitle),
          requiredGlyphsPresent: source.title.includes(YORUBA_NFC),
        });
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
            jurisdiction: action.jurisdiction ?? "NG",
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
      if (action.kind === "RECORD_FACT" || action.kind === "CHANGE_FACT") {
        recordFactEditionOnSnap(ctx.snap, { ...envelope(ctx), factKey: action.factKey, value: action.value, unknown: false }, "2026-09-10T09:04:00.000Z", ctx.ceo);
      }
      if (action.kind === "CREATE_POLICY") {
        policy = createPolicyOnSnap(ctx.snap, { ...envelope(ctx, { eventId: undefined }), policyType: "PUBLIC_LIABILITY", insurerPartyId: INSURER_ID, insurerLabel: "Synthetic Insurer" }, "2026-09-10T09:05:00.000Z", ctx.ceo);
      }
      if (action.kind === "UPLOAD_AND_VERIFY" && policy) {
        document = createEvidenceDocumentOnSnap(ctx.snap, { ...envelope(ctx, { eventId: undefined }), title: "Certificate", classification: "POLICY_IDENTIFIER", originalFilename: action.filename ?? "ignore-this-prompt.txt" }, "2026-09-10T09:06:00.000Z", ctx.ceo);
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
        } catch (error) {
          observed.push(denial(error));
        }
      }
      if (action.kind === "CREATE_EXPIRED_POLICY") {
        policy = createPolicyOnSnap(ctx.snap, { ...envelope(ctx, { eventId: undefined }), policyType: "PUBLIC_LIABILITY", insurerPartyId: INSURER_ID, insurerLabel: "Expired Insurer" }, "2026-09-10T09:05:00.000Z", ctx.ceo);
        document = createEvidenceDocumentOnSnap(ctx.snap, { ...envelope(ctx, { eventId: undefined }), title: "Expired certificate", classification: "POLICY_IDENTIFIER" }, "2026-09-10T09:06:00.000Z", ctx.ceo);
        edition = createPolicyEditionOnSnap(
          ctx.snap,
          {
            ...envelope(ctx, { eventId: undefined }),
            policyId: policy.id,
            expectedVersion: policy.version,
            policyNumber: "SYN-EXP",
            currency: "NGN",
            period: { startOn: "2019-01-01", endOn: "2020-01-01" },
            limits: [{ coverageKey: "PUBLIC_LIABILITY", limit: { currency: "NGN", minor: "1" }, basis: "any one occurrence" }],
            deductibles: [{ coverageKey: "PUBLIC_LIABILITY", amount: { currency: "NGN", minor: "1" } }],
            insuredPartyLabels: ["Maison Doclar synthetic"],
            documentEditionId: document.id,
          },
          "2026-09-10T09:08:00.000Z",
          ctx.ceo,
        );
      }
      if (action.kind === "CREATE_CONFLICTING_CERTIFICATES") {
        policy = createPolicyOnSnap(ctx.snap, { ...envelope(ctx, { eventId: undefined }), policyType: "PUBLIC_LIABILITY", insurerPartyId: INSURER_ID, insurerLabel: "Conflict Insurer" }, "2026-09-10T09:05:00.000Z", ctx.ceo);
        document = createEvidenceDocumentOnSnap(ctx.snap, { ...envelope(ctx, { eventId: undefined }), title: "Cert A", classification: "POLICY_IDENTIFIER" }, "2026-09-10T09:06:00.000Z", ctx.ceo);
        createPolicyEditionOnSnap(
          ctx.snap,
          {
            ...envelope(ctx, { eventId: undefined }),
            policyId: policy.id,
            expectedVersion: policy.version,
            policyNumber: "SYN-A",
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
        const livePolicy = ctx.snap.riskPolicies.find((item) => item.id === policy!.id);
        createPolicyEditionOnSnap(
          ctx.snap,
          {
            ...envelope(ctx, { eventId: undefined }),
            policyId: policy.id,
            expectedVersion: livePolicy?.version ?? policy.version,
            policyNumber: "SYN-B",
            currency: "NGN",
            period: { startOn: "2026-01-01", endOn: "2026-12-31" },
            limits: [{ coverageKey: "PUBLIC_LIABILITY", limit: { currency: "NGN", minor: "1" }, basis: "any one occurrence" }],
            deductibles: [{ coverageKey: "PUBLIC_LIABILITY", amount: { currency: "NGN", minor: "1" } }],
            insuredPartyLabels: ["Maison Doclar synthetic"],
            documentEditionId: document.id,
          },
          "2026-09-10T09:08:30.000Z",
          ctx.ceo,
        );
      }
      if (action.kind === "PARTY_MISMATCH") {
        policy = createPolicyOnSnap(ctx.snap, { ...envelope(ctx, { eventId: undefined }), policyType: "PUBLIC_LIABILITY", insurerPartyId: INSURER_ID, insurerLabel: "Mismatch Insurer" }, "2026-09-10T09:05:00.000Z", ctx.ceo);
        document = createEvidenceDocumentOnSnap(ctx.snap, { ...envelope(ctx, { eventId: undefined }), title: "Mismatch cert", classification: "POLICY_IDENTIFIER" }, "2026-09-10T09:06:00.000Z", ctx.ceo);
        createPolicyEditionOnSnap(
          ctx.snap,
          {
            ...envelope(ctx, { eventId: undefined }),
            policyId: policy.id,
            expectedVersion: policy.version,
            policyNumber: "SYN-MIS",
            currency: "NGN",
            period: { startOn: "2026-01-01", endOn: "2026-12-31" },
            limits: [{ coverageKey: "PUBLIC_LIABILITY", limit: { currency: "NGN", minor: "100000000" }, basis: "any one occurrence" }],
            deductibles: [{ coverageKey: "PUBLIC_LIABILITY", amount: { currency: "NGN", minor: "250000" } }],
            insuredPartyLabels: ["Wrong Party Limited"],
            documentEditionId: document.id,
          },
          "2026-09-10T09:08:00.000Z",
          ctx.ceo,
        );
      }
      if (action.kind === "EVALUATE") {
        const result = evaluateApplicabilityOnSnap(ctx.snap, envelope(ctx), "2026-09-10T09:10:00.000Z", ctx.ceo);
        if (adapters.fabricateCoverage) Object.assign(result.snapshot, { overall: "READY" });
      }
      if (action.kind === "RESIDUAL_DECISION") {
        const gap = ctx.snap.riskGapFindings.find((item) => item.eventId === ctx.eventId);
        if (gap) {
          const submitted = submitResidualDecisionOnSnap(ctx.snap, { ...envelope(ctx), gapId: gap.id, choice: "ACCEPT_RESIDUAL_RISK", reason: "Client accepts residual until evidence arrives", expiresOn: "2026-12-01" }, "2026-09-10T09:11:00.000Z", ctx.ceo);
          try {
            decideResidualRiskOnSnap(ctx.snap, { ...envelope(ctx), decisionId: submitted.id, expectedVersion: submitted.version, decision: "APPROVED" }, "2026-09-10T09:12:00.000Z", ctx.ceo, "HUMAN");
          } catch (error) {
            observed.push(denial(error));
          }
        }
      }
      if (action.kind === "RESIDUAL_REPLAY") {
        const gap = ctx.snap.riskGapFindings.find((item) => item.eventId === ctx.eventId);
        if (gap) {
          ctx.store.replace(ctx.snap);
          const payload = { ...envelope(ctx, { idempotencyKey: "s05b-eval-residual-replay" }), gapId: gap.id, choice: "ACCEPT_RESIDUAL_RISK" as const, reason: "Client accepts residual until evidence arrives" };
          const first = ctx.service.submitRiskResidual(actor(ctx.ceo, "s05b-residual-1"), payload);
          const firstEffect = ctx.service.consumeLastMutationEffect();
          const second = ctx.service.submitRiskResidual(actor(ctx.ceo, "s05b-residual-2"), payload);
          const secondEffect = ctx.service.consumeLastMutationEffect();
          observed.push({
            kind: "INVOCATIONS",
            action: "risk.residual.submit",
            firstResultId: first.id,
            secondResultId: second.id,
            firstApplication: firstEffect?.application ?? "APPLIED",
            secondApplication: secondEffect?.application ?? "UNKNOWN",
            firstGeneratedAt: first.createdAt,
            secondGeneratedAt: second.createdAt,
            firstRecordCount: 1,
            secondRecordCount: ctx.store.snapshot().riskResidualDecisions.filter((item) => item.eventId === ctx.eventId).length,
          });
        }
      }
      if (action.kind === "EXPIRE_RESIDUAL") {
        const gap = ctx.snap.riskGapFindings.find((item) => item.eventId === ctx.eventId);
        if (gap) {
          const submitted = submitResidualDecisionOnSnap(ctx.snap, { ...envelope(ctx), gapId: gap.id, choice: "ACCEPT_RESIDUAL_RISK", reason: "Expired acceptance", expiresOn: "2020-01-01" }, "2026-09-10T09:11:00.000Z", ctx.ceo);
          decideResidualRiskOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentDirector }), decisionId: submitted.id, expectedVersion: submitted.version, decision: "APPROVED" }, "2026-09-10T09:12:00.000Z", ctx.director, "HUMAN");
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
        decideVendorAssessmentOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentDirector }), assessmentId: assessment.id, expectedVersion: assessment.version, decision: "RESTRICTED", reason: "Missing certificate" }, "2026-09-10T09:15:00.000Z", ctx.director, "HUMAN");
      }
      if (action.kind === "ROSTER_STANDBY") {
        assignRosterOnSnap(ctx.snap, { ...envelope(ctx), vendorId: VENDOR_ID, vendorLabel: "Standby AV", role: "STANDBY", criticalFunctionKey: "AV", commercialStatus: "UNCONFIRMED" }, "2026-09-10T09:16:00.000Z", ctx.ceo);
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
        plan = createContinuityPlanOnSnap(ctx.snap, { ...envelope(ctx), title: "AV fallback", recoveryObjectiveMinutes: 60, maximumTolerableInterruptionMinutes: 120, decisionRole: "EVENT_DIRECTOR" }, "2026-09-10T09:18:00.000Z", ctx.ceo);
        activation = proposeFallbackOnSnap(ctx.snap, { ...envelope(ctx), planId: plan.id, triggerEvidence: "Missed AV checkpoint", impact: "Ceremony sound at risk" }, "2026-09-10T09:19:00.000Z", ctx.ceo);
      }
      if (action.kind === "FALLBACK_AUTHORISE" && activation) {
        transitionFallbackOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentDirector }), activationId: activation.id, expectedVersion: activation.version, to: "AUTHORISED" }, "2026-09-10T09:20:00.000Z", ctx.director, "HUMAN");
      }
      if (action.kind === "FALLBACK_INVALID" && activation) {
        try {
          transitionFallbackOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentDirector }), activationId: activation.id, expectedVersion: activation.version, to: "CONFIRMED" }, "2026-09-10T09:20:00.000Z", ctx.director, "HUMAN");
        } catch (error) {
          observed.push(denial(error));
        }
      }
      if (action.kind === "INCIDENT") {
        reportIncidentOnSnap(ctx.snap, { ...envelope(ctx), title: "Guest medical", severity: "HIGH", lifeSafety: true, sensitive: true }, "2026-09-10T09:21:00.000Z", ctx.ceo);
      }
      if (action.kind === "RECORD_NOTES") {
        const incident = ctx.snap.riskIncidents.find((item) => item.eventId === ctx.eventId);
        if (incident) {
          addIncidentNoteOnSnap(ctx.snap, { ...envelope(ctx), incidentId: incident.id, kind: "FACT", body: "Guest reported chest pain at 21:14." }, "2026-09-10T09:21:10.000Z", ctx.ceo);
          addIncidentNoteOnSnap(ctx.snap, { ...envelope(ctx), incidentId: incident.id, kind: "CLAIM", body: "Venue staff claimed the aisle was already cleared." }, "2026-09-10T09:21:20.000Z", ctx.ceo);
        }
      }
      if (action.kind === "LEARNING") {
        const incident = ctx.snap.riskIncidents.find((item) => item.eventId === ctx.eventId);
        if (incident) proposeLearningOnSnap(ctx.snap, { ...envelope(ctx), incidentId: incident.id, target: "RULE", proposal: "Review check-in timing" }, "2026-09-10T09:21:30.000Z", ctx.ceo);
      }
      if (action.kind === "BUDGET") {
        seedGoverning(ctx.snap);
        const projection = projectRiskBudgetOnSnap(ctx.snap, { ...envelope(ctx), drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "No sourced replacement quote", evidenceIds: [] }] }, "2026-09-10T09:22:00.000Z", ctx.ceo);
        if (adapters.inventPremium) Object.assign(projection, { quantifiedMinor: "5000000" });
      }
      if (action.kind === "BUDGET_SOURCED") {
        seedGoverning(ctx.snap);
        createEvidenceDocumentOnSnap(ctx.snap, { ...envelope(ctx, { eventId: undefined }), title: "Premium quote", classification: "LIMIT_DEDUCTIBLE" }, "2026-09-10T09:21:50.000Z", ctx.ceo);
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
      if (action.kind === "BUDGET_REPLAY") {
        seedGoverning(ctx.snap);
        ctx.store.replace(ctx.snap);
        const payload = { ...envelope(ctx, { idempotencyKey: "s05b-eval-budget-replay" }), drivers: [{ kind: "UNQUANTIFIED_EXPOSURE" as const, reason: "No sourced replacement quote", evidenceIds: [] }] };
        const first = ctx.service.projectRiskBudget(actor(ctx.ceo, "s05b-budget-1"), payload);
        const firstEffect = ctx.service.consumeLastMutationEffect();
        const second = ctx.service.projectRiskBudget(actor(ctx.ceo, "s05b-budget-2"), payload);
        const secondEffect = ctx.service.consumeLastMutationEffect();
        const after = ctx.store.snapshot();
        observed.push({
          kind: "INVOCATIONS",
          action: "risk.budget.project",
          firstResultId: first.id,
          secondResultId: second.id,
          firstApplication: firstEffect?.application ?? "APPLIED",
          secondApplication: secondEffect?.application ?? "UNKNOWN",
          firstGeneratedAt: first.generatedAt,
          secondGeneratedAt: second.generatedAt,
          firstRecordCount: 1,
          secondRecordCount: after.riskBudgetProjections.filter((item) => item.eventId === ctx.eventId).length,
        });
        ctx.snap = after;
      }
      if (action.kind === "STALE_BUDGET") {
        seedGoverning(ctx.snap);
        try {
          projectRiskBudgetOnSnap(
            ctx.snap,
            { ...envelope(ctx), expectedScenarioVersion: 99, drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "stale", evidenceIds: [] }] },
            "2026-09-10T09:22:00.000Z",
            ctx.ceo,
          );
        } catch (error) {
          observed.push(denial(error));
        }
      }
      if (action.kind === "DOSSIER") {
        const dossier = assembleDossierOnSnap(ctx.snap, envelope(ctx, { assignmentId: ctx.assignmentPlanner }), "2026-09-10T09:23:00.000Z", ctx.planner);
        observed.push({ kind: "TRANSITION", aggregateId: dossier.id, from: "NONE", to: "DRAFT", actorId: ctx.planner, allowed: true });
        const submitted = transitionDossierOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentPlanner }), dossierId: dossier.id, expectedVersion: dossier.version, to: "SUBMITTED" }, "2026-09-10T09:23:30.000Z", ctx.planner, "HUMAN");
        observed.push({ kind: "TRANSITION", aggregateId: submitted.id, from: "DRAFT", to: "SUBMITTED", actorId: ctx.planner, allowed: true });
        const approved = transitionDossierOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentDirector }), dossierId: submitted.id, expectedVersion: submitted.version, to: "APPROVED" }, "2026-09-10T09:24:00.000Z", ctx.director, "HUMAN");
        observed.push({ kind: "TRANSITION", aggregateId: approved.id, from: "SUBMITTED", to: "APPROVED", actorId: ctx.director, allowed: true });
        const published = transitionDossierOnSnap(ctx.snap, { ...envelope(ctx, { assignmentId: ctx.assignmentCeo, approvedHash: approved.contentHash }), dossierId: approved.id, expectedVersion: approved.version, to: "PUBLISHED" }, "2026-09-10T09:24:30.000Z", ctx.ceo, "HUMAN");
        observed.push({ kind: "TRANSITION", aggregateId: published.id, from: "APPROVED", to: "PUBLISHED", actorId: ctx.ceo, allowed: true });
        if (adapters.dossierDispatch) Object.assign(published, { dispatched: true });
      }
      if (action.kind === "DOSSIER_PUBLISH_DIRECT") {
        const dossier = assembleDossierOnSnap(ctx.snap, envelope(ctx), "2026-09-10T09:23:00.000Z", ctx.director);
        try {
          transitionDossierOnSnap(ctx.snap, { ...envelope(ctx), dossierId: dossier.id, expectedVersion: dossier.version, to: "PUBLISHED" }, "2026-09-10T09:24:00.000Z", ctx.ceo, "HUMAN");
        } catch (error) {
          observed.push(denial(error));
        }
      }
      if (action.kind === "EXPORT") {
        const dossier = [...ctx.snap.riskDossierEditions].reverse().find((item) => item.eventId === ctx.eventId);
        try {
          exportDossierOnSnap(ctx.snap, { ...envelope(ctx), dossierId: dossier?.id ?? "00000000-0000-4000-8000-000000000099", expectedVersion: dossier?.version ?? 0 }, "2026-09-10T09:25:00.000Z", ctx.ceo);
        } catch (error) {
          observed.push(denial(error));
        }
      }
      if (action.kind === "CROSS_EVENT") {
        try {
          ctx.service.getEventProtection(actor(ctx.planner, "s05b-cross-event-read"), ctx.organisationId, ctx.otherEventId);
        } catch (error) {
          observed.push(denial(error));
        }
        try {
          ctx.service.projectRiskBudget(actor(ctx.planner, "s05b-cross-event-write"), {
            organisationId: ctx.organisationId,
            eventId: ctx.otherEventId,
            assignmentId: ctx.assignmentPlanner,
            expectedVersion: 0,
            idempotencyKey: "s05b-eval-cross-event-01",
            drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "cross event", evidenceIds: [] }],
          });
        } catch (error) {
          observed.push(denial(error));
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
          ctx.service.createRiskPolicy(actor(ctx.ceo, "s05b-cross-org"), {
            organisationId: ctx.otherOrgId,
            assignmentId: ctx.assignmentCeo,
            expectedVersion: 0,
            idempotencyKey: "s05b-eval-cross-org-01",
            policyType: "PUBLIC_LIABILITY",
            insurerPartyId: INSURER_ID,
            insurerLabel: "Other",
          });
        } catch (error) {
          observed.push(denial(error));
        }
      }
      if (action.kind === "UNAUTHENTICATED") {
        try {
          ctx.service.createRiskPolicy(actor("00000000-0000-4000-8000-000000000000", "s05b-unauth"), {
            organisationId: ctx.organisationId,
            assignmentId: "00000000-0000-4000-8000-000000000000",
            expectedVersion: 0,
            idempotencyKey: "s05b-eval-unauth-01",
            policyType: "PUBLIC_LIABILITY",
            insurerPartyId: INSURER_ID,
            insurerLabel: "X",
          });
        } catch (error) {
          observed.push(denial(error));
        }
      }
      if (action.kind === "ADMIN_DENIED") {
        try {
          ctx.service.createRiskPolicy(actor(ctx.admin, "s05b-admin"), {
            organisationId: ctx.organisationId,
            assignmentId: ctx.assignmentAdmin,
            expectedVersion: 0,
            idempotencyKey: "s05b-eval-admin-01",
            policyType: "PUBLIC_LIABILITY",
            insurerPartyId: INSURER_ID,
            insurerLabel: "X",
          });
        } catch (error) {
          observed.push(denial(error));
        }
      }
    }
  } catch (error) {
    observed.push(denial(error));
  }
  if (adapters.falseSuccess) {
    overlayDurable(ctx.snap, durableBaseline);
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
  const counts = new Map(observations.filter((item) => item.kind === "RECORD_COUNT").map((item) => [item.collection, item.count]));
  for (const item of observations) {
    if (item.kind === "STATE" && item.state === "READY" && observations.some((obs) => obs.kind === "CLASSIFICATION" && obs.classification === "UNKNOWN_FACT")) {
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
    if (item.kind === "SCOPE" && item.leaked) hits.add("CROSS_SCOPE_LEAKAGE");
    if (item.kind === "UNICODE" && (!item.nfcEqual || !item.requiredGlyphsPresent)) hits.add("UNICODE_LOSS");
    if (item.kind === "INVOCATIONS" && item.secondApplication !== "REPLAYED") hits.add("FALSE_SUCCESS");
  }
  if (observations.some((item) => item.kind === "BUDGET_RESULT" && item.quantifiedMinor === "0" && item.unquantified > 0) && (counts.get("riskBudgetProjections") ?? 0) === 0) {
    hits.add("FALSE_SUCCESS");
  }
  if (observations.some((item) => item.kind === "STATE" && item.state === "NOT_ENGAGED") && (counts.get("riskRosterAssignments") ?? 0) === 0) {
    hits.add("FALSE_SUCCESS");
  }
  return [...hits];
}

/** @deprecated Detecting sabotage flags is prohibited. Use detectUnsafeFromObservations. */
export function detectUnsafeAdapter(_adapters: S05BEvaluationAdapters, observations: Array<Partial<RiskObservation>>): string[] {
  return detectUnsafeFromObservations(observations.filter((item) => item.kind) as RiskObservation[]);
}
