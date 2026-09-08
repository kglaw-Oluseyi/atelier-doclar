import { createHash, randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import { evaluateBudgetExpr, type BudgetExpr } from "./eec-budget-engine.js";
import { exactHash, nfc } from "./eec-hash.js";
import { emptyMasterEventFile } from "./mef.js";
import { ensureDefaultPhaseOnSnap } from "./programme-operations.js";
import type { Client, EventRecord } from "./schemas.js";
import type {
  AiJob,
  BudgetAssumption,
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

export function decideBriefEditionOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; editionId: string; decision: "APPROVE" | "REJECT"; expectedVersion: number },
  now: string,
  actorPersonId: string,
): EventBriefEdition {
  const record = snap.eventBriefEditions.find((item) => item.id === input.editionId && item.organisationId === input.organisationId);
  if (!record) throw new PlatformError("NOT_FOUND", "brief edition was not found");
  if (record.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale brief edition");
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
    throw new PlatformError("AUTH_REQUIRED", "discovery client access is not available");
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
        ? { kind: "MULTIPLY", factors: [{ kind: "CONST_MONEY", valueMinor: "1500000", currency: "NGN" }, { kind: "DRIVER", key: "guest.target_count" }] }
        : { kind: "CONST_MONEY", valueMinor: unitKind === "event" ? "25000000" : "8000000", currency: "NGN" };
    snap.costRuleEditions.push({
      id: randomUUID(),
      organisationId,
      costItemCode: code,
      expression,
      contentHash: exactHash(expression),
      current: true,
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
    const record: BudgetTemplateEdition = {
      id: randomUUID(),
      organisationId,
      archetype,
      itemCodes: [...itemCodes],
      contentHash: exactHash({ archetype, itemCodes }),
      current: true,
      version: 1,
      ...stamp(now),
    };
    snap.budgetTemplateEditions.push(record);
  }
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
  const template = snap.budgetTemplateEditions.find((item) => item.organisationId === input.organisationId && item.archetype === input.archetype && item.current);
  if (!template) throw new PlatformError("NOT_FOUND", "budget template was not found");
  const excluded = new Set(input.excludeCodes ?? []);
  for (const code of excluded) {
    const item = snap.costItemDefinitions.find((entry) => entry.code === code && entry.organisationId === input.organisationId);
    if (item?.protectedItem) throw new PlatformError("VALIDATION_FAILED", `protected line ${code} cannot be excluded without a recorded risk`);
  }
  let expected = 0n;
  let low = 0n;
  let high = 0n;
  const trace: BudgetScenarioEdition["trace"] = [];
  for (const code of template.itemCodes) {
    if (excluded.has(code)) continue;
    const rule = snap.costRuleEditions.find((item) => item.organisationId === input.organisationId && item.costItemCode === code && item.current);
    if (!rule) continue;
    const result = evaluateBudgetExpr(rule.expression as BudgetExpr, {
      drivers: { "guest.target_count": input.guests },
      ruleEditionHash: rule.contentHash,
    });
    if (result.value.kind !== "MONEY" || result.value.currency !== "NGN" || !result.value.minor) {
      throw new PlatformError("VALIDATION_FAILED", "budget lines must resolve in NGN");
    }
    const minor = BigInt(result.value.minor);
    expected += minor;
    low += (minor * 90n) / 100n;
    high += (minor * 115n) / 100n;
    trace.push(...result.trace.map((step) => ({ op: step.op, detail: `${code}:${step.detail}`, value: step.value })));
  }
  const assumption: BudgetAssumption = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: input.engagementId,
    eventId: input.eventId,
    key: "guest.target_count",
    value: input.guests,
    unit: "guests",
    confirmed: true,
    stale: false,
    version: 1,
    ...stamp(now),
  };
  snap.budgetAssumptions.push(assumption);
  const envelope = snap.financialStateDeclarations.find((item) => item.organisationId === input.organisationId && item.kind === "ENVELOPE");
  let alignment: BudgetScenarioEdition["alignment"] = "ALIGNED";
  if (!envelope) alignment = "INSUFFICIENT_INFORMATION";
  else if (expected > BigInt(envelope.money.minor)) alignment = "MISALIGNED";
  else if (expected * 100n > BigInt(envelope.money.minor) * 90n) alignment = "PRESSURED";
  else if (expected * 100n < BigInt(envelope.money.minor) * 70n) alignment = "SURPLUS_CAPACITY";
  const inputHash = exactHash({ template: template.contentHash, guests: input.guests, excluded: [...excluded], purpose: input.purpose });
  const record: BudgetScenarioEdition = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: input.engagementId,
    eventId: input.eventId,
    purpose: input.purpose,
    status: "DRAFT",
    alignment,
    calculationStatus: "COMPLETE",
    currency: "NGN",
    expectedMinor: expected.toString(),
    lowMinor: low.toString(),
    highMinor: high.toString(),
    inputHash,
    resultHash: exactHash({ expected: expected.toString(), low: low.toString(), high: high.toString(), inputHash }),
    trace,
    submittedByPersonId: actorPersonId,
    current: true,
    version: 1,
    ...stamp(now),
  };
  for (const previous of snap.budgetScenarioEditions.filter((item) => item.organisationId === input.organisationId && item.purpose === input.purpose && item.current)) {
    previous.current = false;
    previous.status = "SUPERSEDED";
  }
  snap.budgetScenarioEditions.push(record);
  return record;
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
  input: { organisationId: string; eventId?: string; engagementId?: string; titles: readonly { title: string; layer: RoadmapMilestone["layer"]; durationDays: string; clientVisible: boolean }[] },
  now: string,
): { edition: RoadmapEdition; milestones: RoadmapMilestone[]; dependencies: RoadmapDependency[] } {
  const milestones = input.titles.map((item) => {
    const record: RoadmapMilestone = {
      id: randomUUID(),
      organisationId: input.organisationId,
      eventId: input.eventId,
      engagementId: input.engagementId,
      title: nfc(item.title),
      layer: item.layer,
      durationDays: item.durationDays,
      clientVisible: item.clientVisible,
      version: 1,
      ...stamp(now),
    };
    snap.roadmapMilestones.push(record);
    return record;
  });
  const dependencies: RoadmapDependency[] = [];
  for (let index = 1; index < milestones.length; index += 1) {
    const record: RoadmapDependency = {
      id: randomUUID(),
      organisationId: input.organisationId,
      editionId: "pending",
      fromMilestoneId: milestones[index - 1]!.id,
      toMilestoneId: milestones[index]!.id,
      kind: "FINISH_TO_START",
      version: 1,
      ...stamp(now),
    };
    dependencies.push(record);
  }
  const contentHash = exactHash({ milestones: milestones.map((item) => item.id), edges: dependencies.map((item) => [item.fromMilestoneId, item.toMilestoneId]) });
  const edition: RoadmapEdition = {
    id: randomUUID(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    engagementId: input.engagementId,
    status: "PUBLISHED",
    contentHash,
    current: true,
    version: 1,
    ...stamp(now),
  };
  for (const dependency of dependencies) {
    dependency.editionId = edition.id;
    snap.roadmapDependencies.push(dependency);
  }
  snap.roadmapEditions.push(edition);
  return { edition, milestones, dependencies };
}

export function calculateCriticalPath(
  milestones: readonly RoadmapMilestone[],
  dependencies: readonly RoadmapDependency[],
): { status: "CALCULATED" | "INFEASIBLE"; milestoneIds: string[]; totalDurationDays: string; inputHash: string } {
  const nodes = new Map(milestones.map((item) => [item.id, item]));
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const node of milestones) {
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  }
  for (const edge of dependencies) {
    if (edge.fromMilestoneId === edge.toMilestoneId) throw new PlatformError("VALIDATION_FAILED", "self-loop rejected");
    if (!nodes.has(edge.fromMilestoneId) || !nodes.has(edge.toMilestoneId)) throw new PlatformError("VALIDATION_FAILED", "missing dependency node");
    incoming.get(edge.toMilestoneId)!.push(edge.fromMilestoneId);
    outgoing.get(edge.fromMilestoneId)!.push(edge.toMilestoneId);
  }
  const degree = new Map([...incoming.entries()].map(([id, list]) => [id, list.length]));
  const queue = [...degree.entries()].filter(([, count]) => count === 0).map(([id]) => id);
  const order: string[] = [];
  const earliest = new Map<string, number>();
  for (const id of queue) earliest.set(id, 0);
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    const start = earliest.get(id) ?? 0;
    const finish = start + Number(nodes.get(id)!.durationDays);
    for (const next of outgoing.get(id) ?? []) {
      earliest.set(next, Math.max(earliest.get(next) ?? 0, finish));
      degree.set(next, (degree.get(next) ?? 1) - 1);
      if (degree.get(next) === 0) queue.push(next);
    }
  }
  if (order.length !== milestones.length) throw new PlatformError("VALIDATION_FAILED", "dependency cycle rejected");
  let endId = milestones[milestones.length - 1]!.id;
  let best = -1;
  for (const item of milestones) {
    const finish = (earliest.get(item.id) ?? 0) + Number(item.durationDays);
    if (finish >= best) {
      best = finish;
      endId = item.id;
    }
  }
  const path = [endId];
  let cursor = endId;
  while ((incoming.get(cursor) ?? []).length) {
    const previous = (incoming.get(cursor) ?? []).sort((left, right) => (earliest.get(right) ?? 0) - (earliest.get(left) ?? 0))[0]!;
    path.unshift(previous);
    cursor = previous;
  }
  return {
    status: "CALCULATED",
    milestoneIds: path,
    totalDurationDays: String(best),
    inputHash: exactHash({ milestones: milestones.map((item) => [item.id, item.durationDays]), dependencies: dependencies.map((item) => [item.fromMilestoneId, item.toMilestoneId]) }),
  };
}

export function createChangeProposalOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; engagementId?: string; eventId?: string; summary: string; sourceAssertionId?: string; governingBriefHash?: string },
  now: string,
  actorPersonId: string,
): ChangeProposal {
  const semanticHash = exactHash({ summary: nfc(input.summary), sourceAssertionId: input.sourceAssertionId ?? "", eventId: input.eventId ?? "" });
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
  const proposal = snap.changeProposals.find((item) => item.id === input.changeProposalId && item.organisationId === input.organisationId);
  if (!proposal) throw new PlatformError("NOT_FOUND", "change proposal was not found");
  const guest = /guest/i.test(proposal.summary);
  const date = /date/i.test(proposal.summary);
  const venue = /venue/i.test(proposal.summary);
  const impacts = [
    { target: "brief", kind: guest || date ? "DIRECT" : "POTENTIAL", explanation: "Governing brief assertions may need a new edition." },
    { target: "budget", kind: guest ? "DIRECT" : "POTENTIAL", explanation: "Guest or scope changes stale budget assumptions." },
    { target: "roadmap", kind: date || venue ? "DIRECT" : "POTENTIAL", explanation: "Date or venue changes move latest-safe windows." },
    { target: "rsvp", kind: "NONE", explanation: "RSVP truth is not mutated by discovery change." },
  ] as ImpactAssessment["impacts"];
  const record: ImpactAssessment = {
    id: randomUUID(),
    organisationId: input.organisationId,
    changeProposalId: proposal.id,
    impacts,
    inputHash: exactHash({ proposal: proposal.semanticHash, brief: proposal.governingBriefHash ?? "" }),
    stale: false,
    version: 1,
    ...stamp(now),
  };
  snap.impactAssessments.push(record);
  proposal.status = "IMPACT_ASSESSED";
  proposal.version += 1;
  proposal.updatedAt = now;
  return record;
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
    for (const assumption of snap.budgetAssumptions.filter((item) => item.organisationId === input.organisationId)) {
      assumption.stale = true;
      assumption.updatedAt = now;
    }
    proposal.status = "PROPAGATED";
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
