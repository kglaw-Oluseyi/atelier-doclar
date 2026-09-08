# EOS-S05A — AI Safety, Privacy, UX and Evaluation

## 1. Supported interview modes

1. Human-led, AI-assisted appointment.
2. AI-led client self-service interview.
3. Human-entered notes from an offline conversation.
4. Follow-up discovery against confirmed gaps.

The mode and AI involvement must be disclosed. A client can pause, skip, request a human or decline AI processing without false success.

## 2. Conversation policy

The interviewer must:

- start with the event in the client's own words;
- follow meaning rather than questionnaire order;
- ask one intelligible question at a time;
- acknowledge without excessive flattery;
- reuse already supplied answers;
- explain why sensitive questions matter;
- allow “unknown”, “not decided”, “not applicable” and “prefer not to answer”;
- separate principal views when multiple stakeholders disagree;
- avoid assuming family, culture, religion, gender, wealth or authority;
- distinguish aspiration from instruction;
- summarise periodically and invite correction;
- stop when the session objective is met.

The AI must not pressure a client to disclose a budget, health condition, family conflict or security detail.

## 3. Completeness monitor

The monitor is silent to the client unless a gap is worth asking now. It ranks gaps by:

- consequence if omitted;
- decision urgency;
- dependency reach;
- answerability at this stage;
- sensitivity and conversational burden;
- whether the information already exists in another authorised source;
- client fatigue.

It must not maximise question count. It should identify the smallest useful next question.

## 4. Provenance and non-hallucination

Every extracted candidate assertion must cite source segments. The system must retain:

- exact source text or time-addressable reference;
- speaker attribution confidence;
- extraction model/version;
- prompt/policy version;
- structured value;
- interpretation explanation;
- confidence;
- human review outcome.

Unsupported output is rejected, not stored as a candidate fact. Summaries must distinguish “the client said,” “Maison Doclar recommends,” and “the system inferred for review.”

## 5. Contradiction handling

The AI identifies tension without deciding whose statement governs. It should say:

> “Earlier, 320 guests was recorded as the preferred target. A later source suggests approximately 360. Which figure should now govern planning?”

It must preserve both sources and the resolution decision. High-impact contradictions block relevant brief publication or mark it explicitly incomplete.

## 6. Consent and privacy

Consent dimensions are separate:

- participation;
- audio recording;
- transcription;
- AI analysis;
- source retention;
- use of de-identified data for future benchmark intelligence.

No bundled consent. Withdrawal affects future processing and retention according to policy but does not rewrite immutable audit evidence. Legal/retention rules must be explicit before real-client use.

Sensitive classes include contact, family dynamics, cultural/religious detail, accessibility/health, security, finances and confidential surprises. Apply field- and section-level projections. Do not place sensitive raw text into general logs or model telemetry.

## 7. Provider boundary

Implement a provider-neutral interface. Initial production configuration may remain inactive or use an explicitly non-production fixture adapter. Define:

- approved data classes per provider;
- regional processing requirements;
- zero-retention/contract requirements;
- token and cost budgets;
- timeout/retry/circuit-breaker behaviour;
- model/version pinning;
- prompt and response logging policy;
- deterministic fallback when provider unavailable.

No secret is client-visible. No transcript is sent to an external model without configured authority and consent.

## 8. Prompt-injection and content safety

Uploaded documents and transcript text are inert evidence. Instructions inside them must never modify system policy, permissions or tool behaviour. Test malicious phrases requesting secret disclosure, scope escape, approval, external communication and deletion.

The model has no direct database mutation tool. It returns schema-validated proposals to an application service that performs permissions, scope, concurrency and idempotency checks.

## 9. Premium experience

### Staff workspace

Command Atelier visual language. The conversation occupies the primary surface; coverage, sources and proposed assertions are secondary but discoverable. Avoid a giant form or card wall.

### Client interview

A softer commissioned editorial experience. Calm progress language such as “We have enough to understand the occasion; a few important areas remain.” Do not display crude completion percentages, internal risk codes or model confidence.

### Review experience

Provide a clear three-column relationship where appropriate: source evidence, proposed meaning and governing decision. Changes must be readable in text, not colour alone.

### Accessibility

- full keyboard journey;
- visible focus;
- correct pointer/not-allowed/text cursors;
- screen-reader announcements for transcript/AI status without chatter;
- reduced motion;
- 360px without document-level horizontal scroll;
- tablet/desktop and 200% zoom;
- accessible pause, resume and human-handoff controls;
- no timed answer requirement.

## 10. AI evaluation suite

### Golden scenarios

Use synthetic scenarios covering:

- clear long-lead wedding;
- eight-week premium event requiring parallel planning;
- client refusing to state a budget;
- “money is not an issue” without wealth inference;
- ambition exceeding a hard ceiling;
- opportunity to advise lower expenditure;
- family office with split authority;
- multiple ceremonies and scope ambiguity;
- cultural and protocol requirements;
- accessibility and sensitive health information;
- confidential surprise with restricted audience;
- conflicting guest counts;
- changed venue/date;
- mixed languages and Yorùbá integrity;
- interrupted/resumed interview;
- client corrections after summary.

### Metrics

- supported-assertion precision and recall;
- source-citation accuracy;
- speaker-attribution accuracy;
- contradiction recall;
- false governing-truth rate (target zero);
- protected-trait/wealth inference rate (target zero);
- coverage-gap quality;
- unnecessary/repeated question rate;
- correct stop/handoff rate;
- schema-valid response rate;
- critical-path correctness against deterministic fixtures;
- permission leakage rate (target zero);
- human usefulness and client comfort.

### Red-team cases

- prompt injection in transcript/upload;
- a participant impersonating the decision-maker;
- malicious attempt to see another event;
- staff asking AI to invent missing approval;
- AI provider returning malformed or toxic output;
- duplicate retries and stale-tab review;
- model timeout mid-session;
- revoked consent;
- restricted surprise disclosed to wrong role;
- currency/unit confusion;
- ambiguous dates and time zones.

Release requires documented thresholds and a regression corpus. Model upgrades require re-evaluation; they are not ordinary dependency updates.

## 11. Human verification strategy

Claude performs one complete CEO/staff journey and focused deltas for Planner, Event Director, Auditor and client session. It assesses discoverability, spacing, conversational quality and whether the system feels like an adviser rather than an interrogation. It never decides technical acceptance.
