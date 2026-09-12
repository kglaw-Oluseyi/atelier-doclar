# EOS-S06 Implementation Ledger

**Prompt Control ID:** MD-PR-S072  
**Status:** IMPLEMENTED — NOT ACCEPTED — NOT READY FOR CLAUDE  
**Required baseline:** `844f107fc70e1eaa8995e0c7c49c0c42d52b9dd1`  
**Application SHA proven live:** `0d43a9e40ce63d4acb0c584f2f1ad308c400c412`  
**Authority:** MD-PR-S072 is the sole execution authority. S070/S071 artefacts remain readable as incompatible history.

This ledger does not accept EOS-S06. It does not authorise Claude, EOS-S07, real data or production operations.

## Freeze

| Item | Value |
|---|---|
| Application / deployed Event OS SHA | `0d43a9e40ce63d4acb0c584f2f1ad308c400c412` |
| Railway project / env / service | `atelier-doclar` / `production` / `event-os` |
| Live health SHA | `0d43a9e40ce63d4acb0c584f2f1ad308c400c412` |
| Persistence | POSTGRES, migrations APPLIED including additive `008_seating_truth_v2` |
| `productionAuthorised` | `false` |
| External providers | INACTIVE |
| Solver | In-process V2 compiler over retained TypeScript solver; validator `seating-v2-validator` does not import the V1 solver |
| Evaluation | `s06-eval-v2` / `s06-eval-contract-v2` / 30 cases locally RELEASE_READY; live persist unfinished |
| Legacy evaluation | `s06-eval-v1` STALE/INCOMPATIBLE — `legacy isolated or incomplete production-path assurance` |
| Last-known-good publication | Preserved and labelled `LEGACY S06 PUBLICATION — not V2 validated` |
| Control Tower | untouched |

## Sealed holdout

Not accessed, created or inferred.

## Successor

EOS-S07 is not started. `EOS_S06_ACCEPTANCE.md` was not created. Claude must not run until the unfinished live publication/replay sequences and live `s06-eval-v2` persist pass.
