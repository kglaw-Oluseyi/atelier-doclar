# EOS-S06 — Layout-Binding Maker-Checker Target Mismatch

## Root cause

`proposeLayoutBinding` inserted a new DRAFT without superseding prior pending drafts. The Event Director projection used `layoutBindings.find(state === DRAFT)`, which returned the **oldest** DRAFT (`e5cc0f54…` / S073 hall) and hid the Planner’s newer proposal (`adae3f65…` / Synthetic seating hall).

## Durable records

| Record | ID | Hash | State (final) | Notes |
| --- | --- | --- | --- | --- |
| Correlation `afa15268…` proposal | `adae3f65-dd64-48bc-ba24-676998b7975c` | `dc84e03a733f` | **DRAFT** (kept for Claude Stage A) | Synthetic seating hall · pub `1a66799c…` · proposed 2026-09-15T09:50:27Z by planner `…0043` · version 1 |
| Older pending | `e5cc0f54-7ee6-4e4a-a726-9d82ac9d710e` | `6d601448ca59` | **SUPERSEDED** | S073 hall · created 2026-09-15T01:32:11Z · reconciled with audited supersession |

## Canonical pending-draft policy

**At most one DRAFT seating layout binding per event.**

- New propose supersedes prior DRAFTs (audited via propose mutation).
- Projection selects that single pending proposal (latest if residue remains).
- Activation requires binding ID + publication ID/hash + expected version to match that proposal; maker ≠ checker.

## Correction / deploy

- Commit / deployed SHA: `a32d4f7e436badcb1dff7d6f364b57b80a3aabe7`
- Railway: event-os production only; Control Tower untouched
- Posture: POSTGRES · APPLIED · productionAuthorised:false · providers INACTIVE

## Live Stage A (unactivated)

- Binding: `adae3f65-dd64-48bc-ba24-676998b7975c`
- Layout: Synthetic seating hall
- Hash: `dc84e03a733f`
- Layout B remains eligible: hash `785100a246bd` · 3 tables

## EOS gates

EOS-S06 unaccepted · EOS-S07 unstarted
