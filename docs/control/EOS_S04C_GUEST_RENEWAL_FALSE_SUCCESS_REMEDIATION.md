# EOS-S04C guest-access renewal false-success remediation

**Slice:** `EOS-S04C`  
**Prompt Control ID:** `MD-PR-S020`  
**Status:** `IN_REVIEW / NOT READY`  
**Starting baseline:** `6ac7b668c371e880f75cf1bf916c27b8d3ab16fe`  
**Catalogue slice:** no  
**Production:** unauthorised  

Claude’s focused re-verification found one remaining blocker: a stale different-value **guest-access renewal** was rejected durably (`VERSION_CONFLICT`, rollback, failed audit) but the losing operator was not told. The page could remain a normal usable state and look successful.

Vendor-renewal conflict handling was already correct. This batch aligns guest-renewal operator feedback with that path. Domain CAS, persist rollback and audit are unchanged.

## Operator-visible repair

When a stale different-value guest renewal receives `VERSION_CONFLICT`:

- durable persist completes before any issued-link flash or success redirect
- a single `role="alert"` conflict uses the shared `AtelierOperationalState` copy
- focus moves to the conflict summary
- leftover `ok=` success copy and issued-access links are suppressed
- guest/vendor lifecycle mutation controls stay locked until reload
- exactly one `Reload the current record` action consumes the conflict flash
- reload shows the durable winning expiry/version and restores controls

The existing valid access grant remains. The operator is not asked to infer failure from the audit ledger.

## Out of scope

Vendor mint/lifecycle, merchandise creation, consent, Academy, permissions and domain behaviour are not reopened. EOS-S04D–F and EOS-S05 are not started. EOS-S04C is not accepted.
