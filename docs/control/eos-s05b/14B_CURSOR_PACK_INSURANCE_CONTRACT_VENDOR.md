# EOS-S05B Detailed Cursor Pack B Insurance Contract and Vendor Intelligence

**Status:** Ratification draft — not independently executable

## Unit RPC-11 Rule and source library

Build source editions and rule editions exactly as document 02. UI must show publisher, locator, jurisdiction, effective dates, last verified, review due, status and supersession. Creating a rule from a source produces a draft. Only a distinct authorised reviewer can approve.

Do not ship supplied statutory/venue claims as unconditional defaults. Seed synthetic examples marked `DISCOVERY` unless an accepted source and reviewer exist.

## Unit RPC-12 Policy registry

Build create/edit/supersede journeys for organisation and event policies. Fields: type, insurer party, encrypted number, insured parties, dates, limits by coverage, deductibles, territorial/activity scope, assets, endorsements/exclusions, source documents and verification.

Frontend: progressive sections; concise summary; status banner; explicit unknowns; document preview/retrieval; change history. Never expose encrypted values in DOM/URL/logs.

## Unit RPC-13 Certificate verification

Implement maker/checker verification. Reviewer confirms cited fields, discrepancies and document safety. Rejection preserves upload and reason. Expiry is derived at read/evaluation time and cannot be defeated by stale cached status.

Tests: maker self-verify, forged filename, conflicting dates, duplicate bytes, inaccessible object, expired certificate and projection denial.

## Unit RPC-14 Applicability resolver

Implement pure deterministic resolver. Inputs are explicit fact editions, approved rule editions and current policy editions. Output trace names every input and branch. Missing fact → `INDETERMINATE`. A `DOES_NOT_APPLY` result needs the rule path, not absence of a policy.

```ts
type Applicability = {
  requirementKey:string;
  decision:"APPLIES"|"DOES_NOT_APPLY"|"INDETERMINATE"|"STALE";
  factEditionIds:UUID[];
  ruleEditionId:UUID;
  trace:TraceStep[];
};
```

## Unit RPC-15 Coverage matcher

Match current verified policy editions against requirements without claiming claim acceptance. Compare period, parties, activity/venue, currency/limit basis, assets and exclusions. Preserve partial and unknown states.

## Unit RPC-16 Gap engine

Create immutable applicability snapshots and gap findings using document 04 taxonomy. Gap identity is stable by event, snapshot hash, requirement and affected object set. Same-hash reevaluation recognises an active authorised residual-risk decision; changed inputs do not inherit it.

## Unit RPC-17 Residual risk decisions

Decision choices: resolve with evidence, accept residual risk until expiry, add compensating control, reject applicability with cited basis, or keep unresolved. Maker/checker, reason, evidence, authority, expiry and immutable lineage required. Publication/readiness counts raw, overridden and unresolved separately.

## Unit RPC-18 Coverage UI

Build requirement-to-protection matrix, but responsive mobile becomes labelled cards. Default view answers “what is missing and what must I do?” Filters cannot hide the aggregate readiness warning. Do not rely on red/amber/green alone.

## Unit RPC-19 Clause template library

Implement immutable clause template editions with typed variables and jurisdiction. Draft, legal review, commercial approval and supersession are distinct. AI-proposed text is visually and structurally marked.

## Unit RPC-20 Contract clause studio

Build vendor/event clause application. Show rendered wording, variables, source template, deviations, review trail and execution evidence. Sanitize/escape markup. Strict placeholder multiset validation prevents missing or injected terms.

## Unit RPC-21 Safeguard terms

Model retention, performance security and liquidated-damages structures as contractual terms. Require basis, cap, currency, milestone and legal-review state. Never initiate payment or state enforceability. Create a permission-safe projection for Budget/Payment consumers.

## Unit RPC-22 Vendor risk evidence

Attach risk evidence to canonical vendors. Evidence entries have source, observation date, event relevance, verification and expiry. Corrections supersede. Never treat free-text allegations as verified incidents.

## Unit RPC-23 Deterministic vendor assessment

Implement approved model editions, factor calculation, unknown handling and trace. A band is not a decision. Manual approval/restriction/decline preserves computed band and requires evidence/reason/maker-checker. No protected attributes or proxies.

Mutation tests must show that removing missing-evidence detection or allowing trait influence causes evaluation failure.

## Unit RPC-24 Tiered assignment roster

Extend canonical event vendor assignments with role `PRIMARY|ALTERNATE|STANDBY`, critical function, availability window, readiness and commercial status. Prevent an assignment from being labelled booked/confirmed without source authority. Standby never means engaged.

## Unit RPC-25 Insurance contract vendor journeys

Playwright: CEO creates organisation policy draft; reviewer verifies; event lead evaluates applicability; unknown blocks readiness; evidence resolves; residual decision maker/checker; clause review; vendor assessment; Auditor read-only; System Administrator business denial; cross-event/API denial; 360/tablet/desktop/200%/keyboard.

Run Pack B focused tests and commit coherently. Continue to Pack C.

