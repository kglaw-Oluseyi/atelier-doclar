# EOS-S04D Canonical Record Mapping

**Slice:** `EOS-S04D`  
**Prompt Control ID:** `MD-PR-S022`  
**Rule:** one concept becomes one persisted collection. Pack naming differences are aliases, not duplicate tables.

| Canonical record | Snapshot collection | Slice-pack labels | Cursor-pack labels | Notes |
|------------------|---------------------|-------------------|--------------------|-------|
| ForecastPolicy | `forecastPolicies` | forecast policy | policy / governing policy | Organisation-scoped ACTIVE policy. Seeded as provisional default. |
| ModelParameterSet | `modelParameterSets` | parameter set | model parameters / calibration parameters | Versioned, effective-dated, immutable after use. GLOBAL seed `PARAM-SET-V1`; EVENT sets supersede for that event only. |
| AttendanceForecastRun | `attendanceForecastRuns` | forecast run | forecast execution / run | Immutable result. New evidence creates a new run and supersedes the previous. |
| ForecastPopulationMember | `forecastPopulationMembers` | forecast population | included population / population snapshot | Distinct people by `guestId`. Unnamed allowances are `UNNAMED_ENTITLEMENT`, not people. |
| ForecastEstimate | `forecastEstimates` | phase forecast / estimate | programme/phase estimate | `scope` PROGRAMME or PHASE; `countsPeople` distinguishes people vs occupancy. |
| UncertaintyDriver | `uncertaintyDrivers` | uncertainty driver | uncertainty contribution | Named drivers. Host projection uses `hostSafeLabel` only. |
| ConfidenceAssessment | `confidenceAssessments` | confidence assessment | confidence | Plain-language confidence. Never a composite unexplained score. |
| ForecastOverride | `forecastOverrides` | override | forecast override | Maker/checker. Original model result preserved. |
| OperationalProvisionRecommendation | `operationalProvisionRecommendations` | provision recommendation | operational provision | Separate product from forecast and RSVP. No vendor/comms/payment side effects. |
| CalibrationObservation | `calibrationObservations` | calibration observation / outcome | forecast-versus-outcome | Later observed count recorded beside original low/centre/high. |
| ForecastEvaluation | `forecastEvaluations` | forecast evaluation | evaluation / model evaluation | Shadow or reviewed. `releaseRecommendation` remains `NOT_RELEASED` in this slice. |
| S04DMigrationReceipt | `s04dMigrationReceipts` | migration journal | migration receipt | Checksum-protected, replay-safe. ID `EOS-S04D-FORECAST-PLANNING-V1`. |

Observed RSVP, invitation, guest, party, phase entitlement and attendance remain on accepted S03 / S04A / S04B collections. They are inputs, never rewritten by a forecast run.
