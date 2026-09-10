import { authorize, type Person } from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";

export function protectionPermissions(person: Person, organisationId: string, eventId?: string) {
  const actorSnap = getRuntime().service.resolveActor(person.id);
  const scope = { organisationId, eventId };
  const allow = (permission: Parameters<typeof authorize>[0]["permission"]) => authorize({ actor: actorSnap, permission, scope }).allow;
  return {
    catalogueView: allow("risk.catalogue.view"),
    catalogueManage: allow("risk.catalogue.manage"),
    ruleApprove: allow("risk.rule.approve"),
    policyView: allow("risk.policy.view"),
    policyManage: allow("risk.policy.manage"),
    policyVerify: allow("risk.policy.verify"),
    eventView: allow("risk.event.view"),
    eventManage: allow("risk.event.manage"),
    eventDecide: allow("risk.event.decide"),
    vendorAssess: allow("risk.vendor.assess"),
    vendorDecide: allow("risk.vendor.decide"),
    clauseDraft: allow("risk.clause.draft"),
    clauseLegal: allow("risk.clause.legalReview"),
    continuityManage: allow("risk.continuity.manage"),
    continuityAuthorise: allow("risk.continuity.authorise"),
    incidentReport: allow("risk.incident.report"),
    incidentCommand: allow("risk.incident.command"),
    reserveRequest: allow("risk.reserve.request"),
    dossierView: allow("risk.dossier.view"),
    dossierApprove: allow("risk.dossier.approve"),
    dossierPublish: allow("risk.dossier.publish"),
    auditView: allow("risk.audit.view"),
  };
}
