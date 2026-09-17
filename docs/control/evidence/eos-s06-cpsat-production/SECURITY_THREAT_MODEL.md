# Security threat model (summary)

| Threat | Control |
|--------|---------|
| Untrusted child | Schema, size, hash, request binding, independent verification |
| Command injection | Spawn argv without shell; clean secret-free environment |
| Data leakage | Integer indices only; no names/contacts/rule prose |
| Network exfiltration | Child has no network credentials/calls |
| Privilege escalation | Least-privilege DB role; no provider secrets on worker |
| Ingress attack surface | No public domain; no listening app port |
