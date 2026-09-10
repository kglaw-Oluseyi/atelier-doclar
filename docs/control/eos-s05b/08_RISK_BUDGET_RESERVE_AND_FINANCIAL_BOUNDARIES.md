# EOS-S05B Risk Budget Reserve and Financial Boundaries

**Status:** CEO review draft

## Integration doctrine

Risk finance is a projection into the accepted EOS-S05A Budget Intelligence Engine. It must not create a second event budget.

## Driver model

```ts
type RiskBudgetDriver =
 | { kind: "INSURANCE_PREMIUM_ASSUMPTION"; money: Money; evidenceIds: UUID[] }
 | { kind: "DEDUCTIBLE_EXPOSURE"; money: Money; policyEditionId: UUID }
 | { kind: "CONTRACT_RETENTION"; basisPoints: number; contractEditionId: UUID }
 | { kind: "CONTINUITY_RESERVE"; basis: "FIXED"|"BUDGET_PERCENTAGE"|"EXPOSURE_MODEL"; value: number; reason: string }
 | { kind: "FALLBACK_REPLACEMENT_EXPOSURE"; money: Money; vendorAssignmentId: UUID }
 | { kind: "UNQUANTIFIED_EXPOSURE"; reason: string; evidenceIds: UUID[] };
```

All money uses integer minor units and explicit currency. Percentages use basis points. A suggested 5% reserve is a scenario assumption with provenance, never a default presented as truth.

## Scenario behaviour

- Governing Budget truth remains the current approved/published budget scenario.
- Risk modelling creates immutable successor scenarios.
- Unknown amounts remain unknown; no invented premium or replacement price.
- Quotes expire and stale inputs block “current” labelling.
- Every result provides input snapshot, formula/model edition, trace, variance and source evidence.
- Contingency, reserve allocation, commitment, invoice, payment and actual spend remain distinct.

## Reserve deployment

EOS-S05B can request and authorise an internal reserve allocation decision. Actual engagement and financial movement remain downstream protected actions. UI language: “Authorise fallback plan” and “Request reserve allocation”; never “Deploy funds” unless a future payment slice supplies that authority.

## Client presentation

Client views show approved high-level protection allocations and implications without exposing vendor negotiations, internal risk bands, legal advice, deductibles or staff-only contingency tactics unless explicitly approved for disclosure.

