# Known Limitations — EOS-S06C

1. Promotion runs in-process via request/`advance` loops (Railway Event OS), not a separate worker process — leases/checkpoints still apply.
2. XLSX reader is a minimal OOXML path (first sheet); complex shared-string rich text may flatten.
3. Mapping templates (saved org-wide profiles) are not persisted beyond per-job editions in this delivery.
4. Virtualised review table is scroll-bounded (200-row window in UI) — full correction CSV export covers the rest.
5. `TDR-S06-006` remediated only for intake view/progress reads; broader authorizeQuery clones remain OPEN.
6. New live CAP1000 product fixture (`af4a6b7e-…`, 1000-row job `d39e9bde-…`) is installed and reconciled by the governed intake engine but remains **awaiting independent verification** — not qualified.
7. Old partial CAP1000 `3d212906-…` remains quarantined (125 guests); not deleted.
8. Open programme debts TDR-S06A-001, TDR-S06-002–008 remain OPEN (none silently closed).
9. Documentation-head mismatch and CT0 validator disposition remain unresolved production blockers.
10. Concurrent second `PostgresPlatformStore` writers against live DB (scripts) can race the long-lived Event OS process; prefer product UI or single-writer windows for further live mutation.
