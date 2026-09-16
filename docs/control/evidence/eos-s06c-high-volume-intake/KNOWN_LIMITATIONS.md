# Known Limitations — EOS-S06C

1. Promotion runs in-process via request/`advance` loops (Railway Event OS), not a separate worker process — leases/checkpoints still apply.
2. XLSX reader is a minimal OOXML path (first sheet); complex shared-string rich text may flatten.
3. Mapping templates (saved org-wide profiles) are not persisted beyond per-job editions in this delivery.
4. Virtualised review table is scroll-bounded (200-row window in UI) — full correction CSV export covers the rest.
5. `TDR-S06-006` remediated only for intake view/progress reads; broader authorizeQuery clones remain OPEN.
6. Live CAP1000 product replacement and independent browser verification are pending post-deploy.
7. Postgres-backed scale timings may differ from local memory; live verification must re-measure.
8. Open programme debts TDR-S06A-001, TDR-S06-002–008 remain OPEN (none silently closed).
9. Documentation-head mismatch and CT0 validator disposition remain unresolved production blockers.
