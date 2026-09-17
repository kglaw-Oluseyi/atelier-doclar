# Queue, lease and recovery

- Claim: `FOR UPDATE SKIP LOCKED` by priority + creation time
- Increment lease epoch on claim; fence every settlement by epoch
- Heartbeat ~5s; qualified lease window; requeue once after expiry
- Cancellation: stop frame → CP-SAT stop → grace → SIGTERM → process-group kill
- Child crash: retry once; reproducible crash → incident + `SOLVER_FAULT`
- Duplicate workers: epoch mismatch prevents settlement
