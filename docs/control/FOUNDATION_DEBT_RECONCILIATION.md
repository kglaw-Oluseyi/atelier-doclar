# Foundation debt reconciliation matrix

**Slice:** MD-FC1  
**Method:** Re-evaluated against the repository. Historical statuses were not copied blindly. Resolutions are append-only.

| ID | Original statement | Severity | Owner | Blocker | Current evidence | Current truth | Classification | Required action | Resulting state |
|----|--------------------|----------|-------|---------|------------------|---------------|----------------|-----------------|-----------------|
| OI-CT0-001 | Framework/UI not implemented or CEO-signed | HIGH | AI CTO | no | `apps/control-tower` Next.js App Router | Framework exists | RESOLVED_BY_IMPLEMENTATION | Append resolution | RESOLVED |
| OI-CT0-002 | EOS-S08 must not be a parallel Event-Day runtime | CRITICAL | AI CTO | yes | Mapping still required; no Event OS code | Valid EOS architecture rule | VALID_EVENT_OS_BLOCKER | Keep open | OPEN |
| OI-CT0-003 | Academy readiness before R17 | HIGH | AI CTO | yes | Contract document only | Valid Event-Day dependency | VALID_EVENT_OS_BLOCKER | Keep open | OPEN |
| OI-CT0-004 | Hosting, IdP, Railway unchosen | HIGH | CEO | no | Railway intended (`atelier-doclar`); not provisioned; IdP unselected | Production decision | PRODUCTION_DECISION_REQUIRED | Keep open; record intent | OPEN |
| OI-CT0-005 | No executable application foundation | CRITICAL | AI CTO | was yes | Control Tower implemented CT4–CT9 | Historical condition false | RESOLVED_BY_IMPLEMENTATION | Close; transfer store note to OI-FC1-004 | RESOLVED |
| CT1-OI-001 | Phase.slices incomplete | LOW | AI CTO | no | PH-EVENT-OS-OPERATIONS now includes EOS-S08; validator enforces completeness | Clerical gap removed | RESOLVED_BY_IMPLEMENTATION | Keep validator | RESOLVED |
| CT1-OI-002 | programme-control.ts vs executable package | MEDIUM | AI CTO | no | `@maison-doclar/programme-domain` is executable; historical TS is documentary | Ambiguity closed | RESOLVED_BY_RECONCILIATION | Do not rewrite historical source | RESOLVED |
| CT1-OI-003 | Decision/Approval/Check/Timeline had no YAML | LOW | AI CTO | no | `programme/decisions/*.yaml` loaded; gates/open-items already YAML; approvals event-gated | Foundation corpus gap closed | RESOLVED_BY_IMPLEMENTATION | Keep approvals unsigned | RESOLVED |
| CT2-OI-001 | Production database unselected | HIGH | CEO | no | Memory/Filesystem `NON_PRODUCTION`; ADR recommends PostgreSQL | Not production persistence | PRODUCTION_DECISION_REQUIRED | Do not provision | OPEN |
| CT2-OI-002 | Weights absent; percentage UNAVAILABLE | MEDIUM | AI CTO | no | Calculator correctly returns UNAVAILABLE | Correct representation | RESOLVED_BY_RECONCILIATION | Do not invent weights | RESOLVED |
| CT3-OI-001 | Live GitHub HTTP client missing | MEDIUM | AI CTO | no | `GitHubHttpProvider`; tests use fetch doubles | Live-capable read client exists | RESOLVED_BY_IMPLEMENTATION | Keep live mode explicit | RESOLVED |
| CT3-OI-002 | HTTP webhook route deferred | MEDIUM | AI CTO | no | `POST /api/programme/github/webhook` | Route ready; remote hook not created | RESOLVED_BY_IMPLEMENTATION | Do not create remote webhook | RESOLVED |
| CT4-OI-001 | Production IdP unselected | HIGH | CEO | no | Synthetic/dev session; auth ADR | Dev auth ≠ production IdP | PRODUCTION_DECISION_REQUIRED | Do not bind a vendor | OPEN |
| CT4-OI-002 | Production hosting unselected | HIGH | CEO | no | Railway intended; `railway.toml`; not deployed | Prepared, not live | PRODUCTION_DECISION_REQUIRED | Do not deploy | OPEN |
| CT5-OI-001 | SVG not authoritative | LOW | AI CTO | no | Table + graph from `buildRoadmap` | Design decision | OPTIONAL_FUTURE_ENHANCEMENT | Keep table authoritative | RESOLVED |
| CT6-OI-001 | Process-local audit | MEDIUM | AI CTO | no | File/Memory `AuditRepository` | Process-local debt removed | RESOLVED_BY_IMPLEMENTATION | Production DB still CT2-OI-001 | RESOLVED |
| CT7-OI-001 | Model/RAG vendor unselected | HIGH | CEO | no | Deterministic extractive RAG | Vendor not required for EOS | OPTIONAL_FUTURE_ENHANCEMENT | Keep deterministic baseline | OPEN |
| CT7-OI-002 | Index rebuilt per request | MEDIUM | AI CTO | no | Fingerprint cache + optional file | Latency debt removed | RESOLVED_BY_IMPLEMENTATION | No search cluster | RESOLVED |
| CT8-OI-001 | External messaging unselected | MEDIUM | CEO | no | In-app notices exist | Optional | OPTIONAL_FUTURE_ENHANCEMENT | Do not select Twilio/email | OPEN |
| CT9-OI-001 | Hosting + database + live validation umbrella | HIGH | CEO | no | Split into precise items | Umbrella retired | RESOLVED_BY_RECONCILIATION | Use split items | RESOLVED |
| OI-FC1-001 | Live browser verification | HIGH | CEO | no | CEO accessed live Control Tower 2026-09-05; issues NONE | Human verification complete | RESOLVED_BY_HUMAN_VERIFICATION | Keep historical record | RESOLVED |
| OI-FC1-002 | Independent acceptance | CRITICAL | Independent | no | GATE-INDEPENDENT unsigned | Protected | PROTECTED_APPROVAL_REQUIRED | Named reviewer | OPEN |
| OI-FC1-003 | CEO production authorisation | CRITICAL | CEO | no | GATE-CEO-PRODUCTION unsigned | Protected | PROTECTED_APPROVAL_REQUIRED | CEO only | OPEN |
| OI-FC1-004 | Shared platform store must not fork | HIGH | AI CTO | no | `@maison-doclar/shared-platform` plus isolation tests | Shared ownership executable | RESOLVED_BY_EVENT_OS_ARCHITECTURE | Keep historical record | RESOLVED |
