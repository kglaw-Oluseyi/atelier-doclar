# Checkpoint 2 — Known limitations

1. **Full qualification matrix incomplete** — 10k tiny oracle, 1k differential, 480 planted, mutation ≥90% not fully run in this session; resumable `cpsat-qualification-runner.ts` exists.
2. **Local Python patch** — Docker image pins `3.12.14`; host venv may report `3.12.13`. Engine identity for production is the image pin.
3. **Block reservations** — Capacity-style min/max reservations projected only when `min/exact >= eligible count` (hard domain force). Partial banquet min&lt;eligible not yet modelled as Stage A cardinality constraints.
4. **Supervisor claim loop** — SQL schema + claim/heartbeat/fence helpers landed; full multi-process supervisor service against ephemeral PG not soak-tested for every chaos row in the pack.
5. **Diagnostics suite** — `DIAG_MAXSEAT` / `DIAG_MCS` / `DIAG_CORE` paths exist in purpose field but not fully evidenced for every certificate class.
6. **UI axe/keyboard** — Status panel prepared with focus-visible and 360px layout; formal axe CI gate not executed in this session.
7. **SBOM / vuln scan** — Dependency inventory and wheel hashes under `container-build/`; full CVE scanner output may be incomplete if scanner tooling unavailable.
8. **Proof rate at 1k** — B_TYPICAL returned `FEASIBLE` (not all tiers proven OPTIMAL) under 120s deterministic budget — matches pack: do not promise optimality at this scale.
9. **Heuristic still present** — intentional comparator; removal deferred to Checkpoint 3.
10. **Seat-relational HARD** — correctly rejected with model-v2 trigger; not implemented in v1.
