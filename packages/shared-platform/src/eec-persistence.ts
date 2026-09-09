import { PlatformError } from "./errors.js";
import {
  AssertionConflictSchema,
  CandidateAssertionSchema,
  CoverageAssessmentSchema,
  CoverageCatalogueEditionSchema,
  CoverageRequirementSchema,
  DiscoveryConsentRecordSchema,
  DiscoveryEngagementSchema,
  DiscoveryParticipantSchema,
  EngagementOpportunitySchema,
  InterviewSessionSchema,
  S05AMigrationReceiptSchema,
  S05A_CANONICAL_COLLECTIONS,
  SourceArtefactSchema,
  SourceSegmentSchema,
} from "./eec-schemas.js";
import {
  AiEvaluationRunSchema,
  AiJobSchema,
  BudgetAssumptionSchema,
  BudgetBomSnapshotSchema,
  BudgetLineSchema,
  BudgetRecommendationEditionSchema,
  BudgetScenarioEditionSchema,
  BudgetTaxonomyEditionSchema,
  BudgetTemplateEditionSchema,
  ChangeProposalSchema,
  ClientBriefDecisionSchema,
  CalendarDefinitionSchema,
  ClientInvestmentActionSchema,
  ClientOverviewEditionSchema,
  ClientReviewActionSchema,
  ClientReviewEditionSchema,
  ContingencyRuleEditionSchema,
  ConversationTurnSchema,
  ConversionReceiptSchema,
  CostItemDefinitionSchema,
  CostRuleEditionSchema,
  DiscoveryClientAccessSchema,
  EventBriefDraftSchema,
  EventBriefEditionSchema,
  EventCalendarOverlaySchema,
  FinancialStateDeclarationSchema,
  FxObservationSchema,
  ImpactAssessmentSchema,
  LocationCostZoneSchema,
  LocationFactorEditionSchema,
  LookupTableEditionSchema,
  MarketIndexDefinitionSchema,
  MarketIndexObservationSchema,
  PriceEvidenceSchema,
  RoadmapDependencySchema,
  RoadmapEditionSchema,
  RoadmapMilestoneSchema,
  RoadmapScheduleResultSchema,
  RoadmapTemplateEditionSchema,
  S05AIntelligenceReceiptSchema,
  S05A_INTELLIGENCE_COLLECTIONS,
  ScenarioComparisonSchema,
  SeasonWindowEditionSchema,
  SensitivityRunSchema,
  VendorPriceCardEditionSchema,
  VendorPriceCardSchema,
} from "./eec-intelligence-schemas.js";
import {
  AiEvaluationCaseResultSchema,
  AiEvaluationRunLeaseSchema,
  S05AEvaluationMigrationReceiptSchema,
  S05A_EVALUATION_COLLECTIONS,
} from "./eec-evaluation-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export const S05A_UNKNOWN_FIELDS_POLICY = "REJECT" as const;
export const S05A_JOURNAL_COLLECTION = "s05aMigrationReceipts" as const;
export const S05A_STORE_COLLECTIONS = [...S05A_CANONICAL_COLLECTIONS, S05A_JOURNAL_COLLECTION] as const;

const S05A_COLLECTION_SCHEMAS = {
  engagementOpportunities: EngagementOpportunitySchema.array(),
  discoveryEngagements: DiscoveryEngagementSchema.array(),
  discoveryParticipants: DiscoveryParticipantSchema.array(),
  discoveryConsentRecords: DiscoveryConsentRecordSchema.array(),
  interviewSessions: InterviewSessionSchema.array(),
  sourceArtefacts: SourceArtefactSchema.array(),
  sourceSegments: SourceSegmentSchema.array(),
  candidateAssertions: CandidateAssertionSchema.array(),
  assertionConflicts: AssertionConflictSchema.array(),
  coverageCatalogueEditions: CoverageCatalogueEditionSchema.array(),
  coverageRequirements: CoverageRequirementSchema.array(),
  coverageAssessments: CoverageAssessmentSchema.array(),
  s05aMigrationReceipts: S05AMigrationReceiptSchema.array(),
} as const;

const S05A_INTELLIGENCE_SCHEMAS = {
  eventBriefDrafts: EventBriefDraftSchema.array(),
  eventBriefEditions: EventBriefEditionSchema.array(),
  clientBriefDecisions: ClientBriefDecisionSchema.array(),
  discoveryClientAccess: DiscoveryClientAccessSchema.array(),
  conversionReceipts: ConversionReceiptSchema.array(),
  budgetTaxonomyEditions: BudgetTaxonomyEditionSchema.array(),
  costItemDefinitions: CostItemDefinitionSchema.array(),
  costRuleEditions: CostRuleEditionSchema.array(),
  priceEvidenceRecords: PriceEvidenceSchema.array(),
  budgetTemplateEditions: BudgetTemplateEditionSchema.array(),
  budgetAssumptions: BudgetAssumptionSchema.array(),
  budgetScenarioEditions: BudgetScenarioEditionSchema.array(),
  budgetRecommendationEditions: BudgetRecommendationEditionSchema.array(),
  financialStateDeclarations: FinancialStateDeclarationSchema.array(),
  roadmapMilestones: RoadmapMilestoneSchema.array(),
  roadmapEditions: RoadmapEditionSchema.array(),
  roadmapDependencies: RoadmapDependencySchema.array(),
  changeProposals: ChangeProposalSchema.array(),
  impactAssessments: ImpactAssessmentSchema.array(),
  aiJobs: AiJobSchema.array(),
  aiEvaluationRuns: AiEvaluationRunSchema.array(),
  s05aIntelligenceReceipts: S05AIntelligenceReceiptSchema.array(),
  vendorPriceCards: VendorPriceCardSchema.array(),
  vendorPriceCardEditions: VendorPriceCardEditionSchema.array(),
  marketIndexDefinitions: MarketIndexDefinitionSchema.array(),
  marketIndexObservations: MarketIndexObservationSchema.array(),
  fxObservations: FxObservationSchema.array(),
  locationCostZones: LocationCostZoneSchema.array(),
  locationFactorEditions: LocationFactorEditionSchema.array(),
  seasonWindowEditions: SeasonWindowEditionSchema.array(),
  lookupTableEditions: LookupTableEditionSchema.array(),
  budgetLines: BudgetLineSchema.array(),
  budgetBomSnapshots: BudgetBomSnapshotSchema.array(),
  contingencyRuleEditions: ContingencyRuleEditionSchema.array(),
  sensitivityRuns: SensitivityRunSchema.array(),
  scenarioComparisons: ScenarioComparisonSchema.array(),
  roadmapTemplateEditions: RoadmapTemplateEditionSchema.array(),
  roadmapScheduleResults: RoadmapScheduleResultSchema.array(),
  conversationTurns: ConversationTurnSchema.array(),
  clientOverviewEditions: ClientOverviewEditionSchema.array(),
  clientReviewEditions: ClientReviewEditionSchema.array(),
  clientReviewActions: ClientReviewActionSchema.array(),
  clientInvestmentActions: ClientInvestmentActionSchema.array(),
  calendarDefinitions: CalendarDefinitionSchema.array(),
  eventCalendarOverlays: EventCalendarOverlaySchema.array(),
} as const;

const S05A_EVALUATION_SCHEMAS = {
  aiEvaluationCaseResults: AiEvaluationCaseResultSchema.array(),
  aiEvaluationRunLeases: AiEvaluationRunLeaseSchema.array(),
  s05aEvaluationMigrationReceipts: S05AEvaluationMigrationReceiptSchema.array(),
} as const;

export function validateS05APersistedCollections(snapshot: PlatformSnapshot): void {
  for (const collection of S05A_STORE_COLLECTIONS) {
    const parsed = S05A_COLLECTION_SCHEMAS[collection].safeParse(snapshot[collection]);
    if (!parsed.success) {
      throw new PlatformError("VALIDATION_FAILED", `invalid ${collection}`, {
        details: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      });
    }
  }
  for (const collection of S05A_INTELLIGENCE_COLLECTIONS) {
    const parsed = S05A_INTELLIGENCE_SCHEMAS[collection].safeParse(snapshot[collection]);
    if (!parsed.success) {
      throw new PlatformError("VALIDATION_FAILED", `invalid ${collection}`, {
        details: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      });
    }
  }
  for (const collection of S05A_EVALUATION_COLLECTIONS) {
    const parsed = S05A_EVALUATION_SCHEMAS[collection].safeParse(snapshot[collection]);
    if (!parsed.success) {
      throw new PlatformError("VALIDATION_FAILED", `invalid ${collection}`, {
        details: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      });
    }
  }
  for (const segment of snapshot.sourceSegments) {
    const artefact = snapshot.sourceArtefacts.find((item) => item.id === segment.artefactId);
    if (!artefact || artefact.engagementId !== segment.engagementId || artefact.organisationId !== segment.organisationId) {
      throw new PlatformError("VALIDATION_FAILED", "source segments cannot outlive or cross their source artefact");
    }
  }
  for (const assertion of snapshot.candidateAssertions) {
    for (const segmentId of assertion.sourceSegmentIds) {
      const segment = snapshot.sourceSegments.find((item) => item.id === segmentId);
      if (!segment || segment.engagementId !== assertion.engagementId || segment.organisationId !== assertion.organisationId) {
        throw new PlatformError("VALIDATION_FAILED", "assertion source IDs must share engagement and organisation");
      }
    }
  }
  const converted = snapshot.discoveryEngagements.filter((item) => item.convertedEventId);
  const byEvent = new Map<string, string>();
  for (const engagement of converted) {
    const eventId = engagement.convertedEventId!;
    const existing = byEvent.get(eventId);
    if (existing && existing !== engagement.id) {
      throw new PlatformError("VALIDATION_FAILED", "conversion links one engagement to at most one operational Event");
    }
    byEvent.set(eventId, engagement.id);
  }
}
