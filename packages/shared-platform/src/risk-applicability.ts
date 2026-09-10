import type { RiskApplicabilitySnapshot, RiskFactEdition, RiskPolicyEdition, RiskRuleEdition } from "./risk-schemas.js";

export type Applicability = RiskApplicabilitySnapshot["requirements"][number];

export type ApplicabilityInputs = {
  now: string;
  facts: readonly RiskFactEdition[];
  rules: readonly RiskRuleEdition[];
  policies: readonly RiskPolicyEdition[];
};

function factValue(facts: readonly RiskFactEdition[], key: string): RiskFactEdition | undefined {
  return facts.find((item) => item.factKey === key);
}

function currentPolicy(policies: readonly RiskPolicyEdition[], type: string | undefined): RiskPolicyEdition | undefined {
  return policies.find((item) => item.current && item.verificationState === "VERIFIED" && (!type || item.policyType === type));
}

export function resolveRequirement(rule: RiskRuleEdition, inputs: ApplicabilityInputs): Applicability {
  const trace: Applicability["trace"] = [{ step: "RULE", detail: `${rule.ruleKey} status ${rule.status}` }];
  if (rule.status !== "APPROVED") {
    return {
      requirementKey: rule.requirementKey,
      decision: rule.status === "SUPERSEDED" || rule.status === "WITHDRAWN" ? "STALE" : "INDETERMINATE",
      factEditionIds: [],
      ruleEditionId: rule.id,
      missingFacts: ["approved_rule"],
      trace: [...trace, { step: "STATUS", detail: "unapproved or stale rule cannot be mandatory" }],
    };
  }
  if (rule.effectiveTo && rule.effectiveTo < inputs.now.slice(0, 10)) {
    return {
      requirementKey: rule.requirementKey,
      decision: "STALE",
      factEditionIds: [],
      ruleEditionId: rule.id,
      missingFacts: ["current_rule"],
      trace: [...trace, { step: "EFFECTIVE_TO", detail: "rule expired before evaluation" }],
    };
  }
  const jurisdiction = factValue(inputs.facts, "jurisdiction");
  const venue = factValue(inputs.facts, "venue");
  const workforce = factValue(inputs.facts, "workforce_relationship");
  const dates = factValue(inputs.facts, "event_dates");
  const usedFacts = [jurisdiction, venue, workforce, dates].filter((item): item is RiskFactEdition => Boolean(item));
  const missing: string[] = [];
  if (!jurisdiction || jurisdiction.unknown) missing.push("jurisdiction");
  if (!dates || dates.unknown) missing.push("event_dates");
  if (rule.requirementKey.includes("WORKFORCE") && (!workforce || workforce.unknown)) missing.push("workforce_relationship");
  if (rule.requirementKey.includes("VENUE") && (!venue || venue.unknown)) missing.push("venue");
  if (missing.length) {
    return {
      requirementKey: rule.requirementKey,
      decision: "INDETERMINATE",
      factEditionIds: usedFacts.map((item) => item.id),
      ruleEditionId: rule.id,
      missingFacts: missing,
      trace: [...trace, { step: "MISSING_FACT", detail: missing.join(",") }],
    };
  }
  if (jurisdiction && rule.jurisdiction !== "NG" && jurisdiction.value !== rule.jurisdiction && jurisdiction.value !== "NG") {
    return {
      requirementKey: rule.requirementKey,
      decision: "DOES_NOT_APPLY",
      factEditionIds: usedFacts.map((item) => item.id),
      ruleEditionId: rule.id,
      missingFacts: [],
      trace: [...trace, { step: "JURISDICTION", detail: `fact ${jurisdiction.value} outside ${rule.jurisdiction}` }],
    };
  }
  const policy = currentPolicy(inputs.policies, rule.policyType);
  if (policy) {
    trace.push({ step: "POLICY", detail: `verified edition ${policy.id}` });
  } else {
    trace.push({ step: "POLICY", detail: "no current verified policy of required type" });
  }
  return {
    requirementKey: rule.requirementKey,
    decision: "APPLIES",
    factEditionIds: usedFacts.map((item) => item.id),
    ruleEditionId: rule.id,
    policyEditionId: policy?.id,
    missingFacts: [],
    trace,
  };
}

export function resolveApplicability(inputs: ApplicabilityInputs): Applicability[] {
  return inputs.rules.map((rule) => resolveRequirement(rule, inputs));
}
