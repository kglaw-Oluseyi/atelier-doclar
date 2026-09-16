# CT0 Historical Validator Failure Disposition — MD-PR-S080

**Control ID:** `MD-PR-S080`
**Date:** `2026-09-16`
**Disposition ID:** `DISP-S080-CT0-VALIDATOR-001`

## Validator name and scope

| Field | Value |
|-------|-------|
| Validator | `docs/control/tools/validate_ct0.py` |
| Scope | CT0 **control-artefact** validation only (prompt register/map lock at 693; catalog/state projection integrity; no dependency cycles; source paths exist; forbid root Next/Dockerfile scaffold) |
| Not in scope | Product test suites; Event OS runtime; `pnpm programme:validate` (programme-domain successor validator) |

## Historical failure status

**RETAINED — FAILING when executed.**

Reproduced during MD-PR-S080 governance prep (2026-09-16):

```
CT0 VALIDATION FAIL
 - EOS-S01 illegally ACCEPTED
 - EOS-S02 illegally ACCEPTED
 - EOS-S03 illegally ACCEPTED
 - EOS-S04 illegally ACCEPTED
```

Root rule in the historical validator: any `status == "ACCEPTED"` in `programme/slices/state-projection.json` is treated as illegal. That freeze rule predates formal Event OS slice acceptance under later Prompt Control IDs.

## Preserved evidence location

| Artefact | Path |
|----------|------|
| Validator script (unchanged by this disposition) | `docs/control/tools/validate_ct0.py` |
| State projection (contains legitimate ACCEPTED product slices) | `programme/slices/state-projection.json` |
| Dependency-semantics ADR (Foundation remains intentionally not ACCEPTED) | `docs/control/ADR_DEPENDENCY_SEMANTICS.md` |
| This disposition + reproduction | `docs/control/evidence/eos-s06-s080-governance-prep/CT0_HISTORICAL_VALIDATOR_FAILURE_DISPOSITION.md` |
| Validation capture | `docs/control/evidence/eos-s06-s080-governance-prep/VALIDATION.md` |

The failure is **not** deleted, rewritten or concealed. The validator script is **not** weakened by this disposition.

## Supersession / bypass / acceptance by another control

| Question | Finding |
|----------|---------|
| Superseded for programme DAG validation? | **YES** — executable programme validation is `pnpm programme:validate` (`@maison-doclar/programme-domain`), with dependency kinds from `ADR_DEPENDENCY_SEMANTICS.md` / MD-GR1 |
| Bypassed? | **NO** — CT0 script remains runnable; failure is retained when invoked |
| Accepted as green? | **NO** — must not be represented as CT0 VALIDATION PASS |
| Product ACCEPTED statuses authorised by later controls? | **YES** — EOS-S01…S06(+A) acceptance records under their Prompt Control IDs; catalogue count 6 |

## Gate impact

| Gate | Impact |
|------|--------|
| Affects EOS-S06B | `REQUIRES TRIAGE` — historical CT0 freeze conflict is not an S06B product defect; bounded S06B authority must not treat CT0 FAIL as current-product greenwash either |
| Affects EOS-S06C | `REQUIRES TRIAGE` — same |
| Affects production authorisation | `BLOCKING UNTIL DISPOSITIONED` pending control-owner decision on CT0 freeze vs successor validators |

## Required remediation or compensating control

Compensating control already in force for programme correctness:

- Use `pnpm programme:validate` as the relevant programme validator for current Event OS progression.
- Keep Foundation slices intentionally `IN_REVIEW` (do not mass-ACCEPT Foundation to appease CT0).
- Keep product ACCEPTED statuses that were formally accepted under later controls.

Required remediation options (owner chooses):

1. Issue a controlled CT0-validator successor authority that distinguishes historical freeze checks from legitimate post-CT0 product acceptance; or
2. Explicitly accept retained CT0 FAIL as historical artefact with named owner, while binding release gates to programme-domain validation; or
3. Other owner-approved remediation that does **not** delete evidence or greenwash the historical failure.

## Named owner

| Field | Value |
|-------|-------|
| Owner | `REQUIRES CONTROL OWNER REVIEW` — Event OS / AI CTO for interim custody; CEO for any waiver that affects production gates |

## Revalidation requirement

| Requirement | Value |
|-------------|-------|
| Re-run CT0 validator | Required whenever CT0 artefacts or state-projection acceptance semantics change; retain FAIL output until disposition (1) or (2) above is signed |
| Do not claim PASS | CT0 VALIDATION FAIL remains the honest result until remediated or explicitly accepted as retained historical fail |
| Programme gate | `pnpm programme:validate` remains mandatory for current programme corpus |

## Insufficient-evidence fallback (applied where owner choice is unsigned)

| Field | Value |
|-------|-------|
| STATUS | `REQUIRES CONTROL OWNER REVIEW` |
| FAILURE | `RETAINED` |
| PRODUCTION AUTHORISATION | `BLOCKED UNTIL DISPOSITIONED` |

## Explicit preservation statement

This disposition does not delete, rewrite or conceal the historical CT0 validator failure. It does not modify `validate_ct0.py` to force a pass.
