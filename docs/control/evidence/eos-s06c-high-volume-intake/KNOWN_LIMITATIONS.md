# Known Limitations — EOS-S06C

1. Promotion runs in-process via request/`advance` loops (Railway Event OS), not a separate worker process — leases/checkpoints still apply.
2. XLSX reader is a minimal OOXML path (first sheet); complex shared-string rich text may flatten.
3. Mapping templates (saved org-wide profiles) are not persisted beyond per-job editions in this delivery.
4. Virtualised review table is scroll-bounded (200-row window in UI) — full correction CSV export covers the rest.
5. `TDR-S06-006` remediated only for intake view/progress reads; broader authorizeQuery clones remain OPEN.
6. Mixed-intake event `af4a6b7e-…` holds **1,050** guests (50+1000 on the same event). Job `d39e9bde-…` qualifies 1,000-row throughput only — it is **not** an exact CAP1000 population fixture.
7. Exact CAP1000 fixture is event `add41e21-…` / job `28a5370a-…` (0→1000, COMPLETED, replay no mutation). Automated browser closure PASS on SHA `04d5607…`; **independent Claude verification still required** — not accepted.
8. Old partial CAP1000 `3d212906-…` remains quarantined (125 guests); not deleted.
9. Open programme debts TDR-S06A-001, TDR-S06-002–008 remain OPEN (none silently closed).
10. Documentation-head mismatch and CT0 validator disposition remain unresolved production blockers.
11. Concurrent second `PostgresPlatformStore` writers against live DB (scripts) can race the long-lived Event OS process; prefer product UI or single-writer windows for further live mutation.
