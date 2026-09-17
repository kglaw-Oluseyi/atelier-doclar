# Verifier specification (skeleton)

- Pure TypeScript; reads frozen authored authority
- **No import path** to compiler or Python model
- Verifies primitive together rules (not the same closure recomputation)
- Checks eligibility, capacity, locks, reservations, domains, apart, seat attributes, hashes, movement/preference tiers
- Mutation score target ≥90%; 100% detection of injected invariant violations
