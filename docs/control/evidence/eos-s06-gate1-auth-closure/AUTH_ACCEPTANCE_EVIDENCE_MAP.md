# Authentication Remediation Acceptance Evidence Map

| Claim | Evidence |
|-------|----------|
| Initial 32–36s warm sign-in | `docs/control/evidence/eos-signin-performance-remediation/MEASUREMENT.md` |
| Root cause snapshot/replace + N+1 home clones | Same MEASUREMENT.md |
| Bounded auth mutation + home view fix | Commits `04438ca`, `66e713a` |
| Accepted application SHA | `71317881384e38671295c3fda32d533c71c3f559` |
| Remediation deployment | `815dea7a-9ece-4165-be33-a7c9e5abb640` |
| Formal acceptance | `docs/control/EOS_AUTH_PERFORMANCE_REMEDIATION_ACCEPTANCE.md` |
| Full-clone debt not closed | `TDR-S06-006` OPEN |
