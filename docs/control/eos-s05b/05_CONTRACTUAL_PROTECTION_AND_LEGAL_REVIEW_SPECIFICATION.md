# EOS-S05B Contractual Protection and Legal Review Specification

**Status:** CEO review draft

## Clause families

Performance security, retention, liquidated damages, indemnity, insurance obligations, cancellation, force majeure, step-in/replacement, subcontractor evidence, data protection, confidentiality, intellectual property, service levels, notification, audit rights and termination.

## Clause studio

Clause creation starts from an approved template edition or an explicit blank draft. Variables are typed and labelled. Generated wording includes source template, jurisdiction, assumptions and required reviewers. AI suggestions are visibly proposed text, never approved text.

```ts
interface ClauseEdition {
  id: UUID; clauseId: UUID; jurisdiction: string; language: string;
  body: string; variables: ClauseVariableValue[]; sourceTemplateEditionId?: UUID;
  legalReviewStatus: "NOT_REVIEWED" | "CHANGES_REQUESTED" | "APPROVED";
  commercialApprovalStatus: "PENDING" | "APPROVED" | "REJECTED";
  contentHash: Sha256; supersedesEditionId?: UUID;
}
```

## Financial safeguards

Percentages and multipliers are inputs with provenance, currency basis, cap/floor, event criticality and authorised rationale. The platform must not label a clause a “penalty” or promise enforceability. It should surface proportionality, causation, cap and double-recovery questions for counsel.

Retention is a contract/payment-plan condition, not money withheld by this slice. Payment workflows may later consume an approved milestone projection; EOS-S05B does not initiate or release funds.

## Contract readiness

A vendor assignment cannot be marked protection-ready when mandatory clauses are absent, unapproved, unsigned where signature is required, expired, contradicted by amendments, or not linked to the current vendor/event engagement.

## Change control

Every amendment creates a new edition and recalculates event protection impact. The old edition remains retrievable. Material weakening triggers a maker/checker decision and an event-risk alert.

