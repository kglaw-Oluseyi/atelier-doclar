import { PlatformError } from "./errors.js";
import {
  S05B_CANONICAL_COLLECTIONS,
  type RiskDossierAccessGrant,
  type RiskDossierExport,
  type RiskDossierPublication,
  type RiskIdempotencyReceipt,
} from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export const RISK_STORE_COLLECTIONS = [
  ...S05B_CANONICAL_COLLECTIONS,
  "riskDossierPublications",
  "riskDossierExports",
] as const;

export type RiskStoreCollection = (typeof RISK_STORE_COLLECTIONS)[number];

export type RiskProtectionState = Pick<PlatformSnapshot, (typeof S05B_CANONICAL_COLLECTIONS)[number]> & {
  riskDossierPublications: RiskDossierPublication[];
  riskDossierExports: RiskDossierExport[];
  riskDossierAccessGrants: RiskDossierAccessGrant[];
};

export type RiskIdempotencyRecord = RiskIdempotencyReceipt;

export interface RiskProtectionStore {
  loadOrganisation(organisationId: string): RiskProtectionState;
  persistFromSnapshot(previous: PlatformSnapshot, next: PlatformSnapshot, organisationId?: string): void;
  getIdempotency(organisationId: string, action: string, key: string): RiskIdempotencyRecord | undefined;
  putIdempotency(record: RiskIdempotencyRecord): void;
  normalizedAuthority(): boolean;
}

export function emptyRiskState(): RiskProtectionState {
  return {
    riskSourceEditions: [],
    riskRuleEditions: [],
    riskEvidenceDocuments: [],
    riskPolicies: [],
    riskPolicyEditions: [],
    riskFactEditions: [],
    riskApplicabilitySnapshots: [],
    riskGapFindings: [],
    riskResidualDecisions: [],
    riskClauseTemplates: [],
    riskClauseEditions: [],
    riskVendorEvidence: [],
    riskVendorAssessments: [],
    riskRosterAssignments: [],
    riskCriticalFunctions: [],
    riskContinuityPlans: [],
    riskCheckpointTemplates: [],
    riskCheckpointInstances: [],
    riskCheckIns: [],
    riskCommunicationIntents: [],
    riskEscalationIntents: [],
    riskFallbackActivations: [],
    riskIncidents: [],
    riskIncidentNotes: [],
    riskLearningProposals: [],
    riskBudgetProjections: [],
    riskDossierEditions: [],
    riskDossierPublications: [],
    riskDossierExports: [],
    riskDossierAccessGrants: [],
    riskEvaluationRuns: [],
    riskEvaluationCaseResults: [],
    riskEvaluationRunLeases: [],
    s05bMigrationReceipts: [],
  };
}

export function extractRiskState(snap: PlatformSnapshot, organisationId?: string): RiskProtectionState {
  const matches = <T extends { organisationId?: string }>(items: readonly T[]): T[] =>
    organisationId ? items.filter((item) => !item.organisationId || item.organisationId === organisationId) : [...items];
  return {
    riskSourceEditions: matches(snap.riskSourceEditions),
    riskRuleEditions: matches(snap.riskRuleEditions),
    riskEvidenceDocuments: matches(snap.riskEvidenceDocuments),
    riskPolicies: matches(snap.riskPolicies),
    riskPolicyEditions: matches(snap.riskPolicyEditions),
    riskFactEditions: matches(snap.riskFactEditions),
    riskApplicabilitySnapshots: matches(snap.riskApplicabilitySnapshots),
    riskGapFindings: matches(snap.riskGapFindings),
    riskResidualDecisions: matches(snap.riskResidualDecisions),
    riskClauseTemplates: matches(snap.riskClauseTemplates),
    riskClauseEditions: matches(snap.riskClauseEditions),
    riskVendorEvidence: matches(snap.riskVendorEvidence),
    riskVendorAssessments: matches(snap.riskVendorAssessments),
    riskRosterAssignments: matches(snap.riskRosterAssignments),
    riskCriticalFunctions: matches(snap.riskCriticalFunctions),
    riskContinuityPlans: matches(snap.riskContinuityPlans),
    riskCheckpointTemplates: matches(snap.riskCheckpointTemplates),
    riskCheckpointInstances: matches(snap.riskCheckpointInstances),
    riskCheckIns: matches(snap.riskCheckIns),
    riskCommunicationIntents: matches(snap.riskCommunicationIntents),
    riskEscalationIntents: matches(snap.riskEscalationIntents),
    riskFallbackActivations: matches(snap.riskFallbackActivations),
    riskIncidents: matches(snap.riskIncidents),
    riskIncidentNotes: matches(snap.riskIncidentNotes),
    riskLearningProposals: matches(snap.riskLearningProposals),
    riskBudgetProjections: matches(snap.riskBudgetProjections),
    riskDossierEditions: matches(snap.riskDossierEditions),
    riskDossierPublications: matches(snap.riskDossierPublications ?? []),
    riskDossierExports: matches(snap.riskDossierExports ?? []),
    riskDossierAccessGrants: matches(snap.riskDossierAccessGrants ?? []),
    riskEvaluationRuns: matches(snap.riskEvaluationRuns),
    riskEvaluationCaseResults: matches(snap.riskEvaluationCaseResults),
    riskEvaluationRunLeases: matches(snap.riskEvaluationRunLeases),
    s05bMigrationReceipts: matches(snap.s05bMigrationReceipts),
  };
}

export function overlayRiskState(snap: PlatformSnapshot, state: RiskProtectionState, organisationId?: string): void {
  for (const collection of RISK_STORE_COLLECTIONS) {
    const current = ((snap as unknown as Record<string, unknown[]>)[collection] ?? []) as Array<{ id: string; organisationId?: string }>;
    const incoming = (state[collection] ?? []) as Array<{ id: string; organisationId?: string }>;
    const retained = organisationId
      ? current.filter((item) => item.organisationId && item.organisationId !== organisationId)
      : [];
    (snap as unknown as Record<string, unknown[]>)[collection] = [...retained, ...incoming];
  }
}

export function assertOptimisticWrite(
  previous: { id: string; version: number } | undefined,
  next: { id: string; version: number },
): void {
  if (!previous) return;
  if (next.version < previous.version || (next.version === previous.version && JSON.stringify(previous) !== JSON.stringify(next))) {
    throw new PlatformError("VERSION_CONFLICT", "stale risk aggregate write was not rescued", {
      publicMessage: "This record changed while you were editing. Reload before saving.",
    });
  }
}
