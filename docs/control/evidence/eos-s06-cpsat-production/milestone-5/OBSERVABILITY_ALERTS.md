# Milestone 5 observability alerts / runbook definitions

Definitions only — external alert providers are **not** configured in this milestone.

| Alert | Trigger | Operator action |
|---|---|---|
| Verifier disagreement | Settlement fault `VERIFICATION_*` / assignment hash mismatch | Quarantine run; do not adopt; inspect incident row |
| Explanation failure | Explain phase fault | Fail closed; keep prior operational plan |
| Decomposition gap | Model/index map inconsistency | SOLVER_FAULT path; no adoption |
| Inconsistent proof | Confirmation FEASIBLE after INFEASIBLE | Immutable incident; never claim infeasibility |
| Repeated crash | N child non-zero exits / truncated frames | Drain worker; inspect image identity drift |
| Repeated lease expiry | Reaper faults above threshold | Check heartbeat/DB connectivity; self-fence |
| Worker unavailable | Admission refusals `WORKER_UNAVAILABLE` | Check registry READY heartbeats; no heuristic |
| Queue-depth threshold | Global/class depth near limit | Refuse new launches with busy wording |
| Worker build drift | Registry image digest ≠ approved candidate | Refuse READY until digest matches |

## Structured log fields (worker)

Emitted: `runId`, correlation via run row, `phase`, queue wait (created→started), deterministic/wall times, model stats, result/lifecycle, fault subtype, lease/reaper actions, child resource usage, worker build identity.

Never logged: guest names, contacts, raw request payload, rule prose, credentials, assignment rows.
