import { PlatformError } from "./errors.js";
import {
  RiskApplicabilitySnapshotSchema,
  RiskBudgetProjectionSchema,
  RiskCheckInSchema,
  RiskCheckpointInstanceSchema,
  RiskCheckpointTemplateSchema,
  RiskClauseEditionSchema,
  RiskClauseTemplateSchema,
  RiskCommunicationIntentSchema,
  RiskContinuityPlanSchema,
  RiskCriticalFunctionSchema,
  RiskDossierEditionSchema,
  RiskAuthorityGovernanceReceiptSchema,
  RiskDossierAccessGrantSchema,
  RiskDossierExportSchema,
  RiskDossierPublicationSchema,
  RiskEscalationIntentSchema,
  RiskEvaluationCaseResultSchema,
  RiskEvaluationRunLeaseSchema,
  RiskEvaluationRunSchema,
  RiskEvidenceDocumentSchema,
  RiskFactEditionSchema,
  RiskFallbackActivationSchema,
  RiskGapFindingSchema,
  RiskIncidentNoteSchema,
  RiskIncidentSchema,
  RiskLearningProposalSchema,
  RiskPolicyEditionSchema,
  RiskPolicySchema,
  RiskResidualDecisionSchema,
  RiskRosterAssignmentSchema,
  RiskRuleEditionSchema,
  RiskSourceEditionSchema,
  RiskVendorAssessmentSchema,
  RiskVendorEvidenceSchema,
  S05BMigrationReceiptSchema,
  S05B_CANONICAL_COLLECTIONS,
} from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export const S05B_UNKNOWN_FIELDS_POLICY = "REJECT" as const;
export const S05B_JOURNAL_COLLECTION = "s05bMigrationReceipts" as const;
export const S05B_STORE_COLLECTIONS = [...S05B_CANONICAL_COLLECTIONS] as const;

const S05B_COLLECTION_SCHEMAS = {
  riskSourceEditions: RiskSourceEditionSchema.array(),
  riskRuleEditions: RiskRuleEditionSchema.array(),
  riskEvidenceDocuments: RiskEvidenceDocumentSchema.array(),
  riskPolicies: RiskPolicySchema.array(),
  riskPolicyEditions: RiskPolicyEditionSchema.array(),
  riskFactEditions: RiskFactEditionSchema.array(),
  riskApplicabilitySnapshots: RiskApplicabilitySnapshotSchema.array(),
  riskGapFindings: RiskGapFindingSchema.array(),
  riskResidualDecisions: RiskResidualDecisionSchema.array(),
  riskClauseTemplates: RiskClauseTemplateSchema.array(),
  riskClauseEditions: RiskClauseEditionSchema.array(),
  riskVendorEvidence: RiskVendorEvidenceSchema.array(),
  riskVendorAssessments: RiskVendorAssessmentSchema.array(),
  riskRosterAssignments: RiskRosterAssignmentSchema.array(),
  riskCriticalFunctions: RiskCriticalFunctionSchema.array(),
  riskContinuityPlans: RiskContinuityPlanSchema.array(),
  riskCheckpointTemplates: RiskCheckpointTemplateSchema.array(),
  riskCheckpointInstances: RiskCheckpointInstanceSchema.array(),
  riskCheckIns: RiskCheckInSchema.array(),
  riskCommunicationIntents: RiskCommunicationIntentSchema.array(),
  riskEscalationIntents: RiskEscalationIntentSchema.array(),
  riskFallbackActivations: RiskFallbackActivationSchema.array(),
  riskIncidents: RiskIncidentSchema.array(),
  riskIncidentNotes: RiskIncidentNoteSchema.array(),
  riskLearningProposals: RiskLearningProposalSchema.array(),
  riskBudgetProjections: RiskBudgetProjectionSchema.array(),
  riskDossierEditions: RiskDossierEditionSchema.array(),
  riskDossierPublications: RiskDossierPublicationSchema.array(),
  riskDossierExports: RiskDossierExportSchema.array(),
  riskDossierAccessGrants: RiskDossierAccessGrantSchema.array(),
  riskAuthorityGovernanceReceipts: RiskAuthorityGovernanceReceiptSchema.array(),
  riskEvaluationRuns: RiskEvaluationRunSchema.array(),
  riskEvaluationCaseResults: RiskEvaluationCaseResultSchema.array(),
  riskEvaluationRunLeases: RiskEvaluationRunLeaseSchema.array(),
  s05bMigrationReceipts: S05BMigrationReceiptSchema.array(),
} as const;

export function validateS05BPersistedCollections(snapshot: PlatformSnapshot): void {
  for (const collection of S05B_STORE_COLLECTIONS) {
    if (collection === "riskEvaluationCaseResults") {
      const kept = (snapshot.riskEvaluationCaseResults ?? []).flatMap((row) => {
        const parsed = RiskEvaluationCaseResultSchema.safeParse(row);
        return parsed.success ? [parsed.data] : [];
      });
      snapshot.riskEvaluationCaseResults = kept;
      continue;
    }
    const parsed = S05B_COLLECTION_SCHEMAS[collection].safeParse(snapshot[collection] ?? []);
    if (!parsed.success) {
      throw new PlatformError("VALIDATION_FAILED", `invalid ${collection}`, {
        details: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      });
    }
  }
}
