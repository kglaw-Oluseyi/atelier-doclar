# EOS-S05B Insurance Coverage and Gap Engine

**Status:** CEO review draft

## Outcome

The engine produces an explainable event protection matrix. It never claims that a loss will be paid.

## Policy catalogue

Support extensible types including employee compensation, group life, public liability, professional indemnity, equipment all-risk/inland transit, fire/special perils/burglary, event cancellation/postponement and contingent business interruption/extra expense. Types are catalogue keys, not hard-coded legal conclusions.

## Applicability snapshot

At a governed event milestone, resolve:

```ts
interface CoverageApplicabilitySnapshot {
  eventId: UUID; evaluatedAt: ISODateTime; ruleEditionIds: UUID[];
  factEditionIds: UUID[]; policyEditionIds: UUID[];
  requirements: CoverageRequirementResult[];
  overall: "READY" | "GAPS" | "INDETERMINATE" | "STALE";
  contentHash: Sha256;
}
```

Each requirement result contains required/optional/unknown status, source, applicable limit basis, policy match, date overlap, named-insured/party alignment, venue evidence, exclusions requiring review, missing facts and a readable trace.

## Gap taxonomy

- missing policy or certificate;
- expired/expiring before event close-out;
- insufficient or indeterminate limit;
- event/venue/activity not evidenced;
- party/name mismatch;
- asset or transit scope mismatch;
- exclusion/restriction needing broker or counsel review;
- unverified document;
- rule or source stale;
- evidence inaccessible;
- duplicate/conflicting certificate.

## Readiness rules

`READY` requires every mandatory approved rule to resolve with current verified evidence or an authorised residual-risk decision. `INDETERMINATE` is blocking at protected milestones. A waiver/accepted risk needs named authority, reason, compensating controls, expiry and maker/checker.

## Document ingestion

Uploads use private object storage, MIME/signature inspection, size limits, safe filenames, hash deduplication, malware status vocabulary (`NOT_SCANNED`, `SCAN_PENDING`, `CLEAN`, `QUARANTINED`, `SCAN_FAILED`) and permission-safe retrieval. In-process content safety is not represented as general antivirus.

OCR/extraction creates proposals with page/region citations and confidence. Human verification is required for policy number, dates, limits, insured parties, endorsements and exclusions. Values never become governing solely because OCR found them.

## Milestone hooks

Provide configurable evidence gates at planning, contracting, 72h, 24h, 6h and event-live milestones. These names are initial templates; events may adopt different checkpoints through approved policy editions.

