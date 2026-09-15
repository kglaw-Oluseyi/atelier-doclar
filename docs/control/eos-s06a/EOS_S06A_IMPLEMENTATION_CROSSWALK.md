# EOS-S06A Implementation Crosswalk

Maps ratified requirements to delivered surfaces. Controlling documents: `01` product/governance, `02` technical, `06` Task Bank.

| Requirement | App surface | Server capability | Permission | Domain command / tool | Approval | Audit evidence | Automated test | Human verification |
|-------------|-------------|-------------------|------------|----------------------|----------|----------------|----------------|--------------------|
| Intelligence answer | Atelier Command workspace | Context Broker + interpret | `atelierCommand.view` / `instruct` | `intelligence.answer` | None (R0) | interpretation + receipt | `answers an event-scoped intelligence instruction` | Ask event question; check sources |
| Cross-event handoff | Instruction refuse + receipt | `refuseCrossEventRequest` | view/instruct | n/a | n/a | CROSS_EVENT_HANDOFF receipt | `hands off cross-event requests` | Ask org-wide question |
| Native plan + execute | Plan preview + Execute | Tool registry + executePlan | execute | domain tools | Plan confirm / maker-checker by tier | run receipt + correlation | `executes a read path` | Confirm then execute |
| Maker-checker | Approve as checker | `approvePlan` + `assertMakerChecker` | approve | R3 tools | Independent checker | plan status APPROVED | `requires maker-checker separation` | Planner submit; Director approve |
| Task Bank | Task Bank panel | `invokeTaskBankTask` | instruct | task → tools | Per task | taskInvocation + plan | Task Bank tests | Search, edit, compile |
| Event scope | Visible event context | scopeSnapshot + filters | all | all | n/a | eventId on all records | Task Bank event freeze | Attempt other-event edit |
| Browser retrieve | Browser tasks | `simulateBrowserRun` | browser | `browser.*` | Plan confirm | browserRuns/actions | allowlist/injection tests | Run browser task (sim) |
| Provider block | Comms send task | PDP R4 + posture | execute | `communication.sendApproved` | Immediate/blocked | BLOCKED step | `blocks external communications` | Attempt send |
| Auditor read-only | Workspace read | authorizeQuery | view/audit only | none mutating | n/a | DENIED on instruct | `refuses auditor mutation` | Auditor session |
| Idempotent replay | Receipt / reconcile | idempotencyReceipts | execute | any mutating | n/a | REPLAYED | lost-response test | Retry after loss |
| Ambiguity gate | Clarification state | interpreter | instruct | blocked | n/a | NEEDS_CLARIFICATION | ambiguity test | Vague guest update |
| Partial failure | Receipt residuals | failAtOrdinal path | execute | n/a | n/a | COMPLETED_WITH_RESIDUALS | partial failure test | Force mid-run failure |

## Reused infrastructure

- Command Atelier visual language (`atelier.css`, design tokens)
- `authorize` / role catalogue / maker-checker primitives
- Platform snapshot + Postgres document store
- Action result flash / operational states
- Existing domain permissions referenced by tools (brief, seating, investment, …)
