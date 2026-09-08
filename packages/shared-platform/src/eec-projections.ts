import type { PermissionKey } from "./schemas.js";
import { completenessDimensions } from "./eec-coverage.js";
import type {
  AssertionConflict,
  CandidateAssertion,
  CoverageAssessment,
  DiscoveryConsentRecord,
  DiscoveryEngagement,
  DiscoveryParticipant,
  EngagementOpportunity,
  InterviewSession,
  SourceArtefact,
  SourceSegment,
} from "./eec-schemas.js";

export type EecCapabilities = {
  canViewEngagement: boolean;
  canCreateEngagement: boolean;
  canUpdateEngagement: boolean;
  canConvertEngagement: boolean;
  canViewSession: boolean;
  canManageSession: boolean;
  canViewSource: boolean;
  canManageSource: boolean;
  canReviewAssertion: boolean;
  canViewExecutiveCommand: boolean;
};

export function eecPermissionAllowed(keys: readonly PermissionKey[]): EecCapabilities {
  return {
    canViewEngagement: keys.includes("engagement.view"),
    canCreateEngagement: keys.includes("engagement.create"),
    canUpdateEngagement: keys.includes("engagement.update"),
    canConvertEngagement: keys.includes("engagement.convert"),
    canViewSession: keys.includes("discovery.session.view"),
    canManageSession: keys.includes("discovery.session.manage"),
    canViewSource: keys.includes("discovery.source.view"),
    canManageSource: keys.includes("discovery.source.manage"),
    canReviewAssertion: keys.includes("discovery.assertion.review"),
    canViewExecutiveCommand: keys.includes("executiveCommand.view"),
  };
}

export type DiscoveryWorkspace = {
  opportunity: EngagementOpportunity;
  engagement: DiscoveryEngagement;
  participants: DiscoveryParticipant[];
  consents: DiscoveryConsentRecord[];
  sessions: InterviewSession[];
  artefacts: SourceArtefact[];
  segments: SourceSegment[];
  assertions: CandidateAssertion[];
  conflicts: AssertionConflict[];
  assessments: CoverageAssessment[];
  completeness: ReturnType<typeof completenessDimensions>;
  nextAction: string;
  capabilities: EecCapabilities;
};

export function buildDiscoveryWorkspace(input: {
  opportunity: EngagementOpportunity;
  engagement: DiscoveryEngagement;
  participants: DiscoveryParticipant[];
  consents: DiscoveryConsentRecord[];
  sessions: InterviewSession[];
  artefacts: SourceArtefact[];
  segments: SourceSegment[];
  assertions: CandidateAssertion[];
  conflicts: AssertionConflict[];
  assessments: CoverageAssessment[];
  capabilities: EecCapabilities;
  redactSensitive: boolean;
}): DiscoveryWorkspace {
  const assessments = input.assessments;
  const assertions = input.redactSensitive
    ? input.assertions.map((item) =>
        item.sensitivity === "STANDARD"
          ? item
          : { ...item, narrative: "Restricted", rationale: "Restricted", structuredValue: { redacted: true } },
      )
    : input.assertions;
  const segments = input.capabilities.canViewSource
    ? input.segments
    : input.segments.map((item) => ({ ...item, text: "Source text is not available in this projection." }));
  const nextGap = [...assessments].sort((left, right) => Number(right.rankScore) - Number(left.rankScore))[0];
  return {
    opportunity: input.opportunity,
    engagement: input.engagement,
    participants: input.participants,
    consents: input.consents,
    sessions: input.sessions,
    artefacts: input.artefacts,
    segments,
    assertions,
    conflicts: input.conflicts,
    assessments,
    completeness: completenessDimensions(assessments.map((item) => item.state)),
    nextAction: nextGap && Number(nextGap.rankScore) > 0
      ? `Review ${nextGap.topicKey.replaceAll(".", " ")}`
      : "Record the next useful note or close this session",
    capabilities: input.capabilities,
  };
}
