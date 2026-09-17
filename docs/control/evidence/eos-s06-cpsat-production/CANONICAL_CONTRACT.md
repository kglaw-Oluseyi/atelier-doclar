# Canonical solver contract (edition skeleton)

**Controlling pack:** `03_Canonical_Solver_Contract.docx`

- Canonical JSON + one JSON Schema shared by TypeScript and Python
- SHA-256 over RFC 8785 canonical JSON
- Framing: 4-byte big-endian length + UTF-8 JSON
- stdin = request; dedicated fd 3 = child responses
- Run-local integer indices only across the child boundary
- Identity maps remain in PostgreSQL
- Reject unknown contract/model versions, engine mismatch, closure-hash mismatch, oversized/malformed frames, lease-epoch mismatch

Full schemas land in P1 implementation; Checkpoint 1 proves framing with a stub child.
