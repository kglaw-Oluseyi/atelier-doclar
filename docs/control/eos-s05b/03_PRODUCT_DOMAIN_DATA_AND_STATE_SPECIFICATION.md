# EOS-S05B Product Domain Data and State Specification

**Status:** CEO review draft

## Aggregate boundaries

1. Protection Catalogue — organisation policies, rule editions and clause templates.
2. Event Protection File — event applicability snapshots, gaps and readiness.
3. Vendor Risk File — vendor evidence, assessments and event assignments.
4. Continuity Plan — critical functions, fallback candidates, checkpoints and activations.
5. Incident File — immutable facts, impacts, decisions, actions and recovery.
6. Risk Budget View — projection into accepted Budget Intelligence scenarios.
7. Assurance Dossier — permission-safe, immutable client/venue export edition.

## Core entities

```ts
type RecordScope = { kind: "ORGANISATION"; organisationId: UUID }
 | { kind: "EVENT"; organisationId: UUID; eventId: UUID };

interface InsurancePolicy {
  id: UUID; scope: RecordScope; policyType: PolicyType; insurerPartyId: UUID;
  policyNumberCiphertext: EncryptedString; currency: Currency;
  period: DateRange; limits: CoverageLimit[]; deductibles: Deductible[];
  exclusions: EvidenceRef[]; insuredParties: PartyRef[]; assetInventoryRefs: UUID[];
  documentEditionId: UUID; verification: VerificationState; version: number;
}

interface ContractualClause {
  id: UUID; scope: RecordScope; clauseType: ClauseType; templateEditionId?: UUID;
  contractId: UUID; vendorId?: UUID; commercialTerms: StructuredTerm[];
  legalReview: LegalReviewState; execution: ExecutionState; version: number;
}

interface VendorRiskProfile {
  id: UUID; organisationId: UUID; vendorId: UUID; evidenceIds: UUID[];
  indicators: RiskIndicator[]; assessmentEditionId: UUID; manualDecision?: DecisionRef;
}

interface EventRiskBudget {
  id: UUID; organisationId: UUID; eventId: UUID; budgetScenarioEditionId: UUID;
  exposureLines: ExposureLine[]; reserveDriver?: BudgetDriverRef; version: number;
}
```

## State machines

| Aggregate | States |
|---|---|
| Policy evidence | DRAFT → SUBMITTED → VERIFIED or REJECTED → EXPIRED/SUPERSEDED |
| Applicability | NOT_EVALUATED → INDETERMINATE/APPLIES/DOES_NOT_APPLY → SUPERSEDED |
| Protection gap | OPEN → MITIGATION_PROPOSED → ACCEPTED_RISK/RESOLVED → REOPENED |
| Clause | DRAFT → LEGAL_REVIEW → APPROVED → ISSUED → EXECUTED → SUPERSEDED |
| Vendor assessment | INCOMPLETE → REVIEW_READY → APPROVED/RESTRICTED/DECLINED → EXPIRED |
| Check-in | SCHEDULED → DUE → CONFIRMED/AT_RISK/MISSED → ESCALATED/CLOSED |
| Fallback activation | PROPOSED → AUTHORISED → INITIATED → CONFIRMED/FAILED/CANCELLED |
| Incident | OPEN → STABILISED → RECOVERY → CLOSED → POST_INCIDENT_REVIEWED |
| Dossier | DRAFT → SUBMITTED → APPROVED → PUBLISHED/WITHDRAWN/SUPERSEDED |

## Durable command envelope

Every mutation includes actor assignment, organisation/event scope, expected version, idempotency key, reason where consequential, correlation ID and timestamp. Server authority is reloaded at execution. Replayed commands return `REPLAYED/didDataChange:false`; failures return `NOT_APPLIED/didDataChange:false`.

## Invariants

- No event policy or vendor record can be fetched by another event unless it is an explicitly organisation-scoped source projected through applicability.
- No deleted evidence; corrections supersede.
- No silent status derivation from document filename or upload completion.
- No gap is resolved by a recommendation alone.
- No incident closes while critical actions remain open without an authorised residual-risk decision.
- No dossier publication while included data is stale, unapproved or permission-incompatible.

