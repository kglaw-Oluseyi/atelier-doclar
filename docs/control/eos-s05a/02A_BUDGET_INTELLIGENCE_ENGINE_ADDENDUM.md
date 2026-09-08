# EOS-S05A — Budget Intelligence Engine Addendum
Status: CEO REVIEW / ADDITIVE RATIFICATION REQUIRED
Relationship: extends the ratified Investment Intelligence requirements; does not replace them.
## 1. Product outcome
The Budget Intelligence Engine converts the confirmed Event Brief, curated price knowledge and explicit planning assumptions into explainable budget scenarios. It is not a spreadsheet, quotation scraper, black-box estimator or payment product.
It must answer:
- What does the current brief responsibly require?
- Which costs are required, conditional, recommended or optional?
- What quantity and price assumptions produced each amount?
- Which prices are current, stale, indicative, quoted or contracted?
- Where does money create value against the client’s priorities?
- Where can Maison Doclar responsibly recommend restraint?
- What changes when guest count, venue, date, service level or scope changes?
- How does the forecast compare with the authorised envelope?
- When is cash likely to be required?
- Which uncertainties could move the result materially?
## 2. Design doctrine
- Deterministic calculation is authoritative; AI is advisory only.
- Every number has a source, effective date, currency, basis and confidence.
- A range is not false precision disguised as a total.
- Vendor quotation, benchmark, estimate, commitment and payment are distinct.
- The client envelope is never a consumption target.
- Budget scenarios optimise for the client’s stated value architecture, not generic luxury tiers.
- Historical intelligence improves future estimates only through governed, de-identified and comparable cohorts.
- Old calculations remain reproducible from versioned inputs and rules.
## 3. Price knowledge model
### Core records
- BudgetTaxonomyEdition: immutable category and subcategory hierarchy.
- CostItemDefinition: governed purchasable or provisionable concept.
- QuantityDriverDefinition: named input such as guests, hours, tables, rooms or days.
- CostRuleEdition: safe deterministic calculation rule.
- EventBudgetTemplateEdition: conditional bill-of-material pattern for an event archetype.
- VendorProfile: existing or linked supplier identity projection, never a parallel vendor ledger.
- VendorPriceCardEdition: time-bounded supplier price terms.
- MarketIndexObservation: governed inflation, FX, fuel or category-index observation.
- PriceEvidence: quote, rate-card or benchmark provenance and private artefact reference.
- BudgetAssumption: event-scoped selected value and source.
- BudgetLine: materialised calculation result with trace.
- BudgetScenarioEdition: immutable complete scenario.
- BudgetRecommendationEdition: Maison Doclar advice over exact scenario hashes.
- FinancialStateDeclaration: separately declared envelope, commitment, payment, forecast or cash need.
- ComparableEventCohortEdition: governed de-identified benchmark definition.
### Cost item requirements
Each CostItemDefinition carries:
- stable code and human title;
- taxonomy path;
- unit kind;
- quantity-driver schema;
- required/conditional/recommended/optional classification;
- inclusion predicates;
- mutually exclusive/compatible item relationships;
- minimum/maximum/order increments;
- location, duration, season, FX and lead-time sensitivity;
- whether taxes/fees are embedded;
- default contingency class;
- client-visible description;
- internal procurement notes;
- lifecycle and edition provenance.
## 4. Unit and money safety
Amounts must use integer minor units and ISO currency. Never use binary floating-point for money.

```typescript
type CurrencyCode = "NGN" | "GBP" | "USD" | "EUR" | string;

type Money = Readonly<{
  currency: CurrencyCode;
  minor: bigint;
}>;

type MoneyRange = Readonly<{
  low: Money;
  expected: Money;
  high: Money;
  confidence: "LOW" | "MEDIUM" | "HIGH";
}>;
```

Quantities carry explicit units. Conversions use governed definitions. Adding different currencies without an explicit FX conversion is rejected.
## 5. Safe rule language
Do not evaluate arbitrary JavaScript or user expressions. Store a closed discriminated-union AST validated with strict schemas.

```typescript
type BudgetExpr =
  | { kind: "CONST_MONEY"; valueMinor: string; currency: CurrencyCode }
  | { kind: "CONST_NUMBER"; value: string }
  | { kind: "DRIVER"; key: string }
  | { kind: "ADD"; terms: BudgetExpr[] }
  | { kind: "MULTIPLY"; factors: BudgetExpr[] }
  | { kind: "MAX"; values: BudgetExpr[] }
  | { kind: "MIN"; values: BudgetExpr[] }
  | { kind: "ROUND"; value: BudgetExpr; increment: string; mode: "UP" | "DOWN" | "NEAREST" }
  | { kind: "LOOKUP"; tableId: string; input: BudgetExpr }
  | { kind: "IF"; condition: BudgetCondition; then: BudgetExpr; otherwise: BudgetExpr };

type BudgetCondition =
  | { kind: "COMPARE"; operator: "LT" | "LTE" | "EQ" | "GTE" | "GT"; left: BudgetExpr; right: BudgetExpr }
  | { kind: "IN"; value: BudgetExpr; choices: string[] }
  | { kind: "AND" | "OR"; conditions: BudgetCondition[] };
```

The evaluator must enforce maximum depth/node count, type compatibility, deterministic decimal arithmetic, no I/O and a complete trace.
## 6. Calculation trace
Every materialised Budget Line records:
- selected cost-item and rule edition;
- source template and inclusion reason;
- input drivers and their provenance;
- selected vendor price card/benchmark;
- base price or range;
- quantity calculation;
- each factor/lookup/rounding step;
- tax/service/contingency treatment;
- FX rate and observation date where applicable;
- low/expected/high result;
- staleness and confidence;
- warnings and unresolved inputs;
- content hash.
The same immutable inputs and rule editions must reproduce the same output hash.
## 7. Bill-of-material generation
Templates contain conditional item selectors, not fixed packages. A template may propose a line because of event type, guest count, programme, venue status, service duration, client priority or risk requirement.
Line presence states:
REQUIRED, CONDITIONAL, RECOMMENDED, OPTIONAL, EXCLUDED_BY_CLIENT, NOT_APPLICABLE, UNRESOLVED.
An exclusion of a safety, legal, power-resilience or other protected requirement must produce an explicit risk/approval route rather than silently reducing the number.
## 8. Prices and evidence
Price basis:
VENDOR_QUOTE, VENDOR_RATE_CARD, CONTRACTED, INTERNAL_BENCHMARK, COMPARABLE_EVENT, MARKET_ESTIMATE, MANUAL_ASSUMPTION.
Price confidence considers evidence kind, age, conditions, volatility and unresolved scope. A stale price is not automatically inflated into truth. The engine may produce an indexed planning estimate alongside the original evidence, clearly labelled.
Vendor records must not be scraped or activated automatically. AI may extract a proposed price card from an inert document; an authorised maker/checker process publishes the edition.
## 9. Lagos, inflation and FX
Model location through governed zones and logistics rules, not stereotypes. Support:
- mainland/island and event-specific access conditions;
- distance/travel bands;
- setup/strike timing;
- festive/peak windows;
- power/fuel assumptions;
- imported-material FX exposure;
- quote validity and repricing dates;
- multi-currency lines and locked/indicative FX rates.
External market data is never silently trusted. Observations require source, retrieval time, effective time and approval state. Provider failure retains the last approved observation and marks freshness honestly.
## 10. Scenario engine
Scenarios are named by advisory purpose, not status packages:
- PROTECT_INVESTMENT;
- PROTECT_PRIORITIES;
- PROTECT_FULL_BRIEF;
- MAISON_RECOMMENDED;
- a client-defined alternative.
The scenario engine must keep protected/non-negotiable lines, expose removed/deferred/changed items and calculate marginal cost/benefit. Optimisation is constrained and explainable; it is not an opaque AI selection.
## 11. Contingency and uncertainty
Contingency may be global or category/risk-specific, inside or outside the envelope. Rules must prohibit accidental double-counting. Show:
- priced known scope;
- uncertainty range;
- explicit contingency;
- unpriced/unresolved exposure;
- forecast range.
Do not imply that a contingency reserve is committed or available cash.
## 12. Maturation model
### Stage 1 — curated deterministic foundation
Maison Doclar defines taxonomy, rules, templates and benchmark evidence. Calculation is fully traceable.
### Stage 2 — vendor price knowledge
Governed price cards, quote validity, comparison and reliability evidence.
### Stage 3 — completed-event learning
De-identified comparable cohorts show estimate-vs-commitment-vs-final variance. No client-specific leakage.
### Stage 4 — assisted maintenance
AI proposes quote extraction, stale-price review and missing line items; humans approve.
### Stage 5 — calibrated forecasting
Statistical ranges supplement deterministic rules when sufficient governed data exists. Model cards, holdout evaluation, drift monitoring and explainability are mandatory.
No stage is activated merely because code exists.
## 13. User experience
### Planner Budget Studio
- assumption rail with source and confidence;
- category tree and line-item table;
- price-driver explanation drawer;
- unresolved/stale evidence queue;
- scenario comparison;
- envelope alignment;
- version/change history;
- keyboard-accessible bulk review without dangerous bulk approval.
### CEO Investment Command
- authorised envelope and meaning;
- recommended forecast range;
- unallocated capacity or misalignment;
- committed/paid/forecast distinction;
- next cash window;
- top variance and stale-price risks;
- decisions requiring executive intervention;
- explicit “do not spend” recommendations.
### Client investment view
- calm total range;
- what is protected and optimised;
- major category ranges;
- assumptions;
- optional enhancements with incremental value;
- exclusions and decisions;
- no vendor margin, internal reliability notes or staff-only benchmark details.
## 14. Authority and publication
Draft calculations may be generated by authorised planners. Published client scenarios and formal Maison Doclar recommendations require exact-hash approval by a different authorised checker where consequential. A scenario cannot be presented as approved after any input, rule, price-card or FX edition changes.
## 15. Acceptance tests
- 400 guests vs 450 updates all legitimate drivers without changing fixed costs.
- hard ceiling, working target and hypothesis produce different alignment behaviour.
- client refuses budget; engine provides evidence-labelled range without inventing capacity.
- lower responsible forecast produces unallocated capacity and HOLD recommendation.
- NGN line plus USD import rejects aggregation until an FX basis is selected.
- stale vendor card is visible and reduces confidence.
- low/expected/high totals reconcile exactly to their lines.
- required safety line cannot disappear silently.
- contingency is never double-counted.
- old scenario reproduces after later rule/price editions are published.
- cross-event/vendor evidence leakage is denied.
- AI-proposed price never becomes approved automatically.
- client view omits internal/vendor-sensitive fields.
