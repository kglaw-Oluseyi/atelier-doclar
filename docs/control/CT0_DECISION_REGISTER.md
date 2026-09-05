# CT0 Decision Register

**Slice:** MD-CT0  
**Rule:** Cursor analyses and recommends. Cursor does not invent CEO decisions or approve protected gates.

Decisions below are either (a) controlling because the CT0 instruction itself supplied them, or (b) **proposals**. Proposals are not implementations.

## Controlling decisions supplied to CT0

### CT0-D-DAG — Programme sequencing

- **Issue:** Multiple historical orderings (CRQ-007 / RD-B0-003).
- **Decision:** Model a dependency DAG. Executive critical path: Foundation → Event OS foundations → Event-Day Runtime foundations → Premium Ushering → Academy → Marketing OS → Integration → Validation. Pull only bounded prerequisites forward.
- **Authority:** CT0 §7.1 (this instruction).
- **CEO further decision required?** No for adopting the DAG method. Yes if the CEO later rejects the executive progression.
- **Reversible:** Yes — DAG edges can be amended with a recorded decision.

### CT0-D-RUNTIME — Event-Day relationship

- **Issue:** Event OS Slice 8 vs Event-Day v2 (CRQ-007 / GAP-012).
- **Decision:** Event OS = control plane. Event-Day Runtime = distinct runtime product. Historical Slice 8 is retained and mapped, not executed as a parallel runtime.
- **Authority:** CT0 §7.2.
- **CEO further decision required?** No for the mapping principle. Yes if CEO later authorises executing Slice 8 as-is.

### CT0-D-SCHEMA — Manifest vs SliceRecord

- **Issue:** JSON schema ≠ Zod SliceRecord (CRQ-008).
- **Decision:** Related but distinct. Manifest = declared work contract. SliceRecord = evidence-derived projection. Do not delete fields to force identity.
- **Authority:** CT0 §7.3.
- **CT1 blocker if ignored?** Yes.

### CT0-D-MONOREPO — Single physical repository

- **Issue:** Historical separate-repo language (CRQ-009).
- **Decision:** Only `kglaw-Oluseyi/atelier-doclar`. Historical “Academy/Marketing/Ushering repository” means logical module/package.
- **Authority:** CT0 §7.4.
- **CEO further decision required?** Only if another repository is later wanted.

### CT0-D-ACA-ID — Academy prompts 09–12

- **Issue:** Bodies exist; native IDs not located (CRQ-002).
- **Decision:** Do not invent historical native IDs. `MD-PR-xxxx` is permanent identity. Descriptive aliases allowed.
- **Authority:** CT0 §7.5.

### CT0-D-QUALIFY — Native ID collisions

- **Issue:** Academy S10 vs Event OS S10 (CRQ-003).
- **Decision:** Qualify every future execution as `PRODUCT | MD-PR-xxxx | native`. Do not rename historical IDs.
- **Authority:** CT0 §7.6.

### CT0-D-CLAUDE — Role compatibility

- **Issue:** CT standing contract vs successor handover (CRQ-012).
- **Decision:** Do not rewrite sources. Execution uses `EXECUTION_COMPATIBILITY_REGISTER.md`. Claude-as-vendor remains separate (CRQ-013).
- **Authority:** CT0 §4.

### CT0-D-ROUTE — `/programme`

- **Issue:** Control Tower base route.
- **Decision:** Treat `/programme` as accepted programme direction. Do not implement the route in CT0.
- **Authority:** CT0 §10 and addendum executive decision.

## Architecture proposals (not implemented)

| ID | Topic | Recommendation | Alternatives | Rationale | Impact | Reversible? | CEO required? | CT1 blocker? |
|----|-------|----------------|--------------|-----------|--------|-------------|---------------|--------------|
| CT0-P-TS | Language | TypeScript, strict | JS, mixed | Ratified in CT/R programmes | Future packages | Costly later | No (functional requirement already ratified) | Yes if CT1 writes code |
| CT0-P-ZOD | Validation | Zod | Valibot, custom | Already in ratified contracts | CT1 loader | Yes | No | Yes if CT1 writes code |
| CT0-P-PKG | Package manager | pnpm workspaces | npm, yarn | Historical Event OS S1/Marketing preference; lockfile hygiene | Monorepo layout | Yes | No | Yes before installing CT1 deps |
| CT0-P-MONO | Workspace | Single repo packages (`programme-control`, later `apps/*`) | Multi-repo | CT0-D-MONOREPO | All products | Repo-split needs CEO | No | No for validator-only CT1 |
| CT0-P-NEXT | App framework | Next.js App Router **for later UI** (CT4+) | Remix, plain React | Historical preference in Event OS/Academy/Marketing; **ABSENT** now | UI slices | Costly after CT4 | Yes before locking estate-wide UI | **No** for CT1 |
| CT0-P-CSS | Design system | Tailwind + accessible primitives later | CSS modules | Historical Tailwind; Radix not evidenced in extracts | CT4 | Yes | No | No |
| CT0-P-PG | Database | PostgreSQL when persistence starts (CT2) | SQLite, other | Historical + Event-Day SQL dialect | CT2 | Costly after data | Yes before production data | **No** for CT1 |
| CT0-P-PRISMA | ORM | Defer; historical Prisma is preference | Drizzle, SQL | Do not install in CT0/CT1 | Later | Yes until adopted | No | No |
| CT0-P-OIDC | Auth | Private `/programme` requires auth before CT4 goes live; IdP unchosen | Auth.js + unspecified IdP | Functional vs product | All private routes | Costly | **Yes** | **No** for CT1 |
| CT0-P-GHA | CI | GitHub Actions on this repo | Other CI | Matches authorised GitHub | CT3 | Yes | No | No for CT1 unit validation; yes for “fail CI” as a hosted fact |
| CT0-P-RAIL | Hosting | Railway remains historical preference only | Other host | No Railway interaction authorised in CT0 | Deploy | Infra | **Yes** | **No** |
| CT0-P-RAG | RAG vendor | Unchosen; architecture boundary only | Managed vs local | CT7 | CT7 | Yes until indexed | **Yes** before CT7 build | No |
| CT0-P-Q | Queue | Defer to CT3 | In-process, vendor queue | Webhooks not built | CT3 | Yes | No | No |
| CT0-P-OBS | Observability | Defer; required by CT9 | — | Not built | Later | Yes | No | No |
| CT0-P-TEST | Test stack | Defer install; CT1 must still add tests if it writes a package | node:test, vitest | Ratified CT test breadth | CT1 | Yes | No | If CT1 writes code, tests are required by CT1 itself |

## What Cursor did not decide

Identity provider product, Railway project creation, production database, biometric vendor, intelligence-model vendor, and any protected gate approval.
