# EOS-S05B Regulatory Insurance and Legal Evidence Model

**Status:** CEO review draft

## Evidence doctrine

Legal and insurance propositions are time-bound evidence. Store the proposition separately from the source and separately from the Maison Doclar decision that relies on it.

```ts
type AuthorityStatus = "DISCOVERY" | "COUNSEL_REVIEWED" | "APPROVED" | "SUPERSEDED" | "WITHDRAWN";
type SourceAuthority = "LEGISLATION" | "REGULATOR" | "VENUE" | "INSURER" | "BROKER" | "COUNSEL" | "CLIENT" | "INTERNAL_POLICY";

interface RiskRuleEdition {
  id: UUID;
  organisationId: UUID;
  ruleKey: string;
  jurisdiction: "NG" | "NG-LA" | string;
  proposition: string;
  sourceEditionIds: UUID[];
  effectiveFrom?: ISODate;
  effectiveTo?: ISODate;
  lastVerifiedAt: ISODateTime;
  nextReviewAt: ISODateTime;
  status: AuthorityStatus;
  approvedByPersonId?: UUID;
  approvedAt?: ISODateTime;
  contentHash: Sha256;
  supersedesEditionId?: UUID;
}
```

## Seeded source register

The initial catalogue may reference, but must not silently paraphrase as timeless law:

- Employees’ Compensation Act 2010 and NSITF official guidance for workplace injury compensation.
- Pension Reform Act 2014 and current PenCom guidance for group-life duties and applicability.
- Nigerian Insurance Industry Reform Act 2025 and current NAICOM guidance for the contemporary insurance framework.
- Nigeria Data Protection Act 2023 and NDPC guidance for personal data, incident and vendor-contact handling.
- Venue-issued requirements supplied as signed or otherwise attributable venue evidence.

Initial official-source anchors for the governed source register are the [NSITF publications](https://nsitf.gov.ng/publications/), [NSITF compensation guidance](https://nsitf.gov.ng/compensation/), [PenCom Pension Reform Act 2014 publication](https://www.pencom.gov.ng/wp-content/uploads/2018/01/PRA_2014.pdf), [NAICOM](https://naicom.gov.ng/) and [Nigeria Data Protection Commission](https://ndpc.gov.ng/). Cursor must not scrape these at runtime or represent availability of a URL as legal verification. A designated reviewer must capture the authoritative edition, relevant locator and current applicability before approval.

Every source entry records URI/document key, publisher, title, publication/effective date when known, retrieval date, file hash, page/section locator, quotation excerpt within copyright limits, and a human summary. An inaccessible or stale source cannot silently become an approved rule.

## Legal review gates

- `DISCOVERY` rules can generate questions and gap warnings but cannot be called mandatory.
- `COUNSEL_REVIEWED` rules show counsel identity, review date, jurisdiction and limitations.
- `APPROVED` rules can participate in compliance readiness.
- Expired, superseded or withdrawn rules fail closed and identify the replacement or required review.
- Material clause templates require maker/checker legal approval.
- The system displays “legal review required” rather than “legally enforceable” unless an approved review supports that assertion.

## Applicability

Applicability is a deterministic, traceable decision tree over explicit facts: organisation, jurisdiction, workforce relationship, venue, event dates, asset ownership/rental, vendor category, contract role and selected risk profile. Unknown inputs produce `INDETERMINATE`, never an inferred answer.

## Source refresh

Source monitoring may create a proposed superseding edition. It cannot rewrite an approved edition or automatically change an event snapshot. A human reviews the change impact and explicitly adopts or rejects it.

## Required warnings

The product is a decision-support and evidence system, not an insurer, broker or law firm. Client dossiers must distinguish Maison Doclar operational assurance from insurer coverage confirmation and legal advice.
