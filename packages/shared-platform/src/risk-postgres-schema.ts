export const EOS_S05B_NORMALIZED_MIGRATION_ID = "004_risk_protection_normalized" as const;
export const EOS_S05B_NORMALIZED_MIGRATION_V3_ID = "005_risk_dossier_access_grants" as const;
export const EOS_S05B_NORMALIZED_MIGRATION_V4_ID = "006_risk_authority_governance_receipts" as const;
export const EOS_S05B_PROTECTION_V2_ID = "EOS-S05B-PROTECTION-V2" as const;

export const RISK_SQL_TABLES = [
  { table: "risk_source_editions", collection: "riskSourceEditions" },
  { table: "risk_rule_editions", collection: "riskRuleEditions" },
  { table: "risk_evidence_documents", collection: "riskEvidenceDocuments" },
  { table: "risk_policies", collection: "riskPolicies" },
  { table: "risk_policy_editions", collection: "riskPolicyEditions" },
  { table: "risk_fact_editions", collection: "riskFactEditions" },
  { table: "risk_applicability_snapshots", collection: "riskApplicabilitySnapshots" },
  { table: "risk_gap_findings", collection: "riskGapFindings" },
  { table: "risk_residual_decisions", collection: "riskResidualDecisions" },
  { table: "risk_clause_templates", collection: "riskClauseTemplates" },
  { table: "risk_clause_editions", collection: "riskClauseEditions" },
  { table: "risk_vendor_evidence", collection: "riskVendorEvidence" },
  { table: "risk_vendor_assessments", collection: "riskVendorAssessments" },
  { table: "risk_roster_assignments", collection: "riskRosterAssignments" },
  { table: "risk_critical_functions", collection: "riskCriticalFunctions" },
  { table: "risk_continuity_plans", collection: "riskContinuityPlans" },
  { table: "risk_checkpoint_templates", collection: "riskCheckpointTemplates" },
  { table: "risk_checkpoint_instances", collection: "riskCheckpointInstances" },
  { table: "risk_check_ins", collection: "riskCheckIns" },
  { table: "risk_communication_intents", collection: "riskCommunicationIntents" },
  { table: "risk_escalation_intents", collection: "riskEscalationIntents" },
  { table: "risk_fallback_activations", collection: "riskFallbackActivations" },
  { table: "risk_incidents", collection: "riskIncidents" },
  { table: "risk_incident_notes", collection: "riskIncidentNotes" },
  { table: "risk_learning_proposals", collection: "riskLearningProposals" },
  { table: "risk_budget_linkages", collection: "riskBudgetProjections" },
  { table: "risk_dossier_editions", collection: "riskDossierEditions" },
  { table: "risk_dossier_publications", collection: "riskDossierPublications" },
  { table: "risk_dossier_exports", collection: "riskDossierExports" },
  { table: "risk_dossier_access_grants", collection: "riskDossierAccessGrants" },
  { table: "risk_authority_governance_receipts", collection: "riskAuthorityGovernanceReceipts" },
  { table: "risk_evaluation_runs", collection: "riskEvaluationRuns" },
  { table: "risk_evaluation_case_results", collection: "riskEvaluationCaseResults" },
  { table: "risk_evaluation_run_leases", collection: "riskEvaluationRunLeases" },
  { table: "risk_migration_receipts", collection: "s05bMigrationReceipts" },
] as const;

export type RiskSqlTable = (typeof RISK_SQL_TABLES)[number]["table"];
export type RiskSqlCollection = (typeof RISK_SQL_TABLES)[number]["collection"];

const STATUS_CHECKS: Partial<Record<(typeof RISK_SQL_TABLES)[number]["table"], string>> = {
  risk_policy_editions: "CHECK (status IS NULL OR status IN ('DRAFT','SUBMITTED','VERIFIED','REJECTED','EXPIRED','SUPERSEDED'))",
  risk_gap_findings: "CHECK (status IS NULL OR status IN ('OPEN','MITIGATION_PROPOSED','ACCEPTED_RISK','RESOLVED','REOPENED'))",
  risk_dossier_editions: "CHECK (status IS NULL OR status IN ('DRAFT','SUBMITTED','APPROVED','PUBLISHED','WITHDRAWN','SUPERSEDED'))",
  risk_fallback_activations: "CHECK (status IS NULL OR status IN ('PROPOSED','AUTHORISED','INITIATED','CONFIRMED','FAILED','CANCELLED','CLOSED'))",
  risk_incidents: "CHECK (status IS NULL OR status IN ('OPEN','STABILISED','RECOVERY','CLOSED','POST_INCIDENT_REVIEWED'))",
  risk_check_ins: "CHECK (status IS NULL OR status IN ('SCHEDULED','DUE','CONFIRMED','AT_RISK','MISSED','ESCALATED','CLOSED'))",
  risk_budget_linkages: "CHECK ((body->>'quantifiedMinor') IS NULL OR (body->>'quantifiedMinor') ~ '^[0-9]+$')",
};

function aggregateTable(name: (typeof RISK_SQL_TABLES)[number]["table"]): string {
  const extra = STATUS_CHECKS[name];
  return `
CREATE TABLE IF NOT EXISTS ${name} (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT,
  version INTEGER NOT NULL CHECK (version >= 1),
  current BOOLEAN,
  status TEXT,
  parent_id TEXT,
  content_hash TEXT,
  submitted_by_person_id TEXT,
  approved_by_person_id TEXT,
  body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (approved_by_person_id IS NULL OR submitted_by_person_id IS NULL OR approved_by_person_id <> submitted_by_person_id)${extra ? `,\n  ${extra}` : ""}
);
CREATE INDEX IF NOT EXISTS ${name}_org_idx ON ${name} (organisation_id);
CREATE INDEX IF NOT EXISTS ${name}_event_idx ON ${name} (organisation_id, event_id);
`;
}

const RISK_SQL_TABLES_004 = RISK_SQL_TABLES.filter((item) => item.table !== "risk_dossier_access_grants");

export const RISK_PROTECTION_POSTGRES_SCHEMA = `
${RISK_SQL_TABLES_004.map((item) => aggregateTable(item.table)).join("\n")}

CREATE UNIQUE INDEX IF NOT EXISTS risk_policy_editions_one_current
  ON risk_policy_editions (parent_id)
  WHERE current IS TRUE AND parent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS risk_continuity_plans_one_current
  ON risk_continuity_plans (event_id)
  WHERE current IS TRUE AND event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS risk_dossier_one_current
  ON risk_dossier_editions (event_id)
  WHERE current IS TRUE AND event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS risk_dossier_one_current_publication
  ON risk_dossier_publications (event_id)
  WHERE current IS TRUE AND event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS risk_idempotency_receipts (
  organisation_id TEXT NOT NULL,
  action TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  result_ref TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (organisation_id, action, idempotency_key)
);
`;

export const RISK_PROTECTION_POSTGRES_SCHEMA_V3 = aggregateTable("risk_dossier_access_grants");
export const RISK_PROTECTION_POSTGRES_SCHEMA_V4 = aggregateTable("risk_authority_governance_receipts");
