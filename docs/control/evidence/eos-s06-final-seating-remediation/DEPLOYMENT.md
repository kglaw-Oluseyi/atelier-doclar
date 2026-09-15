# Deployment and live posture

## Application commit
- `d52ebe65b06116c08cefc5d2235f5f01eb241d0a` — HARD-rule conflict guard, layout-binding recover, successor fixture seed
- Follow-up: `c14e249` — reconcile script withdraw dedupe (script-only; production execute already used deployed script)

## Railway (event-os / production)
- Deployment ID: `f0e3c3d2-d5da-4a4e-a5b1-0f855bfad4be`
- Status: SUCCESS
- Source/application SHA: `d52ebe65b06116c08cefc5d2235f5f01eb241d0a` (`EVENT_OS_GIT_SHA`)
- Control Tower: not deployed (recent entries SKIPPED only)

## Live health
- ready: true
- persistence: POSTGRES
- migrationStatus: APPLIED
- productionAuthorised: false
- providers/adapters: INACTIVE

## Reconciliation
- Dry-run then execute: `node apps/event-os/scripts/reconcile-verification-hard-rule-conflicts.mjs`
- Withdrawn KEEP_APART: `ed40f48d-…`, `1f01c5ba-…`
- Preserved KEEP_TOGETHER for Adaeze/Bola pair includes `11c3f86c-…`
- contradictoryRemaining: []

## Live smoke (focused)
- Conflicting draft UI + refused activation (no data change): PASS
- Layout-binding propose settles without blank page: PASS
- Identical export replay without #418: PASS
- Successor A/B labels: initial live options still showed Ceremony-floor residue; fixture seed hardened to create A/B even when other CURRENT publications exist (follow-up deploy in same evidence train).

## Follow-up deploy (successor fixture on live residue)
- Commit: `52eb287fcd1e42ed3f4ab15bee024d0f018999ee`
- Deployment ID: `8532a584-eddf-40ca-9335-3eac7d39b087` SUCCESS
- Live propose options now include both `Synthetic seating hall` (A, 2 tables) and `EOS-S06 successor layout B` (B, 3 tables)
- ACTIVE seating layout binding at smoke time remained Ceremony floor (pre-existing). Claude should propose/activate layout A first, then run the successor journey onto layout B.
- Docs tip commit: `e78d9310b45325bf0f58f050e699cb0f96b62ed0`
