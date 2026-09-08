# EOS-S05A Build Ledger

**Slice ID:** `EOS-S05A`
**Prompt Control ID:** `MD-PR-S038`
**Starting baseline for MD-PR-S038:** `947e5829b9ed131369055fa51110942dbc46b273`
**Status:** `IMPLEMENTED / NOT ACCEPTED`
**Production:** unauthorised
**Catalogue accepted-slice count:** remains 5
**Implemented range:** `EEC-00`–`EEC-45`
**EOS-S06:** `NOT_STARTED / NOT_AUTHORISED`

## Units

| Unit | Title | Status |
|------|-------|--------|
| EEC-00–EEC-05 | Authority, architecture, permissions, primitives, persistence, opportunity | COMPLETE |
| EEC-06 | Consent and interview-session lifecycle | COMPLETE — consent spoof closed |
| EEC-07 | Source artefacts | COMPLETE — staff notes and private objects |
| EEC-08–EEC-10 | Coverage, extraction, contradiction | COMPLETE |
| EEC-11–EEC-14 | Canonical Brief, client confirmation, conversion, workbench | COMPLETE |
| EEC-15–EEC-25 | Budget Intelligence Engine and Budget Studio | COMPLETE |
| EEC-26–EEC-32 | Roadmap, critical path, change impact | COMPLETE |
| EEC-33–EEC-36 | Fixture AI boundary and interview orchestration | COMPLETE |
| EEC-37–EEC-40 | Client review and Executive Event Command | COMPLETE |
| EEC-41–EEC-45 | Integration, assurance, deployment, evidence | COMPLETE / NOT ACCEPTED |

## First-run failures

| Command | Classification | Root cause | Correction | Rerun |
|---------|----------------|------------|------------|-------|
| Equal-timestamp consent winner | Product defect | UUID sort could prefer an older WITHDRAWN over a later GRANT | Sort by insertion index after timestamps | Consent boundary tests pass |
| ACTIVE RESUME after withdrawal | Product defect | Service `alreadyApplied` returned the ACTIVE session before consent re-evaluation | Remove RESUME short-circuit | Consent boundary tests pass |
| Conversion wrong-hash retry | Product defect | `alreadyApplied` / version check hid the durable hash conflict | Existing receipt checked first; hash mismatch is `IDEMPOTENCY_CONFLICT` | Intelligence tests pass |
| Budget LOOKUP typecheck | Implementation defect | `LOOKUP` uses `input`, not `value` | Count/depth use `input` | `tsc` pass |

## Carried debt

| ID | Note |
|----|------|
| TDR-S05A-001 | CLOSED — private object path on the existing layout store; no public URL; no antivirus claim |
| TDR-S05A-002 | CLOSED — enquiry owner, stage and close forms on Discovery |

## Deployment

Event OS is the only deploy target. Control Tower is not redeployed. Deployment is not acceptance.
