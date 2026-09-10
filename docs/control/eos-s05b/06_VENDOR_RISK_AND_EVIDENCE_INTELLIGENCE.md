# EOS-S05B Vendor Risk and Evidence Intelligence

**Status:** CEO review draft

## Vendor identity

Reuse the canonical vendor/party record and event assignment. Do not create another vendor master. Risk profiles are organisation-scoped; event assessments are event-scoped projections.

## Evidence categories

Insurance certificate, incorporation/tax evidence where authorised, licences, venue accreditation, references, capability evidence, asset evidence, subcontractor evidence, contract status, check-in history, incidents, recovery performance and approved internal observations.

## Explainable indicators

Indicators are facts with evidence, recency and direction, for example:

- required evidence missing or expiring;
- late/missed checkpoint rate;
- confirmed service failures by severity and recency;
- fallback activation frequency and recovery time;
- material contract exceptions;
- concentration/dependency risk;
- capacity mismatch against governed event requirements;
- unresolved incident actions.

Do not use neighbourhood, ethnicity, religion, gender, disability, nationality or inferred proxies. Do not scrape or import rumours. A score cannot be the sole basis for rejection.

## Assessment model

```ts
interface VendorRiskAssessmentEdition {
  id: UUID; vendorId: UUID; eventId?: UUID; evidenceCutoff: ISODateTime;
  indicators: { key: string; status: "POSITIVE"|"NEUTRAL"|"CONCERN"|"UNKNOWN"; evidenceIds: UUID[]; explanation: string }[];
  band: "LOWER" | "MODERATE" | "HEIGHTENED" | "CRITICAL" | "INDETERMINATE";
  recommendedControls: ProposedControl[];
  humanDecision?: "APPROVED" | "RESTRICTED" | "DECLINED";
  contentHash: Sha256;
}
```

The band is deterministic from an approved model edition. The UI shows contributing indicators and unknowns. Manual decisions require reason and cannot rewrite the computed assessment.

## Tiered roster

Primary, alternate and standby are event assignments, not rankings of intrinsic worth. Standby status records capability, availability window, evidence readiness, commercial status and contact protocol. Being “standby” does not mean booked.

