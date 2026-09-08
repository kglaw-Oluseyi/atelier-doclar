# EOS-S05 Canonical Record Mapping

**Slice:** `EOS-S05`  
**Prompt Control ID:** `MD-PR-S028`  
**Rule:** one concept becomes one persisted collection. Historic pack naming differences are aliases, not duplicate tables.

| Kind | Canonical record | Snapshot collection | Historic / pack labels | CEO-overlay labels | Notes |
|------|------------------|---------------------|------------------------|--------------------|-------|
| Venue | Venue | `venues` | Venue / tenant venue | organisation-owned venue | No Tenant. Cross-client reuse denied by default. |
| Fact | VenueFact | `venueFacts` | VenueFact / provenance | reusable venue fact | Source, applicability, verification, lineage. |
| Evidence | VenueEvidenceAsset | `venueEvidenceAssets` | evidence / attachment | metadata-only evidence | Binary upload unavailable until Milestone 3 (`TDR-S05-001`). |
| Adoption | EventVenue | `eventVenues` | EventVenue / event adoption | event venue snapshot | Provenance-preserving. Never mutates Venue. |
| Override | EventVenueFact | `eventVenueFacts` | event fact / override | inherited or event-specific fact | Origin `INHERITED` or `EVENT_OVERRIDE`. |
| Layout | Layout | `layouts` | Layout / floor plan | event-scoped layout | Current revision pointer and content hash. |
| Revision | LayoutRevision | `layoutRevisions` | LayoutRevision | immutable revision | Hash of coordinate system, bounds and objects. |
| Lease | LayoutEditorLease | `layoutEditorLeases` | editor lock | one active editor lease | Read-only collaborators. |
| Geometry | CoordinateSystem + LayoutBounds | embedded on layout/revision | mm / origin | canonical millimetre contract | See `ADR_EOS_S05_VENUE_LAYOUT.md`. |
| Attendance | AttendanceProjectionRead | none — read adapter | capacity input | attendance boundary | Must not persist a second RSVP/forecast ledger. |
| Journal | S05MigrationReceipt | `s05MigrationReceipts` | migration | migration receipt | Checksum-protected, replay-safe. IDs `EOS-S05-VENUE-LAYOUT-V1` and `EOS-S05-VENUE-OBJECTS-V1`. |
| Spatial object | SpatialObject | `layoutRevisions.objects` | Zone/Table/Seat/Fixture/Route/Area | typed persisted object | Not a Konva blob. Seats are physical IDs only. |
| Command | LayoutCommand | `layoutCommands` | editor action | acknowledged draft command | Undo/redo walk this history. |
| Draft cursor | LayoutDraftCursor | `layoutDraftCursors` | undo stack | draft undo/redo pointer | Does not rewrite snapshots. |

Person, Guest, Invitation, RSVP, Forecast, Programme, Merchandise, Atelier and Language remain on accepted collections. EOS-S05 must not store `guestId`, seating assignment or guest placement on any spatial record.

## Distinctions

| Concept | Meaning |
|---------|---------|
| Reusable venue | Organisation-owned fact register. |
| Event venue | Event-scoped adoption snapshot / override set. |
| Declared capacity | A venue-stated or authority-stated fact, not operational provision. |
| Operational provision | Named human-owned planning quantity from EOS-S04D. |
| Observed RSVP | Accepted S03 quantity product. |
| Whole-event forecast | Distinct-person range from PROGRAMME-scope forecast estimates. |
| Phase occupancy | Phase-specific; must not be summed as whole-event people. |
| Physical seat identifier | Spatial object identity only. Not a person. Deferred to later milestones / EOS-S06. |
| Safety verification | Provenance state. Never a certification label. |

## Historic sixty-unit and acceptance-scenario traceability

Historic `S5-01`–`S5-60` remain `NOT_EXECUTED` traceability units. Milestone 1 covers S5-01–S5-13. Milestone 2 covers S5-14–S5-27 and S5-31–S5-38. S5-28–S5-30 remain Milestone 3 because the approved asset pipeline does not exist. Historic twenty acceptance scenarios are not present as working-tree files; their substantive venue, adoption, layout, isolation and false-success requirements are implemented through the authorised milestones.
