# EOS-S04E Canonical Record Mapping

**Slice:** `EOS-S04E`  
**Prompt Control ID:** `MD-PR-S024`  
**Rule:** one concept becomes one persisted collection. Pack naming differences are aliases, not duplicate tables.

| Kind | Canonical record | Snapshot collection | Slice-pack labels | Cursor-pack labels | Notes |
|------|------------------|---------------------|-------------------|--------------------|-------|
| Source | BlueprintGenesis | `blueprintGenesises` | Blueprint Genesis | BlueprintGenesis | Accepted-brief import. Does not manage commercial acceptance. |
| Source | EventAtelier | `eventAteliers` | Event Atelier | EventAtelier | One atelier per event. Publication and lifecycle. |
| Source | AtelierChapter | `atelierChapters` | chapter | AtelierChapter | TODAY, VISION, JOURNEY, BLUEPRINT, ENSEMBLE, DECISIONS, ASSURANCE, EDITIONS, UPDATES. |
| Edition | EventNarrativeEdition | `eventNarrativeEditions` | narrative / Vision edition | EventNarrativeEdition | Immutable after publication. |
| Edition | CuratedMediaSet | `curatedMediaSets` | curated imagery | CuratedMediaSet | Safe URLs, alt text, rights. |
| Edition | ApprovedAssetEdition | `approvedAssetEditions` | Editions artefacts | ApprovedAssetEdition | Invite, menu, plan, mood. |
| Edition | CuratedUpdate | `curatedUpdates` | Notes from Maison Doclar | CuratedUpdate | High-signal updates. Not a chat ledger. |
| Projection | GuestJourneyProjection | `guestJourneyProjections` | Journey | GuestJourneyProjection | Curated S04B phase story. Not a second programme. |
| Projection | HostMilestoneProjection | `hostMilestoneProjections` | milestones | HostMilestoneProjection | Host-readable dates and meaning. |
| Projection | BudgetAssuranceProjection | `budgetAssuranceProjections` | budget assurance | BudgetAssuranceProjection | Fail-closed until finance authority exists. |
| Projection | VendorEnsembleProjection | `vendorEnsembleProjections` | Our Ensemble | VendorEnsembleProjection | Approved attributed services only. |
| Projection | ContingencyAssuranceProjection | `contingencyAssuranceProjections` | Assurance / contingency | ContingencyAssuranceProjection | Host-safe statement. |
| Request | HostDecisionRequest | `hostDecisionRequests` | Decisions | HostDecisionRequest | Staff-published question. |
| Receipt | HostDecisionReceipt | `hostDecisionReceipts` | receipt | HostDecisionReceipt | Immutable outcome. Never a false success. |
| Access | AtelierAccessGrant | `atelierAccessGrants` | host grant | AtelierAccessGrant | Event-scoped host role and chapter allowlist. |
| Access | MagicLinkChallenge | `magicLinkChallenges` | magic link | MagicLinkChallenge | Hashed, single-use, purpose-scoped. |
| Access | AtelierSession | `atelierSessions` | session | MagicLinkChallenge/Session · AtelierSession | Persisted revoke/idle/absolute record. HMAC cookie is not a second identity. |
| Journal | S04EMigrationReceipt | `s04eMigrationReceipts` | migration journal | migration receipt | Checksum-protected, replay-safe. ID `EOS-S04E-ATELIER-V1`. |

Forecast, RSVP, invitation, guest, party, phase, merchandise and communications remain on accepted collections. The Atelier reads approved aggregates and never rewrites those ledgers.

## Distinctions

| Concept | Meaning |
|---------|---------|
| Canonical source record | Event OS truth already accepted in earlier slices. |
| Curated projection | Allowlisted host-safe view with source versions and freshness. |
| Immutable edition | Published narrative/asset that can only be superseded, not edited. |
| Host request | Versioned submission against a published decision. |
| Authorised operational decision | Staff review where required; downstream mutation stays with the canonical owner. This slice records the decision; it does not write RSVP, forecast or programme. |
| Receipt | Truthful statement of what the host submitted, whether canonical data changed, review state, next owner and final outcome. |
