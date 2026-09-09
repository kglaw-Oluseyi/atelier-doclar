import { createHash, randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import { type BudgetExpr } from "./eec-budget-engine.js";
import {
  assessChangeImpactDeepOnSnap,
  buildExecutiveCommandDeep,
  calculateBudgetScenarioDeepOnSnap,
  calculateSchedule,
  instantiateRoadmapFromTemplateOnSnap,
  nextGovernedInterviewTurn,
  propagateApprovedChangeOnSnap,
  applyQuantityRulesToCatalogue,
  seedBudgetKnowledgeOnSnap,
} from "./eec-s05a-depth.js";
import { exactHash, nfc } from "./eec-hash.js";
import { emptyMasterEventFile } from "./mef.js";
import { ensureDefaultPhaseOnSnap } from "./programme-operations.js";
import type { Client, EventRecord } from "./schemas.js";
import type {
  AiJob,
  BudgetRecommendationEdition,
  BudgetScenarioEdition,
  BudgetTemplateEdition,
  ChangeProposal,
  ClientBriefDecision,
  ConversionReceipt,
  CostItemDefinition,
  DiscoveryClientAccess,
  EventBriefDraft,
  EventBriefEdition,
  FinancialStateDeclaration,
  ImpactAssessment,
  RoadmapDependency,
  RoadmapEdition,
  RoadmapMilestone,
} from "./eec-intelligence-schemas.js";
import type { PlatformSnapshot } from "./store.js";

function stamp(now: string) {
  return { schemaVersion: SCHEMA_VERSION as typeof SCHEMA_VERSION, createdAt: now, updatedAt: now };
}

function requireEngagement(snap: PlatformSnapshot, organisationId: string, engagementId: string) {
  const engagement = snap.discoveryEngagements.find((item) => item.id === engagementId && item.organisationId === organisationId);
  if (!engagement) throw new PlatformError("NOT_FOUND", "discovery engagement was not found");
  return engagement;
}

export function createBriefDraftOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; engagementId: string },
  now: string,
): EventBriefDraft {
  requireEngagement(snap, input.organisationId, input.engagementId);
  const existing = snap.eventBriefDrafts.find((item) => item.engagementId === input.engagementId && item.organisationId === input.organisationId);
  if (existing) return existing;
  const reviewed = snap.candidateAssertions
    .filter((item) => item.engagementId === input.engagementId && (item.confirmationState === "STAFF_REVIEWED" || item.confirmationState === "CLIENT_CONFIRMED"))
    .map((item) => item.id);
  const conflicts = snap.assertionConflicts.filter((item) => item.engagementId === input.engagementId && item.status !== "RESOLVED");
  if (conflicts.length) throw new PlatformError("VALIDATION_FAILED", "open assertion conflicts block the working brief");
  const record: EventBriefDraft = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: input.engagementId,
    gate: "INDICATIVE",
    assertionIds: reviewed,
    unknownTopics: snap.coverageAssessments.filter((item) => item.engagementId === input.engagementId && (item.state === "UNKNOWN" || item.state === "UNASSESSED")).map((item) => item.topicKey),
    version: 1,
    ...stamp(now),
  };
  snap.eventBriefDrafts.push(record);
  return record;
}

export function submitBriefEditionOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; engagementId: string; gate: EventBriefEdition["gate"]; expectedVersion: number },
  now: string,
  actorPersonId: string,
): EventBriefEdition {
  const draft = snap.eventBriefDrafts.find((item) => item.engagementId === input.engagementId && item.organisationId === input.organisationId);
  if (!draft) throw new PlatformError("NOT_FOUND", "brief draft was not found");
  if (draft.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale brief draft");
  if (input.gate === "APPROVED" && draft.unknownTopics.length > 0) {
    throw new PlatformError("VALIDATION_FAILED", "unknown topics block approved publication");
  }
  const contentHash = exactHash({ assertionIds: draft.assertionIds, unknownTopics: draft.unknownTopics, gate: input.gate });
  for (const previous of snap.eventBriefEditions.filter((item) => item.draftId === draft.id && item.current)) {
    previous.current = false;
    previous.status = "SUPERSEDED";
    previous.version += 1;
    previous.updatedAt = now;
  }
  const record: EventBriefEdition = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: input.engagementId,
    eventId: draft.eventId,
    draftId: draft.id,
    status: "SUBMITTED",
    gate: input.gate,
    contentHash,
    assertionIds: [...draft.assertionIds],
    unknownTopics: [...draft.unknownTopics],
    submittedByPersonId: actorPersonId,
    current: true,
    version: 1,
    ...stamp(now),
  };
  snap.eventBriefEditions.push(record);
  draft.currentEditionId = record.id;
  draft.gate = input.gate;
  draft.version += 1;
  draft.updatedAt = now;
  return record;
}

export function addAssertionToBriefOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; engagementId: string; assertionId: string; expectedVersion: number },
  now: string,
): EventBriefDraft {
  const draft = snap.eventBriefDrafts.find((item) => item.engagementId === input.engagementId && item.organisationId === input.organisationId);
  if (!draft) throw new PlatformError("NOT_FOUND", "brief draft was not found");
  if (draft.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale brief draft");
  const assertion = snap.candidateAssertions.find((item) => item.id === input.assertionId && item.engagementId === input.engagementId);
  if (!assertion) throw new PlatformError("NOT_FOUND", "assertion was not found");
  if (!draft.assertionIds.includes(assertion.id)) draft.assertionIds.push(assertion.id);
  draft.version += 1;
  draft.updatedAt = now;
  return draft;
}

export function removeAssertionFromDraftOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; engagementId: string; assertionId: string; expectedVersion: number },
  now: string,
): EventBriefDraft {
  const draft = snap.eventBriefDrafts.find((item) => item.engagementId === input.engagementId && item.organisationId === input.organisationId);
  if (!draft) throw new PlatformError("NOT_FOUND", "brief draft was not found");
  if (draft.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale brief draft");
  draft.assertionIds = draft.assertionIds.filter((id) => id !== input.assertionId);
  draft.version += 1;
  draft.updatedAt = now;
  return draft;
}

export function recordBriefUnknownOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; engagementId: string; topicKey: string; expectedVersion: number },
  now: string,
): EventBriefDraft {
  const draft = snap.eventBriefDrafts.find((item) => item.engagementId === input.engagementId && item.organisationId === input.organisationId);
  if (!draft) throw new PlatformError("NOT_FOUND", "brief draft was not found");
  if (draft.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale brief draft");
  if (!draft.unknownTopics.includes(input.topicKey)) draft.unknownTopics.push(nfc(input.topicKey));
  draft.version += 1;
  draft.updatedAt = now;
  return draft;
}

export function decideBriefEditionOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; editionId: string; decision: "APPROVE" | "REJECT"; expectedVersion: number; expectedHash?: string },
  now: string,
  actorPersonId: string,
): EventBriefEdition {
  const record = snap.eventBriefEditions.find((item) => item.id === input.editionId && item.organisationId === input.organisationId);
  if (!record) throw new PlatformError("NOT_FOUND", "brief edition was not found");
  if (record.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale brief edition");
  if (input.expectedHash && input.expectedHash !== record.contentHash) {
    throw new PlatformError("VALIDATION_FAILED", "decision binds the exact submitted hash");
  }
  if (record.submittedByPersonId === actorPersonId) {
    throw new PlatformError("FORBIDDEN", "the submitting maker cannot decide this edition");
  }
  record.status = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
  record.decidedByPersonId = actorPersonId;
  record.version += 1;
  record.updatedAt = now;
  return record;
}

export function publishBriefEditionOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; editionId: string; expectedVersion: number },
  now: string,
): EventBriefEdition {
  const record = snap.eventBriefEditions.find((item) => item.id === input.editionId && item.organisationId === input.organisationId);
  if (!record) throw new PlatformError("NOT_FOUND", "brief edition was not found");
  if (record.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale brief edition");
  if (record.status !== "APPROVED") throw new PlatformError("TRANSITION_INVALID", "only an approved edition can be published");
  record.status = "PUBLISHED";
  record.version += 1;
  record.updatedAt = now;
  return record;
}

export function recordClientBriefDecisionOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; engagementId: string; assertionId: string; decision: ClientBriefDecision["decision"]; narrative?: string; participantLabel: string },
  now: string,
): ClientBriefDecision {
  requireEngagement(snap, input.organisationId, input.engagementId);
  const assertion = snap.candidateAssertions.find((item) => item.id === input.assertionId && item.engagementId === input.engagementId);
  if (!assertion) throw new PlatformError("NOT_FOUND", "assertion was not found");
  if (input.decision === "CONFIRM") assertion.confirmationState = "CLIENT_CONFIRMED";
  if (input.decision === "CORRECT" || input.decision === "DISPUTE") {
    snap.candidateAssertions.push({
      ...assertion,
      id: randomUUID(),
      origin: "HUMAN",
      confirmationState: "PROPOSED",
      supersedesAssertionId: assertion.id,
      narrative: nfc(input.narrative ?? assertion.narrative),
      version: 1,
      ...stamp(now),
    });
  }
  const record: ClientBriefDecision = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: input.engagementId,
    assertionId: input.assertionId,
    decision: input.decision,
    narrative: input.narrative ? nfc(input.narrative) : undefined,
    participantLabel: nfc(input.participantLabel),
    version: 1,
    ...stamp(now),
  };
  snap.clientBriefDecisions.push(record);
  return record;
}

export function issueDiscoveryClientAccessOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; engagementId: string; token: string; expiresAt: string },
  now: string,
): DiscoveryClientAccess {
  requireEngagement(snap, input.organisationId, input.engagementId);
  const record: DiscoveryClientAccess = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: input.engagementId,
    tokenHash: createHash("sha256").update(input.token).digest("hex"),
    expiresAt: input.expiresAt,
    permittedActions: ["CONFIRM", "CORRECT", "INTERVIEW"],
    version: 1,
    ...stamp(now),
  };
  snap.discoveryClientAccess.push(record);
  return record;
}

export function resolveDiscoveryClientAccess(snap: PlatformSnapshot, token: string, now: string): DiscoveryClientAccess {
  const hash = createHash("sha256").update(token).digest("hex");
  const record = snap.discoveryClientAccess.find((item) => item.tokenHash === hash);
  if (!record || record.revokedAt || record.expiresAt <= now) {
    throw new PlatformError("AUTH_REQUIRED", "discovery client access is not available", {
      publicMessage: "This review link is not available.",
    });
  }
  return record;
}

export function convertEngagementOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    engagementId: string;
    sourceBriefHash: string;
    clientDisposition: { kind: "LINK_EXISTING"; clientId: string } | { kind: "CREATE_NEW"; code: string; displayName: string };
    eventDisposition: { kind: "LINK_EXISTING"; eventId: string } | { kind: "CREATE_NEW"; code: string; name: string; startsAt: string; endsAt: string; timezone: string };
    expectedVersion: number;
  },
  now: string,
  actorPersonId: string,
): ConversionReceipt {
  const engagement = requireEngagement(snap, input.organisationId, input.engagementId);
  const existing = snap.conversionReceipts.find((item) => item.engagementId === engagement.id);
  if (existing) {
    if (existing.sourceBriefHash !== input.sourceBriefHash) throw new PlatformError("IDEMPOTENCY_CONFLICT", "conversion already applied with a different brief hash");
    return existing;
  }
  if (engagement.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale engagement conversion");
  if (engagement.status === "CONVERTED") throw new PlatformError("TRANSITION_INVALID", "engagement is already converted");
  const published = snap.eventBriefEditions.find((item) => item.engagementId === engagement.id && item.status === "PUBLISHED" && item.current);
  if (!published || published.contentHash !== input.sourceBriefHash) {
    throw new PlatformError("VALIDATION_FAILED", "conversion requires the current published brief hash");
  }
  let client: Client;
  if (input.clientDisposition.kind === "LINK_EXISTING") {
    const clientId = input.clientDisposition.clientId;
    const found = snap.clients.find((item) => item.id === clientId && item.organisationId === input.organisationId);
    if (!found) throw new PlatformError("NOT_FOUND", "client was not found");
    client = found;
  } else {
    const createdClient = input.clientDisposition;
    if (snap.clients.some((item) => item.organisationId === input.organisationId && item.code === createdClient.code)) {
      throw new PlatformError("VALIDATION_FAILED", "client code must be unique within the organisation");
    }
    client = {
      id: randomUUID(),
      organisationId: input.organisationId,
      code: createdClient.code,
      displayName: createdClient.displayName,
      status: "PROSPECT",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    snap.clients.push(client);
  }
  let event: EventRecord;
  if (input.eventDisposition.kind === "LINK_EXISTING") {
    const eventId = input.eventDisposition.eventId;
    const found = snap.events.find((item) => item.id === eventId && item.organisationId === input.organisationId && item.clientId === client.id);
    if (!found) throw new PlatformError("NOT_FOUND", "event was not found");
    event = found;
  } else {
    const createdEvent = input.eventDisposition;
    if (Date.parse(createdEvent.endsAt) <= Date.parse(createdEvent.startsAt)) {
      throw new PlatformError("VALIDATION_FAILED", "event end must be after start");
    }
    if (snap.events.some((item) => item.clientId === client.id && item.code === createdEvent.code)) {
      throw new PlatformError("VALIDATION_FAILED", "event code must be unique within the client");
    }
    const eventId = randomUUID();
    const mefId = randomUUID();
    event = {
      id: eventId,
      organisationId: input.organisationId,
      clientId: client.id,
      code: createdEvent.code,
      name: createdEvent.name,
      startsAt: createdEvent.startsAt,
      endsAt: createdEvent.endsAt,
      timezone: createdEvent.timezone,
      phase: "DISCOVER",
      status: "DRAFT",
      masterEventFileId: mefId,
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    snap.events.push(event);
    snap.masterEventFiles.push(emptyMasterEventFile({ id: mefId, organisationId: event.organisationId, clientId: event.clientId, eventId: event.id, at: now }));
    ensureDefaultPhaseOnSnap(snap, event, now, randomUUID());
    snap.phaseHistory.push({
      id: randomUUID(),
      organisationId: event.organisationId,
      clientId: event.clientId,
      eventId: event.id,
      toPhase: "DISCOVER",
      reason: "engagement conversion",
      changedByPersonId: actorPersonId,
      changedAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
  }
  engagement.status = "CONVERTED";
  engagement.convertedClientId = client.id;
  engagement.convertedEventId = event.id;
  engagement.version += 1;
  engagement.updatedAt = now;
  const opportunity = snap.engagementOpportunities.find((item) => item.id === engagement.opportunityId);
  if (opportunity) {
    opportunity.stage = "CONVERTED";
    opportunity.version += 1;
    opportunity.updatedAt = now;
  }
  const draft = snap.eventBriefDrafts.find((item) => item.engagementId === engagement.id);
  if (draft) {
    draft.eventId = event.id;
    draft.version += 1;
    draft.updatedAt = now;
  }
  const receipt: ConversionReceipt = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: engagement.id,
    opportunityId: engagement.opportunityId,
    clientId: client.id,
    eventId: event.id,
    sourceBriefHash: input.sourceBriefHash,
    clientDisposition: input.clientDisposition.kind,
    eventDisposition: input.eventDisposition.kind,
    version: 1,
    ...stamp(now),
  };
  snap.conversionReceipts.push(receipt);
  return receipt;
}

const TAXONOMY = [
  ["VENUE_HIRE", "Venue", "venue/hire", "day", "REQUIRED", true],
  ["CATERING_HEAD", "Catering", "catering/food", "guest", "REQUIRED", false],
  ["BEVERAGE", "Beverage", "catering/beverage", "guest", "CONDITIONAL", false],
  ["PRODUCTION_AV", "Production and AV", "production/av", "day", "RECOMMENDED", false],
  ["POWER", "Power resilience", "production/power", "day", "REQUIRED", true],
  ["DESIGN", "Design and decor", "design/decor", "event", "OPTIONAL", false],
  ["ENTERTAINMENT", "Entertainment", "experience/entertainment", "set", "OPTIONAL", false],
  ["PHOTOGRAPHY", "Photography", "media/photography", "day", "RECOMMENDED", false],
  ["SECURITY", "Security", "safety/security", "shift", "REQUIRED", true],
  ["STAFFING", "Staffing", "operations/staffing", "shift", "REQUIRED", false],
  ["TRANSPORT", "Transport", "logistics/transport", "trip", "CONDITIONAL", false],
  ["ACCOMMODATION", "Accommodation", "logistics/accommodation", "room", "CONDITIONAL", false],
  ["INVITATIONS", "Invitations", "communications/invitations", "guest", "RECOMMENDED", false],
  ["GIFTS", "Gifts", "hospitality/gifts", "guest", "OPTIONAL", false],
  ["PERMITS", "Permits and compliance", "compliance/permits", "event", "REQUIRED", true],
  ["ACCESSIBILITY", "Accessibility provision", "care/accessibility", "guest", "REQUIRED", true],
  ["INSURANCE", "Insurance", "compliance/insurance", "event", "REQUIRED", true],
  ["LOGISTICS", "Logistics", "logistics/general", "event", "CONDITIONAL", false],
  ["PROFESSIONAL_FEES", "Professional fees", "fees/professional", "event", "REQUIRED", false],
  ["TAXES", "Taxes and fees", "compliance/tax", "event", "REQUIRED", false],
  ["CONTINGENCY", "Contingency", "risk/contingency", "event", "REQUIRED", false],
] as const;

export function seedBudgetCatalogueOnSnap(snap: PlatformSnapshot, organisationId: string, now: string): void {
  if (snap.budgetTaxonomyEditions.some((item) => item.organisationId === organisationId)) return;
  const taxonomy = {
    id: randomUUID(),
    organisationId,
    editionLabel: "synthetic-v1",
    current: true,
    contentHash: exactHash(TAXONOMY),
    version: 1,
    ...stamp(now),
  };
  snap.budgetTaxonomyEditions.push(taxonomy);
  for (const [code, title, categoryPath, unitKind, requirement, protectedItem] of TAXONOMY) {
    const item: CostItemDefinition = {
      id: randomUUID(),
      organisationId,
      taxonomyEditionId: taxonomy.id,
      code,
      title,
      categoryPath,
      unitKind,
      requirement,
      protectedItem,
      clientDescription: title,
      retired: false,
      version: 1,
      ...stamp(now),
    };
    snap.costItemDefinitions.push(item);
    const expression: BudgetExpr =
      unitKind === "guest"
        ? { kind: "MULTIPLY", factors: [{ kind: "PRICE_REF", itemCode: code }, { kind: "DRIVER", key: "guest.target_count" }] }
        : { kind: "PRICE_REF", itemCode: code };
    snap.costRuleEditions.push({
      id: randomUUID(),
      organisationId,
      costItemCode: code,
      expression,
      contentHash: exactHash(expression),
      current: true,
      resultUnit: "NGN",
      version: 1,
      ...stamp(now),
    });
  }
  const archetypes = [
    ["WEDDING", ["VENUE_HIRE", "CATERING_HEAD", "BEVERAGE", "POWER", "SECURITY", "ACCESSIBILITY", "CONTINGENCY"]],
    ["PRIVATE_DINNER", ["VENUE_HIRE", "CATERING_HEAD", "BEVERAGE", "ACCESSIBILITY", "CONTINGENCY"]],
    ["CORPORATE", ["VENUE_HIRE", "CATERING_HEAD", "PRODUCTION_AV", "POWER", "SECURITY", "CONTINGENCY"]],
    ["CHIEFTAINCY", ["VENUE_HIRE", "CATERING_HEAD", "ENTERTAINMENT", "SECURITY", "ACCESSIBILITY", "CONTINGENCY"]],
    ["COMPRESSED", ["VENUE_HIRE", "CATERING_HEAD", "POWER", "SECURITY", "ACCESSIBILITY", "CONTINGENCY"]],
  ] as const;
  for (const [archetype, itemCodes] of archetypes) {
    const candidates = itemCodes.map((itemCode) => {
      const item = snap.costItemDefinitions.find((entry) => entry.organisationId === organisationId && entry.code === itemCode);
      return {
        code: itemCode,
        classification: (item?.requirement === "RECOMMENDED" || item?.requirement === "CONDITIONAL" || item?.requirement === "OPTIONAL"
          ? item.requirement
          : "REQUIRED") as NonNullable<BudgetTemplateEdition["candidates"]>[number]["classification"],
        predicate: "ALWAYS" as const,
        driverKey: item?.unitKind === "guest" ? "guest.target_count" : undefined,
        unit: item?.unitKind,
        protectedItem: item?.protectedItem,
        clientVisible: true,
      };
    });
    const record: BudgetTemplateEdition = {
      id: randomUUID(),
      organisationId,
      archetype,
      itemCodes: [...itemCodes],
      candidates,
      contentHash: exactHash({ archetype, candidates }),
      current: true,
      version: 1,
      ...stamp(now),
    };
    snap.budgetTemplateEditions.push(record);
  }
  applyQuantityRulesToCatalogue(snap, organisationId, now);
  seedBudgetKnowledgeOnSnap(snap, organisationId, now);
}

export function calculateBudgetScenarioOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    engagementId?: string;
    eventId?: string;
    purpose: BudgetScenarioEdition["purpose"];
    archetype: string;
    guests: string;
    excludeCodes?: string[];
  },
  now: string,
  actorPersonId: string,
): BudgetScenarioEdition {
  seedBudgetCatalogueOnSnap(snap, input.organisationId, now);
  return calculateBudgetScenarioDeepOnSnap(snap, input, now, actorPersonId);
}

export function decideBudgetScenarioOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; scenarioId: string; expectedVersion: number },
  now: string,
  actorPersonId: string,
): BudgetScenarioEdition {
  const record = snap.budgetScenarioEditions.find((item) => item.id === input.scenarioId && item.organisationId === input.organisationId);
  if (!record) throw new PlatformError("NOT_FOUND", "budget scenario was not found");
  if (record.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale budget scenario");
  if (record.submittedByPersonId === actorPersonId) {
    throw new PlatformError("FORBIDDEN", "the author cannot approve this scenario");
  }
  record.status = "APPROVED";
  record.decidedByPersonId = actorPersonId;
  record.version += 1;
  record.updatedAt = now;
  return record;
}

export function recommendBudgetOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; scenarioId: string; advice: string; holdRecommended: boolean },
  now: string,
  actorPersonId: string,
): BudgetRecommendationEdition {
  const scenario = snap.budgetScenarioEditions.find((item) => item.id === input.scenarioId && item.organisationId === input.organisationId);
  if (!scenario) throw new PlatformError("NOT_FOUND", "budget scenario was not found");
  const record: BudgetRecommendationEdition = {
    id: randomUUID(),
    organisationId: input.organisationId,
    scenarioId: scenario.id,
    advice: nfc(input.advice),
    holdRecommended: input.holdRecommended,
    status: "SUBMITTED",
    contentHash: exactHash({ scenario: scenario.resultHash, advice: input.advice, hold: input.holdRecommended }),
    submittedByPersonId: actorPersonId,
    current: true,
    version: 1,
    ...stamp(now),
  };
  snap.budgetRecommendationEditions.push(record);
  return record;
}

export function declareFinancialStateOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; eventId?: string; kind: FinancialStateDeclaration["kind"]; currency: string; minor: string; basis: string },
  now: string,
): FinancialStateDeclaration {
  if (input.kind === "PAYMENT" || input.kind === "REFUND" || input.kind === "INVOICE") {
    throw new PlatformError("VALIDATION_FAILED", "payments, invoices and refunds are not created in this slice");
  }
  const record: FinancialStateDeclaration = {
    id: randomUUID(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    kind: input.kind,
    money: { currency: input.currency, minor: input.minor },
    basis: nfc(input.basis),
    version: 1,
    ...stamp(now),
  };
  snap.financialStateDeclarations.push(record);
  return record;
}

export function instantiateRoadmapOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; eventId?: string; engagementId?: string; titles: readonly { title: string; layer: RoadmapMilestone["layer"]; durationDays: string; clientVisible: boolean }[]; archetype?: string; leadMode?: "LONG" | "STANDARD" | "SHORT"; availableDays?: string },
  now: string,
): { edition: RoadmapEdition; milestones: RoadmapMilestone[]; dependencies: RoadmapDependency[] } {
  const result = instantiateRoadmapFromTemplateOnSnap(snap, input, now);
  return { edition: result.edition, milestones: result.milestones, dependencies: result.dependencies };
}

export function calculateCriticalPath(
  milestones: readonly RoadmapMilestone[],
  dependencies: readonly RoadmapDependency[],
  availableDays?: string,
): { status: "CALCULATED" | "INFEASIBLE" | "INSUFFICIENT_INFORMATION" | "COMPRESSED"; milestoneIds: string[]; totalDurationDays: string; inputHash: string; critical?: { title: string; explanation: string; floatDays: string }[] } {
  const schedule = calculateSchedule(milestones, dependencies, availableDays);
  return {
    status: schedule.status === "INFEASIBLE" ? "INFEASIBLE" : schedule.status === "INSUFFICIENT_INFORMATION" ? "INSUFFICIENT_INFORMATION" : schedule.status === "COMPRESSED" ? "COMPRESSED" : "CALCULATED",
    milestoneIds: schedule.milestoneIds,
    totalDurationDays: schedule.totalDurationDays,
    inputHash: schedule.inputHash,
    critical: schedule.critical.map((item) => ({ title: item.title, explanation: item.explanation, floatDays: item.floatDays })),
  };
}

export function createChangeProposalOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; engagementId?: string; eventId?: string; summary: string; sourceAssertionId?: string; governingBriefHash?: string },
  now: string,
  actorPersonId: string,
): ChangeProposal {
  const semanticHash = exactHash({
    summary: nfc(input.summary),
    sourceAssertionId: input.sourceAssertionId ?? "",
    eventId: input.eventId ?? "",
    engagementId: input.engagementId ?? "",
  });
  const existing = snap.changeProposals.find((item) => item.organisationId === input.organisationId && item.semanticHash === semanticHash);
  if (existing) return existing;
  const record: ChangeProposal = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: input.engagementId,
    eventId: input.eventId,
    status: "DETECTED",
    semanticHash,
    summary: nfc(input.summary),
    sourceAssertionId: input.sourceAssertionId,
    governingBriefHash: input.governingBriefHash,
    submittedByPersonId: actorPersonId,
    version: 1,
    ...stamp(now),
  };
  snap.changeProposals.push(record);
  return record;
}

export function assessChangeImpactOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; changeProposalId: string },
  now: string,
): ImpactAssessment {
  return assessChangeImpactDeepOnSnap(snap, input, now);
}

export function decideChangeOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; changeProposalId: string; decision: "APPROVE" | "REJECT"; expectedVersion: number },
  now: string,
  actorPersonId: string,
): ChangeProposal {
  const proposal = snap.changeProposals.find((item) => item.id === input.changeProposalId && item.organisationId === input.organisationId);
  if (!proposal) throw new PlatformError("NOT_FOUND", "change proposal was not found");
  if (proposal.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale change proposal");
  if (proposal.submittedByPersonId === actorPersonId) {
    throw new PlatformError("FORBIDDEN", "the detector cannot decide this change");
  }
  proposal.status = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
  proposal.decidedByPersonId = actorPersonId;
  proposal.version += 1;
  proposal.updatedAt = now;
  if (input.decision === "APPROVE") {
    propagateApprovedChangeOnSnap(snap, proposal.id, input.organisationId, now);
  }
  return proposal;
}

export function runFixtureAiJobOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; engagementId?: string; kind: AiJob["kind"] },
  now: string,
): AiJob {
  if (input.engagementId && !consentIsAiAllowed(snap, input.engagementId)) {
    throw new PlatformError("VALIDATION_FAILED", "AI analysis consent is required");
  }
  const record: AiJob = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: input.engagementId,
    kind: input.kind,
    status: "SUCCEEDED",
    providerState: "FIXTURE",
    output: { proposal: true, governing: false },
    version: 1,
    ...stamp(now),
  };
  snap.aiJobs.push(record);
  return record;
}

function consentIsAiAllowed(snap: PlatformSnapshot, engagementId: string): boolean {
  const latest = [...snap.discoveryConsentRecords]
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.engagementId === engagementId && item.dimension === "AI_ANALYSIS" && item.participantId == null)
    .sort((left, right) => right.index - left.index)[0]?.item;
  return latest?.decision === "GRANTED";
}

export function nextInterviewQuestion(
  assessments: { topicKey: string; state: string; rankScore: string }[],
  confirmedTopics: readonly string[],
): { topicKey: string; question: string; revisit: boolean } | undefined {
  const next = [...assessments]
    .filter((item) => !["CONFIRMED", "NOT_APPLICABLE", "NOT_YET_RELEVANT"].includes(item.state))
    .sort((left, right) => Number(right.rankScore) - Number(left.rankScore))[0];
  if (!next) return undefined;
  const revisit = confirmedTopics.includes(next.topicKey) && (next.state === "CONFLICTED" || next.state === "STALE");
  return {
    topicKey: next.topicKey,
    question: revisit
      ? `We need to revisit ${next.topicKey.replaceAll(".", " ")} because the earlier answer is ${next.state.toLowerCase()}.`
      : `What should we record for ${next.topicKey.replaceAll(".", " ")}?`,
    revisit,
  };
}

export function nextInterviewQuestionForEngagement(snap: PlatformSnapshot, engagementId: string) {
  const governed = nextGovernedInterviewTurn(snap, engagementId);
  if (!governed) return undefined;
  return {
    topicKey: governed.topicKeys[0] ?? governed.questionId,
    question: governed.prompt,
    revisit: governed.revisit,
    phase: governed.phase,
    questionId: governed.questionId,
    revisitReason: governed.revisitReason,
  };
}

export function buildExecutiveCommand(input: {
  organisationId: string;
  eventId?: string;
  known: number;
  unknown: number;
  conflicted: number;
  stale: number;
  nextDecision?: string;
  criticalPath?: string[];
  envelopeMinor?: string;
  forecastMinor?: string;
  clientConfirmed: number;
  staffReviewed: number;
  aiProposed: number;
}) {
  return {
    organisationId: input.organisationId,
    eventId: input.eventId,
    known: input.known,
    unknown: input.unknown,
    conflicted: input.conflicted,
    stale: input.stale,
    nextDecision: input.nextDecision ?? "No urgent decision is waiting.",
    criticalPath: input.criticalPath ?? [],
    envelopeMinor: input.envelopeMinor,
    forecastMinor: input.forecastMinor,
    clientConfirmed: input.clientConfirmed,
    staffReviewed: input.staffReviewed,
    aiProposed: input.aiProposed,
    blocking: input.conflicted > 0 ? "Open contradictions block publication." : input.unknown > 0 ? "Unknown facts remain." : "No publication block is recorded.",
  };
}

export function buildExecutiveCommandFromSnap(snap: PlatformSnapshot, organisationId: string, eventId?: string) {
  return buildExecutiveCommandDeep(snap, organisationId, eventId);
}
