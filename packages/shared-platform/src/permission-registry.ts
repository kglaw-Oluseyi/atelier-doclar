import { PERMISSION_KEYS, SYSTEM_ROLE_KEYS } from "./constants.js";
import { permissionsForRole } from "./catalog.js";
import type { PermissionKey, SystemRoleKey } from "./schemas.js";

export const PERMISSION_EFFECTS = [
  "READ",
  "CREATE",
  "UPDATE",
  "OPERATE",
  "SUBMIT",
  "REVIEW",
  "APPROVE",
  "PUBLISH",
  "EXPORT_REQUEST",
  "EXPORT_SETTLE",
  "ACCESS_ADMIN",
  "TECHNICAL_ADMIN",
  "PRODUCTION_RELEASE",
  "EXTERNAL_EFFECT",
  "IMPERSONATE",
] as const;

export const PERMISSION_SCOPE_CATEGORIES = [
  "ORGANISATION",
  "CLIENT",
  "EVENT",
  "DEPARTMENT",
  "SELF",
  "TECHNICAL_SERVICE",
] as const;

export type PermissionEffect = (typeof PERMISSION_EFFECTS)[number];
export type PermissionScopeCategory = (typeof PERMISSION_SCOPE_CATEGORIES)[number];

/**
 * Department Lead cannot be operational. Assignment, Event and work records have
 * no department or workstream identifier, so event scope must not be treated as
 * department isolation.
 */
export const DEPARTMENT_SCOPE_BLOCKER = {
  missingFields: ["Assignment.departmentId", "EventRecord.departmentId", "workstreamId"],
  effect: "New Department Lead assignments are rejected. Existing grants authorise nothing.",
} as const;

export interface PermissionRegistryEntry {
  description: string;
  effect: PermissionEffect;
  requiredScope: PermissionScopeCategory;
  mutates: boolean;
  externalEffect: boolean;
  ceoReserved: boolean;
  technicalOnly: boolean;
  makerChecker: boolean;
}

export const PERMISSION_REGISTRY: Record<PermissionKey, PermissionRegistryEntry> = {
  "organisation.view": { description: "organisation view", effect: "READ", requiredScope: "ORGANISATION", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "organisation.manage": { description: "organisation manage", effect: "UPDATE", requiredScope: "ORGANISATION", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: false },
  "client.list": { description: "client list", effect: "READ", requiredScope: "ORGANISATION", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "client.view": { description: "client view", effect: "READ", requiredScope: "CLIENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "client.create": { description: "client create", effect: "CREATE", requiredScope: "ORGANISATION", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "client.update": { description: "client update", effect: "UPDATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "client.archive": { description: "client archive", effect: "OPERATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: false },
  "event.list": { description: "event list", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "event.view": { description: "event view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "event.create": { description: "event create", effect: "CREATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "event.update": { description: "event update", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "event.phase.transition": { description: "event phase transition", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "event.archive": { description: "event archive", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: false },
  "assignment.view": { description: "assignment view", effect: "READ", requiredScope: "ORGANISATION", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "assignment.manage": { description: "assignment manage", effect: "ACCESS_ADMIN", requiredScope: "ORGANISATION", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: true, makerChecker: false },
  "role.view": { description: "role view", effect: "READ", requiredScope: "ORGANISATION", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "role.manage": { description: "role manage", effect: "ACCESS_ADMIN", requiredScope: "ORGANISATION", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: true, makerChecker: false },
  "audit.view": { description: "audit view", effect: "READ", requiredScope: "ORGANISATION", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "audit.export": { description: "audit export", effect: "EXPORT_REQUEST", requiredScope: "ORGANISATION", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "platform.access.administer": { description: "platform access administer", effect: "TECHNICAL_ADMIN", requiredScope: "TECHNICAL_SERVICE", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: true, makerChecker: false },
  "platform.audit.read_all": { description: "platform audit read_all", effect: "READ", requiredScope: "TECHNICAL_SERVICE", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: true, makerChecker: false },
  "platform.audit.read_operational": { description: "platform audit read_operational", effect: "READ", requiredScope: "TECHNICAL_SERVICE", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: true, makerChecker: false },
  "system.health.view": { description: "system health view", effect: "READ", requiredScope: "TECHNICAL_SERVICE", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: true, makerChecker: false },
  "support.impersonate": { description: "support impersonate", effect: "IMPERSONATE", requiredScope: "ORGANISATION", mutates: true, externalEffect: true, ceoReserved: false, technicalOnly: true, makerChecker: false },
  "mef.view": { description: "mef view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "mef.update": { description: "mef update", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "consent.view": { description: "consent view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "consent.record": { description: "consent record", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.reference.view": { description: "guest reference view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.reference.register": { description: "guest reference register", effect: "CREATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.directory.view": { description: "guest directory view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.intake.create": { description: "guest intake create", effect: "CREATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.intake.approve": { description: "guest intake approve", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "guest.intake.cancel": { description: "guest intake cancel", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.intake.export": { description: "guest intake export", effect: "EXPORT_REQUEST", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.record.amend": { description: "guest record amend", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.duplicate.resolve": { description: "guest duplicate resolve", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.person.link": { description: "guest person link", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.addressing.view": { description: "guest addressing view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.addressing.manage": { description: "guest addressing manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.addressing.confirm": { description: "guest addressing confirm", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.relationship.view": { description: "guest relationship view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.relationship.manage": { description: "guest relationship manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.entitlement.view": { description: "guest entitlement view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.entitlement.manage": { description: "guest entitlement manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.entitlement.exception.review": { description: "guest entitlement exception review", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "guest.child.view": { description: "guest child view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.child.manage": { description: "guest child manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "guest.protocolNote.view": { description: "guest protocolNote view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "rsvp.policy.manage": { description: "rsvp policy manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "rsvp.form.manage": { description: "rsvp form manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "rsvp.invitation.manage": { description: "rsvp invitation manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "rsvp.directory.view": { description: "rsvp directory view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "rsvp.response.amend": { description: "rsvp response amend", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "rsvp.exception.review": { description: "rsvp exception review", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "rsvp.entitlement.manage": { description: "rsvp entitlement manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "msg.policy.manage": { description: "msg policy manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "msg.template.manage": { description: "msg template manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "msg.template.publish": { description: "msg template publish", effect: "PUBLISH", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "msg.audience.manage": { description: "msg audience manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "msg.campaign.manage": { description: "msg campaign manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "msg.campaign.approve": { description: "msg campaign approve", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "msg.campaign.run": { description: "msg campaign run", effect: "EXTERNAL_EFFECT", requiredScope: "EVENT", mutates: true, externalEffect: true, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "msg.inbox.view": { description: "msg inbox view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "msg.inbox.respond": { description: "msg inbox respond", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "msg.inbox.assign": { description: "msg inbox assign", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "msg.inbound.unmatched.resolve": { description: "msg inbound unmatched resolve", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "msg.task.manage": { description: "msg task manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "msg.contactCorrection.review": { description: "msg contactCorrection review", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "msg.analytics.view": { description: "msg analytics view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "programme.view": { description: "programme view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "programme.phase.manage": { description: "programme phase manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "programme.route.manage": { description: "programme route manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "programme.checkpoint.manage": { description: "programme checkpoint manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "programme.entitlement.manage": { description: "programme entitlement manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "programme.protectedAccess.grant": { description: "programme protectedAccess grant", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "programme.vehicle.manage": { description: "programme vehicle manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "programme.accessPlan.publish": { description: "programme accessPlan publish", effect: "PUBLISH", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "programme.exception.review": { description: "programme exception review", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "merch.collection.view": { description: "merch collection view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.collection.manage": { description: "merch collection manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.offer.view": { description: "merch offer view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.offer.manage": { description: "merch offer manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.offer.sponsor": { description: "merch offer sponsor", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.participation.view": { description: "merch participation view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.participation.manage": { description: "merch participation manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.capMeasurement.view": { description: "merch capMeasurement view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.capMeasurement.manage": { description: "merch capMeasurement manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.fulfilment.view": { description: "merch fulfilment view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.fulfilment.manage": { description: "merch fulfilment manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.vendorAssignment.view": { description: "merch vendorAssignment view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.vendorAssignment.manage": { description: "merch vendorAssignment manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.exception.view": { description: "merch exception view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.exception.review": { description: "merch exception review", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "merch.report.view": { description: "merch report view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "merch.audit.view": { description: "merch audit view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "forecast.run": { description: "forecast run", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "forecast.detail.view": { description: "forecast detail view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "forecast.hostProjection.view": { description: "forecast hostProjection view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "forecast.override.propose": { description: "forecast override propose", effect: "SUBMIT", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "forecast.override.approve": { description: "forecast override approve", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "provision.propose": { description: "provision propose", effect: "SUBMIT", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "provision.approve": { description: "provision approve", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "model.parameters.manage": { description: "model parameters manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "model.evaluate": { description: "model evaluate", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "forecast.audit.view": { description: "forecast audit view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "atelier.view": { description: "atelier view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "atelier.manage": { description: "atelier manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "atelier.publish": { description: "atelier publish", effect: "PUBLISH", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "atelier.access.manage": { description: "atelier access manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "atelier.decision.publish": { description: "atelier decision publish", effect: "PUBLISH", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: true },
  "atelier.decision.review": { description: "atelier decision review", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "atelier.audit.view": { description: "atelier audit view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "language.preference.view": { description: "language preference view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "language.preference.manage": { description: "language preference manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "language.cultural.create": { description: "language cultural create", effect: "CREATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "language.cultural.review": { description: "language cultural review", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "language.cultural.approve": { description: "language cultural approve", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "language.translation.create": { description: "language translation create", effect: "CREATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "language.translation.review": { description: "language translation review", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "language.translation.approve": { description: "language translation approve", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "language.edition.manage": { description: "language edition manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "language.edition.publish": { description: "language edition publish", effect: "PUBLISH", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "language.assembly.preview": { description: "language assembly preview", effect: "CREATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "language.glossary.manage": { description: "language glossary manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "language.audit.view": { description: "language audit view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "venue.registry.view": { description: "venue registry view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "venue.record.create": { description: "venue record create", effect: "CREATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "venue.record.update": { description: "venue record update", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "venue.fact.record": { description: "venue fact record", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "venue.fact.verify": { description: "venue fact verify", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "venue.adopt": { description: "venue adopt", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "venue.event.override": { description: "venue event override", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "layout.view": { description: "layout view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "layout.create": { description: "layout create", effect: "CREATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "layout.update": { description: "layout update", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "layout.lease.acquire": { description: "layout lease acquire", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "layout.constraint.override": { description: "layout constraint override", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "layout.asset.manage": { description: "layout asset manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "layout.capacity.record": { description: "layout capacity record", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "layout.validation.run": { description: "layout validation run", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "layout.snapshot.manage": { description: "layout snapshot manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "layout.approval.submit": { description: "layout approval submit", effect: "SUBMIT", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "layout.approval.decide": { description: "layout approval decide", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "layout.publish": { description: "layout publish", effect: "PUBLISH", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "layout.publication.view": { description: "layout publication view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "layout.downstream.read": { description: "layout downstream read", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "engagement.view": { description: "engagement view", effect: "READ", requiredScope: "CLIENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "engagement.create": { description: "engagement create", effect: "CREATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "engagement.update": { description: "engagement update", effect: "UPDATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "engagement.convert": { description: "engagement convert", effect: "OPERATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "discovery.session.view": { description: "discovery session view", effect: "READ", requiredScope: "CLIENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "discovery.session.manage": { description: "discovery session manage", effect: "UPDATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "discovery.source.view": { description: "discovery source view", effect: "READ", requiredScope: "CLIENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "discovery.source.manage": { description: "discovery source manage", effect: "UPDATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "discovery.assertion.review": { description: "discovery assertion review", effect: "REVIEW", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "discovery.confidential.reveal": { description: "discovery confidential reveal", effect: "OPERATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "discovery.confidential.grant": { description: "discovery confidential grant", effect: "OPERATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "brief.view": { description: "brief view", effect: "READ", requiredScope: "CLIENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "brief.author": { description: "brief author", effect: "CREATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "brief.submit": { description: "brief submit", effect: "SUBMIT", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "brief.decide": { description: "brief decide", effect: "APPROVE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "brief.publish": { description: "brief publish", effect: "PUBLISH", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: true },
  "investment.view": { description: "investment view", effect: "READ", requiredScope: "CLIENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "investment.author": { description: "investment author", effect: "CREATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "investment.recommend": { description: "investment recommend", effect: "SUBMIT", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "investment.decide": { description: "investment decide", effect: "APPROVE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: true },
  "budget.catalogue.view": { description: "budget catalogue view", effect: "READ", requiredScope: "CLIENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "budget.catalogue.manage": { description: "budget catalogue manage", effect: "UPDATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "budget.calculate": { description: "budget calculate", effect: "OPERATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "budget.scenario.author": { description: "budget scenario author", effect: "CREATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "budget.recommend": { description: "budget recommend", effect: "SUBMIT", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "budget.decide": { description: "budget decide", effect: "APPROVE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: true },
  "roadmap.view": { description: "roadmap view", effect: "READ", requiredScope: "CLIENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "roadmap.author": { description: "roadmap author", effect: "CREATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "roadmap.rebaseline": { description: "roadmap rebaseline", effect: "OPERATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "roadmap.decide": { description: "roadmap decide", effect: "APPROVE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: true },
  "change.view": { description: "change view", effect: "READ", requiredScope: "CLIENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "change.triage": { description: "change triage", effect: "REVIEW", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "change.decide": { description: "change decide", effect: "APPROVE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: true },
  "change.propagate": { description: "change propagate", effect: "OPERATE", requiredScope: "CLIENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "executiveCommand.view": { description: "executiveCommand view", effect: "READ", requiredScope: "ORGANISATION", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "executiveCommand.evaluate": { description: "executiveCommand evaluate", effect: "OPERATE", requiredScope: "ORGANISATION", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: false },
  "risk.catalogue.view": { description: "risk catalogue view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.catalogue.manage": { description: "risk catalogue manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.rule.review": { description: "risk rule review", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "risk.rule.approve": { description: "risk rule approve", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "risk.policy.view": { description: "risk policy view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.policy.manage": { description: "risk policy manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.policy.verify": { description: "risk policy verify", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "risk.event.view": { description: "risk event view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.event.manage": { description: "risk event manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.event.decide": { description: "risk event decide", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "risk.vendor.view": { description: "risk vendor view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.vendor.assess": { description: "risk vendor assess", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.vendor.decide": { description: "risk vendor decide", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "risk.clause.view": { description: "risk clause view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.clause.draft": { description: "risk clause draft", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.clause.legalReview": { description: "risk clause legalReview", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.clause.commercialApprove": { description: "risk clause commercialApprove", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.continuity.view": { description: "risk continuity view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.continuity.manage": { description: "risk continuity manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.continuity.authorise": { description: "risk continuity authorise", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "risk.incident.view": { description: "risk incident view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.incident.report": { description: "risk incident report", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.incident.command": { description: "risk incident command", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.incident.close": { description: "risk incident close", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.reserve.request": { description: "risk reserve request", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.reserve.authorise": { description: "risk reserve authorise", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: true },
  "risk.dossier.view": { description: "risk dossier view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.dossier.assemble": { description: "risk dossier assemble", effect: "CREATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.dossier.submit": { description: "risk dossier submit", effect: "SUBMIT", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.dossier.approve": { description: "risk dossier approve", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "risk.dossier.publish": { description: "risk dossier publish", effect: "PUBLISH", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: true },
  "risk.dossier.export": { description: "risk dossier export", effect: "EXPORT_REQUEST", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.dossier.client_access.manage": { description: "risk dossier client_access manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.export": { description: "risk export", effect: "EXPORT_REQUEST", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "risk.audit.view": { description: "risk audit view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.view": { description: "seating view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.input.prepare": { description: "seating input prepare", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.constraint.manage": { description: "seating constraint manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.rule.activate": { description: "seating rule activate", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.constraint.review.protocol": { description: "seating constraint review protocol", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.constraint.review.accessibility": { description: "seating constraint review accessibility", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.constraint.review.security": { description: "seating constraint review security", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.reservation.manage": { description: "seating reservation manage", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.run.execute": { description: "seating run execute", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.plan.edit": { description: "seating plan edit", effect: "UPDATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.plan.submit": { description: "seating plan submit", effect: "SUBMIT", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.plan.review.protocol": { description: "seating plan review protocol", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "seating.plan.review.accessibility": { description: "seating plan review accessibility", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "seating.plan.review.security": { description: "seating plan review security", effect: "REVIEW", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "seating.plan.approve": { description: "seating plan approve", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "seating.plan.publish": { description: "seating plan publish", effect: "PUBLISH", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: true },
  "seating.export": { description: "seating export", effect: "EXPORT_REQUEST", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "seating.evaluate": { description: "seating evaluate", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: true, technicalOnly: false, makerChecker: false },
  "seating.fixture_verify_as": { description: "seating fixture_verify_as", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "atelierCommand.view": { description: "atelierCommand view", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "atelierCommand.instruct": { description: "atelierCommand instruct", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "atelierCommand.execute": { description: "atelierCommand execute", effect: "OPERATE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "atelierCommand.approve": { description: "atelierCommand approve", effect: "APPROVE", requiredScope: "EVENT", mutates: true, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: true },
  "atelierCommand.browser": { description: "atelierCommand browser", effect: "EXTERNAL_EFFECT", requiredScope: "EVENT", mutates: true, externalEffect: true, ceoReserved: false, technicalOnly: false, makerChecker: false },
  "atelierCommand.audit": { description: "atelierCommand audit", effect: "READ", requiredScope: "EVENT", mutates: false, externalEffect: false, ceoReserved: false, technicalOnly: false, makerChecker: false },
};

export interface PermissionPolicy extends PermissionRegistryEntry {
  key: PermissionKey;
  permittedRoles: readonly SystemRoleKey[];
}

const ROLE_GRANT_INDEX = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, [] as SystemRoleKey[]])) as Record<
  PermissionKey,
  SystemRoleKey[]
>;

for (const role of SYSTEM_ROLE_KEYS) {
  for (const key of permissionsForRole(role)) {
    ROLE_GRANT_INDEX[key].push(role);
  }
}

export function permissionPolicy(key: PermissionKey): PermissionPolicy {
  const entry = PERMISSION_REGISTRY[key];
  if (!entry) {
    throw new Error(`unclassified permission ${key}`);
  }
  return { key, ...entry, permittedRoles: ROLE_GRANT_INDEX[key] ?? [] };
}

export function registryKeys(): PermissionKey[] {
  return Object.keys(PERMISSION_REGISTRY) as PermissionKey[];
}

export function assertPermissionRegistryComplete(): {
  total: number;
  classified: number;
  unclassified: string[];
  duplicates: string[];
  unknown: string[];
} {
  const source = [...PERMISSION_KEYS];
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const key of source) {
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }
  const registered = registryKeys();
  const unclassified = source.filter((key) => !PERMISSION_REGISTRY[key]);
  const unknown = registered.filter((key) => !seen.has(key));
  if (unclassified.length || unknown.length || duplicates.length || registered.length !== source.length) {
    throw new Error(
      `permission registry incomplete missing=${unclassified.join(",")} unknown=${unknown.join(",")} duplicates=${duplicates.join(",")}`,
    );
  }
  for (const key of source) {
    const policy = permissionPolicy(key);
    if (!policy.effect || !policy.requiredScope || policy.permittedRoles === undefined) {
      throw new Error(`incomplete metadata ${key}`);
    }
    if (policy.effect === "READ" && (policy.mutates || policy.externalEffect)) {
      throw new Error(`read permission cannot mutate ${key}`);
    }
    if (policy.effect === "IMPERSONATE" && policy.permittedRoles.includes("CEO")) {
      throw new Error("impersonation must not be inherited by CEO");
    }
  }
  const auditor = permissionsForRole("READ_ONLY_AUDITOR");
  for (const key of auditor) {
    const policy = permissionPolicy(key);
    if (policy.effect !== "READ" || policy.mutates || policy.externalEffect) {
      throw new Error(`auditor mutation permission ${key}`);
    }
  }
  const admin = permissionsForRole("SYSTEM_ADMINISTRATOR");
  for (const key of admin) {
    const policy = permissionPolicy(key);
    if (policy.effect === "APPROVE" || policy.effect === "PUBLISH" || policy.effect === "PRODUCTION_RELEASE") {
      throw new Error(`system administrator business decision ${key}`);
    }
    if (!policy.technicalOnly && policy.effect !== "READ") {
      throw new Error(`system administrator business authority ${key}`);
    }
  }
  for (const key of source) {
    const policy = permissionPolicy(key);
    const business = !policy.technicalOnly && key !== "support.impersonate";
    if (business && !policy.permittedRoles.includes("CEO")) {
      throw new Error(`CEO missing business permission ${key}`);
    }
    if (key === "support.impersonate" && policy.permittedRoles.includes("CEO")) {
      throw new Error("CEO must not receive support.impersonate");
    }
  }
  return {
    total: source.length,
    classified: registered.length,
    unclassified,
    duplicates,
    unknown,
  };
}
