/** Domain-grounded Intelligence resolvers — event-scoped, deterministic, fixture-safe. */
import type { PlatformSnapshot } from "../store.js";
import type { SeatingWorkspaceView } from "../seating-workspace.js";
import type { ContextBrokerProjection } from "./context.js";
import type { RuntimePosture } from "./policy.js";
import { CANONICAL_TASK_BANK } from "./task-bank.js";

export const ATELIER_DOMAINS = [
  "discovery",
  "investment",
  "roadmap",
  "guests",
  "seating",
  "programme",
  "suppliers",
  "merchandise",
  "communications",
  "change",
  "evidence",
  "browser",
] as const;

export type AtelierDomain = (typeof ATELIER_DOMAINS)[number];

export type DomainAvailability = "PRESENT" | "ABSENT" | "PARTIAL" | "UNSUPPORTED";

export type DomainResolverResult = {
  domain: AtelierDomain | "readiness";
  availability: DomainAvailability;
  answer: string;
  supportingFacts: string[];
  assumptions: string[];
  recommendations: string[];
  limitations: string[];
  risksOrBlockers: string[];
  provenance: string[];
};

export type DomainEvidenceBag = {
  seating?: SeatingWorkspaceView | null;
  roleKey?: string;
};

const TOOL_DOMAIN: Record<string, AtelierDomain> = {
  "seating.explainAuthority": "seating",
  "investment.explain": "investment",
  "investment.compareScenarios": "investment",
  "roadmap.explainCriticalPath": "roadmap",
  "guest.find": "guests",
  "guest.flagMissingInformation": "guests",
  "eventBrief.read": "discovery",
  "discovery.unansweredQuestions": "discovery",
  "programme.analyseCollisions": "programme",
  "change.analyseImpact": "change",
  "evidence.readReceipt": "evidence",
  "browser.retrieveDocument": "browser",
  "browser.checkStatus": "browser",
  "browser.downloadQuarantine": "browser",
  "browser.verifySubmission": "browser",
  "publication.preview": "evidence",
};

/** Every ACTIVE Intelligence / explanatory Task Bank task → resolver domain. */
export function intelligenceTaskResolverMap(): Array<{
  taskId: string;
  version: number;
  domain: string;
  toolName: string;
  riskTier: string;
  resolver: AtelierDomain | "readiness" | "unsupported";
  readOnly: boolean;
}> {
  return CANONICAL_TASK_BANK.filter((task) => task.status === "ACTIVE")
    .filter((task) => {
      const tool = task.planTemplate[0]?.toolName ?? "";
      return (
        task.riskTier === "R0" ||
        tool.startsWith("intelligence.") ||
        tool.startsWith("browser.") ||
        Boolean(TOOL_DOMAIN[tool])
      );
    })
    .map((task) => {
      const toolName = task.planTemplate[0]?.toolName ?? "";
      const resolver: AtelierDomain | "readiness" | "unsupported" =
        TOOL_DOMAIN[toolName] ??
        (toolName.startsWith("intelligence.")
          ? ((ATELIER_DOMAINS as readonly string[]).includes(task.domain)
              ? (task.domain as AtelierDomain)
              : "discovery")
          : toolName.startsWith("browser.")
            ? "browser"
            : "unsupported");
      return {
        taskId: task.id,
        version: task.version,
        domain: task.domain,
        toolName,
        riskTier: task.riskTier,
        resolver,
        readOnly: task.riskTier === "R0" || !task.planTemplate.some((step) => step.riskTier !== "R0" && step.riskTier !== "R1"),
      };
    });
}

export function resolveIntelligenceDomain(input: {
  toolName: string;
  instruction: string;
  taskDomain?: string;
}): AtelierDomain | "readiness" {
  const lowered = input.instruction.toLowerCase();
  if (/explain why sending|sending is blocked|why (is )?sending|communication.*(blocked|block)/.test(lowered)) {
    return "communications";
  }
  const fromTool = TOOL_DOMAIN[input.toolName];
  if (fromTool) return fromTool;
  if (/seat|layout binding|table plan|seating/.test(lowered)) return "seating";
  if (/budget|investment|spend|scenario|unpriced/.test(lowered)) return "investment";
  if (/roadmap|critical path|milestone/.test(lowered)) return "roadmap";
  if (/guest|rsvp|household|vip/.test(lowered)) return "guests";
  if (/programme|timing collision|movement/.test(lowered)) return "programme";
  if (/supplier|vendor/.test(lowered)) return "suppliers";
  if (/merchandise|merch|size chart|fulfilment/.test(lowered)) return "merchandise";
  if (/communication|language edition|send/.test(lowered)) return "communications";
  if (/change impact|stale plan|new fact/.test(lowered)) return "change";
  if (/evidence|receipt|approval outstanding|audit/.test(lowered)) return "evidence";
  if (/browser|portal|quarantine|simulated/.test(lowered)) return "browser";
  if (/brief|discovery|interview|vision/.test(lowered)) return "discovery";
  if (/status|readiness|missing information|gaps/.test(lowered)) return "readiness";
  if (input.taskDomain && (ATELIER_DOMAINS as readonly string[]).includes(input.taskDomain)) {
    return input.taskDomain as AtelierDomain;
  }
  return "readiness";
}

function eventLabel(context: ContextBrokerProjection, eventId: string): string {
  return context.scope.eventName ?? eventId;
}

function resolveSeating(input: {
  context: ContextBrokerProjection;
  eventId: string;
  seating?: SeatingWorkspaceView | null;
}): DomainResolverResult {
  const name = eventLabel(input.context, input.eventId);
  const view = input.seating;
  const provenance: string[] = ["seating.v2.workspace", `event:${input.eventId}`];
  if (!view) {
    return {
      domain: "seating",
      availability: "ABSENT",
      answer: [
        `Seating diagnosis for ${name}:`,
        "The authorised seating workspace projection is not available for this event in the current runtime.",
        "Missing prerequisite: seating layout binding / V2 seating workspace cannot be inspected from Atelier Command until seating authority records exist for this event.",
        "No seating-specific conflict, VIP, capacity, run or publication claim is made because those records were not consulted.",
      ].join(" "),
      supportingFacts: [],
      assumptions: ["Seating workspace projection unavailable for this event."],
      recommendations: ["Open the seating workspace for this same event and activate a layout binding before asking for seating diagnosis."],
      limitations: [
        "This answer distinguishes absent seating data from a general event-status summary.",
        "No seating facts were invented.",
      ],
      risksOrBlockers: ["Seating workspace unavailable"],
      provenance,
    };
  }

  const binding = view.seatingLayoutBinding;
  const bindingStatus = binding?.status ?? "ABSENT";
  const eligible = view.counts.eligibleGuests;
  const seated = view.counts.seated;
  const unseated = view.counts.unseated;
  const tableCount = view.tables.length;
  const totalCapacity = view.capacityLedger.total;
  const capacityDeficit = eligible > totalCapacity && totalCapacity > 0;
  const capacitySurplus = totalCapacity > eligible && totalCapacity > 0;
  const hardRules = view.constraints.filter((c) => c.kind === "HARD" && c.status === "ACTIVE");
  const softRules = view.constraints.filter((c) => c.kind === "SOFT" && c.status === "ACTIVE");
  const duplicateRules = view.constraints.filter((c) => c.duplicateRole === "REDUNDANT_HISTORICAL");
  const hardConflicts = view.constraints.filter((c) => Boolean(c.hardConflictEditionId));
  const runs = view.runs ?? [];
  const currentRun = runs.find((r) => r.current) ?? runs[0];
  const blockers = (view.attention ?? [])
    .filter((item) => item.kind === "blocker" || item.kind === "stale")
    .map((item) => item.message);
  const facts: string[] = [
    `Event seating workspace: ${name} (${input.eventId}).`,
    `Eligible/attending guest cohort: ${eligible}.`,
    `Seated ${seated} · unseated ${unseated}.`,
    `Layout binding status: ${bindingStatus}.`,
    binding?.physicalCapacity != null
      ? `Bound layout physical capacity signal: ${binding.physicalCapacity}.`
      : "Bound layout physical capacity: not recorded on the binding projection.",
    `Published tables: ${tableCount}; total seating capacity: ${totalCapacity}.`,
    capacityDeficit
      ? `Capacity deficit: eligible guests (${eligible}) exceed total capacity (${totalCapacity}).`
      : capacitySurplus
        ? `Capacity surplus: total capacity (${totalCapacity}) exceeds eligible guests (${eligible}).`
        : totalCapacity === 0
          ? "Total capacity is 0 — no published table capacity is available."
          : `Capacity is aligned with the eligible cohort within current totals.`,
    `Active HARD rules: ${hardRules.length}; active SOFT rules: ${softRules.length}.`,
    duplicateRules.length
      ? `Redundant active rule editions detected: ${duplicateRules.length}.`
      : "No redundant active rule editions were flagged.",
    hardConflicts.length
      ? `Contradictory HARD rule pairs flagged: ${hardConflicts.length}.`
      : "No contradictory HARD rule pairs were flagged in the canonical projection.",
    `Input freshness: ${view.inputFreshness}.`,
    view.currentPublication
      ? `Current seating publication: #${view.currentPublication.publicationNumber} (${view.currentPublication.status}).`
      : "No current seating publication is present.",
    view.workingEdition
      ? `Working/submitted edition: ${view.workingEdition.status}${view.workingEdition.stale ? " (STALE)" : ""}.`
      : "No working or submitted seating edition is present.",
    currentRun
      ? `Latest/current solver run status: ${currentRun.status}${currentRun.stale ? " (STALE vs current authority)" : ""}${currentRun.validatorVerdict ? ` · validator ${currentRun.validatorVerdict}` : ""}.`
      : "No solver run is recorded for this event.",
    view.inputEdition
      ? `Frozen input package present: ${String(view.inputEdition.id).slice(0, 8)}…`
      : "No frozen V2 input package is present.",
  ];

  const risks = [
    ...blockers,
    ...(capacityDeficit ? ["Eligible guests exceed published table capacity."] : []),
    ...(hardConflicts.length ? ["Active HARD rule contradictions require resolution before a trusted run."] : []),
    ...(bindingStatus !== "BOUND" ? [`Layout binding is ${bindingStatus} — activate a sole ACTIVE binding before freezing inputs.`] : []),
  ];

  const next =
    bindingStatus !== "BOUND"
      ? "Activate a sole seating layout binding for the current venue-layout publication."
      : !view.inputEdition
        ? "Freeze a V2 input package before launching a solver run."
        : currentRun?.stale || view.workingEdition?.stale || view.inputFreshness === "STALE"
          ? "Freeze a fresh package and launch a new run — current package/run is stale against seating authority."
          : currentRun?.status === "INFEASIBLE"
            ? "Resolve HARD conflicts / capacity blockers, then launch a new run."
            : currentRun?.status === "FEASIBLE"
              ? "Validate, adopt and publish the feasible working edition under maker-checker."
              : "Launch a seating run under the current frozen package.";

  return {
    domain: "seating",
    availability: bindingStatus === "BOUND" || tableCount > 0 || eligible > 0 ? "PARTIAL" : "ABSENT",
    answer: [
      `Seating diagnosis for ${name}:`,
      facts.join(" "),
      risks.length ? `Actionable blockers: ${risks.join(" ")}` : "No invented blockers — canonical projection did not establish a conflict, VIP issue or capacity problem beyond the facts above.",
      `Recommended next action: ${next}`,
    ].join(" "),
    supportingFacts: facts,
    assumptions:
      view.inputFreshness === "MISSING"
        ? ["Seating inputs are missing; treat counts and capacity as incomplete until binding and package exist."]
        : [],
    recommendations: [next, "Use the seating workspace for the same event to mutate binding, rules or runs — Atelier Command Intelligence remains read-only."],
    limitations: [
      "Facts are taken only from the authorised event seating projection.",
      "No seating conflict is claimed unless the canonical projection establishes it.",
      "This is not a general event readiness summary.",
    ],
    risksOrBlockers: risks,
    provenance,
  };
}

function resolveReadiness(input: {
  context: ContextBrokerProjection;
  eventId: string;
  snap: PlatformSnapshot;
}): DomainResolverResult {
  const name = eventLabel(input.context, input.eventId);
  const guests = input.snap.operationalGuests.filter((g) => g.eventId === input.eventId);
  const briefs = (input.snap.eventBriefEditions ?? []).filter((b) => (b as { eventId?: string }).eventId === input.eventId);
  const event = input.snap.events.find((e) => e.id === input.eventId);
  const facts = [
    event ? `Event phase ${event.phase} · status ${event.status}.` : "Event record missing from authorised scope.",
    `Operational guest records: ${guests.length}.`,
    briefs.length ? `Canonical brief editions on file: ${briefs.length}.` : "No published brief edition is present yet.",
    ...input.context.knowledge
      .filter((k) => k.epistemicClass === "CONFIRMED_FACT" || k.epistemicClass === "DERIVED")
      .map((k) => k.statement),
  ];
  const gaps = [
    ...input.context.knowledge.filter((k) => k.epistemicClass === "ASSUMPTION" || k.epistemicClass === "UNKNOWN").map((k) => k.statement),
    ...input.context.contradictions.map((c) => `Contradiction signal: ${c}`),
  ];
  return {
    domain: "readiness",
    availability: "PARTIAL",
    answer: [
      `Readiness status for ${name}:`,
      facts.join(" "),
      gaps.length ? `Open gaps — ${gaps.join(" ")}` : "No open readiness assumptions were listed in the authorised projection.",
      "This readiness answer does not inspect seating layout binding, solver runs, investment engines or communications provider posture.",
    ].join(" "),
    supportingFacts: facts,
    assumptions: gaps,
    recommendations: [
      "Ask a domain-specific question (seating, guests, communications, investment) for grounded diagnosis.",
      "Close discovery brief gaps before treating guest or seating counts as final.",
    ],
    limitations: ["General readiness is supporting context only — it is not a substitute for domain diagnosis."],
    risksOrBlockers: gaps.slice(0, 5),
    provenance: ["context-broker", `event:${input.eventId}`],
  };
}

function resolveCommunications(input: {
  context: ContextBrokerProjection;
  eventId: string;
  posture: RuntimePosture;
}): DomainResolverResult {
  const name = eventLabel(input.context, input.eventId);
  const facts = [
    `productionAuthorised=${String(input.posture.productionAuthorised)}.`,
    `providersActive=${String(input.posture.providersActive)}.`,
    "External-effect tool communication.sendApproved is R4.",
  ];
  const blocked = !input.posture.productionAuthorised || !input.posture.providersActive;
  return {
    domain: "communications",
    availability: "PRESENT",
    answer: [
      `Communications posture for ${name}:`,
      blocked
        ? `Sending is blocked under the current runtime posture. ${facts.join(" ")} External-effect tools (R4) cannot perform a real send until production is authorised and the communications provider is active.`
        : `Sending may proceed only under authorised R4 maker-checker policy. ${facts.join(" ")}`,
      "Drafting or explaining remains permitted as a preparatory / read-only action inside this event only.",
    ].join(" "),
    supportingFacts: facts,
    assumptions: [],
    recommendations: [
      "Use Task Bank “Draft event update” or “Submit communication for approval” for preparatory work.",
      "Do not treat this explanation as a send or provider activation.",
    ],
    limitations: ["This explanation is not a send, draft mutation, or provider activation."],
    risksOrBlockers: blocked ? ["Real send blocked by productionAuthorised/providersActive posture"] : [],
    provenance: ["runtime-posture", `event:${input.eventId}`],
  };
}

function resolveGuests(input: {
  context: ContextBrokerProjection;
  eventId: string;
  snap: PlatformSnapshot;
  roleKey?: string;
}): DomainResolverResult {
  const name = eventLabel(input.context, input.eventId);
  const guests = input.snap.operationalGuests.filter((g) => g.eventId === input.eventId);
  const auditor = input.roleKey === "READ_ONLY_AUDITOR";
  const facts = [
    `Operational guest record count for ${name}: ${guests.length}.`,
    auditor
      ? "Auditor projection reports aggregate counts only — protected guest contact fields are not expanded in Intelligence answers."
      : "Aggregate counts are authorised for assigned staff; individual protected records are not dumped into Intelligence answers.",
  ];
  return {
    domain: "guests",
    availability: guests.length ? "PRESENT" : "ABSENT",
    answer: [
      `Guest aggregates for ${name}:`,
      facts.join(" "),
      guests.length === 0
        ? "Missing prerequisite: no operational guest records are present for this event."
        : "Use guest workspace tasks for missing-info or duplicate reconciliation rather than inventing contact state here.",
    ].join(" "),
    supportingFacts: facts,
    assumptions: guests.length === 0 ? ["Guest directory empty for this event."] : [],
    recommendations: ["Open the guests workspace for the same event to remediate missing RSVP or contact fields."],
    limitations: ["Intelligence does not leak protected guest PII into free-text answers."],
    risksOrBlockers: [],
    provenance: ["operationalGuests", `event:${input.eventId}`],
  };
}

function resolveDiscovery(input: {
  context: ContextBrokerProjection;
  eventId: string;
  snap: PlatformSnapshot;
}): DomainResolverResult {
  const name = eventLabel(input.context, input.eventId);
  const briefs = (input.snap.eventBriefEditions ?? []).filter((b) => (b as { eventId?: string }).eventId === input.eventId);
  const facts = [
    briefs.length
      ? `Canonical brief editions on file: ${briefs.length}.`
      : "No published brief edition is present yet for this event.",
  ];
  return {
    domain: "discovery",
    availability: briefs.length ? "PARTIAL" : "ABSENT",
    answer: [
      `Discovery / brief state for ${name}:`,
      facts.join(" "),
      briefs.length === 0
        ? "Missing prerequisite: publish or draft a canonical brief edition before treating discovery as complete."
        : "Compare unanswered discovery questions against the latest brief edition in the discovery workspace.",
    ].join(" "),
    supportingFacts: facts,
    assumptions: briefs.length === 0 ? ["Brief absent."] : [],
    recommendations: ["Use discovery Task Bank tasks to list unanswered questions against the authorised brief."],
    limitations: ["Discovery Intelligence does not invent client vision content."],
    risksOrBlockers: briefs.length === 0 ? ["No published brief"] : [],
    provenance: ["eventBriefEditions", `event:${input.eventId}`],
  };
}

function unavailableDomain(
  domain: AtelierDomain,
  name: string,
  prerequisite: string,
  provenance: string[],
): DomainResolverResult {
  return {
    domain,
    availability: "UNSUPPORTED",
    answer: [
      `${domain[0]!.toUpperCase()}${domain.slice(1)} diagnosis for ${name}:`,
      `Authoritative ${domain} engine data is not presently available to Atelier Command Intelligence for this event.`,
      `Missing prerequisite: ${prerequisite}.`,
      "No generic event-status summary is substituted for this domain answer.",
    ].join(" "),
    supportingFacts: [],
    assumptions: [`${domain} projection not populated for Intelligence.`],
    recommendations: [`Populate or open the ${domain} workspace for this same event, then re-ask.`],
    limitations: ["Truthful unavailable response — not a substitute readiness summary."],
    risksOrBlockers: [`${domain} data unavailable`],
    provenance,
  };
}

function resolveBrowser(input: { context: ContextBrokerProjection; eventId: string }): DomainResolverResult {
  const name = eventLabel(input.context, input.eventId);
  return {
    domain: "browser",
    availability: "PRESENT",
    answer: [
      `Browser-assisted posture for ${name}:`,
      "Browser runs are simulated only under the current fixture / provider-inactive posture.",
      "Allowed scope is restricted to the configured domain allowlist; downloads are quarantined; no real external portal mutation occurs while productionAuthorised is false.",
      "Expected simulated outcome: scripted navigation with quarantine refs and profile destruction — not a live vendor submission.",
    ].join(" "),
    supportingFacts: [
      "Browser route is simulation-only in current posture.",
      "External-effect limitations remain enforced by policy.",
    ],
    assumptions: [],
    recommendations: ["Use native governed commands when a durable event mutation is required."],
    limitations: ["Simulation must not be described as a real external effect."],
    risksOrBlockers: [],
    provenance: ["browser.simulation", `event:${input.eventId}`],
  };
}

function resolveEvidence(input: {
  context: ContextBrokerProjection;
  eventId: string;
  snap: PlatformSnapshot;
}): DomainResolverResult {
  const name = eventLabel(input.context, input.eventId);
  const receiptCount = (input.snap.atelierCommandLedgers ?? []).reduce(
    (count, doc) => count + (doc.receipts ?? []).filter((receipt) => receipt.eventId === input.eventId).length,
    0,
  );
  return {
    domain: "evidence",
    availability: receiptCount ? "PRESENT" : "PARTIAL",
    answer: [
      `Evidence posture for ${name}:`,
      `Atelier Command receipts on the event ledger: ${receiptCount}.`,
      receiptCount === 0
        ? "No Atelier settlements are recorded yet for this event — ask after an instruction settles, or use Executive Ledger filters."
        : "Receipts remain searchable on the Executive Ledger for authorised CEO/Auditor roles.",
    ].join(" "),
    supportingFacts: [`atelierCommand receipts=${receiptCount}`],
    assumptions: [],
    recommendations: ["Filter Executive Ledger by atelierCommand to locate correlation IDs."],
    limitations: ["Does not invent approvals or publications outside the ledger."],
    risksOrBlockers: [],
    provenance: ["atelierCommandLedgers", `event:${input.eventId}`],
  };
}

/**
 * Resolve a domain-grounded answer from authorised projections only.
 * Never accepts event authority from the instruction text.
 */
export function resolveDomainIntelligence(input: {
  toolName: string;
  instruction: string;
  organisationId: string;
  eventId: string;
  context: ContextBrokerProjection;
  posture: RuntimePosture;
  snap: PlatformSnapshot;
  evidence?: DomainEvidenceBag;
  taskDomain?: string;
}): DomainResolverResult {
  const domain = resolveIntelligenceDomain({
    toolName: input.toolName,
    instruction: input.instruction,
    taskDomain: input.taskDomain,
  });
  const name = eventLabel(input.context, input.eventId);

  switch (domain) {
    case "seating":
      return resolveSeating({ context: input.context, eventId: input.eventId, seating: input.evidence?.seating });
    case "communications":
      return resolveCommunications({ context: input.context, eventId: input.eventId, posture: input.posture });
    case "guests":
      return resolveGuests({
        context: input.context,
        eventId: input.eventId,
        snap: input.snap,
        roleKey: input.evidence?.roleKey,
      });
    case "discovery":
      return resolveDiscovery({ context: input.context, eventId: input.eventId, snap: input.snap });
    case "readiness":
      return resolveReadiness({ context: input.context, eventId: input.eventId, snap: input.snap });
    case "browser":
      return resolveBrowser({ context: input.context, eventId: input.eventId });
    case "evidence":
      return resolveEvidence({ context: input.context, eventId: input.eventId, snap: input.snap });
    case "investment":
      return unavailableDomain(
        "investment",
        name,
        "investment / budget engine projection is not populated for this event in Atelier Command",
        ["investment-intelligence", `event:${input.eventId}`],
      );
    case "roadmap":
      return unavailableDomain(
        "roadmap",
        name,
        "roadmap / critical-path engine projection is not populated for this event in Atelier Command",
        ["roadmap-intelligence", `event:${input.eventId}`],
      );
    case "programme":
      return unavailableDomain(
        "programme",
        name,
        "programme collision projection is not populated for this event in Atelier Command",
        ["programme-projections", `event:${input.eventId}`],
      );
    case "suppliers":
      return unavailableDomain(
        "suppliers",
        name,
        "supplier / vendor engagement projection is not populated for this event in Atelier Command",
        ["risk-projections", `event:${input.eventId}`],
      );
    case "merchandise":
      return unavailableDomain(
        "merchandise",
        name,
        "merchandise workspace projection is not populated for this event in Atelier Command",
        ["merchandise-projections", `event:${input.eventId}`],
      );
    case "change":
      return unavailableDomain(
        "change",
        name,
        "change-impact engine projection is not populated for this event in Atelier Command",
        ["change-intelligence", `event:${input.eventId}`],
      );
    default:
      return resolveReadiness({ context: input.context, eventId: input.eventId, snap: input.snap });
  }
}
