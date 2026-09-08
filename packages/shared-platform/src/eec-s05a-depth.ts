import { createHash, randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { evaluateBudgetExpr, parseBudgetExpr, type BudgetExpr } from "./eec-budget-engine.js";
import { exactHash, nfc } from "./eec-hash.js";
import type {
  BudgetAssumption,
  BudgetBomSnapshot,
  BudgetLine,
  BudgetScenarioEdition,
  BudgetTemplateCandidate,
  BudgetTemplateEdition,
  ClientOverviewEdition,
  ConversationTurn,
  CostItemDefinition,
  CostRuleEdition,
  ImpactAssessment,
  PriceEvidence,
  RoadmapDependency,
  RoadmapEdition,
  RoadmapMilestone,
  RoadmapScheduleResult,
  RoadmapTemplateEdition,
  ScenarioComparison,
  SensitivityRun,
  VendorPriceCardEdition,
} from "./eec-intelligence-schemas.js";
import { PlatformError } from "./errors.js";
import type { PlatformSnapshot } from "./store.js";

function stamp(now: string) {
  return { schemaVersion: SCHEMA_VERSION as typeof SCHEMA_VERSION, createdAt: now, updatedAt: now };
}

const PRICE_PRIORITY = [
  "CONTRACTED",
  "VENDOR_QUOTE",
  "VENDOR_RATE_CARD",
  "INTERNAL_BENCHMARK",
  "COMPARABLE_EVENT",
  "MARKET_ESTIMATE",
  "MANUAL_ASSUMPTION",
  "SYNTHETIC_SEED",
] as const;

export type PriceLookup = {
  winner?: {
    basis: string;
    minor: string;
    currency: string;
    lowMinor: string;
    highMinor: string;
    confidence: "LOW" | "MEDIUM" | "HIGH";
    stale: boolean;
    synthetic: boolean;
    evidenceDate?: string;
    hash: string;
    sourceLabel: string;
  };
  considered: readonly { basis: string; reason: string; hash?: string }[];
  status: "CURRENT" | "STALE" | "SYNTHETIC" | "MANUAL" | "MISSING";
};

export function selectPriceSource(
  snap: PlatformSnapshot,
  organisationId: string,
  itemCode: string,
  asOf: string,
): PriceLookup {
  const considered: { basis: string; reason: string; hash?: string }[] = [];
  const cards = snap.vendorPriceCardEditions.filter(
    (item) => item.organisationId === organisationId && item.costItemCode === itemCode && item.reviewState === "PUBLISHED",
  );
  const evidence = snap.priceEvidenceRecords.filter(
    (item) => item.organisationId === organisationId && (item.costItemCode === itemCode || !item.costItemCode),
  );
  const candidates: PriceLookup["winner"][] = [];
  for (const card of cards) {
    const stale = Boolean(card.effectiveUntil && card.effectiveUntil < asOf.slice(0, 10));
    const hash = card.contentHash;
    considered.push({
      basis: "VENDOR_RATE_CARD",
      reason: stale ? "published card is past effective-until" : "published vendor card considered",
      hash,
    });
    candidates.push({
      basis: card.synthetic ? "SYNTHETIC_SEED" : "VENDOR_RATE_CARD",
      minor: card.unitMinor,
      currency: card.currency,
      lowMinor: card.lowMinor ?? card.unitMinor,
      highMinor: card.highMinor ?? card.unitMinor,
      confidence: card.confidence,
      stale,
      synthetic: card.synthetic,
      evidenceDate: card.effectiveFrom,
      hash,
      sourceLabel: "Governed vendor price-card edition",
    });
  }
  for (const record of evidence) {
    const stale = record.stale || Boolean(record.validUntil && record.validUntil < asOf.slice(0, 10));
    const hash = exactHash({ id: record.id, minor: record.money.minor, basis: record.basis });
    considered.push({
      basis: record.basis,
      reason: stale ? "evidence is stale or expired" : "price evidence considered",
      hash,
    });
    candidates.push({
      basis: record.basis,
      minor: record.money.minor,
      currency: record.money.currency,
      lowMinor: record.lowMinor ?? record.money.minor,
      highMinor: record.highMinor ?? record.money.minor,
      confidence: record.confidence,
      stale,
      synthetic: Boolean(record.synthetic || record.basis === "SYNTHETIC_SEED"),
      evidenceDate: record.evidenceDated ?? record.validFrom,
      hash,
      sourceLabel: record.sourceLabel,
    });
  }
  const ranked = candidates
    .filter((item): item is NonNullable<PriceLookup["winner"]> => Boolean(item))
    .sort((left, right) => {
      if (left.stale !== right.stale) return left.stale ? 1 : -1;
      return PRICE_PRIORITY.indexOf(left.basis as (typeof PRICE_PRIORITY)[number]) - PRICE_PRIORITY.indexOf(right.basis as (typeof PRICE_PRIORITY)[number]);
    });
  const winner = ranked[0];
  if (!winner) return { considered, status: "MISSING" };
  if (winner.stale) return { winner, considered, status: "STALE" };
  if (winner.synthetic || winner.basis === "SYNTHETIC_SEED") return { winner, considered, status: "SYNTHETIC" };
  if (winner.basis === "MANUAL_ASSUMPTION") return { winner, considered, status: "MANUAL" };
  return { winner, considered, status: "CURRENT" };
}

function quantityRule(code: string, unitKind: string): BudgetExpr {
  if (unitKind === "guest") {
    return { kind: "MULTIPLY", factors: [{ kind: "PRICE_REF", itemCode: code }, { kind: "DRIVER", key: "guest.target_count" }] };
  }
  return { kind: "PRICE_REF", itemCode: code };
}

export function seedBudgetKnowledgeOnSnap(snap: PlatformSnapshot, organisationId: string, now: string): void {
  if (snap.vendorPriceCards.some((item) => item.organisationId === organisationId)) return;
  const items = snap.costItemDefinitions.filter((item) => item.organisationId === organisationId && !item.retired);
  for (const item of items) {
    const cardId = randomUUID();
    const unitMinor = item.unitKind === "guest" ? "1500000" : item.unitKind === "event" ? "25000000" : "8000000";
    const lowMinor = item.unitKind === "guest" ? "1200000" : item.unitKind === "event" ? "20000000" : "7000000";
    const highMinor = item.unitKind === "guest" ? "1900000" : item.unitKind === "event" ? "32000000" : "10000000";
    snap.vendorPriceCards.push({
      id: cardId,
      organisationId,
      vendorSourceLabel: "Synthetic non-production planning card",
      vendorRef: "SYNTHETIC-SOURCE",
      costItemCode: item.code,
      version: 1,
      ...stamp(now),
    });
    const edition: VendorPriceCardEdition = {
      id: randomUUID(),
      organisationId,
      cardId,
      costItemCode: item.code,
      currency: "NGN",
      unitMinor,
      lowMinor,
      highMinor,
      pricingBasis: item.unitKind === "guest" ? "PER_GUEST" : item.unitKind === "event" ? "PER_EVENT" : "PER_UNIT",
      geography: "Lagos planning zone",
      inclusions: ["Synthetic planning allowance only"],
      exclusions: ["Not a live vendor quotation"],
      effectiveFrom: now.slice(0, 10),
      confidence: "LOW",
      reviewState: "PUBLISHED",
      current: true,
      synthetic: true,
      nonProduction: true,
      provisional: true,
      unsupportedForRealClientReliance: true,
      contentHash: exactHash({ item: item.code, unitMinor, labelled: "synthetic" }),
      version: 1,
      ...stamp(now),
    };
    snap.vendorPriceCardEditions.push(edition);
    snap.vendorPriceCards[snap.vendorPriceCards.length - 1]!.currentEditionId = edition.id;
    const evidence: PriceEvidence = {
      id: randomUUID(),
      organisationId,
      costItemCode: item.code,
      basis: "SYNTHETIC_SEED",
      money: { currency: "NGN", minor: unitMinor },
      lowMinor,
      highMinor,
      stale: false,
      confidence: "LOW",
      sourceLabel: "Synthetic, non-production, provisional, unsupported for real-client reliance",
      synthetic: true,
      nonProduction: true,
      provisional: true,
      unsupportedForRealClientReliance: true,
      evidenceDated: now,
      vendorPriceCardEditionId: edition.id,
      version: 1,
      ...stamp(now),
    };
    snap.priceEvidenceRecords.push(evidence);
  }
  if (!snap.marketIndexDefinitions.some((item) => item.organisationId === organisationId)) {
    const definitionId = randomUUID();
    snap.marketIndexDefinitions.push({
      id: definitionId,
      organisationId,
      code: "NGN_CATERING_PLANNING",
      title: "Synthetic catering planning index",
      unit: "index",
      freshnessDays: "90",
      version: 1,
      ...stamp(now),
    });
    snap.marketIndexObservations.push({
      id: randomUUID(),
      organisationId,
      definitionId,
      value: "100",
      observedAt: now,
      effectiveAt: now,
      sourceKind: "SYNTHETIC",
      approvalState: "APPROVED",
      confidence: "LOW",
      stale: false,
      contentHash: exactHash({ definitionId, value: "100" }),
      version: 1,
      ...stamp(now),
    });
  }
  if (!snap.fxObservations.some((item) => item.organisationId === organisationId)) {
    snap.fxObservations.push({
      id: randomUUID(),
      organisationId,
      fromCurrency: "USD",
      toCurrency: "NGN",
      rate: "1600",
      locked: false,
      observedAt: now,
      effectiveAt: now,
      sourceKind: "SYNTHETIC",
      approvalState: "APPROVED",
      stale: false,
      contentHash: exactHash({ pair: "USD/NGN", rate: "1600", labelled: "synthetic" }),
      version: 1,
      ...stamp(now),
    });
  }
  if (!snap.locationCostZones.some((item) => item.organisationId === organisationId)) {
    const zoneId = randomUUID();
    snap.locationCostZones.push({
      id: zoneId,
      organisationId,
      code: "LOS_ISLAND",
      title: "Lagos Island access planning zone",
      locality: "Lagos",
      version: 1,
      ...stamp(now),
    });
    const factor = {
      id: randomUUID(),
      organisationId,
      zoneId,
      factor: "1.00",
      accessNote: "Access condition only. Not a demographic claim.",
      current: true,
      contentHash: exactHash({ zoneId, factor: "1.00" }),
      version: 1,
      ...stamp(now),
    };
    snap.locationFactorEditions.push(factor);
    snap.locationCostZones[snap.locationCostZones.length - 1]!.currentEditionId = factor.id;
  }
  if (!snap.seasonWindowEditions.some((item) => item.organisationId === organisationId)) {
    snap.seasonWindowEditions.push({
      id: randomUUID(),
      organisationId,
      title: "Festive planning window",
      startsOn: "2026-12-01",
      endsOn: "2027-01-07",
      factor: "1.10",
      current: true,
      contentHash: exactHash({ title: "festive", factor: "1.10" }),
      version: 1,
      ...stamp(now),
    });
  }
  if (!snap.contingencyRuleEditions.some((item) => item.organisationId === organisationId)) {
    snap.contingencyRuleEditions.push({
      id: randomUUID(),
      organisationId,
      basis: "PERCENT_OF_PRICED_SCOPE",
      percent: "8",
      riskLink: "Unpriced volatility and short-lead substitution",
      minimumMinor: "0",
      current: true,
      contentHash: exactHash({ basis: "PERCENT_OF_PRICED_SCOPE", percent: "8" }),
      version: 1,
      ...stamp(now),
    });
  }
  seedRoadmapTemplatesOnSnap(snap, organisationId, now);
}

export function retireUnsupportedRulePricesOnSnap(snap: PlatformSnapshot, organisationId: string, now: string): void {
  for (const rule of snap.costRuleEditions.filter((item) => item.organisationId === organisationId && item.current)) {
    const expr = rule.expression as BudgetExpr;
    const serialized = JSON.stringify(expr);
    if (!serialized.includes("CONST_MONEY") || serialized.includes("PRICE_REF")) continue;
    const item = snap.costItemDefinitions.find((entry) => entry.organisationId === organisationId && entry.code === rule.costItemCode);
    rule.current = false;
    rule.version += 1;
    rule.updatedAt = now;
    const replacement: CostRuleEdition = {
      ...rule,
      id: randomUUID(),
      expression: quantityRule(rule.costItemCode, item?.unitKind ?? "event"),
      contentHash: exactHash({ code: rule.costItemCode, kind: "PRICE_REF" }),
      current: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    snap.costRuleEditions.push(replacement);
  }
}

export function applyQuantityRulesToCatalogue(snap: PlatformSnapshot, organisationId: string, now: string): void {
  for (const item of snap.costItemDefinitions.filter((entry) => entry.organisationId === organisationId)) {
    const current = snap.costRuleEditions.find((rule) => rule.organisationId === organisationId && rule.costItemCode === item.code && rule.current);
    if (current && JSON.stringify(current.expression).includes("PRICE_REF")) continue;
    if (current) {
      current.current = false;
      current.version += 1;
      current.updatedAt = now;
    }
    const expression = quantityRule(item.code, item.unitKind);
    snap.costRuleEditions.push({
      id: randomUUID(),
      organisationId,
      costItemCode: item.code,
      expression,
      contentHash: exactHash(expression),
      current: true,
      resultUnit: "NGN",
      version: 1,
      ...stamp(now),
    });
  }
  for (const template of snap.budgetTemplateEditions.filter((item) => item.organisationId === organisationId && item.current && !item.candidates)) {
    template.candidates = template.itemCodes.map((code) => {
      const item = snap.costItemDefinitions.find((entry) => entry.organisationId === organisationId && entry.code === code);
      return {
        code,
        classification: item?.requirement === "REQUIRED" || item?.requirement === "RECOMMENDED" || item?.requirement === "CONDITIONAL" || item?.requirement === "OPTIONAL"
          ? item.requirement
          : "REQUIRED",
        predicate: "ALWAYS" as const,
        driverKey: item?.unitKind === "guest" ? "guest.target_count" : undefined,
        unit: item?.unitKind,
        protectedItem: item?.protectedItem,
        clientVisible: true,
        mutexGroup: code === "BEVERAGE" ? "refreshment" : undefined,
      };
    });
    template.contentHash = exactHash({ archetype: template.archetype, candidates: template.candidates });
    template.version += 1;
    template.updatedAt = now;
  }
}

function templateCandidates(template: BudgetTemplateEdition, items: readonly CostItemDefinition[]): BudgetTemplateCandidate[] {
  if (template.candidates?.length) return template.candidates;
  return template.itemCodes.map((code) => {
    const item = items.find((entry) => entry.code === code);
    return {
      code,
      classification: (item?.requirement === "RECOMMENDED" || item?.requirement === "CONDITIONAL" || item?.requirement === "OPTIONAL"
        ? item.requirement
        : "REQUIRED") as BudgetTemplateCandidate["classification"],
      predicate: "ALWAYS" as const,
      protectedItem: item?.protectedItem,
      driverKey: item?.unitKind === "guest" ? "guest.target_count" : undefined,
      unit: item?.unitKind,
      clientVisible: true,
    };
  });
}

export function instantiateBom(input: {
  template: BudgetTemplateEdition;
  items: readonly CostItemDefinition[];
  guests: bigint;
  purpose: BudgetScenarioEdition["purpose"];
  excludeCodes?: readonly string[];
}): { included: BudgetTemplateCandidate[]; excluded: string[]; missingDrivers: string[] } {
  const excluded = new Set(input.excludeCodes ?? []);
  const selected: BudgetTemplateCandidate[] = [];
  const missingDrivers: string[] = [];
  const mutexTaken = new Set<string>();
  for (const candidate of templateCandidates(input.template, input.items)) {
    const item = input.items.find((entry) => entry.code === candidate.code);
    if (item?.protectedItem && excluded.has(candidate.code)) {
      throw new PlatformError("VALIDATION_FAILED", `protected line ${candidate.code} cannot be excluded without a recorded risk`);
    }
    if (excluded.has(candidate.code)) continue;
    if (candidate.predicate === "NEVER") continue;
    if (candidate.predicate === "GUESTS_GTE" && input.guests < BigInt(candidate.predicateValue ?? "0")) continue;
    if (input.purpose === "PROTECT_INVESTMENT" && candidate.classification === "OPTIONAL") continue;
    if (input.purpose === "CLIENT_ALTERNATIVE" && candidate.classification === "OPTIONAL") continue;
    if (candidate.mutexGroup && mutexTaken.has(candidate.mutexGroup)) continue;
    if (candidate.dependsOn?.some((code) => !selected.some((entry) => entry.code === code) && !input.template.itemCodes.includes(code))) {
      continue;
    }
    if (candidate.driverKey && candidate.driverKey !== "guest.target_count") missingDrivers.push(candidate.driverKey);
    if (candidate.mutexGroup) mutexTaken.add(candidate.mutexGroup);
    selected.push(candidate);
  }
  return { included: selected, excluded: [...excluded], missingDrivers };
}

function uncertaintyFromEvidence(expected: bigint, lookup: PriceLookup): { low: bigint; high: bigint } {
  if (!lookup.winner) return { low: expected, high: expected };
  const lowUnit = BigInt(lookup.winner.lowMinor);
  const highUnit = BigInt(lookup.winner.highMinor);
  const unit = BigInt(lookup.winner.minor);
  if (unit === 0n) return { low: expected, high: expected };
  return {
    low: (expected * lowUnit) / unit,
    high: (expected * highUnit) / unit,
  };
}

export function calculateBudgetScenarioDeepOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    engagementId?: string;
    eventId?: string;
    purpose: BudgetScenarioEdition["purpose"];
    archetype: string;
    guests: string;
    excludeCodes?: string[];
    manualAssumptions?: { key: string; value: string; unit: string }[];
  },
  now: string,
  actorPersonId: string,
): BudgetScenarioEdition {
  seedBudgetKnowledgeOnSnap(snap, input.organisationId, now);
  applyQuantityRulesToCatalogue(snap, input.organisationId, now);
  retireUnsupportedRulePricesOnSnap(snap, input.organisationId, now);
  const template = snap.budgetTemplateEditions.find((item) => item.organisationId === input.organisationId && item.archetype === input.archetype && item.current);
  if (!template) throw new PlatformError("NOT_FOUND", "budget template was not found");
  const items = snap.costItemDefinitions.filter((item) => item.organisationId === input.organisationId);
  const guests = BigInt(input.guests);
  const bom = instantiateBom({ template, items, guests, purpose: input.purpose, excludeCodes: input.excludeCodes });
  const assumption: BudgetAssumption = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: input.engagementId,
    eventId: input.eventId,
    key: "guest.target_count",
    value: input.guests,
    unit: "guests",
    sourceKind: "SCENARIO",
    confidence: "MEDIUM",
    confirmed: true,
    stale: false,
    version: 1,
    ...stamp(now),
  };
  snap.budgetAssumptions.push(assumption);
  for (const extra of input.manualAssumptions ?? []) {
    snap.budgetAssumptions.push({
      id: randomUUID(),
      organisationId: input.organisationId,
      engagementId: input.engagementId,
      eventId: input.eventId,
      key: extra.key,
      value: extra.value,
      unit: extra.unit,
      sourceKind: "MANUAL",
      labelledManualAssumption: true,
      confidence: "LOW",
      confirmed: false,
      stale: false,
      version: 1,
      ...stamp(now),
    });
  }
  const brief = snap.eventBriefEditions.find((item) => item.engagementId === input.engagementId && item.current);
  const assertionHashes = (brief?.assertionIds ?? []).map((id) => exactHash({ assertionId: id }));
  const publishedFx = snap.fxObservations.filter((item) => item.organisationId === input.organisationId && item.approvalState === "APPROVED");
  const observationHashes = [
    ...snap.marketIndexObservations.filter((item) => item.organisationId === input.organisationId).map((item) => item.contentHash),
    ...publishedFx.map((item) => item.contentHash),
    ...snap.locationFactorEditions.filter((item) => item.organisationId === input.organisationId && item.current).map((item) => item.contentHash),
    ...snap.seasonWindowEditions.filter((item) => item.organisationId === input.organisationId && item.current).map((item) => item.contentHash),
  ];
  const assumptionSetHash = exactHash({ guests: input.guests, extras: input.manualAssumptions ?? [] });
  const bomRecord: BudgetBomSnapshot = {
    id: randomUUID(),
    organisationId: input.organisationId,
    templateEditionHash: template.contentHash,
    briefHash: brief?.contentHash,
    assertionHashes,
    assumptionSetHash,
    observationHashes,
    itemCodes: bom.included.map((item) => item.code),
    contentHash: exactHash({
      template: template.contentHash,
      brief: brief?.contentHash ?? "",
      assertions: assertionHashes,
      assumptions: assumptionSetHash,
      observations: observationHashes,
      items: bom.included.map((item) => item.code),
    }),
    version: 1,
    ...stamp(now),
  };
  snap.budgetBomSnapshots.push(bomRecord);
  const traces: BudgetScenarioEdition["trace"] = [];
  const warnings: string[] = [];
  let expected = 0n;
  let low = 0n;
  let high = 0n;
  let blocked = false;
  let partial = false;
  const prices: Record<string, { minor: string; currency: string }> = {};
  for (const candidate of bom.included) {
    const lookup = selectPriceSource(snap, input.organisationId, candidate.code, now);
    traces.push({
      op: "PRICE_SELECT",
      detail: `${candidate.code}:${lookup.status}:${lookup.winner?.basis ?? "none"}`,
      value: lookup.winner?.minor ?? "0",
    });
    for (const option of lookup.considered) {
      traces.push({ op: "PRICE_CONSIDERED", detail: `${candidate.code}:${option.basis}:${option.reason}`, value: option.hash?.slice(0, 12) ?? "" });
    }
    if (!lookup.winner) {
      blocked = candidate.classification === "REQUIRED" || Boolean(candidate.protectedItem);
      partial = true;
      warnings.push(`Missing governed price evidence for ${candidate.code}.`);
      continue;
    }
    if (lookup.status !== "CURRENT") partial = true;
    if (lookup.winner.synthetic) {
      warnings.push(`${candidate.code} uses synthetic, non-production, provisional evidence unsupported for real-client reliance.`);
    }
    if (lookup.winner.stale) warnings.push(`${candidate.code} price is stale and is not treated as current.`);
    prices[candidate.code] = { minor: lookup.winner.minor, currency: lookup.winner.currency };
    const rule = snap.costRuleEditions.find((item) => item.organisationId === input.organisationId && item.costItemCode === candidate.code && item.current);
    const expression = rule ? parseBudgetExpr(rule.expression) : { kind: "PRICE_REF" as const, itemCode: candidate.code };
    const result = evaluateBudgetExpr(expression, {
      drivers: { "guest.target_count": input.guests },
      prices,
      ruleEditionHash: rule?.contentHash ?? exactHash(expression),
    });
    if (result.value.kind !== "MONEY" || !result.value.minor) {
      throw new PlatformError("VALIDATION_FAILED", "budget lines must resolve as money");
    }
    const minor = BigInt(result.value.minor);
    const range = uncertaintyFromEvidence(minor, lookup);
    expected += minor;
    low += range.low;
    high += range.high;
    traces.push(...result.trace.map((step) => ({ op: step.op, detail: `${candidate.code}:${step.detail}`, value: step.value })));
    const line: BudgetLine = {
      id: randomUUID(),
      organisationId: input.organisationId,
      scenarioId: "pending",
      itemCode: candidate.code,
      inclusionReason: `${candidate.classification} from ${template.archetype} template`,
      classification: candidate.classification,
      quantity: candidate.driverKey === "guest.target_count" ? input.guests : "1",
      unit: candidate.unit ?? "event",
      quantityDriverKey: candidate.driverKey,
      priceSource: lookup.winner.basis,
      priceEvidenceDate: lookup.winner.evidenceDate,
      priceConfidence: lookup.winner.confidence,
      stale: lookup.winner.stale,
      synthetic: lookup.winner.synthetic,
      expectedMinor: minor.toString(),
      lowMinor: range.low.toString(),
      highMinor: range.high.toString(),
      currency: result.value.currency ?? "NGN",
      ruleEditionHash: result.ruleEditionHash,
      warnings: lookup.winner.synthetic ? ["Synthetic evidence only"] : [],
      unresolvedAssumptions: [],
      contentHash: exactHash({ item: candidate.code, minor: minor.toString(), price: lookup.winner.hash }),
      version: 1,
      ...stamp(now),
    };
    snap.budgetLines.push(line);
  }
  const contingency = snap.contingencyRuleEditions.find((item) => item.organisationId === input.organisationId && item.current);
  let contingencyMinor = 0n;
  if (contingency?.basis === "PERCENT_OF_PRICED_SCOPE" && contingency.percent) {
    contingencyMinor = (expected * BigInt(contingency.percent.split(".")[0] ?? "0")) / 100n;
    traces.push({ op: "CONTINGENCY", detail: `${contingency.percent}% of priced scope · ${contingency.riskLink ?? "explicit"}`, value: contingencyMinor.toString() });
  } else if (contingency?.basis === "FIXED_MONEY" && contingency.money) {
    contingencyMinor = BigInt(contingency.money.minor);
    traces.push({ op: "CONTINGENCY", detail: "fixed money rule", value: contingencyMinor.toString() });
  }
  expected += contingencyMinor;
  low += contingencyMinor;
  high += contingencyMinor;
  const envelope = snap.financialStateDeclarations.find((item) => item.organisationId === input.organisationId && item.kind === "ENVELOPE");
  let alignment: BudgetScenarioEdition["alignment"] = "ALIGNED";
  if (!envelope) alignment = "INSUFFICIENT_INFORMATION";
  else if (expected > BigInt(envelope.money.minor)) alignment = "MISALIGNED";
  else if (expected * 100n > BigInt(envelope.money.minor) * 90n) alignment = "PRESSURED";
  else if (expected * 100n < BigInt(envelope.money.minor) * 70n) alignment = "SURPLUS_CAPACITY";
  const inputHash = exactHash({
    bom: bomRecord.contentHash,
    purpose: input.purpose,
    guests: input.guests,
    excluded: bom.excluded,
    evidence: bom.included.map((item) => selectPriceSource(snap, input.organisationId, item.code, now).winner?.hash ?? "missing"),
  });
  const calculationStatus: BudgetScenarioEdition["calculationStatus"] = blocked ? "BLOCKED" : partial ? "PARTIAL" : "COMPLETE";
  if (calculationStatus !== "COMPLETE") {
    warnings.push("This is not a complete current-price budget. Missing or synthetic evidence remains.");
  }
  const record: BudgetScenarioEdition = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: input.engagementId,
    eventId: input.eventId,
    purpose: input.purpose,
    status: "DRAFT",
    alignment,
    calculationStatus,
    currency: "NGN",
    expectedMinor: expected.toString(),
    lowMinor: low.toString(),
    highMinor: high.toString(),
    inputHash,
    resultHash: exactHash({ expected: expected.toString(), low: low.toString(), high: high.toString(), inputHash, traces }),
    trace: traces,
    submittedByPersonId: actorPersonId,
    current: true,
    bomSnapshotId: bomRecord.id,
    assumptionSetHash,
    evidenceHashes: observationHashes,
    contingencyMinor: contingencyMinor.toString(),
    contingencyBasis: contingency ? `${contingency.basis}:${contingency.percent ?? contingency.money?.minor ?? "0"}` : undefined,
    warnings,
    missingDrivers: bom.missingDrivers,
    version: 1,
    ...stamp(now),
  };
  bomRecord.scenarioId = record.id;
  for (const line of snap.budgetLines.filter((item) => item.scenarioId === "pending")) {
    line.scenarioId = record.id;
  }
  for (const previous of snap.budgetScenarioEditions.filter((item) => item.organisationId === input.organisationId && item.purpose === input.purpose && item.current && item.engagementId === input.engagementId)) {
    previous.current = false;
    previous.status = "SUPERSEDED";
  }
  snap.budgetScenarioEditions.push(record);
  persistSensitivity(snap, record, now);
  return record;
}

function persistSensitivity(snap: PlatformSnapshot, scenario: BudgetScenarioEdition, now: string): SensitivityRun {
  const lines = snap.budgetLines.filter((item) => item.scenarioId === scenario.id);
  const drivers = [...lines]
    .sort((left, right) => (BigInt(right.expectedMinor) > BigInt(left.expectedMinor) ? 1 : -1))
    .slice(0, 5)
    .map((line) => ({
      key: line.itemCode,
      movementMinor: line.expectedMinor,
      explanation: `${line.itemCode} is a principal total driver from ${line.priceSource} evidence.`,
    }));
  const record: SensitivityRun = {
    id: randomUUID(),
    organisationId: scenario.organisationId,
    scenarioId: scenario.id,
    drivers,
    contentHash: exactHash({ scenario: scenario.resultHash, drivers }),
    version: 1,
    ...stamp(now),
  };
  snap.sensitivityRuns.push(record);
  return record;
}

export function compareBudgetScenariosOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; leftScenarioId: string; rightScenarioId: string },
  now: string,
): ScenarioComparison {
  const left = snap.budgetScenarioEditions.find((item) => item.id === input.leftScenarioId && item.organisationId === input.organisationId);
  const right = snap.budgetScenarioEditions.find((item) => item.id === input.rightScenarioId && item.organisationId === input.organisationId);
  if (!left || !right) throw new PlatformError("NOT_FOUND", "scenario comparison requires two organisation-scoped editions");
  const leftLines = snap.budgetLines.filter((item) => item.scenarioId === left.id);
  const rightLines = snap.budgetLines.filter((item) => item.scenarioId === right.id);
  const leftCodes = new Set(leftLines.map((item) => item.itemCode));
  const rightCodes = new Set(rightLines.map((item) => item.itemCode));
  const added = [...rightCodes].filter((code) => !leftCodes.has(code));
  const removed = [...leftCodes].filter((code) => !rightCodes.has(code));
  const quantityChanged = rightLines
    .filter((item) => leftLines.some((entry) => entry.itemCode === item.itemCode && entry.quantity !== item.quantity))
    .map((item) => item.itemCode);
  const priceChanged = rightLines
    .filter((item) => leftLines.some((entry) => entry.itemCode === item.itemCode && entry.priceSource !== item.priceSource))
    .map((item) => item.itemCode);
  const protectedItems = [...leftLines, ...rightLines].filter((item) => item.classification === "REQUIRED").map((item) => item.itemCode);
  const movement = BigInt(right.expectedMinor) - BigInt(left.expectedMinor);
  const record: ScenarioComparison = {
    id: randomUUID(),
    organisationId: input.organisationId,
    leftScenarioId: left.id,
    rightScenarioId: right.id,
    added,
    removed,
    quantityChanged,
    priceChanged,
    assumptionChanged: left.assumptionSetHash === right.assumptionSetHash ? [] : ["guest.target_count"],
    evidenceChanged: JSON.stringify(left.evidenceHashes) === JSON.stringify(right.evidenceHashes) ? [] : ["observation"],
    protectedItems: [...new Set(protectedItems)],
    totalMovementMinor: movement.toString(),
    cashFlowEffect: movement === 0n ? "No cash-window movement is implied." : "Forecast cash requirement moves with the scenario total. No payment is authorised.",
    operationalConsequence: added.length || removed.length ? "Scope lines differ between the scenarios." : "Operational scope is unchanged.",
    clientExperienceConsequence: right.purpose === "CLIENT_ALTERNATIVE" ? "The lower-spend alternative is not framed as inferior; it protects a different ambition." : "Client experience follows the selected protected priorities.",
    unresolvedRisk: [...(left.warnings ?? []), ...(right.warnings ?? [])][0] ?? "No additional unresolved risk was recorded.",
    contentHash: exactHash({ left: left.resultHash, right: right.resultHash }),
    version: 1,
    ...stamp(now),
  };
  snap.scenarioComparisons.push(record);
  return record;
}

export function submitBudgetScenarioOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; scenarioId: string; expectedVersion: number; expectedHash?: string },
  now: string,
  actorPersonId: string,
): BudgetScenarioEdition {
  const record = snap.budgetScenarioEditions.find((item) => item.id === input.scenarioId && item.organisationId === input.organisationId);
  if (!record) throw new PlatformError("NOT_FOUND", "budget scenario was not found");
  if (record.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale budget scenario");
  if (input.expectedHash && input.expectedHash !== record.resultHash) {
    throw new PlatformError("VALIDATION_FAILED", "submit binds the exact result hash");
  }
  record.status = "SUBMITTED";
  record.submittedByPersonId = actorPersonId;
  record.version += 1;
  record.updatedAt = now;
  return record;
}

function seedRoadmapTemplatesOnSnap(snap: PlatformSnapshot, organisationId: string, now: string): void {
  if (snap.roadmapTemplateEditions.some((item) => item.organisationId === organisationId)) return;
  const templates: Array<Omit<RoadmapTemplateEdition, "id" | "organisationId" | "contentHash" | "current" | "schemaVersion" | "version" | "createdAt" | "updatedAt"> & { archetype: string; leadMode: RoadmapTemplateEdition["leadMode"] }> = [
    {
      archetype: "WEDDING",
      leadMode: "STANDARD",
      milestones: [
        { code: "GUEST_DECISION", title: "Confirm guest count", purpose: "Lock the guest assumption that drives catering, seating and invitations.", layer: "DECISION", durationDays: "3", leadTimeDays: "14", compressible: true, clientVisible: true, delayConsequence: "Catering and seating cannot be confirmed.", dependsOn: [] },
        { code: "VENUE_HOLD", title: "Venue hold window", purpose: "Secure the operational venue window.", layer: "OPERATIONAL_READINESS", durationDays: "5", leadTimeDays: "21", compressible: false, clientVisible: false, delayConsequence: "Venue availability becomes the critical constraint.", dependsOn: ["GUEST_DECISION"], dependencyKind: "DECISION_GATES" },
        { code: "CELEBRATION_DATE", title: "Family celebration date", purpose: "Confirm the client-visible celebration outcome.", layer: "CLIENT_OUTCOME", durationDays: "2", leadTimeDays: "7", compressible: true, clientVisible: true, delayConsequence: "Invitations and travel plans slip.", dependsOn: ["VENUE_HOLD"], dependencyKind: "FINISH_TO_START" },
      ],
    },
    {
      archetype: "WEDDING",
      leadMode: "SHORT",
      milestones: [
        { code: "GUEST_DECISION", title: "Confirm guest count", purpose: "Immediate guest decision.", layer: "DECISION", durationDays: "1", leadTimeDays: "3", compressible: false, clientVisible: true, delayConsequence: "Short-lead catering cannot start.", dependsOn: [] },
        { code: "VENUE_HOLD", title: "Venue hold window", purpose: "Compressed venue confirmation.", layer: "OPERATIONAL_READINESS", durationDays: "2", leadTimeDays: "5", compressible: false, clientVisible: false, delayConsequence: "The date is infeasible without a held venue.", dependsOn: ["GUEST_DECISION"], dependencyKind: "FINISH_TO_START" },
        { code: "CELEBRATION_DATE", title: "Family celebration date", purpose: "Compressed celebration lock.", layer: "CLIENT_OUTCOME", durationDays: "1", leadTimeDays: "2", compressible: false, clientVisible: true, delayConsequence: "The event cannot be announced.", dependsOn: ["VENUE_HOLD"], dependencyKind: "FINISH_TO_START" },
      ],
    },
    {
      archetype: "CORPORATE",
      leadMode: "STANDARD",
      milestones: [
        { code: "BRIEF_LOCK", title: "Lock programme brief", purpose: "Confirm the corporate outcome.", layer: "DECISION", durationDays: "4", leadTimeDays: "10", compressible: true, clientVisible: true, delayConsequence: "Production cannot be sequenced.", dependsOn: [] },
        { code: "PRODUCTION_READY", title: "Production readiness", purpose: "AV and power ready.", layer: "OPERATIONAL_READINESS", durationDays: "6", leadTimeDays: "14", compressible: false, clientVisible: false, delayConsequence: "Show continuity is at risk.", dependsOn: ["BRIEF_LOCK"], dependencyKind: "EVIDENCE_GATES" },
      ],
    },
  ];
  for (const template of templates) {
    snap.roadmapTemplateEditions.push({
      id: randomUUID(),
      organisationId,
      ...template,
      contentHash: exactHash(template),
      current: true,
      version: 1,
      ...stamp(now),
    });
  }
}

export function instantiateRoadmapFromTemplateOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId?: string;
    engagementId?: string;
    archetype?: string;
    leadMode?: RoadmapTemplateEdition["leadMode"];
    titles?: readonly { title: string; layer: RoadmapMilestone["layer"]; durationDays: string; clientVisible: boolean }[];
    availableDays?: string;
  },
  now: string,
): { edition: RoadmapEdition; milestones: RoadmapMilestone[]; dependencies: RoadmapDependency[]; schedule: ReturnType<typeof calculateSchedule> } {
  seedRoadmapTemplatesOnSnap(snap, input.organisationId, now);
  const brief = snap.eventBriefEditions.find((item) => item.engagementId === input.engagementId && item.current);
  const budget = snap.budgetScenarioEditions.find((item) => item.engagementId === input.engagementId && item.current);
  const template = snap.roadmapTemplateEditions.find(
    (item) => item.organisationId === input.organisationId && item.current && item.archetype === (input.archetype ?? "WEDDING") && item.leadMode === (input.leadMode ?? "STANDARD"),
  );
  const definitions = input.titles
    ? input.titles.map((item, index) => ({
        code: `CUSTOM_${index + 1}`,
        title: item.title,
        purpose: item.title,
        layer: item.layer,
        durationDays: item.durationDays,
        leadTimeDays: item.durationDays,
        compressible: true,
        clientVisible: item.clientVisible,
        delayConsequence: "The next dependent milestone cannot start on time.",
        dependsOn: index === 0 ? [] : [`CUSTOM_${index}`],
        dependencyKind: "FINISH_TO_START" as const,
      }))
    : template?.milestones ?? [];
  if (!definitions.length) throw new PlatformError("NOT_FOUND", "roadmap template was not found");
  const editionId = randomUUID();
  const milestones = definitions.map((item) => {
    const record: RoadmapMilestone = {
      id: randomUUID(),
      organisationId: input.organisationId,
      eventId: input.eventId,
      engagementId: input.engagementId,
      editionId,
      code: item.code,
      title: nfc(item.title),
      purpose: item.purpose,
      layer: item.layer,
      durationDays: item.durationDays,
      leadTimeDays: item.leadTimeDays,
      compressible: item.compressible,
      delayConsequence: item.delayConsequence,
      confidence: "MEDIUM",
      status: "PLANNED",
      clientVisible: item.clientVisible,
      sourceLabel: template ? `template:${template.archetype}:${template.leadMode}` : "explicit titles",
      contentHash: exactHash(item),
      version: 1,
      ...stamp(now),
    };
    snap.roadmapMilestones.push(record);
    return record;
  });
  const byCode = new Map(milestones.map((item) => [item.code, item]));
  const dependencies: RoadmapDependency[] = [];
  for (const definition of definitions) {
    for (const parent of definition.dependsOn ?? []) {
      const from = byCode.get(parent);
      const to = byCode.get(definition.code);
      if (!from || !to) throw new PlatformError("VALIDATION_FAILED", "roadmap template referenced an unknown milestone");
      const record: RoadmapDependency = {
        id: randomUUID(),
        organisationId: input.organisationId,
        editionId,
        fromMilestoneId: from.id,
        toMilestoneId: to.id,
        kind: definition.dependencyKind ?? "FINISH_TO_START",
        version: 1,
        ...stamp(now),
      };
      dependencies.push(record);
      snap.roadmapDependencies.push(record);
    }
  }
  const schedule = calculateSchedule(milestones, dependencies, input.availableDays);
  for (const previous of snap.roadmapEditions.filter((item) => item.organisationId === input.organisationId && item.engagementId === input.engagementId && item.current)) {
    previous.current = false;
    previous.status = "SUPERSEDED";
    previous.updatedAt = now;
  }
  const edition: RoadmapEdition = {
    id: editionId,
    organisationId: input.organisationId,
    eventId: input.eventId,
    engagementId: input.engagementId,
    status: schedule.status === "INFEASIBLE" ? "INFEASIBLE" : "PUBLISHED",
    contentHash: exactHash({ milestones: milestones.map((item) => item.contentHash), edges: dependencies.map((item) => [item.fromMilestoneId, item.toMilestoneId, item.kind]) }),
    current: true,
    templateEditionId: template?.id,
    briefHash: brief?.contentHash,
    budgetHash: budget?.resultHash,
    scheduleStatus: schedule.status,
    unresolvedAssumptions: schedule.missingInputs,
    version: 1,
    ...stamp(now),
  };
  snap.roadmapEditions.push(edition);
  const persisted: RoadmapScheduleResult = {
    id: randomUUID(),
    organisationId: input.organisationId,
    editionId,
    status: schedule.status,
    compressionClass: schedule.compressionClass,
    critical: schedule.critical,
    totalDurationDays: schedule.totalDurationDays,
    inputHash: schedule.inputHash,
    version: 1,
    ...stamp(now),
  };
  snap.roadmapScheduleResults.push(persisted);
  return { edition, milestones, dependencies, schedule };
}

export function calculateSchedule(
  milestones: readonly RoadmapMilestone[],
  dependencies: readonly RoadmapDependency[],
  availableDays?: string,
): {
  status: RoadmapScheduleResult["status"];
  compressionClass: RoadmapScheduleResult["compressionClass"];
  milestoneIds: string[];
  totalDurationDays: string;
  inputHash: string;
  earliest: Record<string, number>;
  latest: Record<string, number>;
  float: Record<string, number>;
  critical: RoadmapScheduleResult["critical"];
  missingInputs: string[];
} {
  const nodes = new Map(milestones.map((item) => [item.id, item]));
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  const kinds = new Map<string, RoadmapDependency["kind"]>();
  for (const node of milestones) {
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  }
  for (const edge of dependencies) {
    if (edge.fromMilestoneId === edge.toMilestoneId) throw new PlatformError("VALIDATION_FAILED", "self-loop rejected");
    if (!nodes.has(edge.fromMilestoneId) || !nodes.has(edge.toMilestoneId)) throw new PlatformError("VALIDATION_FAILED", "missing dependency node");
    incoming.get(edge.toMilestoneId)!.push(edge.fromMilestoneId);
    outgoing.get(edge.fromMilestoneId)!.push(edge.toMilestoneId);
    kinds.set(`${edge.fromMilestoneId}->${edge.toMilestoneId}`, edge.kind);
  }
  const missingInputs = milestones.filter((item) => item.durationDays === "" || item.confidence === "UNRESOLVED").map((item) => item.title);
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
      const kind = kinds.get(`${id}->${next}`);
      const nextStart = kind === "START_TO_START" ? start : finish;
      earliest.set(next, Math.max(earliest.get(next) ?? 0, nextStart));
      degree.set(next, (degree.get(next) ?? 1) - 1);
      if (degree.get(next) === 0) queue.push(next);
    }
  }
  if (order.length !== milestones.length) throw new PlatformError("VALIDATION_FAILED", "dependency cycle rejected");
  const finishes = new Map<string, number>();
  let horizon = 0;
  for (const item of milestones) {
    const finish = (earliest.get(item.id) ?? 0) + Number(item.durationDays);
    finishes.set(item.id, finish);
    if (finish > horizon) horizon = finish;
  }
  const latest = new Map<string, number>();
  for (const item of milestones) latest.set(item.id, horizon - Number(item.durationDays));
  for (const id of [...order].reverse()) {
    for (const next of outgoing.get(id) ?? []) {
      const kind = kinds.get(`${id}->${next}`);
      const latestStart = kind === "START_TO_START" ? (latest.get(next) ?? 0) : (latest.get(next) ?? 0);
      const candidate = kind === "START_TO_START" ? latestStart : latestStart - Number(nodes.get(id)!.durationDays);
      latest.set(id, Math.min(latest.get(id) ?? candidate, Math.max(0, candidate)));
    }
  }
  const float: Record<string, number> = {};
  const earliestDto: Record<string, number> = {};
  const latestDto: Record<string, number> = {};
  const critical: RoadmapScheduleResult["critical"] = [];
  for (const item of milestones) {
    const slack = (latest.get(item.id) ?? 0) - (earliest.get(item.id) ?? 0);
    float[item.id] = slack;
    earliestDto[item.id] = earliest.get(item.id) ?? 0;
    latestDto[item.id] = latest.get(item.id) ?? 0;
    if (slack === 0) {
      critical.push({
        milestoneId: item.id,
        title: item.title,
        floatDays: "0",
        explanation: item.delayConsequence ?? "This milestone has no float; delay moves the whole path.",
      });
    }
  }
  let status: RoadmapScheduleResult["status"] = missingInputs.length ? "INSUFFICIENT_INFORMATION" : "CALCULATED";
  let compressionClass: RoadmapScheduleResult["compressionClass"] = "STANDARD";
  if (availableDays) {
    const available = Number(availableDays);
    const irreducible = milestones.reduce((sum, item) => {
      if (item.compressible === false) return sum + Number(item.leadTimeDays ?? item.durationDays);
      return sum + 1;
    }, 0);
    if (available < irreducible) {
      status = "INFEASIBLE";
      compressionClass = "INFEASIBLE";
    } else if (available < horizon) {
      const decisionHeavy = milestones.some((item) => item.layer === "DECISION");
      const riskHeavy = milestones.some((item) => item.layer === "OPERATIONAL_READINESS" && item.compressible !== false);
      status = "COMPRESSED";
      compressionClass = decisionHeavy ? "FEASIBLE_WITH_DECISIONS" : riskHeavy ? "FEASIBLE_WITH_RISK" : "COMPRESSED_FEASIBLE";
    }
  }
  return {
    status,
    compressionClass,
    milestoneIds: critical.map((item) => item.milestoneId),
    totalDurationDays: String(horizon),
    inputHash: exactHash({
      milestones: milestones.map((item) => [item.id, item.durationDays, item.leadTimeDays ?? ""]),
      dependencies: dependencies.map((item) => [item.fromMilestoneId, item.toMilestoneId, item.kind]),
      availableDays: availableDays ?? "",
    }),
    earliest: earliestDto,
    latest: latestDto,
    float,
    critical,
    missingInputs,
  };
}

export function assessChangeImpactDeepOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; changeProposalId: string },
  now: string,
): ImpactAssessment {
  const proposal = snap.changeProposals.find((item) => item.id === input.changeProposalId && item.organisationId === input.organisationId);
  if (!proposal) throw new PlatformError("NOT_FOUND", "change proposal was not found");
  const brief = snap.eventBriefEditions.find((item) => item.engagementId === proposal.engagementId && item.current);
  const budget = snap.budgetScenarioEditions.find((item) => item.engagementId === proposal.engagementId && item.current);
  const roadmap = snap.roadmapEditions.find((item) => item.engagementId === proposal.engagementId && item.current);
  const summary = proposal.summary.toLowerCase();
  const guest = /guest/.test(summary);
  const date = /date|when|calendar/.test(summary);
  const venue = /venue|location|site/.test(summary);
  const invitations = snap.rsvpInvitations.some((item) => item.organisationId === input.organisationId);
  const impacts: ImpactAssessment["impacts"] = [
    {
      target: "brief",
      kind: guest || date || venue ? "DIRECT" : brief ? "POTENTIAL" : "UNKNOWN",
      explanation: brief
        ? `Bound to brief hash ${brief.contentHash.slice(0, 12)}. ${guest || date || venue ? "A new brief edition is required." : "No matching brief assertion was named."}`
        : "No current brief edition exists, so brief impact is unknown rather than none.",
    },
    {
      target: "budget",
      kind: guest ? "DIRECT" : budget ? "POTENTIAL" : "UNKNOWN",
      explanation: budget
        ? `Bound to budget result ${budget.resultHash.slice(0, 12)}. Guest or scope change stales assumptions; it does not rewrite the edition.`
        : "No current budget edition exists, so budget impact is unknown.",
    },
    {
      target: "roadmap",
      kind: date || venue ? "DIRECT" : roadmap ? "POTENTIAL" : "UNKNOWN",
      explanation: roadmap
        ? `Bound to roadmap ${roadmap.contentHash.slice(0, 12)}. Latest-safe windows may move.`
        : "No current roadmap edition exists, so schedule impact is unknown.",
    },
    {
      target: "venue_spatial",
      kind: venue ? "POTENTIAL" : "NONE",
      explanation: venue
        ? "Venue wording may affect spatial work. No layout record is rewritten here."
        : "No venue wording or spatial edition is implicated. NONE is evidenced by the proposal text and current layout silence.",
    },
    {
      target: "rsvp",
      kind: "NONE",
      explanation: invitations
        ? "Invitation records exist, but this change adapter does not mutate RSVP authority, responses or entitlements."
        : "No RSVP invitation, response or entitlement is present, and this adapter never mutates RSVP truth.",
    },
    {
      target: "programme",
      kind: date ? "POTENTIAL" : "NONE",
      explanation: date
        ? "Date wording may require a programme-phase review. No phase is rewritten here."
        : "No programme-phase record is implicated by the proposal text.",
    },
  ];
  const record: ImpactAssessment = {
    id: randomUUID(),
    organisationId: input.organisationId,
    changeProposalId: proposal.id,
    impacts,
    inputHash: exactHash({
      proposal: proposal.semanticHash,
      brief: brief?.contentHash ?? "",
      budget: budget?.resultHash ?? "",
      roadmap: roadmap?.contentHash ?? "",
    }),
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

export function propagateApprovedChangeOnSnap(
  snap: PlatformSnapshot,
  proposalId: string,
  organisationId: string,
  now: string,
): void {
  const proposal = snap.changeProposals.find((item) => item.id === proposalId && item.organisationId === organisationId);
  if (!proposal) return;
  for (const assumption of snap.budgetAssumptions.filter((item) => item.organisationId === organisationId && item.engagementId === proposal.engagementId)) {
    assumption.stale = true;
    assumption.updatedAt = now;
  }
  for (const scenario of snap.budgetScenarioEditions.filter((item) => item.organisationId === organisationId && item.engagementId === proposal.engagementId && item.current)) {
    scenario.status = "STALE";
    scenario.calculationStatus = "STALE";
    scenario.updatedAt = now;
  }
  for (const edition of snap.roadmapEditions.filter((item) => item.organisationId === organisationId && item.engagementId === proposal.engagementId && item.current)) {
    edition.unresolvedAssumptions = [...(edition.unresolvedAssumptions ?? []), "Approved change requires a new roadmap edition"];
    edition.updatedAt = now;
  }
  proposal.status = "PROPAGATED";
}

const INTERVIEW_SCRIPT: Array<{
  phase: ConversationTurn["phase"];
  questionId: string;
  topicKeys: string[];
  prompt: string;
}> = [
  { phase: "WELCOME", questionId: "welcome", topicKeys: [], prompt: "Welcome. This conversation helps Maison Doclar understand your event with care. We will ask one question at a time, and you may pause whenever you need." },
  { phase: "CONSENT", questionId: "consent", topicKeys: ["consent.participation"], prompt: "We will use your answers only to plan this engagement. You may say unknown, not yet, not applicable, or prefer not to answer at any time. Do you consent to continue this conversation?" },
  { phase: "PRINCIPALS", questionId: "principals", topicKeys: ["people.principals"], prompt: "Who are the participating principals we should address, and how should we refer to each person?" },
  { phase: "ADDRESS", questionId: "address", topicKeys: ["people.address"], prompt: "What form of address would you like us to use?" },
  { phase: "LANGUAGE", questionId: "language", topicKeys: ["language.preference"], prompt: "Which language would you prefer for this conversation? We will not infer this from names or tone." },
  { phase: "COVERAGE", questionId: "guest", topicKeys: ["guest.target_count"], prompt: "How many guests should we plan for, if you know?" },
  { phase: "COVERAGE", questionId: "date", topicKeys: ["date.window"], prompt: "Is there a date or season we should treat as the working window?" },
  { phase: "COVERAGE", questionId: "venue", topicKeys: ["venue.status"], prompt: "Has a venue already been chosen, or is that still open?" },
  { phase: "COVERAGE", questionId: "vision", topicKeys: ["vision.feeling"], prompt: "In your own words, what should this occasion feel like?" },
  { phase: "REVIEW", questionId: "review", topicKeys: [], prompt: "Here is what we understood. Please correct anything before you confirm. Your words stay distinct from any Maison interpretation." },
];

function settledTopic(snap: PlatformSnapshot, engagementId: string, topicKey: string): boolean {
  const confirmed = snap.candidateAssertions.some(
    (item) => item.engagementId === engagementId && item.topicKey === topicKey && (item.confirmationState === "CLIENT_CONFIRMED" || item.confirmationState === "STAFF_REVIEWED"),
  );
  const answered = snap.conversationTurns.some(
    (item) =>
      item.engagementId === engagementId &&
      item.topicKeys.includes(topicKey) &&
      ["CLIENT_DIRECT", "UNKNOWN", "NOT_YET", "NOT_APPLICABLE", "PREFER_NOT"].includes(item.answerSource),
  );
  const conflicted = snap.coverageAssessments.some((item) => item.engagementId === engagementId && item.topicKey === topicKey && (item.state === "CONFLICTED" || item.state === "STALE"));
  return (confirmed || answered) && !conflicted;
}

export function nextGovernedInterviewTurn(
  snap: PlatformSnapshot,
  engagementId: string,
): { phase: ConversationTurn["phase"]; questionId: string; topicKeys: string[]; prompt: string; revisit: boolean; revisitReason?: string } | undefined {
  const conflicted = snap.coverageAssessments.find((item) => item.engagementId === engagementId && (item.state === "CONFLICTED" || item.state === "STALE"));
  if (conflicted) {
    return {
      phase: "COVERAGE",
      questionId: `revisit:${conflicted.topicKey}`,
      topicKeys: [conflicted.topicKey],
      prompt: `We need to revisit ${conflicted.topicKey.replaceAll(".", " ")} because the earlier answer is ${conflicted.state.toLowerCase()}. Your previous words are kept; this is not a new blank form.`,
      revisit: true,
      revisitReason: conflicted.state,
    };
  }
  for (const step of INTERVIEW_SCRIPT) {
    if (step.topicKeys.length === 0) {
      const already = snap.conversationTurns.some((item) => item.engagementId === engagementId && item.questionId === step.questionId && item.answerSource !== "PAUSE");
      if (!already) return { ...step, revisit: false };
      continue;
    }
    if (step.topicKeys.every((topic) => settledTopic(snap, engagementId, topic))) continue;
    return { ...step, revisit: false };
  }
  return undefined;
}

export function recordConversationTurnOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    engagementId: string;
    sessionId?: string;
    accessId?: string;
    questionId: string;
    phase: ConversationTurn["phase"];
    topicKeys: string[];
    prompt: string;
    answerSource: ConversationTurn["answerSource"];
    speakerLabel?: string;
    formOfAddress?: string;
    languagePreference?: string;
    directClientText?: string;
    revisitReason?: string;
  },
  now: string,
): ConversationTurn {
  const turnIndex = snap.conversationTurns.filter((item) => item.engagementId === input.engagementId).length;
  const record: ConversationTurn = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: input.engagementId,
    sessionId: input.sessionId,
    accessId: input.accessId,
    turnIndex,
    phase: input.phase,
    questionId: input.questionId,
    questionEdition: "s05a-interview-v1",
    topicKeys: input.topicKeys,
    prompt: nfc(input.prompt),
    answerSource: input.answerSource,
    speakerLabel: input.speakerLabel ? nfc(input.speakerLabel) : undefined,
    formOfAddress: input.formOfAddress ? nfc(input.formOfAddress) : undefined,
    languagePreference: input.languagePreference,
    directClientText: input.directClientText ? nfc(input.directClientText) : undefined,
    proposedNarrative: undefined,
    confirmationState: input.answerSource === "CLIENT_DIRECT" ? "CAPTURED" : "UNANSWERED",
    revisitReason: input.revisitReason,
    correlationId: createHash("sha256").update(`${input.engagementId}:${turnIndex}:${now}`).digest("hex").slice(0, 16),
    version: 1,
    ...stamp(now),
  };
  snap.conversationTurns.push(record);
  return record;
}

export function buildClientOverviewOnSnap(
  snap: PlatformSnapshot,
  engagementId: string,
  organisationId: string,
  now: string,
): ClientOverviewEdition {
  const assertions = snap.candidateAssertions.filter((item) => item.engagementId === engagementId && item.sensitivity === "STANDARD");
  const turns = snap.conversationTurns.filter((item) => item.engagementId === engagementId);
  const knownFacts = assertions.filter((item) => item.confirmationState === "CLIENT_CONFIRMED" || item.confirmationState === "STAFF_REVIEWED").map((item) => item.narrative);
  const openQuestions = snap.coverageAssessments.filter((item) => item.engagementId === engagementId && (item.state === "UNKNOWN" || item.state === "UNASSESSED")).map((item) => item.topicKey);
  const record: ClientOverviewEdition = {
    id: randomUUID(),
    organisationId,
    engagementId,
    vision: turns.find((item) => item.questionId === "vision")?.directClientText,
    priorities: knownFacts.slice(0, 3),
    nonNegotiables: assertions.filter((item) => /must|non-negotiable/i.test(item.narrative)).map((item) => item.narrative),
    knownFacts,
    openQuestions,
    decisionsRequired: snap.changeProposals.filter((item) => item.engagementId === engagementId && item.status === "IMPACT_ASSESSED").map((item) => item.summary),
    investmentFraming: "Any investment range we share later will be a planning frame, not a request to spend.",
    roadmapExpectation: "We will show the decisions you need, by when, and what delay would change.",
    conflicts: snap.assertionConflicts.filter((item) => item.engagementId === engagementId && item.status !== "RESOLVED").map((item) => item.explanation),
    changesSinceLastReview: snap.clientBriefDecisions.filter((item) => item.engagementId === engagementId).slice(-3).map((item) => item.decision),
    contentHash: exactHash({ knownFacts, openQuestions }),
    current: true,
    version: 1,
    ...stamp(now),
  };
  for (const previous of snap.clientOverviewEditions.filter((item) => item.engagementId === engagementId && item.current)) {
    previous.current = false;
    previous.updatedAt = now;
  }
  snap.clientOverviewEditions.push(record);
  return record;
}

export function revokeDiscoveryClientAccessOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; accessId: string },
  now: string,
) {
  const record = snap.discoveryClientAccess.find((item) => item.id === input.accessId && item.organisationId === input.organisationId);
  if (!record) throw new PlatformError("NOT_FOUND", "client access was not found");
  record.revokedAt = now;
  record.updatedAt = now;
  record.version += 1;
  return record;
}

export function buildExecutiveCommandDeep(snap: PlatformSnapshot, organisationId: string, eventId?: string) {
  const engagements = snap.discoveryEngagements.filter((item) => item.organisationId === organisationId);
  const selected = eventId
    ? engagements.find((item) => item.convertedEventId === eventId) ?? engagements[0]
    : engagements[0];
  const brief = selected ? snap.eventBriefEditions.find((item) => item.engagementId === selected.id && item.current) : undefined;
  const budget = selected ? snap.budgetScenarioEditions.find((item) => item.engagementId === selected.id && item.current) : undefined;
  const roadmap = selected ? snap.roadmapEditions.find((item) => item.engagementId === selected.id && item.current) : undefined;
  const schedule = roadmap ? snap.roadmapScheduleResults.find((item) => item.editionId === roadmap.id) : undefined;
  const assessments = snap.coverageAssessments.filter((item) => !selected || item.engagementId === selected.id);
  const assertions = snap.candidateAssertions.filter((item) => !selected || item.engagementId === selected.id);
  const envelope = snap.financialStateDeclarations.find((item) => item.organisationId === organisationId && item.kind === "ENVELOPE");
  const approvedCommitment = snap.financialStateDeclarations.find((item) => item.organisationId === organisationId && item.kind === "APPROVED_COMMITMENT");
  const contracted = snap.financialStateDeclarations.find((item) => item.organisationId === organisationId && item.kind === "CONTRACTED_COMMITMENT");
  const cash = snap.financialStateDeclarations.find((item) => item.organisationId === organisationId && item.kind === "CASH_REQUIREMENT");
  const change = snap.changeProposals.find((item) => (!selected || item.engagementId === selected.id) && (item.status === "IMPACT_ASSESSED" || item.status === "APPROVED" || item.status === "PROPAGATED"));
  const stalePrices = snap.priceEvidenceRecords.filter((item) => item.organisationId === organisationId && item.stale);
  const syntheticPrices = snap.priceEvidenceRecords.filter((item) => item.organisationId === organisationId && item.synthetic);
  const decisions = [
    change
      ? {
          what: change.summary,
          whyNow: "An assessed change is waiting for a checker who is not the detector.",
          latestSafe: schedule?.critical[0]?.title ?? "Before the next critical milestone",
          delayConsequence: schedule?.critical[0]?.explanation ?? "Dependent work stays stale.",
          investmentConsequence: budget ? `Forecast remains ${budget.calculationStatus.toLowerCase()} until a new edition is calculated.` : "No budget edition is bound yet.",
          clientConsequence: "The client overview can drift from the governing brief.",
          evidence: change.governingBriefHash ?? brief?.contentHash ?? "No brief hash is bound.",
          uncertainty: "Impact kinds are evidenced, not assumed empty.",
          owner: "CEO or authorised checker",
          action: "Decide the exact change proposal hash",
          hash: change.semanticHash,
        }
      : undefined,
  ].filter(Boolean);
  return {
    organisationId,
    eventId: eventId ?? selected?.convertedEventId,
    engagementId: selected?.id,
    engagementLabel: selected?.displayReference ?? "No active engagement",
    briefHash: brief?.contentHash,
    budgetHash: budget?.resultHash,
    roadmapHash: roadmap?.contentHash,
    lastMaterialChange: change?.summary ?? "No material change is recorded.",
    readiness: assessments.some((item) => item.state === "CONFLICTED") ? "Blocked by contradiction" : assessments.some((item) => item.state === "UNKNOWN") ? "Unknown facts remain" : "No publication block is recorded",
    evidenceFreshness: stalePrices.length ? "Stale price evidence is present" : "No stale price evidence is marked",
    clientConfirmation: `${assertions.filter((item) => item.confirmationState === "CLIENT_CONFIRMED").length} client-confirmed facts`,
    known: assessments.filter((item) => item.state === "CONFIRMED").length,
    unknown: assessments.filter((item) => item.state === "UNKNOWN" || item.state === "UNASSESSED").length,
    conflicted: assessments.filter((item) => item.state === "CONFLICTED").length,
    stale: assessments.filter((item) => item.state === "STALE").length,
    nextDecision: decisions[0]?.what ?? "No urgent decision is waiting.",
    decisions,
    exceptions: {
      unknown: assessments.filter((item) => item.state === "UNKNOWN" || item.state === "UNASSESSED").map((item) => item.topicKey),
      conflicts: assessments.filter((item) => item.state === "CONFLICTED").map((item) => item.topicKey),
      staleAssertions: assessments.filter((item) => item.state === "STALE").map((item) => item.topicKey),
      stalePrices: stalePrices.map((item) => item.sourceLabel),
      missingPrices: budget?.missingDrivers ?? [],
      weakConfidence: syntheticPrices.map((item) => item.costItemCode ?? item.sourceLabel),
      blockedBudget: budget?.calculationStatus === "BLOCKED",
      roadmapInfeasible: roadmap?.status === "INFEASIBLE",
      unpropagated: snap.changeProposals.some((item) => item.organisationId === organisationId && item.status === "APPROVED"),
    },
    investment: {
      envelopeMinor: envelope?.money.minor,
      forecastMinor: budget?.expectedMinor,
      forecastLowMinor: budget?.lowMinor,
      forecastHighMinor: budget?.highMinor,
      calculationStatus: budget?.calculationStatus,
      approvedCommitmentMinor: approvedCommitment?.money.minor,
      contractedCommitmentMinor: contracted?.money.minor,
      cashWindowMinor: cash?.money.minor,
      contingencyMinor: budget?.contingencyMinor,
      contingencyBasis: budget?.contingencyBasis,
      protectedPriorities: budget?.purpose,
      evidenceMaturity: budget?.calculationStatus === "COMPLETE" ? "Current governed evidence" : "Partial or synthetic evidence remains",
      spendNotRecommended: budget?.alignment === "SURPLUS_CAPACITY",
    },
    roadmap: {
      criticalPath: schedule?.critical.map((item) => item.milestoneId) ?? [],
      criticalMilestones: schedule?.critical ?? [],
      compressionClass: schedule?.compressionClass,
      infeasible: roadmap?.status === "INFEASIBLE",
    },
    change: change
      ? {
          summary: change.summary,
          status: change.status,
          hash: change.semanticHash,
        }
      : undefined,
    clientConfirmed: assertions.filter((item) => item.confirmationState === "CLIENT_CONFIRMED").length,
    staffReviewed: assertions.filter((item) => item.confirmationState === "STAFF_REVIEWED").length,
    aiProposed: assertions.filter((item) => item.origin === "AI_FIXTURE" && item.confirmationState === "PROPOSED").length,
    blocking: assessments.some((item) => item.state === "CONFLICTED")
      ? "Open contradictions block publication."
      : assessments.some((item) => item.state === "UNKNOWN" || item.state === "UNASSESSED")
        ? "Unknown facts remain."
        : "No publication block is recorded.",
    criticalPath: schedule?.critical.map((item) => item.milestoneId) ?? [],
    envelopeMinor: envelope?.money.minor,
    forecastMinor: budget?.expectedMinor,
  };
}
