/**
 * Canonical Event OS System Health programme posture copy.
 * Gate 1 must not be marked accepted here.
 */
export const EVENT_OS_PROGRAMME_POSTURE = {
  eosS06: "EOS-S06 ACCEPTED (MD-PR-S077)",
  eosS06A: "EOS-S06A ACCEPTED (MD-PR-S079)",
  gate1: "EOS-S06 Gate 1: qualification awaiting independent verification and AI CTO acceptance",
  eosS06B: "EOS-S06B NOT_STARTED / NOT_AUTHORISED",
  eosS07: "EOS-S07 NOT_STARTED / NOT_AUTHORISED",
  productionAuthorised: false,
} as const;

export function formatProgrammePostureLine(): string {
  return [
    EVENT_OS_PROGRAMME_POSTURE.eosS06,
    EVENT_OS_PROGRAMME_POSTURE.eosS06A,
    EVENT_OS_PROGRAMME_POSTURE.gate1,
    EVENT_OS_PROGRAMME_POSTURE.eosS06B,
    EVENT_OS_PROGRAMME_POSTURE.eosS07,
    `productionAuthorised ${String(EVENT_OS_PROGRAMME_POSTURE.productionAuthorised)}`,
  ].join(" · ");
}

export const CAP600_QUALIFICATION_EVIDENCE_COMMIT = "5561171261f3c193136a0b3be5dbd504a2ed8f70";
/** Populated when CAP1000 stretch evidence commit lands; null until then. */
export const CAP1000_STRETCH_EVIDENCE_COMMIT: string | null = null;

export const IDENTITY_FIELD_HELP = {
  applicationSha: "Commit identity of the deployed Event OS application bundle.",
  deploymentSourceSha: "Railway/source git identity associated with this deployment or rebuild.",
  documentationHead: "Authoritative governance/documentation tip declared via EVENT_OS_DOCS_HEAD.",
  cap600EvidenceCommit: "Gate 1 CAP600 qualification evidence commit (not an application SHA).",
  cap1000EvidenceCommit: "CAP1000 stretch qualification evidence commit (not an application SHA).",
  acceptanceControl: "Governance control accepting a milestone (e.g. MD-PR-S077, MD-PR-S079).",
} as const;
