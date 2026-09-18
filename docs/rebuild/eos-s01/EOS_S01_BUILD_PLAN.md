# EOS-S01 build plan

| Build unit  | Capabilities                                       | Packages and files                                | Completion gate                         |
| ----------- | -------------------------------------------------- | ------------------------------------------------- | --------------------------------------- |
| S01-BLD-001 | Toolchain                                          | Root package.json, pnpm-lock.yaml, tsconfig       | Install and typecheck                   |
| S01-BLD-002 | S01-DATA-001 to S01-DATA-016                       | packages/foundation/migrations/001_foundation.sql | Second migrate does not drift           |
| S01-BLD-003 | S01-PERM                                           | permissions.ts, policy.ts                         | Registry and role tests                 |
| S01-BLD-004 | S01-CAP-001 to S01-CAP-006                         | service.ts sign-in, sign-in page                  | Fixture sign-in and pending state       |
| S01-BLD-005 | S01-CAP-030, S01-CAP-031, S01-CAP-037, S01-CAP-038 | service-admin.ts                                  | CEO maker/checker and privilege refusal |
| S01-BLD-006 | S01-CAP-034 to S01-CAP-036                         | audit tables and audit page                       | Export request and settle               |
| S01-BLD-007 | S01-UI-001                                         | globals.css                                       | Tokens documented in S01-DEC-004        |
| S01-BLD-008 | S01-CAP-007, S01-CAP-022                           | app layout                                        | Navigation present                      |
| S01-BLD-009 | S01-CAP-008 to S01-CAP-015, S01-CAP-042            | client pages                                      | Create and read client                  |
| S01-BLD-010 | S01-CAP-016 to S01-CAP-024                         | event and MEF pages                               | Event create writes fourteen slots      |
| S01-BLD-011 | S01-CAP-025 to S01-CAP-033                         | department, workstream, access, My Work           | Department Lead test                    |
| S01-BLD-012 | S01-CAP-039 to S01-CAP-041, S01-DEP                | health routes, Dockerfile                         | Live and ready probes                   |

Dependency order is BLD-001, BLD-002, BLD-003, then BLD-004 through BLD-012. Every S01-CAP identifier is named above.
