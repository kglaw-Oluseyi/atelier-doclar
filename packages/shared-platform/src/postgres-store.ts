import { PlatformError } from "./errors.js";
import { runPlatformMigrations } from "./migrations.js";
import { PRODUCTION_STORE_STATUS, type StoreProductionStatus } from "./constants.js";
import type { AuditEvent, Person, StaffSession } from "./schemas.js";
import {
  normalizeStaffEmail,
  type StaffAuthCapableStore,
  type StaffAuthMutation,
  type StaffAuthPerfMark,
} from "./staff-auth-store.js";
import { emptySnapshot, normalizeSnapshot, type IdempotencyRecord, type PlatformSnapshot, type PlatformStore } from "./store.js";
import { validateS04APersistedCollections } from "./addressing-persistence.js";
import { validateS04BPersistedCollections } from "./programme-persistence.js";
import { validateS04CPersistedCollections } from "./merchandise-persistence.js";
import { validateS04DPersistedCollections } from "./forecast-persistence.js";
import { validateS04EPersistedCollections } from "./atelier-persistence.js";
import { validateS04FPersistedCollections } from "./language-persistence.js";
import { validateS05PersistedCollections } from "./venue-persistence.js";
import { validateS05APersistedCollections } from "./eec-persistence.js";
import { validateS05BPersistedCollections } from "./risk-persistence.js";
import { PostgresRiskProtectionRepository, PostgresRiskProtectionStore, PostgresRiskTransaction } from "./postgres-risk-store.js";
import { PostgresRiskDossierRepository } from "./postgres-risk-dossier-store.js";
import { PostgresSeatingRepository } from "./postgres-seating-store.js";
import { PostgresSeatingV2Repository } from "./postgres-seating-v2-store.js";
import type { DossierOverlay } from "./risk-dossier-command-service.js";
import type { AuthorityOverlay } from "./risk-authority-command-service.js";
import { writeRiskSnapshotDelta } from "./risk-repository.js";
import { backfillNormalizedRiskTables } from "./risk-normalized-migration.js";
import { RISK_SQL_TABLES } from "./risk-postgres-schema.js";
import { overlayRiskState } from "./risk-store.js";
import { S05B_CANONICAL_COLLECTIONS } from "./risk-schemas.js";
import type { PgQueryable, PgQueryResult, PgTransactor } from "./postgres-schema.js";

const S05B_PERSISTED_COLLECTIONS = new Set<string>([...S05B_CANONICAL_COLLECTIONS, "riskDossierPublications", "riskDossierExports", "riskDossierAccessGrants"]);

type Collection = keyof Omit<PlatformSnapshot, "audit" | "idempotency">;

const COLLECTIONS: Collection[] = [
  "organisations",
  "clients",
  "programmes",
  "events",
  "phaseHistory",
  "persons",
  "memberships",
  "roles",
  "permissions",
  "rolePermissions",
  "assignments",
  "masterEventFiles",
  "consents",
  "guestReferences",
  "operationalGuests",
  "guestHouseholds",
  "guestDuplicateCandidates",
  "guestIntakeBatches",
  "guestIntakeRows",
  "guestIntakeSources",
  "guestIntakeJobs",
  "guestMappingEditions",
  "guestIntakeCandidates",
  "guestPromotionChunks",
  "guestIntakeReceipts",
  "guestIntakeOutboxEvents",
  "guestParties",
  "guestPartyMembers",
  "guestRelationships",
  "companionEntitlements",
  "companionNominations",
  "responsibleAdultLinks",
  "eventSeries",
  "eventSeriesMembers",
  "addressingReconciliationItems",
  "s04aMigrationReceipts",
  "programmeDays",
  "programmePhases",
  "phaseEntitlements",
  "arrivalRoutes",
  "perimeterCheckpoints",
  "accessZones",
  "credentialProjections",
  "operationalVehicles",
  "vehicleAssociations",
  "offlineAccessPackages",
  "accessExceptions",
  "s04bMigrationReceipts",
  "merchandiseCollections",
  "merchandiseItems",
  "merchandiseItemVariants",
  "merchandiseCohorts",
  "merchandiseCohortMembers",
  "hostOfferRules",
  "guestOffers",
  "guestParticipations",
  "capMeasurements",
  "merchandiseFulfilments",
  "vendorAssignments",
  "vendorUpdates",
  "vendorSessions",
  "merchandiseGuestGrants",
  "merchandiseGuestSessions",
  "externalContactLinks",
  "merchandiseExceptions",
  "s04cMigrationReceipts",
  "forecastPolicies",
  "modelParameterSets",
  "attendanceForecastRuns",
  "forecastPopulationMembers",
  "forecastEstimates",
  "uncertaintyDrivers",
  "confidenceAssessments",
  "forecastOverrides",
  "operationalProvisionRecommendations",
  "calibrationObservations",
  "forecastEvaluations",
  "s04dMigrationReceipts",
  "eventAteliers",
  "blueprintGenesises",
  "atelierChapters",
  "eventNarrativeEditions",
  "curatedMediaSets",
  "approvedAssetEditions",
  "guestJourneyProjections",
  "hostMilestoneProjections",
  "budgetAssuranceProjections",
  "vendorEnsembleProjections",
  "contingencyAssuranceProjections",
  "hostDecisionRequests",
  "hostDecisionReceipts",
  "curatedUpdates",
  "atelierAccessGrants",
  "magicLinkChallenges",
  "atelierSessions",
  "s04eMigrationReceipts",
  "languageProfiles",
  "languagePreferenceHistories",
  "culturalSourceTexts",
  "contentWorks",
  "contentEditions",
  "contentBlocks",
  "translationLinks",
  "terminologyEntries",
  "reviewAssignments",
  "recipientEditionRules",
  "recipientAssemblies",
  "languageCoverageSnapshots",
  "s04fMigrationReceipts",
  "venues",
  "venueFacts",
  "eventVenues",
  "eventVenueFacts",
  "layouts",
  "layoutRevisions",
  "layoutEditorLeases",
  "layoutCommands",
  "layoutDraftCursors",
  "venueEvidenceAssets",
  "layoutFloorPlanAssets",
  "layoutAssetCalibrations",
  "layoutCapacityStatements",
  "layoutValidationRuns",
  "layoutValidationFindings",
  "layoutValidationOverrides",
  "layoutSnapshots",
  "layoutApprovals",
  "layoutPublications",
  "layoutExportJobs",
  "s05MigrationReceipts",
  "engagementOpportunities",
  "discoveryEngagements",
  "discoveryParticipants",
  "discoveryConsentRecords",
  "interviewSessions",
  "sourceArtefacts",
  "sourceSegments",
  "candidateAssertions",
  "assertionConflicts",
  "coverageCatalogueEditions",
  "coverageRequirements",
  "coverageAssessments",
  "discoveryDisclosureGrants",
  "extractionOutcomes",
  "s05aMigrationReceipts",
  "eventBriefDrafts",
  "eventBriefEditions",
  "clientBriefDecisions",
  "discoveryClientAccess",
  "conversionReceipts",
  "budgetTaxonomyEditions",
  "costItemDefinitions",
  "costRuleEditions",
  "priceEvidenceRecords",
  "budgetTemplateEditions",
  "budgetAssumptions",
  "budgetScenarioEditions",
  "budgetRecommendationEditions",
  "financialStateDeclarations",
  "roadmapMilestones",
  "roadmapEditions",
  "roadmapDependencies",
  "changeProposals",
  "impactAssessments",
  "aiJobs",
  "aiEvaluationRuns",
  "aiEvaluationCaseResults",
  "aiEvaluationRunLeases",
  "s05aEvaluationMigrationReceipts",
  "s05aIntelligenceReceipts",
  "vendorPriceCards",
  "vendorPriceCardEditions",
  "marketIndexDefinitions",
  "marketIndexObservations",
  "fxObservations",
  "locationCostZones",
  "locationFactorEditions",
  "seasonWindowEditions",
  "lookupTableEditions",
  "budgetLines",
  "budgetBomSnapshots",
  "contingencyRuleEditions",
  "sensitivityRuns",
  "scenarioComparisons",
  "roadmapTemplateEditions",
  "roadmapScheduleResults",
  "conversationTurns",
  "clientOverviewEditions",
  "clientReviewEditions",
  "clientReviewActions",
  "clientInvestmentActions",
  "calendarDefinitions",
  "eventCalendarOverlays",
  "rsvpPolicies",
  "rsvpQuestionnaires",
  "rsvpInvitations",
  "rsvpGuestSessions",
  "staffSessions",
  "rsvpResponses",
  "rsvpReceipts",
  "rsvpEntitlements",
  "rsvpExceptions",
  "rsvpAssistanceRequests",
  "rsvpKeyRings",
  "rsvpEventProjections",
  "channelPolicies",
  "guestSafeOccasions",
  "contactProjections",
  "suppressionEntries",
  "messageTemplates",
  "messageTemplateVersions",
  "audienceDefinitions",
  "audienceSnapshots",
  "campaigns",
  "campaignApprovals",
  "commsMessages",
  "messageContentSnapshots",
  "messageAttempts",
  "deliveryEvents",
  "commsOutbox",
  "conversationThreads",
  "inboundMessages",
  "followUpTasks",
  "contactCorrections",
  "commsNotifications",
  "commsIntelligenceAlerts",
  "policyVersions",
  "riskSourceEditions",
  "riskRuleEditions",
  "riskEvidenceDocuments",
  "riskPolicies",
  "riskPolicyEditions",
  "riskFactEditions",
  "riskApplicabilitySnapshots",
  "riskGapFindings",
  "riskResidualDecisions",
  "riskClauseTemplates",
  "riskClauseEditions",
  "riskVendorEvidence",
  "riskVendorAssessments",
  "riskRosterAssignments",
  "riskCriticalFunctions",
  "riskContinuityPlans",
  "riskCheckpointTemplates",
  "riskCheckpointInstances",
  "riskCheckIns",
  "riskCommunicationIntents",
  "riskEscalationIntents",
  "riskFallbackActivations",
  "riskIncidents",
  "riskIncidentNotes",
  "riskLearningProposals",
  "riskBudgetProjections",
  "riskDossierEditions",
  "riskDossierPublications",
  "riskDossierExports",
  "riskDossierAccessGrants",
  "riskAuthorityGovernanceReceipts",
  "riskEvaluationRuns",
  "riskEvaluationCaseResults",
  "riskEvaluationRunLeases",
  "s05bMigrationReceipts",
  "atelierCommandLedgers",
];

function idOf(collection: Collection, record: Record<string, unknown>): string {
  if (collection === "rolePermissions") {
    return `${String(record.roleId)}:${String(record.permissionId)}`;
  }
  return String(record.id);
}

function asBody<T>(value: unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

export class PostgresPlatformStore implements PlatformStore, StaffAuthCapableStore {
  readonly productionStatus: StoreProductionStatus = PRODUCTION_STORE_STATUS;
  private state: PlatformSnapshot = emptySnapshot();
  private pending: Promise<void> = Promise.resolve();
  private riskNormalized = false;
  private readonly authPerfMarks: StaffAuthPerfMark[] = [];

  constructor(private readonly client: PgQueryable) {}

  /** Raw PostgreSQL client for durable CP-SAT queue operations. */
  pgClient(): PgQueryable {
    return this.client;
  }

  static async migrate(client: PgQueryable): Promise<void> {
    await runPlatformMigrations(client);
    await backfillNormalizedRiskTables(client);
  }

  static async open(client: PgQueryable): Promise<PostgresPlatformStore> {
    await PostgresPlatformStore.migrate(client);
    const store = new PostgresPlatformStore(client);
    await store.hydrate();
    return store;
  }

  snapshot(): PlatformSnapshot {
    return structuredClone(this.state);
  }

  viewSnapshot(): PlatformSnapshot {
    return this.state;
  }

  findPersonsByNormalizedEmail(email: string): Person[] {
    const normalized = normalizeStaffEmail(email);
    return structuredClone(
      this.state.persons.filter((item) => normalizeStaffEmail(item.email) === normalized),
    );
  }

  findPersonById(id: string): Person | undefined {
    const hit = this.state.persons.find((item) => item.id === id);
    return hit ? structuredClone(hit) : undefined;
  }

  findStaffSessionById(id: string): StaffSession | undefined {
    const hit = this.state.staffSessions.find((item) => item.id === id);
    return hit ? structuredClone(hit) : undefined;
  }

  applyStaffAuthMutation(mutation: StaffAuthMutation): void {
    const started = Date.now();
    let rowsTouched = 0;
    if (mutation.person) {
      const idx = this.state.persons.findIndex((item) => item.id === mutation.person!.id);
      if (idx >= 0) this.state.persons[idx] = structuredClone(mutation.person);
      else this.state.persons.push(structuredClone(mutation.person));
      rowsTouched += 1;
    }
    if (mutation.sessionInsert) {
      this.state.staffSessions.push(structuredClone(mutation.sessionInsert));
      rowsTouched += 1;
    }
    if (mutation.sessionUpdate) {
      const idx = this.state.staffSessions.findIndex((item) => item.id === mutation.sessionUpdate!.id);
      if (idx >= 0) this.state.staffSessions[idx] = structuredClone(mutation.sessionUpdate);
      else this.state.staffSessions.push(structuredClone(mutation.sessionUpdate));
      rowsTouched += 1;
    }
    this.state.audit.push(structuredClone(mutation.audit));
    rowsTouched += 1;
    this.recordStaffAuthPerf({
      correlationId: mutation.audit.correlationId,
      phase: "postgres.applyStaffAuthMutation.memory",
      durationMs: Date.now() - started,
      rowsTouched,
    });
    this.pending = this.pending
      .catch(() => undefined)
      .then(() => this.persistStaffAuthMutation(mutation))
      .catch(async (error) => {
        await this.hydrate();
        throw error;
      });
  }

  recordStaffAuthPerf(mark: StaffAuthPerfMark): void {
    this.authPerfMarks.push(mark);
  }

  drainStaffAuthPerf(): StaffAuthPerfMark[] {
    return this.authPerfMarks.splice(0, this.authPerfMarks.length);
  }

  private async persistStaffAuthMutation(mutation: StaffAuthMutation): Promise<void> {
    const started = Date.now();
    let queryCount = 0;
    const run = async (tx: PgQueryable) => {
      if (mutation.person) {
        const record = mutation.person as unknown as Record<string, unknown>;
        const expected =
          mutation.personExpectedVersion ?? Math.max(1, Number(mutation.person.version ?? 1) - 1);
        const existing = await tx.query<{ version: number }>(
          "SELECT version FROM platform_documents WHERE collection=$1 AND id=$2",
          ["persons", mutation.person.id],
        );
        queryCount += 1;
        if ((existing.rowCount ?? 0) === 0) {
          await tx.query(
            "INSERT INTO platform_documents (collection, id, organisation_id, client_id, event_id, version, body) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)",
            [
              "persons",
              mutation.person.id,
              record.organisationId ?? null,
              record.clientId ?? null,
              record.eventId ?? null,
              Number(mutation.person.version ?? 1),
              JSON.stringify(mutation.person),
            ],
          );
          queryCount += 1;
        } else {
          const result = await tx.query(
            "UPDATE platform_documents SET organisation_id=$3, client_id=$4, event_id=$5, version=$6, body=$7::jsonb WHERE collection=$1 AND id=$2 AND version=$8",
            [
              "persons",
              mutation.person.id,
              record.organisationId ?? null,
              record.clientId ?? null,
              record.eventId ?? null,
              Number(mutation.person.version ?? 1),
              JSON.stringify(mutation.person),
              expected,
            ],
          );
          queryCount += 1;
          if ((result.rowCount ?? 0) === 0) {
            throw new PlatformError("VERSION_CONFLICT", "persisted version conflict", {
              publicMessage: "This record changed while you were editing. Reload before saving.",
            });
          }
        }
      }
      if (mutation.sessionInsert) {
        const record = mutation.sessionInsert as unknown as Record<string, unknown>;
        await tx.query(
          "INSERT INTO platform_documents (collection, id, organisation_id, client_id, event_id, version, body) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)",
          [
            "staffSessions",
            mutation.sessionInsert.id,
            record.organisationId ?? null,
            record.clientId ?? null,
            record.eventId ?? null,
            Number(mutation.sessionInsert.version ?? 1),
            JSON.stringify(mutation.sessionInsert),
          ],
        );
        queryCount += 1;
      }
      if (mutation.sessionUpdate) {
        const record = mutation.sessionUpdate as unknown as Record<string, unknown>;
        const expected =
          mutation.sessionExpectedVersion ?? Math.max(1, Number(mutation.sessionUpdate.version ?? 1) - 1);
        const result = await tx.query(
          "UPDATE platform_documents SET organisation_id=$3, client_id=$4, event_id=$5, version=$6, body=$7::jsonb WHERE collection=$1 AND id=$2 AND version=$8",
          [
            "staffSessions",
            mutation.sessionUpdate.id,
            record.organisationId ?? null,
            record.clientId ?? null,
            record.eventId ?? null,
            Number(mutation.sessionUpdate.version ?? 1),
            JSON.stringify(mutation.sessionUpdate),
            expected,
          ],
        );
        queryCount += 1;
        if ((result.rowCount ?? 0) === 0) {
          throw new PlatformError("VERSION_CONFLICT", "persisted version conflict", {
            publicMessage: "This record changed while you were editing. Reload before saving.",
          });
        }
      }
      const riskTx = new PostgresRiskTransaction(tx);
      await riskTx.appendAudit(mutation.audit);
      queryCount += 1;
    };
    if (hasTransaction(this.client)) {
      await this.client.transaction(run);
    } else {
      await run(this.client);
    }
    this.recordStaffAuthPerf({
      correlationId: mutation.audit.correlationId,
      phase: "postgres.persistStaffAuthMutation",
      durationMs: Date.now() - started,
      queryCount,
      rowsTouched:
        (mutation.person ? 1 : 0) +
        (mutation.sessionInsert ? 1 : 0) +
        (mutation.sessionUpdate ? 1 : 0) +
        1,
    });
  }

  loadEventById(eventId: string) {
    const hit = this.state.events.find((item) => item.id === eventId);
    return hit ? structuredClone(hit) : undefined;
  }

  loadLayoutPublicationById(id: string, organisationId: string, eventId: string) {
    const hit = this.state.layoutPublications.find(
      (item) => item.id === id && item.organisationId === organisationId && item.eventId === eventId,
    );
    return hit ? structuredClone(hit) : undefined;
  }

  loadLayoutRevisionById(id: string, organisationId: string, eventId: string) {
    const hit = this.state.layoutRevisions.find(
      (item) => item.id === id && item.organisationId === organisationId && item.eventId === eventId,
    );
    return hit ? structuredClone(hit) : undefined;
  }

  loadCurrentLayoutPublication(organisationId: string, eventId: string, layoutId: string) {
    const hit = this.state.layoutPublications.find(
      (item) =>
        item.organisationId === organisationId &&
        item.eventId === eventId &&
        item.layoutId === layoutId &&
        item.status === "CURRENT",
    );
    return hit ? structuredClone(hit) : undefined;
  }

  listOperationalGuestsByEventId(organisationId: string, eventId: string) {
    return structuredClone(
      this.state.operationalGuests.filter((item) => item.organisationId === organisationId && item.eventId === eventId),
    );
  }

  listRsvpResponsesByEventId(organisationId: string, eventId: string) {
    return structuredClone(
      this.state.rsvpResponses.filter((item) => item.organisationId === organisationId && item.eventId === eventId),
    );
  }

  listDiscoveryEngagementsByEventId(organisationId: string, eventId: string) {
    return structuredClone(
      this.state.discoveryEngagements.filter(
        (item) =>
          item.organisationId === organisationId &&
          (item.convertedEventId === eventId || item.opportunityId === eventId),
      ),
    );
  }

  listPublishedEventBriefsForEvent(organisationId: string, eventId: string) {
    const engagement = this.state.discoveryEngagements.find(
      (item) =>
        item.organisationId === organisationId &&
        (item.convertedEventId === eventId || item.opportunityId === eventId),
    );
    return structuredClone(
      this.state.eventBriefEditions.filter(
        (item) =>
          item.organisationId === organisationId &&
          item.status === "PUBLISHED" &&
          item.current &&
          (!engagement || item.engagementId === engagement.id),
      ),
    );
  }

  listRiskApplicabilitySnapshotsByEventId(organisationId: string, eventId: string) {
    return structuredClone(
      this.state.riskApplicabilitySnapshots.filter(
        (item) => item.organisationId === organisationId && item.eventId === eventId,
      ),
    );
  }

  dossierRepository(): PostgresRiskDossierRepository {
    return new PostgresRiskDossierRepository(this.client);
  }

  seatingRepository(): PostgresSeatingRepository {
    return new PostgresSeatingRepository(this.client);
  }

  seatingV2Repository(): PostgresSeatingV2Repository {
    return new PostgresSeatingV2Repository(this.client);
  }

  protectionRepository(): PostgresRiskProtectionRepository {
    return new PostgresRiskProtectionRepository(this.client);
  }

  adoptAuthorityOverlay(overlay: AuthorityOverlay): void {
    const upsert = <T extends { id: string }>(current: T[], incoming?: T[]) => {
      if (!incoming?.length) return current;
      const byId = new Map(current.map((item) => [item.id, item]));
      for (const row of incoming) byId.set(row.id, row);
      return [...byId.values()];
    };
    this.state.riskRuleEditions = upsert(this.state.riskRuleEditions, overlay.rules);
    this.state.riskAuthorityGovernanceReceipts = upsert(this.state.riskAuthorityGovernanceReceipts, overlay.receipts);
    if (overlay.audit?.length) {
      const seen = new Set(this.state.audit.map((item) => item.id));
      for (const entry of overlay.audit) {
        if (!seen.has(entry.id)) this.state.audit.push(entry);
      }
    }
    if (overlay.idempotency?.length) {
      const seen = new Set(this.state.idempotency.map((item) => `${item.action}:${item.key}`));
      for (const record of overlay.idempotency) {
        if (!seen.has(`${record.action}:${record.key}`)) this.state.idempotency.push(record);
      }
    }
  }

  adoptRiskOverlay(overlay: DossierOverlay): void {
    const upsert = <T extends { id: string }>(current: T[], incoming?: T[]) => {
      if (!incoming?.length) return current;
      const byId = new Map(current.map((item) => [item.id, item]));
      for (const row of incoming) byId.set(row.id, row);
      return [...byId.values()];
    };
    this.state.riskDossierEditions = upsert(this.state.riskDossierEditions, overlay.editions);
    this.state.riskDossierPublications = upsert(this.state.riskDossierPublications, overlay.publications);
    this.state.riskDossierAccessGrants = upsert(this.state.riskDossierAccessGrants, overlay.grants);
    this.state.riskDossierExports = upsert(this.state.riskDossierExports, overlay.exports);
  }

  async flush(): Promise<void> {
    await this.pending;
  }

  replace(next: PlatformSnapshot): void {
    const normalised = structuredClone(normalizeSnapshot(next));
    const previous = this.state;
    this.state = normalised;
    this.pending = this.pending
      .catch(() => undefined)
      .then(() => this.persistTransactional(previous, normalised))
      .catch(async (error) => {
        await this.hydrate();
        throw error;
      });
  }

  async replaceAsync(next: PlatformSnapshot): Promise<void> {
    this.replace(next);
    await this.flush();
  }

  private async persistTransactional(previous: PlatformSnapshot, normalised: PlatformSnapshot): Promise<void> {
    const run = async (tx: PgQueryable) => {
      for (const collection of COLLECTIONS) {
        if (this.riskNormalized && S05B_PERSISTED_COLLECTIONS.has(collection)) continue;
        const previousById = new Map(
          (previous[collection] as Array<Record<string, unknown>>).map((item) => [idOf(collection, item), item]),
        );
        const remaining = new Set<string>();
        for (const record of normalised[collection] as Array<Record<string, unknown>>) {
          const id = idOf(collection, record);
          remaining.add(id);
          const existed = previousById.get(id);
          const incomingVersion = Number(record.version ?? 1);
          if (!existed) {
            await tx.query(
              "INSERT INTO platform_documents (collection, id, organisation_id, client_id, event_id, version, body) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)",
              [
                collection,
                id,
                record.organisationId ?? null,
                record.clientId ?? null,
                record.eventId ?? null,
                incomingVersion,
                JSON.stringify(record),
              ],
            );
            continue;
          }
          const persistedVersion = Number(existed.version ?? 1);
          const sameBody = JSON.stringify(existed) === JSON.stringify(record);
          if (incomingVersion < persistedVersion || (incomingVersion === persistedVersion && !sameBody)) {
            throw new PlatformError("VERSION_CONFLICT", "persisted version conflict", {
              publicMessage: "This record changed while you were editing. Reload before saving.",
            });
          }
          if (sameBody) continue;
          const result = await tx.query(
            "UPDATE platform_documents SET organisation_id=$3, client_id=$4, event_id=$5, version=$6, body=$7::jsonb WHERE collection=$1 AND id=$2 AND version=$8",
            [
              collection,
              id,
              record.organisationId ?? null,
              record.clientId ?? null,
              record.eventId ?? null,
              incomingVersion,
              JSON.stringify(record),
              persistedVersion,
            ],
          );
          if ((result.rowCount ?? 0) === 0) {
            throw new PlatformError("VERSION_CONFLICT", "persisted version conflict", {
              publicMessage: "This record changed while you were editing. Reload before saving.",
            });
          }
        }
        for (const [id, existed] of previousById) {
          if (remaining.has(id)) continue;
          const persistedVersion = Number(existed.version ?? 1);
          const result = await tx.query(
            "DELETE FROM platform_documents WHERE collection=$1 AND id=$2 AND version=$3",
            [collection, id, persistedVersion],
          );
          if ((result.rowCount ?? 0) > 0) continue;
          const existing = await tx.query<{ version: number }>(
            "SELECT version FROM platform_documents WHERE collection=$1 AND id=$2",
            [collection, id],
          );
          if ((existing.rowCount ?? 0) > 0) {
            throw new PlatformError("VERSION_CONFLICT", "persisted version conflict", {
              publicMessage: "This record changed while you were editing. Reload before saving.",
            });
          }
          // Concurrent delete/delete: a versioned DELETE that matches no row, and
          // the durable key is already absent, is an idempotent success. The
          // second writer does not receive VERSION_CONFLICT. If the row still
          // exists at another version, that is a stale delete and conflicts.
        }
      }
      const riskTx = new PostgresRiskTransaction(tx);
      if (this.riskNormalized) {
        await writeRiskSnapshotDelta(riskTx, previous, normalised);
      }
      const previousAuditIds = new Set(previous.audit.map((item) => item.id));
      for (const entry of normalised.audit) {
        if (previousAuditIds.has(entry.id)) continue;
        await riskTx.appendAudit(entry);
      }
      const previousIdempotencyKeys = new Set(previous.idempotency.map((item) => item.key));
      for (const entry of normalised.idempotency) {
        if (!previousIdempotencyKeys.has(entry.key)) {
          await tx.query(
            "INSERT INTO platform_idempotency (key, action, hash, result_ref, created_at, body) VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
            [entry.key, entry.action, entry.hash, entry.resultRef, entry.createdAt, JSON.stringify(entry)],
          );
          if (entry.action.startsWith("risk.")) {
            const audit = normalised.audit.find((item) => item.idempotencyKey === entry.key && item.organisationId);
            if (audit?.organisationId) {
              await riskTx.insertIdempotency({
                organisationId: audit.organisationId,
                action: entry.action,
                idempotencyKey: entry.key,
                resultRef: entry.resultRef,
                hash: entry.hash,
                createdAt: entry.createdAt,
              });
            }
          }
        }
      }
    };
    if (hasTransaction(this.client)) {
      await this.client.transaction(run);
      return;
    }
    await run(this.client);
  }

  private async hydrate(): Promise<void> {
    const next = emptySnapshot();
    const docs = await this.client.query<{ collection: Collection; body: unknown }>(
      "SELECT collection, body FROM platform_documents",
    );
    const riskStore = new PostgresRiskProtectionStore(this.client);
    this.riskNormalized = await riskStore.normalizedAuthorityAsync();
    for (const row of docs.rows) {
      if (this.riskNormalized && S05B_PERSISTED_COLLECTIONS.has(row.collection)) continue;
      const table = next[row.collection];
      if (!Array.isArray(table)) continue;
      table.push(structuredClone(asBody(row.body)));
    }
    if (this.riskNormalized) {
      overlayRiskState(next, await riskStore.loadAll());
    }
    const audit = await this.client.query<{ body: unknown }>("SELECT body FROM platform_audit");
    next.audit = audit.rows.map((row) => structuredClone(asBody<AuditEvent>(row.body)));
    const idem = await this.client.query<{ body: unknown }>("SELECT body FROM platform_idempotency");
    next.idempotency = idem.rows.map((row) => structuredClone(asBody<IdempotencyRecord>(row.body)));
    const normalised = normalizeSnapshot(next);
    validateS04APersistedCollections(normalised);
    validateS04BPersistedCollections(normalised);
    validateS04CPersistedCollections(normalised);
    validateS04DPersistedCollections(normalised);
    validateS04EPersistedCollections(normalised);
    validateS04FPersistedCollections(normalised);
    validateS05PersistedCollections(normalised);
    validateS05APersistedCollections(normalised);
    validateS05BPersistedCollections(normalised);
    this.state = normalised;
  }
}

interface MemoryRiskRow {
  table: string;
  id: string;
  organisation_id: string;
  event_id: string | null;
  version: number;
  current: boolean | null;
  status: string | null;
  parent_id: string | null;
  content_hash: string | null;
  submitted_by_person_id: string | null;
  approved_by_person_id: string | null;
  body: unknown;
  created_at: string;
  updated_at: string;
}

interface MemoryIdempotencyRiskRow {
  organisation_id: string;
  action: string;
  idempotency_key: string;
  result_ref: string;
  hash: string;
  created_at: string;
}

interface MemoryDocumentRow {
  collection: string;
  id: string;
  organisation_id: string | null;
  client_id: string | null;
  event_id: string | null;
  version: number;
  body: unknown;
}

export class MemoryPlatformPg implements PgTransactor {
  readonly documents: MemoryDocumentRow[] = [];
  readonly audit: unknown[] = [];
  readonly idempotency: Array<IdempotencyRecord & { body: unknown }> = [];
  readonly migrations: Array<{ id: string; applied_at: string; checksum: string }> = [];
  readonly seeds: Array<{
    seed_id: string;
    seed_version: string;
    applied_at: string;
    record_count: number;
    synthetic: boolean;
  }> = [];
  readonly cleanup: Array<{
    id: string;
    occurred_at: string;
    mode: string;
    seed_id: string | null;
    collections: unknown;
    confirmed: boolean;
  }> = [];
  readonly riskRows: MemoryRiskRow[] = [];
  readonly riskIdempotency: MemoryIdempotencyRiskRow[] = [];
  readonly seatingRows: Array<{ table: string; cols: Record<string, unknown> }> = [];
  private failNext = false;
  private failNextAudit = false;
  private snapshot: {
    documents: MemoryDocumentRow[];
    audit: unknown[];
    idempotency: Array<IdempotencyRecord & { body: unknown }>;
    migrations: Array<{ id: string; applied_at: string; checksum: string }>;
    seeds: MemoryPlatformPg["seeds"];
    cleanup: MemoryPlatformPg["cleanup"];
    riskRows: MemoryRiskRow[];
    riskIdempotency: MemoryIdempotencyRiskRow[];
    seatingRows: Array<{ table: string; cols: Record<string, unknown> }>;
  } | undefined;

  failNextWrite(): void {
    this.failNext = true;
  }

  failNextAuditWrite(): void {
    this.failNextAudit = true;
  }

  async transaction<T>(fn: (client: PgQueryable) => Promise<T>): Promise<T> {
    this.snapshot = {
      documents: structuredClone(this.documents),
      audit: structuredClone(this.audit),
      idempotency: structuredClone(this.idempotency),
      migrations: structuredClone(this.migrations),
      seeds: structuredClone(this.seeds),
      cleanup: structuredClone(this.cleanup),
      riskRows: structuredClone(this.riskRows),
      riskIdempotency: structuredClone(this.riskIdempotency),
      seatingRows: structuredClone(this.seatingRows),
    };
    try {
      const result = await fn(this);
      this.snapshot = undefined;
      return result;
    } catch (error) {
      this.restore();
      throw error;
    }
  }

  private restore(): void {
    if (!this.snapshot) return;
    this.documents.splice(0, this.documents.length, ...this.snapshot.documents);
    this.audit.splice(0, this.audit.length, ...this.snapshot.audit);
    this.idempotency.splice(0, this.idempotency.length, ...this.snapshot.idempotency);
    this.migrations.splice(0, this.migrations.length, ...this.snapshot.migrations);
    this.seeds.splice(0, this.seeds.length, ...this.snapshot.seeds);
    this.cleanup.splice(0, this.cleanup.length, ...this.snapshot.cleanup);
    this.riskRows.splice(0, this.riskRows.length, ...this.snapshot.riskRows);
    this.riskIdempotency.splice(0, this.riskIdempotency.length, ...this.snapshot.riskIdempotency);
    this.seatingRows.splice(0, this.seatingRows.length, ...this.snapshot.seatingRows);
    this.snapshot = undefined;
  }

  async query<T extends object = Record<string, unknown>>(
    text: string,
    values: unknown[] = [],
  ): Promise<PgQueryResult<T>> {
    const statements = text
      .split(";")
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    let last: PgQueryResult<T> = { rows: [], rowCount: 0 };
    for (const sql of statements) {
      last = await this.exec<T>(sql, values);
    }
    return last;
  }

  private async exec<T extends object>(sql: string, values: unknown[]): Promise<PgQueryResult<T>> {
    if (sql === "BEGIN") {
      this.snapshot = {
        documents: structuredClone(this.documents),
        audit: structuredClone(this.audit),
        idempotency: structuredClone(this.idempotency),
        migrations: structuredClone(this.migrations),
        seeds: structuredClone(this.seeds),
        cleanup: structuredClone(this.cleanup),
        riskRows: structuredClone(this.riskRows),
        riskIdempotency: structuredClone(this.riskIdempotency),
        seatingRows: structuredClone(this.seatingRows),
      };
      return { rows: [], rowCount: 0 };
    }
    if (sql === "COMMIT") {
      this.snapshot = undefined;
      return { rows: [], rowCount: 0 };
    }
    if (sql === "ROLLBACK") {
      this.restore();
      return { rows: [], rowCount: 0 };
    }
    if (sql.startsWith("CREATE TABLE")) return { rows: [], rowCount: 0 };
    if (sql.startsWith("CREATE INDEX") || sql.startsWith("CREATE UNIQUE INDEX")) return { rows: [], rowCount: 0 };
    if (sql.startsWith("ALTER TABLE") || sql.startsWith("DROP INDEX")) return { rows: [], rowCount: 0 };
    const seatingHandled = this.execSeatingSql<T>(sql, values);
    if (seatingHandled) return seatingHandled;
    const riskHandled = this.execRiskSql<T>(sql, values);
    if (riskHandled) return riskHandled;
    if (this.failNext && sql.startsWith("INSERT")) {
      this.failNext = false;
      throw new Error("synthetic write failure");
    }
    if (sql.startsWith("SELECT id, checksum FROM platform_schema_migrations")) {
      return { rows: this.migrations.map((row) => ({ id: row.id, checksum: row.checksum })) as T[], rowCount: this.migrations.length };
    }
    if (sql.startsWith("INSERT INTO platform_schema_migrations")) {
      const [id, appliedAt, checksum] = values as [string, string, string];
      if (this.migrations.some((row) => row.id === id)) throw new Error("unique_violation");
      this.migrations.push({ id, applied_at: appliedAt, checksum });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("SELECT seed_id, seed_version")) {
      const seedId = String(values[0] ?? "");
      return {
        rows: this.seeds.filter((row) => row.seed_id === seedId) as T[],
        rowCount: this.seeds.filter((row) => row.seed_id === seedId).length,
      };
    }
    if (sql.startsWith("INSERT INTO platform_seed_ledger")) {
      const [seedId, seedVersion, appliedAt, recordCount] = values as [string, string, string, number];
      if (!this.seeds.some((row) => row.seed_id === seedId)) {
        this.seeds.push({
          seed_id: seedId,
          seed_version: seedVersion,
          applied_at: appliedAt,
          record_count: recordCount,
          synthetic: true,
        });
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
    if (sql.startsWith("INSERT INTO platform_cleanup_audit")) {
      this.cleanup.push({
        id: String(values[0]),
        occurred_at: String(values[1]),
        mode: String(values[2]),
        seed_id: values[3] == null ? null : String(values[3]),
        collections: typeof values[4] === "string" ? JSON.parse(String(values[4])) : values[4],
        confirmed: Boolean(values[5]),
      });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("SELECT version FROM platform_documents")) {
      const [collection, id] = values as [string, string];
      const row = this.documents.find((item) => item.collection === collection && item.id === id);
      if (!row) return { rows: [], rowCount: 0 };
      return { rows: [{ version: row.version }] as T[], rowCount: 1 };
    }
    if (sql.startsWith("SELECT body FROM platform_documents WHERE collection")) {
      const [collection, id] = values as [string, string];
      const rows = this.documents.filter((row) => row.collection === collection && (!id || row.id === id));
      return { rows: rows.map((row) => ({ body: row.body })) as T[], rowCount: rows.length };
    }
    if (sql.startsWith("SELECT collection, body FROM platform_documents")) {
      return { rows: this.documents.map((row) => ({ collection: row.collection, body: row.body })) as T[], rowCount: this.documents.length };
    }
    if (sql.startsWith("SELECT body FROM platform_audit")) {
      return { rows: this.audit.map((body) => ({ body })) as T[], rowCount: this.audit.length };
    }
    if (sql.startsWith("SELECT body FROM platform_idempotency")) {
      return { rows: this.idempotency.map((row) => ({ body: row.body })) as T[], rowCount: this.idempotency.length };
    }
    if (sql.startsWith("INSERT INTO platform_documents")) {
      const [collection, id, organisationId, clientId, eventId, version, bodyJson] = values as [
        string,
        string,
        string | null,
        string | null,
        string | null,
        number,
        string,
      ];
      if (this.documents.some((row) => row.collection === collection && row.id === id)) {
        throw new Error("unique_violation");
      }
      this.documents.push({
        collection,
        id,
        organisation_id: organisationId,
        client_id: clientId,
        event_id: eventId,
        version,
        body: JSON.parse(bodyJson),
      });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("UPDATE platform_documents")) {
      const [collection, id, organisationId, clientId, eventId, version, bodyJson, expectedVersion] = values as [
        string,
        string,
        string | null,
        string | null,
        string | null,
        number,
        string,
        number | undefined,
      ];
      const row = this.documents.find((item) => item.collection === collection && item.id === id);
      if (!row) return { rows: [], rowCount: 0 };
      if (expectedVersion !== undefined && Number(row.version) !== Number(expectedVersion)) {
        return { rows: [], rowCount: 0 };
      }
      row.organisation_id = organisationId;
      row.client_id = clientId;
      row.event_id = eventId;
      row.version = version;
      row.body = JSON.parse(bodyJson);
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("DELETE FROM platform_documents")) {
      if (!sql.includes("AND version")) {
        throw new Error("unversioned document delete is forbidden");
      }
      const [collection, id, version] = values as [string, string, number];
      const index = this.documents.findIndex(
        (row) => row.collection === collection && row.id === id && Number(row.version) === Number(version),
      );
      if (index < 0) return { rows: [], rowCount: 0 };
      this.documents.splice(index, 1);
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("INSERT INTO platform_audit")) {
      if (this.failNextAudit) {
        this.failNextAudit = false;
        throw new Error("synthetic audit write failure");
      }
      this.audit.push(JSON.parse(String(values[7])));
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("SELECT key, action, hash, result_ref, created_at FROM platform_idempotency")) {
      const key = String(values[0] ?? "");
      const row = this.idempotency.find((item) => item.key === key);
      if (!row) return { rows: [], rowCount: 0 };
      return {
        rows: [{ key: row.key, action: row.action, hash: row.hash, result_ref: row.resultRef, created_at: row.createdAt }] as T[],
        rowCount: 1,
      };
    }
    if (sql.startsWith("INSERT INTO platform_idempotency")) {
      if (this.idempotency.some((row) => row.key === String(values[0]))) {
        throw new Error("unique_violation");
      }
      this.idempotency.push({
        key: String(values[0]),
        action: String(values[1]),
        hash: String(values[2]),
        resultRef: String(values[3]),
        createdAt: String(values[4]),
        body: JSON.parse(String(values[5])),
      });
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`unsupported test SQL: ${sql}`);
  }

  private execSeatingSql<T extends object>(sql: string, values: unknown[]): PgQueryResult<T> | undefined {
    const tableMatch = sql.match(/\b(seating_[a-z0-9_]+)\b/);
    if (!tableMatch) return undefined;
    const table = tableMatch[1] ?? "";
    if (
      sql.includes("event_id") &&
      (table === "seating_v2_evaluation_runs" ||
        table === "seating_v2_evaluation_case_results" ||
        table === "seating_v2_migration_receipts")
    ) {
      throw new Error(`column "event_id" does not exist`);
    }
    if (this.failNext && sql.startsWith("INSERT INTO")) {
      this.failNext = false;
      throw new Error("synthetic write failure");
    }
    if (this.failNextAudit && sql.startsWith("INSERT INTO platform_audit")) {
      this.failNextAudit = false;
      throw new Error("synthetic audit failure");
    }
    if (sql.startsWith("INSERT INTO")) {
      const columnsMatch = sql.match(/INSERT INTO [a-z0-9_]+ \(([^)]+)\)/);
      const columns = (columnsMatch?.[1] ?? "").split(",").map((item) => item.trim()).filter(Boolean);
      const cols: Record<string, unknown> = {};
      columns.forEach((column, index) => {
        cols[column] = values[index];
      });
      if (
        cols.id != null &&
        this.seatingRows.some((row) => row.table === table && row.cols.id != null && String(row.cols.id) === String(cols.id))
      ) {
        throw new Error("unique_violation");
      }
      if (
        table === "seating_v2_idempotency_receipts" &&
        this.seatingRows.some(
          (row) =>
            row.table === table &&
            String(row.cols.organisation_id) === String(cols.organisation_id) &&
            String(row.cols.event_id) === String(cols.event_id) &&
            String(row.cols.action) === String(cols.action) &&
            String(row.cols.idempotency_key) === String(cols.idempotency_key),
        )
      ) {
        throw new Error("unique_violation");
      }
      if (table === "seating_v2_runs" && ["FEASIBLE", "INFEASIBLE", "QUEUED", "RUNNING"].includes(String(cols.status))) {
        const replayKey = (item: Record<string, unknown>) =>
          [
            item.organisation_id,
            item.event_id,
            item.package_hash,
            item.semantic_hash,
            item.compiled_request_hash,
            item.compiler_version,
            item.solver_version,
            item.solver_config_hash,
            item.validator_version,
            item.deterministic_seed,
          ].join("|");
        if (
          this.seatingRows.some(
            (row) =>
              row.table === table &&
              ["FEASIBLE", "INFEASIBLE", "QUEUED", "RUNNING"].includes(String(row.cols.status)) &&
              replayKey(row.cols) === replayKey(cols),
          )
        ) {
          throw new Error("unique_violation");
        }
      }
      if (cols.current === true) {
        for (const row of this.seatingRows) {
          if (row.table === table && row.cols.current === true && row.cols.event_id === cols.event_id && row.cols.organisation_id === cols.organisation_id) {
            throw new Error("duplicate key value violates unique constraint");
          }
        }
      }
      if (cols.current_working === true) {
        for (const row of this.seatingRows) {
          if (row.table === table && row.cols.current_working === true && row.cols.event_id === cols.event_id && row.cols.organisation_id === cols.organisation_id) {
            throw new Error("duplicate key value violates unique constraint");
          }
        }
      }
      if (cols.status === "CURRENT" && table === "seating_publications") {
        for (const row of this.seatingRows) {
          if (row.table === table && row.cols.status === "CURRENT" && row.cols.event_id === cols.event_id && row.cols.organisation_id === cols.organisation_id) {
            throw new Error("duplicate key value violates unique constraint");
          }
        }
      }
      this.seatingRows.push({ table, cols });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("UPDATE") && !sql.includes("WHERE id")) {
      const orgSlot = sql.match(/organisation_id = \$(\d+)/);
      const eventSlot = sql.match(/event_id = \$(\d+)/);
      const statusSlot = sql.match(/AND status = \$(\d+)/);
      let count = 0;
      for (const row of this.seatingRows) {
        if (row.table !== table) continue;
        if (orgSlot && String(row.cols.organisation_id) !== String(values[Number(orgSlot[1]) - 1])) continue;
        if (eventSlot && String(row.cols.event_id) !== String(values[Number(eventSlot[1]) - 1])) continue;
        if (sql.includes("current = TRUE") && row.cols.current !== true) continue;
        if (sql.includes("current_working = TRUE") && row.cols.current_working !== true) continue;
        if (statusSlot && String(row.cols.status) !== String(values[Number(statusSlot[1]) - 1])) continue;
        if (sql.includes("SET current = FALSE")) row.cols.current = false;
        if (sql.includes("SET current_working = FALSE")) row.cols.current_working = false;
        if (sql.includes("SET status = $1")) row.cols.status = values[0];
        count += 1;
      }
      return { rows: [], rowCount: count };
    }
    if (sql.startsWith("UPDATE") && sql.includes("WHERE id = $1 AND organisation_id = $2 AND event_id = $3")) {
      const row = this.seatingRows.find((item) => item.table === table && String(item.cols.id) === String(values[0]));
      if (!row) return { rows: [], rowCount: 0 };
      if (String(row.cols.organisation_id) !== String(values[1])) return { rows: [], rowCount: 0 };
      if (row.cols.event_id && String(row.cols.event_id) !== String(values[2])) return { rows: [], rowCount: 0 };
      const assignments = [...sql.matchAll(/([a-z_]+) = \$(\d+)/g)];
      for (const assignment of assignments) {
        const column = assignment[1];
        const index = Number(assignment[2]) - 1;
        if (!column || column === "id" || column === "organisation_id" || column === "event_id") continue;
        row.cols[column] = values[index];
      }
      return { rows: [{ ...row.cols }] as T[], rowCount: 1 };
    }
    if (sql.startsWith("UPDATE")) {
      const id = String(values[0]);
      const expectedVersion = Number(values[1]);
      const row = this.seatingRows.find((item) => item.table === table && String(item.cols.id) === id);
      if (!row || Number(row.cols.version) !== expectedVersion) return { rows: [], rowCount: 0 };
      const assignments = [...sql.matchAll(/([a-z_]+) = \$(\d+)/g)];
      for (const assignment of assignments) {
        const column = assignment[1];
        const index = Number(assignment[2]) - 1;
        if (!column || column === "id") continue;
        if (column === "version" && Number(assignment[2]) === 2) continue;
        row.cols[column] = values[index];
      }
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("DELETE FROM")) {
      const id = values[0] != null ? String(values[0]) : undefined;
      const remaining = this.seatingRows.filter((row) => {
        if (row.table !== table) return true;
        if (id && String(row.cols.id) !== id) return true;
        if (values[1] && String(row.cols.organisation_id) !== String(values[1])) return true;
        if (values[2] && String(row.cols.event_id) !== String(values[2])) return true;
        return false;
      });
      const count = this.seatingRows.length - remaining.length;
      this.seatingRows.splice(0, this.seatingRows.length, ...remaining);
      return { rows: [], rowCount: count };
    }
    if (sql.startsWith("SELECT")) {
      const rows = this.seatingRows.filter((row) => {
        if (row.table !== table) return false;
        if (sql.includes("WHERE id") && String(row.cols.id) !== String(values[0] ?? "")) return false;
        if (sql.includes("organisation_id") && values[0] && !sql.includes("WHERE id") && String(row.cols.organisation_id) !== String(values[0])) {
          return false;
        }
        if (sql.includes("WHERE id") && sql.includes("organisation_id") && String(row.cols.organisation_id) !== String(values[1] ?? row.cols.organisation_id)) {
          return false;
        }
        if (sql.includes("event_id") && values[1] && !sql.includes("WHERE id") && String(row.cols.event_id) !== String(values[1])) return false;
        if (sql.includes("event_id") && sql.includes("WHERE id") && values[2] && row.cols.event_id && String(row.cols.event_id) !== String(values[2])) {
          return false;
        }
        if (sql.includes("action =") && String(row.cols.action) !== String(values[2] ?? values[1] ?? "")) return false;
        if (sql.includes("idempotency_key") && String(row.cols.idempotency_key) !== String(values[3] ?? values[2] ?? "")) return false;
        return true;
      });
      return { rows: rows.map((row) => ({ ...row.cols })) as T[], rowCount: rows.length };
    }
    return { rows: [], rowCount: 0 };
  }

  private execRiskSql<T extends object>(sql: string, values: unknown[]): PgQueryResult<T> | undefined {
    const tableMatch = sql.match(/\b(risk_[a-z_]+)\b/);
    if (!tableMatch) return undefined;
    const table = tableMatch[1] ?? "";
    if (table === "risk_idempotency_receipts") {
      if (sql.startsWith("INSERT INTO risk_idempotency_receipts")) {
        const [organisationId, action, key, resultRef, hash, createdAt] = values as string[];
        if (this.riskIdempotency.some((row) => row.organisation_id === organisationId && row.action === action && row.idempotency_key === key)) {
          throw new Error("unique_violation");
        }
        this.riskIdempotency.push({
          organisation_id: String(organisationId ?? ""),
          action: String(action ?? ""),
          idempotency_key: String(key ?? ""),
          result_ref: String(resultRef ?? ""),
          hash: String(hash ?? ""),
          created_at: String(createdAt ?? ""),
        });
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith("DELETE FROM risk_idempotency_receipts") && values.length === 0) {
        const count = this.riskIdempotency.length;
        this.riskIdempotency.splice(0, count);
        return { rows: [], rowCount: count };
      }
      if (sql.startsWith("SELECT")) {
        const rows = this.riskIdempotency.filter(
          (row) =>
            (!values[0] || row.organisation_id === values[0]) &&
            (!values[1] || row.action === values[1]) &&
            (!values[2] || row.idempotency_key === values[2]),
        );
        return {
          rows: rows.map((row) => ({
            organisationId: row.organisation_id,
            action: row.action,
            idempotencyKey: row.idempotency_key,
            resultRef: row.result_ref,
            hash: row.hash,
            createdAt: row.created_at,
          })) as T[],
          rowCount: rows.length,
        };
      }
      return { rows: [], rowCount: 0 };
    }
    if (!RISK_SQL_TABLES.some((item) => item.table === table)) return undefined;
    if (this.failNext && sql.startsWith("INSERT INTO")) {
      this.failNext = false;
      throw new Error("synthetic write failure");
    }
    if (sql.startsWith("INSERT INTO")) {
      const [
        id,
        organisationId,
        eventId,
        version,
        current,
        status,
        parentId,
        contentHash,
        submittedBy,
        approvedBy,
        bodyJson,
        createdAt,
        updatedAt,
      ] = values as [
        string,
        string,
        string | null,
        number,
        boolean | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string,
        string,
        string,
      ];
      if (this.riskRows.some((row) => row.table === table && row.id === id)) throw new Error("unique_violation");
      if (current === true) {
        const eventScoped =
          table === "risk_continuity_plans" || table === "risk_dossier_editions" || table === "risk_dossier_publications";
        const conflict = this.riskRows.some((row) => {
          if (row.table !== table || row.current !== true) return false;
          if (table === "risk_policy_editions") return row.parent_id === parentId && parentId != null;
          return eventScoped && row.event_id === eventId && eventId != null;
        });
        if (conflict) throw new Error("duplicate key value violates unique constraint");
      }
      this.riskRows.push({
        table,
        id,
        organisation_id: organisationId,
        event_id: eventId,
        version,
        current,
        status,
        parent_id: parentId,
        content_hash: contentHash,
        submitted_by_person_id: submittedBy,
        approved_by_person_id: approvedBy,
        body: typeof bodyJson === "string" ? JSON.parse(bodyJson) : bodyJson,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("UPDATE") && sql.includes("SET current = FALSE")) {
      const keepId = String(values[1]);
      const scoped = String(values[0]);
      const byParent = sql.includes("parent_id");
      let count = 0;
      for (const row of this.riskRows) {
        if (row.table !== table || row.id === keepId || row.current !== true) continue;
        if (byParent ? row.parent_id === scoped : row.event_id === scoped) {
          row.current = false;
          if (row.body && typeof row.body === "object") {
            (row.body as { current?: boolean }).current = false;
          }
          count += 1;
        }
      }
      return { rows: [], rowCount: count };
    }
    if (sql.startsWith("UPDATE")) {
      const id = String(values[0]);
      const expectedVersion = Number(values[1]);
      const row = this.riskRows.find((item) => item.table === table && item.id === id);
      if (!row || Number(row.version) !== expectedVersion) return { rows: [], rowCount: 0 };
      row.organisation_id = String(values[2] ?? row.organisation_id);
      row.event_id = (values[3] as string | null) ?? null;
      row.version = Number(values[4]);
      row.current = (values[5] as boolean | null) ?? null;
      row.status = (values[6] as string | null) ?? null;
      row.parent_id = (values[7] as string | null) ?? null;
      row.content_hash = (values[8] as string | null) ?? null;
      row.submitted_by_person_id = (values[9] as string | null) ?? null;
      row.approved_by_person_id = (values[10] as string | null) ?? null;
      row.body = typeof values[11] === "string" ? JSON.parse(String(values[11])) : values[11];
      row.updated_at = String(values[12] ?? row.updated_at);
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("DELETE FROM") && values.length === 0) {
      const remaining = this.riskRows.filter((row) => row.table !== table);
      const count = this.riskRows.length - remaining.length;
      this.riskRows.splice(0, this.riskRows.length, ...remaining);
      return { rows: [], rowCount: count };
    }
    if (sql.startsWith("DELETE FROM")) {
      const id = String(values[0]);
      const version = Number(values[1]);
      const index = this.riskRows.findIndex((row) => row.table === table && row.id === id && Number(row.version) === version);
      if (index < 0) return { rows: [], rowCount: 0 };
      this.riskRows.splice(index, 1);
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("SELECT COUNT")) {
      const organisationId = values[0] ? String(values[0]) : undefined;
      const eventId = values[1] ? String(values[1]) : undefined;
      const count = this.riskRows.filter((row) => {
        if (row.table !== table) return false;
        if (organisationId && row.organisation_id !== organisationId) return false;
        if (eventId && row.event_id !== eventId) return false;
        return true;
      }).length;
      return { rows: [{ count } as T], rowCount: 1 };
    }
    if (sql.startsWith("SELECT body FROM") || sql.startsWith("SELECT")) {
      const organisationId = sql.includes("organisation_id") ? String(values[0] ?? "") : undefined;
      const eventId = sql.includes("event_id") ? String(values[1] ?? "") : undefined;
      const idFilter = sql.includes("WHERE id") ? String(values[0] ?? "") : sql.includes("AND id =") ? String(values[2] ?? "") : undefined;
      const hashFilter = sql.includes("content_hash") ? String(values[2] ?? values[1] ?? "") : undefined;
      const tokenHash = sql.includes("tokenHash") ? String(values[0] ?? "") : undefined;
      const currentOnly = sql.includes("current IS TRUE");
      const statusActive = sql.includes("status = 'ACTIVE'");
      const limitMatch = sql.match(/LIMIT \$(\d+)/);
      const limit = limitMatch ? Number(values[Number(limitMatch[1]) - 1] ?? 20) : undefined;
      const rows = this.riskRows.filter((row) => {
        if (row.table !== table) return false;
        if (tokenHash) return (row.body as { tokenHash?: string }).tokenHash === tokenHash;
        if (sql.includes("WHERE id") && !sql.includes("organisation_id") && row.id !== idFilter) return false;
        if (sql.includes("WHERE id") && sql.includes("organisation_id") && row.id !== String(values[0] ?? "")) return false;
        if (organisationId && sql.includes("organisation_id") && !sql.includes("WHERE id") && row.organisation_id !== organisationId && row.organisation_id !== "") return false;
        if (eventId && sql.includes("event_id") && row.event_id !== eventId) return false;
        if (hashFilter && sql.includes("content_hash") && row.content_hash !== hashFilter) return false;
        if (idFilter && sql.includes("AND id =") && row.id !== idFilter) return false;
        if (currentOnly && row.current !== true) return false;
        if (statusActive && row.status !== "ACTIVE") return false;
        if (sql.includes("WHERE status") && !statusActive && !sql.includes("organisation_id")) return row.status === "APPLIED";
        return true;
      });
      const sliced = limit ? rows.slice(0, limit) : rows;
      return { rows: sliced.map((row) => ({ body: row.body })) as T[], rowCount: sliced.length };
    }
    return { rows: [], rowCount: 0 };
  }
}
