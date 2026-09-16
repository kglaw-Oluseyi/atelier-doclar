# CAP1000 Treatment Proposal — EOS-S06C

## Exact identity (quarantined — historical)

| Field | Value |
|-------|-------|
| Event ID | `3d212906-529e-4bd8-b13f-b0c2a24e5fba` |
| Label / name | `[SYNTHETIC STRETCH QUALIFICATION] Capacity Stretch 1000` (incomplete install) |
| Guests (live read 2026-09-16) | 125 / 1000 |
| Disposition | **QUARANTINED** — not mutated; not for verification; retain until archival authority |

## New product CAP1000 fixture (awaiting independent verification)

| Field | Value |
|-------|-------|
| Event ID | `af4a6b7e-0424-46d5-b9e5-d0a26845173e` |
| Name | `[SYNTHETIC QUALIFICATION] EOS-S06C High-Volume Intake 2026-09-16` |
| 1000-row intake job | `d39e9bde-9cdd-415c-b8eb-f586f6623bdc` |
| Status | COMPLETED via governed HV intake (not sequential installer) |
| Reconciliation | 1000 created; chunksCommitted 4; guestTotal 50→1050 on shared event with prior 50-row job |
| Machine time | 1644 ms (server-side promote path) |
| Qualification | **NOT QUALIFIED** until Claude independent verification |

## Explicitly not done

- No resume of `capacity-live-install` sequential guest loop.
- No deletion of the partial CAP1000 event.
- Pre-existing dirty installer/manifest files left unstaged.
