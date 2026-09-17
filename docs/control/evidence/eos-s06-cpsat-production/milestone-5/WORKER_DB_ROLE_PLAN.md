# Worker database role plan (Milestone 5 — prepare only)

Do **not** apply to production in this milestone. Credentials are not included.

## Intended role

`event_os_solver_worker` (name illustrative)

## Grants (least privilege)

```sql
-- illustrative; not applied
GRANT CONNECT ON DATABASE <event_os_db> TO event_os_solver_worker;
GRANT USAGE ON SCHEMA public TO event_os_solver_worker;

-- Solver queue / registry / evidence
GRANT SELECT, INSERT, UPDATE ON
  cpsat_solver_runs,
  cpsat_solver_run_events,
  cpsat_solver_workers,
  cpsat_solver_admission_events,
  cpsat_solver_candidates,
  cpsat_solver_proposals,
  cpsat_solver_infeasibility,
  cpsat_solver_counterfactuals,
  cpsat_solver_incidents
TO event_os_solver_worker;

-- Frozen snapshot reads required for verification (read-only)
GRANT SELECT ON
  /* seating package / layout / rules projection tables used by verification */
TO event_os_solver_worker;

-- Explicit denials / absences
-- NO DDL
-- NO provider tables
-- NO communications tables
-- NO access-administration mutation
-- NO broad organisation administration
```

## Runtime configuration

Worker uses `CPSAT_DATABASE_URL` separate from Event OS app credentials when deployed.

## Verification before production apply

1. Role can claim/heartbeat/settle and update worker registry.
2. Role cannot CREATE/ALTER/DROP.
3. Role cannot SELECT/UPDATE provider or communications tables.
4. Role cannot mutate access-administration tables.
