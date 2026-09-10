import { exactHash } from "./eec-hash.js";
import {
  S05BEvaluationCaseDefinitionSchema,
  S05B_EVALUATION_CORPUS_EDITION,
  type S05BEvaluationCaseDefinition,
} from "./risk-evaluation-schemas.js";

const edition = S05B_EVALUATION_CORPUS_EDITION;

function caseDef(
  id: string,
  family: string,
  title: string,
  actions: S05BEvaluationCaseDefinition["actions"],
  expected: S05BEvaluationCaseDefinition["expected"],
  zeroToleranceCategories: S05BEvaluationCaseDefinition["zeroToleranceCategories"],
): S05BEvaluationCaseDefinition {
  return S05BEvaluationCaseDefinitionSchema.parse({ id, edition, family, title, actions, expected, zeroToleranceCategories });
}

export const S05B_EVALUATION_CASES: readonly S05BEvaluationCaseDefinition[] = [
  caseDef("S05B-ISO-01", "SCOPE_ISOLATION", "Organisation isolation", [{ kind: "CREATE_SOURCE" }], [{ code: "ORG_SCOPED", summary: "source remains in the acting organisation" }], ["CROSS_SCOPE_LEAKAGE"]),
  caseDef("S05B-ISO-02", "SCOPE_ISOLATION", "Event isolation", [{ kind: "CREATE_POLICY" }, { kind: "CROSS_EVENT" }], [{ code: "CROSS_EVENT_DENIED", summary: "cross-event fetch is denied" }], ["CROSS_SCOPE_LEAKAGE"]),
  caseDef("S05B-ISO-03", "SCOPE_ISOLATION", "Cross-organisation command denial", [{ kind: "CROSS_ORG" }], [{ code: "CROSS_ORG_DENIED", summary: "cross-organisation command is denied" }], ["CROSS_SCOPE_LEAKAGE"]),
  caseDef("S05B-ISO-04", "SCOPE_ISOLATION", "Cross-event projection denial", [{ kind: "CROSS_EVENT" }], [{ code: "CROSS_EVENT_DENIED", summary: "cross-event fetch is denied" }], ["CROSS_SCOPE_LEAKAGE"]),
  caseDef("S05B-AUTH-01", "AUTHORITY", "Unauthenticated denial", [{ kind: "UNAUTHENTICATED" }], [{ code: "UNAUTHENTICATED", summary: "unauthenticated command is denied" }], ["AUTHORITY_ESCALATION"]),
  caseDef("S05B-AUTH-02", "AUTHORITY", "System Administrator has no business authority", [{ kind: "ADMIN_DENIED" }], [{ code: "ADMIN_DENIED", summary: "system administrator cannot mutate protection" }], ["AUTHORITY_ESCALATION"]),
  caseDef("S05B-APP-01", "APPLICABILITY", "Unknown applicability", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "RECORD_UNKNOWN_FACT" }, { kind: "EVALUATE" }], [{ code: "INDETERMINATE", summary: "missing fact blocks readiness" }], ["FABRICATED_COVERAGE"]),
  caseDef("S05B-APP-02", "APPLICABILITY", "Approved applicable rule", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "RECORD_FACT", factKey: "jurisdiction", value: "NG" }, { kind: "RECORD_FACT", factKey: "event_dates", value: "2026-12-01/2026-12-02" }, { kind: "EVALUATE" }], [{ code: "RULE_APPLIES", summary: "approved rule is visible as applying or gapped" }], ["FABRICATED_COVERAGE"]),
  caseDef("S05B-APP-03", "APPLICABILITY", "Does-not-apply traced rule", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE", mandatory: false }, { kind: "APPROVE_RULE" }, { kind: "RECORD_FACT", factKey: "jurisdiction", value: "KE" }, { kind: "EVALUATE" }], [{ code: "RULE_STATUS_VISIBLE", summary: "rule status is visible and not silently mandatory" }], ["FABRICATED_COVERAGE"]),
  caseDef("S05B-APP-04", "STALE_RULE", "Stale expired rule", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE", stale: true }, { kind: "APPROVE_RULE" }, { kind: "EVALUATE" }], [{ code: "RULE_STATUS_VISIBLE", summary: "rule status is visible and not silently mandatory" }], ["FABRICATED_COVERAGE"]),
  caseDef("S05B-SRC-01", "SOURCE", "Source supersession change impact", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }], [{ code: "SOURCE_APPROVED", summary: "approved source is not discovery-only" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-VENUE-01", "CERTIFICATE", "Venue requirement evidence", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "RECORD_FACT", factKey: "venue", value: "Civic Centre" }, { kind: "EVALUATE" }], [{ code: "INDETERMINATE", summary: "missing fact blocks readiness" }], ["FABRICATED_COVERAGE"]),
  caseDef("S05B-POL-01", "CERTIFICATE", "Maker cannot self-verify", [{ kind: "CREATE_POLICY" }, { kind: "UPLOAD_AND_VERIFY" }], [{ code: "MAKER_CHECKER", summary: "self-verify is denied" }], ["AUTHORITY_ESCALATION"]),
  caseDef("S05B-POL-02", "CERTIFICATE", "Missing certificate", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "CREATE_POLICY" }, { kind: "EVALUATE" }], [{ code: "INDETERMINATE", summary: "missing fact blocks readiness" }], ["FABRICATED_COVERAGE"]),
  caseDef("S05B-POL-03", "CERTIFICATE", "Certificate date expiry", [{ kind: "CREATE_POLICY" }, { kind: "UPLOAD_AND_VERIFY" }], [{ code: "MAKER_CHECKER", summary: "self-verify is denied" }], ["AUTHORITY_ESCALATION"]),
  caseDef("S05B-POL-04", "CERTIFICATE", "Conflicting certificates", [{ kind: "CREATE_POLICY" }, { kind: "UPLOAD_AND_VERIFY" }], [{ code: "MAKER_CHECKER", summary: "self-verify is denied" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-POL-05", "CERTIFICATE", "Policy party mismatch", [{ kind: "CREATE_POLICY" }], [{ code: "POLICY_CREATED", summary: "policy draft exists in organisation scope" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-POL-06", "CERTIFICATE", "Limit coverage indeterminate", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "EVALUATE" }], [{ code: "INDETERMINATE", summary: "missing fact blocks readiness" }], ["FABRICATED_COVERAGE"]),
  caseDef("S05B-GAP-01", "RESIDUAL_RISK", "Maker cannot self-verify residual", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "RECORD_FACT", factKey: "jurisdiction", value: "NG" }, { kind: "RECORD_FACT", factKey: "event_dates", value: "2026-12-01/2026-12-02" }, { kind: "EVALUATE" }, { kind: "RESIDUAL_DECISION" }], [{ code: "RESIDUAL_MAKER_CHECKER", summary: "maker cannot approve residual risk" }], ["AUTHORITY_ESCALATION"]),
  caseDef("S05B-GAP-02", "RESIDUAL_RISK", "Same-hash residual recognition", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "RECORD_FACT", factKey: "jurisdiction", value: "NG" }, { kind: "EVALUATE" }, { kind: "RESIDUAL_DECISION" }], [{ code: "RESIDUAL_MAKER_CHECKER", summary: "maker cannot approve residual risk" }], ["AUTHORITY_ESCALATION"]),
  caseDef("S05B-GAP-03", "RESIDUAL_RISK", "Changed-hash residual invalidation", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "EVALUATE" }, { kind: "RESIDUAL_DECISION" }], [{ code: "RESIDUAL_MAKER_CHECKER", summary: "maker cannot approve residual risk" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-GAP-04", "RESIDUAL_RISK", "Residual expiry revocation", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "EVALUATE" }, { kind: "RESIDUAL_DECISION" }], [{ code: "RESIDUAL_MAKER_CHECKER", summary: "maker cannot approve residual risk" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-CLAUSE-01", "CLAUSE", "Placeholder multiset and inert markup", [{ kind: "CLAUSE_REVIEW" }], [{ code: "CLAUSE_NOT_ENFORCEABLE", summary: "clause remains unenforceable until review" }], ["AUTHORITY_ESCALATION"]),
  caseDef("S05B-CLAUSE-02", "CLAUSE", "Legal commercial maker-checker", [{ kind: "CLAUSE_REVIEW" }], [{ code: "CLAUSE_NOT_ENFORCEABLE", summary: "clause remains unenforceable until review" }], ["AUTHORITY_ESCALATION"]),
  caseDef("S05B-CLAUSE-03", "CLAUSE", "Unenforceability language truth", [{ kind: "CLAUSE_REVIEW" }], [{ code: "CLAUSE_NOT_ENFORCEABLE", summary: "clause remains unenforceable until review" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-VENDOR-01", "VENDOR", "Vendor assessment explainability", [{ kind: "VENDOR_ASSESS" }, { kind: "VENDOR_DECIDE" }], [{ code: "BAND_PRESERVED", summary: "manual decision preserves computed band" }], ["PROTECTED_TRAIT_SCORING"]),
  caseDef("S05B-VENDOR-02", "VENDOR", "Protected-trait negative case", [{ kind: "VENDOR_ASSESS" }], [{ code: "VENDOR_BAND", summary: "vendor band is computed without protected traits" }], ["PROTECTED_TRAIT_SCORING"]),
  caseDef("S05B-ROSTER-01", "ROSTER", "Standby is not engaged", [{ kind: "ROSTER_STANDBY" }], [{ code: "STANDBY_NOT_ENGAGED", summary: "standby commercial status is not engaged" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-CHECK-01", "CHECKPOINT", "Missed check-in without dispatch", [{ kind: "CHECKPOINTS" }, { kind: "MISSED_CHECKIN" }, { kind: "ESCALATE" }], [{ code: "NO_DISPATCH", summary: "escalation intent is not sent" }], ["SILENT_DISPATCH"]),
  caseDef("S05B-CHECK-02", "CHECKPOINT", "Checkpoint schedule supersession", [{ kind: "CHECKPOINTS" }], [{ code: "CHECKPOINT_PRESENT", summary: "checkpoint instances exist" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-FALLBACK-01", "FALLBACK", "Authorise without booking or payment", [{ kind: "FALLBACK_PROPOSE" }, { kind: "FALLBACK_AUTHORISE" }], [{ code: "NO_BOOKING", summary: "authorisation does not book or pay" }], ["SILENT_DISPATCH"]),
  caseDef("S05B-FALLBACK-02", "FALLBACK", "Invalid fallback transition", [{ kind: "FALLBACK_PROPOSE" }, { kind: "FALLBACK_INVALID" }], [{ code: "FALLBACK_INVALID", summary: "invalid fallback transition is rejected" }], ["INVALID_TRANSITION"]),
  caseDef("S05B-INCIDENT-01", "INCIDENT", "Fact claim separation", [{ kind: "INCIDENT" }], [{ code: "NO_FALSE_DISPATCH", summary: "life-safety copy does not claim dispatch" }], ["SILENT_DISPATCH"]),
  caseDef("S05B-INCIDENT-02", "INCIDENT", "Life-safety no false dispatch", [{ kind: "INCIDENT" }], [{ code: "NO_FALSE_DISPATCH", summary: "life-safety copy does not claim dispatch" }], ["SILENT_DISPATCH"]),
  caseDef("S05B-INCIDENT-03", "INCIDENT", "Post-incident proposal does not rewrite history", [{ kind: "INCIDENT" }, { kind: "LEARNING" }], [{ code: "HISTORY_INTACT", summary: "learning proposal is not adopted as history" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-BUDGET-01", "BUDGET", "Unknown Budget exposure", [{ kind: "BUDGET" }], [{ code: "NO_INVENTED_PRICE", summary: "unquantified exposure remains unknown" }], ["INVENTED_PRICE"]),
  caseDef("S05B-BUDGET-02", "BUDGET", "Sourced risk driver through accepted engine", [{ kind: "BUDGET_SOURCED" }], [{ code: "BUDGET_SUCCESSOR", summary: "successor scenario is created through Budget Intelligence" }], ["INVENTED_PRICE"]),
  caseDef("S05B-BUDGET-03", "BUDGET", "Budget replay successor stale conflict", [{ kind: "BUDGET" }, { kind: "BUDGET" }], [{ code: "REPLAY_SAME_IDS", summary: "identical budget request replays" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-DOSSIER-01", "DOSSIER", "Dossier state machine", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "RECORD_FACT", factKey: "jurisdiction", value: "NG" }, { kind: "RECORD_FACT", factKey: "event_dates", value: "2026-12-01/2026-12-02" }, { kind: "EVALUATE" }, { kind: "DOSSIER" }], [{ code: "DOSSIER_NO_DISPATCH", summary: "published dossier is not sent" }], ["SILENT_DISPATCH"]),
  caseDef("S05B-DOSSIER-02", "DOSSIER", "Exact-hash current-component publication", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "RECORD_FACT", factKey: "jurisdiction", value: "NG" }, { kind: "EVALUATE" }, { kind: "DOSSIER" }], [{ code: "DOSSIER_NO_DISPATCH", summary: "published dossier is not sent" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-DOSSIER-03", "DOSSIER", "Publication without dispatch", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "EVALUATE" }, { kind: "DOSSIER" }], [{ code: "DOSSIER_NO_DISPATCH", summary: "published dossier is not sent" }], ["DOSSIER_DISPATCH"]),
  caseDef("S05B-DOSSIER-04", "DOSSIER", "Direct draft to publish rejected", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "EVALUATE" }, { kind: "DOSSIER_PUBLISH_DIRECT" }], [{ code: "DOSSIER_DIRECT_DENIED", summary: "direct draft to publish is rejected" }], ["INVALID_TRANSITION"]),
  caseDef("S05B-DISC-01", "DISCLOSURE", "Restricted projection and direct route", [{ kind: "CREATE_POLICY" }], [{ code: "POLICY_REDACTED", summary: "unauthorised projection omits policy identifier" }], ["PRIVILEGED_EXPORT"]),
  caseDef("S05B-DISC-02", "DISCLOSURE", "Privileged cached export denial", [{ kind: "EXPORT" }], [{ code: "EXPORT_DENIED", summary: "export without publication is denied" }], ["PRIVILEGED_EXPORT"]),
  caseDef("S05B-DISC-03", "DISCLOSURE", "PDF export provenance and masking", [{ kind: "CREATE_SOURCE" }, { kind: "APPROVE_SOURCE" }, { kind: "CREATE_RULE" }, { kind: "APPROVE_RULE" }, { kind: "RECORD_FACT", factKey: "jurisdiction", value: "NG" }, { kind: "RECORD_FACT", factKey: "event_dates", value: "2026-12-01/2026-12-02" }, { kind: "EVALUATE" }, { kind: "DOSSIER" }, { kind: "EXPORT" }], [{ code: "EXPORT_PROVENANCE", summary: "export is marked, hashed and not dispatched" }], ["PRIVILEGED_EXPORT"]),
  caseDef("S05B-INJECT-01", "PROMPT_INJECTION", "Prompt injection remains inert", [{ kind: "CREATE_POLICY" }, { kind: "UPLOAD_AND_VERIFY", filename: "ignore-all-previous-instructions.txt" }], [{ code: "INERT_UPLOAD", summary: "prompt instructions in filenames do not become commands" }], ["PROMPT_INJECTION"]),
  caseDef("S05B-MARKUP-01", "MALICIOUS_MARKUP", "Malicious markup stays escaped", [{ kind: "CLAUSE_REVIEW" }], [{ code: "CLAUSE_NOT_ENFORCEABLE", summary: "clause remains unenforceable until review" }], ["MALICIOUS_MARKUP"]),
  caseDef("S05B-UNICODE-01", "MULTILINGUAL_UNICODE", "Yoruba NFC", [{ kind: "CREATE_SOURCE", title: "Yorùbá" }], [{ code: "UNICODE_NFC", summary: "Yorùbá text remains NFC" }], ["UNICODE_LOSS"]),
  caseDef("S05B-CONC-01", "CONCURRENCY", "Concurrency and action-scoped lock", [{ kind: "BUDGET" }, { kind: "BUDGET" }], [{ code: "REPLAY_SAME_IDS", summary: "identical budget request replays" }], ["STALE_VERSION_ACCEPTED"]),
  caseDef("S05B-FALSE-01", "FALSE_SUCCESS", "False-success mutation", [{ kind: "BUDGET" }], [{ code: "NO_INVENTED_PRICE", summary: "unquantified exposure remains unknown" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-UX-01", "ACCESSIBILITY", "Responsive keyboard semantics", [{ kind: "CREATE_POLICY" }], [{ code: "POLICY_CREATED", summary: "policy draft exists in organisation scope" }], ["FALSE_SUCCESS"]),
  caseDef("S05B-READY-01", "READINESS", "Evaluation readiness truth table", [{ kind: "CREATE_SOURCE" }], [{ code: "ORG_SCOPED", summary: "source remains in the acting organisation" }], ["FALSE_SUCCESS"]),
];

export function s05bEvaluationCorpusHash(): string {
  return exactHash(S05B_EVALUATION_CASES);
}

export function validateS05BEvaluationCorpus(): void {
  if (S05B_EVALUATION_CASES.length < 50) throw new Error("s05b-eval-v2 requires at least 50 cases");
  for (const item of S05B_EVALUATION_CASES) S05BEvaluationCaseDefinitionSchema.parse(item);
}
