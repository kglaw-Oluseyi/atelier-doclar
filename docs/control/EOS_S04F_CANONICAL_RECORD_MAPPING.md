# EOS-S04F Canonical Record Mapping

**Slice:** `EOS-S04F`  
**Prompt Control ID:** `MD-PR-S026`  
**Rule:** one concept becomes one persisted collection. Pack naming differences are aliases, not duplicate tables.

| Kind | Canonical record | Snapshot collection | Controlled-pack labels | CEO-overlay labels | Notes |
|------|------------------|---------------------|------------------------|--------------------|-------|
| Preference | LanguageProfile | `languageProfiles` | LanguageProfile | language preference | Optional; event-scoped; unknown is first-class. Never inferred. |
| History | LanguagePreferenceHistory | `languagePreferenceHistories` | LanguageProfile provenance | language-preference source/history | Immutable correction lineage. |
| Cultural | CulturalSourceText | `culturalSourceTexts` | cultural text / Yorùbá orthography | cultural source text | Exact text, meaning, provenance, reviewer, approval. |
| Approval | CulturalTextApproval | embedded on `culturalSourceTexts` + `reviewAssignments` | ReviewAssignment | cultural-text approval | Human, attributable. No automatic AI approval. |
| Work | ContentWork | `contentWorks` | ContentWork | multilingual content identity | Stable communicative work. Not a second campaign. |
| Edition | ContentEdition | `contentEditions` | ContentEdition | translation edition / multilingual content edition | Immutable when approved. Supersession only. |
| Unit | ContentBlock | `contentBlocks` | ContentBlock | translation unit | Ordered; supports partial translation. |
| Lineage | TranslationLink | `translationLinks` | TranslationLink | translation source lineage | Source edition/block → target. Stale when source changes. |
| Glossary | TerminologyEntry | `terminologyEntries` | TerminologyEntry | glossary/term decision | Context and language scoped. |
| Review | ReviewAssignment | `reviewAssignments` | ReviewAssignment | reviewer decision | Maker/checker. Author cannot approve self. |
| Rule | RecipientEditionRule | `recipientEditionRules` | RecipientEditionRule | fallback decision (policy) | Deterministic selection and fallback. |
| Assembly | RecipientAssembly | `recipientAssemblies` | RecipientAssembly | recipient content assembly | Preview artefact. Not dispatched. |
| Fallback | AssemblyUnitDecision | embedded on `recipientAssemblies.units` | fallback explanation | fallback decision | Requested vs selected language, reason, approval. |
| Validation | RenderingValidation | embedded on `recipientAssemblies` | rendering hash | rendering/validation result | Placeholder, Unicode and approval checks. |
| Coverage | LanguageCoverageSnapshot | `languageCoverageSnapshots` | LanguageCoverageSnapshot | translation coverage | Honest partial/complete/stale states. |
| Journal | S04FMigrationReceipt | `s04fMigrationReceipts` | migration | migration receipt | Checksum-protected, replay-safe. ID `EOS-S04F-LANGUAGE-V1`. |

Guest, Invitation, RSVP, Campaign, Atelier, Document, Forecast, Programme and Merchandise remain on accepted collections. EOS-S04F reads approved identity, addressing and recipient eligibility. It never rewrites those ledgers.

## Distinctions

| Concept | Meaning |
|---------|---------|
| Language code | Closed BCP 47 tag from the eight-language register. |
| Locale / English convention | `en-GB` or `en-US` spelling and date convention. Never silently mixed. |
| Translation status | Draft, review, approved, stale, superseded. |
| Edition | Versioned language or bilingual composition of a ContentWork. |
| Unknown preference | No preference was supplied. Must not be stored as English. |
| Approved cultural text | Human-reviewed source with attributable reviewer. Synthetic fixtures are unvalidated. |
| Recipient assembly | Deterministic preview for one `guestId`. Ready for communications review. Not sent. |
| Dispatch | EOS-S04 campaign authority only. S04F must not invoke a provider. |

## Prohibited inference sources

Language preference must not be derived from name, surname, title, ethnicity, religion, nationality, address, household, party, phone country code or previous event attendance.
