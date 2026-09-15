# EOS-S06A Remediation 2 — Intelligence task / domain crosswalk

**Date:** 2026-09-15  
**Finding:** F-1 domain-grounded Intelligence  
**Claude:** not run

## Contract

Every ACTIVE Task Bank task whose primary capability is Intelligence or that produces an explanatory/diagnostic answer maps to a domain resolver. Resolvers return structured facts from authorised event-scoped projections. Unavailable domains return an explicit missing-prerequisite response — never a generic readiness substitute.

Answer envelope fields: event identity, intent, domain, direct answer, authoritative facts, gaps, assumptions, risks/blockers, recommendations, timestamp, correlation via receipt, `businessDataChanged:false`, `commandRecordSaved:true`.

## Inventory (explanatory / Intelligence tasks)

| Task ID | Ver | Domain | Tool | Intent | Authoritative sources | Permission | Unavailable behaviour | Read-only | Tests |
|---|---|---|---|---|---|---|---|---|---|
| tb.discovery.unanswered | 1 | discovery | discovery.unansweredQuestions | ANSWER | eventBriefEditions / context | atelierCommand.view | Missing brief prerequisite | yes | rem2 suite |
| tb.discovery.summarise_vision | 1 | discovery | intelligence.answer | ANSWER | brief editions | atelierCommand.view | Missing brief | yes | rem2 suite |
| tb.discovery.compare_brief | 1 | discovery | eventBrief.read | ANSWER | brief editions | atelierCommand.view | Missing brief | yes | rem2 suite |
| tb.investment.unpriced | 1 | investment | investment.explain | ANSWER | investment engine (when present) | atelierCommand.view | UNSUPPORTED prerequisite | yes | rem2 suite |
| tb.investment.explain_variance | 1 | investment | investment.explain | ANSWER | investment engine | atelierCommand.view | UNSUPPORTED | yes | rem2 suite |
| tb.investment.compare_scenarios | 1 | investment | investment.compareScenarios | ANSWER | investment engine | atelierCommand.view | UNSUPPORTED | yes | rem2 suite |
| tb.roadmap.short_lead | 1 | roadmap | roadmap.explainCriticalPath | ANSWER | roadmap engine | atelierCommand.view | UNSUPPORTED | yes | rem2 suite |
| tb.roadmap.latest_safe | 1 | roadmap | roadmap.explainCriticalPath | ANSWER | roadmap engine | atelierCommand.view | UNSUPPORTED | yes | rem2 suite |
| tb.roadmap.blocked | 1 | roadmap | roadmap.explainCriticalPath | DIAGNOSE | roadmap engine | atelierCommand.view | UNSUPPORTED | yes | rem2 suite |
| tb.roadmap.delay_impact | 1 | roadmap | intelligence.diagnose | DIAGNOSE | roadmap engine | atelierCommand.view | UNSUPPORTED | yes | rem2 suite |
| tb.guest.missing_info | 1 | guests | guest.flagMissingInformation | ANSWER | operationalGuests aggregates | atelierCommand.view | Empty directory | yes | rem2 suite |
| tb.guest.vip_protocol | 1 | guests | intelligence.recommend | RECOMMEND | guest aggregates | atelierCommand.view | Empty directory | yes | rem2 suite |
| tb.guest.rsvp_gaps | 1 | guests | guest.flagMissingInformation | ANSWER | guest aggregates | atelierCommand.view | Empty directory | yes | rem2 suite |
| tb.guest.duplicates | 1 | guests | guest.find | ANSWER | guest aggregates | atelierCommand.view | Empty directory | yes | rem2 suite |
| tb.seating.explain_authority | 1 | seating | seating.explainAuthority | ANSWER | seating V2 workspace | atelierCommand.view | Missing binding/workspace | yes | rem2 + domain-resolvers |
| tb.seating.input_readiness | 1 | seating | seating.explainAuthority | DIAGNOSE | seating V2 workspace | atelierCommand.view | Missing binding | yes | rem2 + domain-resolvers |
| tb.seating.hard_constraints | 1 | seating | intelligence.diagnose | DIAGNOSE | seating rules/conflicts | atelierCommand.view | Missing workspace | yes | rem2 + domain-resolvers |
| tb.seating.compare_plans | 1 | seating | seating.explainAuthority | ANSWER | editions/publications | atelierCommand.view | Missing workspace | yes | rem2 + domain-resolvers |
| tb.programme.* | 1 | programme | programme.analyseCollisions / diagnose | DIAGNOSE | programme projections | atelierCommand.view | UNSUPPORTED | yes | rem2 suite |
| tb.supplier.* | 1 | suppliers | intelligence.* / roadmap | ANSWER/DIAGNOSE | supplier projections | atelierCommand.view | UNSUPPORTED | yes | rem2 suite |
| tb.merch.* | 1 | merchandise | intelligence.diagnose | DIAGNOSE | merchandise projections | atelierCommand.view | UNSUPPORTED | yes | rem2 suite |
| tb.comms.language | 1 | communications | intelligence.diagnose | DIAGNOSE | language/comms posture | atelierCommand.view | Posture facts | yes | rem2 suite |
| tb.comms.explain_block | 1 | communications | intelligence.answer | EXPLAIN_BLOCK | runtime posture | atelierCommand.view | Always specific | yes | rem1+rem2 |
| tb.change.* | 1 | change | change.analyseImpact | DIAGNOSE | change-intelligence | atelierCommand.view | UNSUPPORTED | yes | rem2 suite |
| tb.evidence.* | 1 | evidence | evidence.readReceipt / intelligence.answer | ANSWER | atelier receipts / ledger | atelierCommand.view | Zero receipts | yes | rem2 suite |
| tb.browser.* | 1–R2 | browser | browser.* / intelligence.answer | ANSWER | simulation policy | view(+instruct/execute) | Simulation posture | sim | rem2 suite |

## Previously falling through to generic readiness

Before Remediation 2, `buildIntelligenceResult` answered seating/domain tools with ContextBroker guest-count + brief boilerplate (or the generic status template). Those paths now route through `resolveDomainIntelligence`.

## Architecture

- `domain-resolvers.ts` — domain selection + resolvers
- `intelligence.ts` — typed envelope
- `PlatformService.executeAtelierCommandPlan` — injects seating V2 `projectWorkspace` evidence when authorised
- Interpreter routing prefers seating before generic readiness

No material contradiction with the ratified pack was found.
