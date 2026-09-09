# EOS-S05A Build Ledger

**Slice ID:** `EOS-S05A`
**Prompt Control ID:** `MD-PR-S039`
**Starting baseline for MD-PR-S039:** `566df703672209007da9ee3de180a8913a7be78b`
**Status:** `REMEDIATED / NOT ACCEPTED`
**Production:** unauthorised
**Catalogue accepted-slice count:** remains 5
**Implemented range:** `EEC-00`–`EEC-45` with honest PARTIAL depth after S039
**EOS-S06:** `NOT_STARTED / NOT_AUTHORISED`

## Units

| Unit | Title | Status |
|------|-------|--------|
| EEC-00–EEC-05 | Authority, architecture, permissions, primitives, persistence, opportunity | COMPLETE |
| EEC-06 | Consent and interview-session lifecycle | COMPLETE — consent spoof closed |
| EEC-07 | Source artefacts | COMPLETE — staff notes and private objects |
| EEC-08–EEC-10 | Coverage, extraction, contradiction | COMPLETE |
| EEC-11–EEC-14 | Canonical Brief, client confirmation, conversion, workbench | PARTIAL |
| EEC-15–EEC-25 | Budget Intelligence Engine and Budget Studio | PARTIAL — synthetic evidence cannot claim COMPLETE |
| EEC-26–EEC-32 | Roadmap, critical path, compression, Roadmap Studio | PARTIAL |
| EEC-33–EEC-36 | Fixture AI boundary and change adapters | PARTIAL |
| EEC-37–EEC-40 | Conversational interview and Executive Event Command | PARTIAL — EEC-39 evaluation corpus still stub |
| EEC-41–EEC-45 | Integration, assurance, deployment, evidence | PARTIAL / NOT ACCEPTED |

## First-run failures

| Command | Classification | Root cause | Correction | Rerun |
|---------|----------------|------------|------------|-------|
| Equal-timestamp consent winner | Product defect (S038) | UUID sort could prefer an older WITHDRAWN over a later GRANT | Sort by insertion index after timestamps | Consent boundary tests pass |
| ACTIVE RESUME after withdrawal | Product defect (S038) | Service `alreadyApplied` returned the ACTIVE session before consent re-evaluation | Remove RESUME short-circuit | Consent boundary tests pass |
| Conversion wrong-hash retry | Product defect (S038) | `alreadyApplied` / version check hid the durable hash conflict | Existing receipt checked first | Intelligence tests pass |
| Budget LOOKUP typecheck | Implementation defect (S038) | `LOOKUP` uses `input`, not `value` | Count/depth use `input` | `tsc` pass |
| Live whole-slice E2E extract | Test defect (S038) | Journey omitted AI-analysis consent | Grant AI-analysis before extract | Rerun after test correction |
| Short-lead infeasibility first assertion | Implementation defect (S039) | Compressible-undefined milestones were treated as fully compressible, so 1 available day became COMPRESSED | Irreducible duration includes non-compressible lead times and a one-day floor for compressible work | Depth tests pass |
| First Event OS deploy after S039 | Product defect (S039) | V2 mutated current cost rules/templates and the V1 receipt at the same document version, so Postgres CAS refused boot | Increment versions on durable mutations; V1 replay no longer rewrites the receipt | Redeploy after correction |
| Live whole-slice change list empty | Product defect (S039) | Change idempotency matched org-wide summary, so a later engagement reused an earlier proposal | Bind semantic hash and alreadyApplied to engagement | Intelligence tests pass |
| Planner Budget Studio showed Restricted | Product defect (S038/S039) | Redaction used the whole role catalogue, so every staff actor appeared to hold READ_ONLY_AUDITOR | Redact only when the actor has an active auditor assignment | Planner sees integer minor units; auditor still redacted |
| Live whole-slice private-object assert | Test defect then product defect (S039) | Immediate retrieve count raced the reload; live store then rejected `discovery/` keys as unsafe | Wait for retrieve or failure; allow governed `discovery/` object keys | Live E2E rerun |
| Live revoked client link still readable | Product defect (S039) | Expired or revoked tokens used the staff AUTH_REQUIRED public copy “Sign in is required.” | Client access now returns “This review link is not available.” | Live E2E rerun |
| Live Event Command showed an older enquiry | Product defect (S039) | Command selected the first persisted engagement, so a later converted journey was invisible | Default to the latest updated engagement and add a selector | Live E2E rerun |
| Live SysAdmin Home crashed after sign-in | Product defect (S039) | Home called listEvents/listClients without catching a SysAdmin business-authority denial | Treat those reads as empty assigned work | Live E2E rerun |
| Live whole-slice after Home fix | Test defect (S039) | `loginAs` shadowed the staff `identity` argument, so Playwright could not load the S05A specs | Rename the signed-in display name | Live E2E passed on `f645a39362c6aab0796df1d65c7c02d946732a2a` |

## Carried debt

| ID | Note |
|----|------|
| TDR-S05A-001 | CLOSED — private object path on the existing layout store |
| TDR-S05A-002 | CLOSED — enquiry owner, stage and close forms on Discovery |
| TDR-S05A-003 | OPEN — EEC-39 versioned evaluation corpus and red-team gate remain a schema stub |
| TDR-S05A-004 | OPEN — client investment view is framing only; no separate client budget route |
| TDR-S05A-005 | OPEN — roadmap dates are duration-based integers, not a full Lagos working-day calendar |

## Deployment

Event OS is the only deploy target. Control Tower remains `64642db9-db60-497b-a207-3d5d92fbcae3` and is not redeployed.

Application SHA with complete gates and live whole-slice/responsive E2E: `f645a39362c6aab0796df1d65c7c02d946732a2a`.

Verified Event OS deployment at that SHA: `c0d1ab98-4fc8-4cdc-a5ab-a6caee4161b0` SUCCESS. Ready: `alive: true`, `ready: true`, `POSTGRES`, `APPLIED`, `productionAuthorised: false`, `layoutAssetStore: READY`, `layoutExport: READY`.

A later documentation-only evidence commit may move GitHub `main`; Event OS is redeployed for SHA parity. Deployment is not acceptance.
