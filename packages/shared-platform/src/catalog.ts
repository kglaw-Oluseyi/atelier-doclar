import {
  BUSINESS_PERMISSIONS,
  PERMISSION_KEYS,
  S04A_SENSITIVE_PERMISSIONS,
  SCHEMA_VERSION,
  SYSTEM_ROLE_KEYS,
} from "./constants.js";
import type { Permission, PermissionKey, Role } from "./schemas.js";

const SEEDED_AT = "2026-09-05T14:00:00.000Z";

const PERMISSION_IDS: Record<PermissionKey, string> = {
  "organisation.view": "11111111-1111-4111-8111-111111111001",
  "organisation.manage": "11111111-1111-4111-8111-111111111002",
  "client.list": "11111111-1111-4111-8111-111111111003",
  "client.view": "11111111-1111-4111-8111-111111111004",
  "client.create": "11111111-1111-4111-8111-111111111005",
  "client.update": "11111111-1111-4111-8111-111111111006",
  "client.archive": "11111111-1111-4111-8111-111111111007",
  "event.list": "11111111-1111-4111-8111-111111111008",
  "event.view": "11111111-1111-4111-8111-111111111009",
  "event.create": "11111111-1111-4111-8111-111111111010",
  "event.update": "11111111-1111-4111-8111-111111111011",
  "event.phase.transition": "11111111-1111-4111-8111-111111111012",
  "event.archive": "11111111-1111-4111-8111-111111111013",
  "assignment.view": "11111111-1111-4111-8111-111111111014",
  "assignment.manage": "11111111-1111-4111-8111-111111111015",
  "role.view": "11111111-1111-4111-8111-111111111016",
  "role.manage": "11111111-1111-4111-8111-111111111017",
  "audit.view": "11111111-1111-4111-8111-111111111018",
  "audit.export": "11111111-1111-4111-8111-111111111019",
  "system.health.view": "11111111-1111-4111-8111-111111111020",
  "support.impersonate": "11111111-1111-4111-8111-111111111021",
  "mef.view": "11111111-1111-4111-8111-111111111022",
  "mef.update": "11111111-1111-4111-8111-111111111023",
  "consent.view": "11111111-1111-4111-8111-111111111024",
  "consent.record": "11111111-1111-4111-8111-111111111025",
  "guest.reference.view": "11111111-1111-4111-8111-111111111026",
  "guest.reference.register": "11111111-1111-4111-8111-111111111027",
  "guest.directory.view": "11111111-1111-4111-8111-111111111028",
  "guest.intake.create": "11111111-1111-4111-8111-111111111029",
  "guest.record.amend": "11111111-1111-4111-8111-111111111030",
  "guest.duplicate.resolve": "11111111-1111-4111-8111-111111111031",
  "guest.person.link": "11111111-1111-4111-8111-111111111032",
  "guest.addressing.view": "11111111-1111-4111-8111-111111111054",
  "guest.addressing.manage": "11111111-1111-4111-8111-111111111055",
  "guest.addressing.confirm": "11111111-1111-4111-8111-111111111056",
  "guest.relationship.view": "11111111-1111-4111-8111-111111111057",
  "guest.relationship.manage": "11111111-1111-4111-8111-111111111058",
  "guest.entitlement.view": "11111111-1111-4111-8111-111111111059",
  "guest.entitlement.manage": "11111111-1111-4111-8111-111111111060",
  "guest.entitlement.exception.review": "11111111-1111-4111-8111-111111111061",
  "guest.child.view": "11111111-1111-4111-8111-111111111062",
  "guest.child.manage": "11111111-1111-4111-8111-111111111063",
  "guest.protocolNote.view": "11111111-1111-4111-8111-111111111064",
  "rsvp.policy.manage": "11111111-1111-4111-8111-111111111033",
  "rsvp.form.manage": "11111111-1111-4111-8111-111111111034",
  "rsvp.invitation.manage": "11111111-1111-4111-8111-111111111035",
  "rsvp.directory.view": "11111111-1111-4111-8111-111111111036",
  "rsvp.response.amend": "11111111-1111-4111-8111-111111111037",
  "rsvp.exception.review": "11111111-1111-4111-8111-111111111038",
  "rsvp.entitlement.manage": "11111111-1111-4111-8111-111111111039",
  "msg.policy.manage": "11111111-1111-4111-8111-111111111040",
  "msg.template.manage": "11111111-1111-4111-8111-111111111041",
  "msg.template.publish": "11111111-1111-4111-8111-111111111042",
  "msg.audience.manage": "11111111-1111-4111-8111-111111111043",
  "msg.campaign.manage": "11111111-1111-4111-8111-111111111044",
  "msg.campaign.approve": "11111111-1111-4111-8111-111111111045",
  "msg.campaign.run": "11111111-1111-4111-8111-111111111046",
  "msg.inbox.view": "11111111-1111-4111-8111-111111111047",
  "msg.inbox.respond": "11111111-1111-4111-8111-111111111048",
  "msg.inbox.assign": "11111111-1111-4111-8111-111111111049",
  "msg.inbound.unmatched.resolve": "11111111-1111-4111-8111-111111111050",
  "msg.task.manage": "11111111-1111-4111-8111-111111111051",
  "msg.contactCorrection.review": "11111111-1111-4111-8111-111111111052",
  "msg.analytics.view": "11111111-1111-4111-8111-111111111053",
};

const ROLE_IDS: Record<(typeof SYSTEM_ROLE_KEYS)[number], string> = {
  CEO: "22222222-2222-4222-8222-222222222001",
  EVENT_DIRECTOR: "22222222-2222-4222-8222-222222222002",
  CLIENT_LEAD: "22222222-2222-4222-8222-222222222003",
  DEPARTMENT_LEAD: "22222222-2222-4222-8222-222222222004",
  PLANNER: "22222222-2222-4222-8222-222222222005",
  SYSTEM_ADMINISTRATOR: "22222222-2222-4222-8222-222222222006",
  READ_ONLY_AUDITOR: "22222222-2222-4222-8222-222222222007",
};

/**
 * EOS-S04A catalogue grants (contracts only; P03/P04/P06 must enforce server-side):
 * CEO — governed broad authority (all keys except support.impersonate).
 * Event Director — operational management, confirmation and exception review.
 * Planner — routine addressing, party, child and entitlement administration.
 *   Planner must not confirm protocol-sensitive addressing, review entitlement
 *   exceptions, or view restricted protocol notes.
 *   `guest.entitlement.manage` never authorises entitlement expansion; P03/P04
 *   must enforce EOS-S03 quantity authority server-side.
 * Client Lead / Department Lead — no EOS-S04A role in the ratified pack.
 * System Administrator — no business authority by default.
 * Gate/Security — no system role and no S04A mutation path.
 * Read-only Auditor — read-only minimum-necessary projection contract, including
 *   `guest.child.view`. This is not unrestricted child-record or household visibility.
 */
const ROLE_PERMISSIONS: Record<(typeof SYSTEM_ROLE_KEYS)[number], readonly PermissionKey[]> = {
  CEO: PERMISSION_KEYS.filter((key) => key !== "support.impersonate"),
  EVENT_DIRECTOR: [
    "organisation.view",
    "client.list",
    "client.view",
    "client.create",
    "client.update",
    "event.list",
    "event.view",
    "event.create",
    "event.update",
    "event.phase.transition",
    "assignment.view",
    "assignment.manage",
    "role.view",
    "audit.view",
    "mef.view",
    "mef.update",
    "consent.view",
    "consent.record",
    "guest.reference.view",
    "guest.reference.register",
    "guest.directory.view",
    "guest.intake.create",
    "guest.record.amend",
    "guest.duplicate.resolve",
    "guest.person.link",
    "guest.addressing.view",
    "guest.addressing.manage",
    "guest.addressing.confirm",
    "guest.relationship.view",
    "guest.relationship.manage",
    "guest.entitlement.view",
    "guest.entitlement.manage",
    "guest.entitlement.exception.review",
    "guest.child.view",
    "guest.child.manage",
    "guest.protocolNote.view",
    "rsvp.policy.manage",
    "rsvp.form.manage",
    "rsvp.invitation.manage",
    "rsvp.directory.view",
    "rsvp.response.amend",
    "rsvp.exception.review",
    "rsvp.entitlement.manage",
    "msg.policy.manage",
    "msg.template.manage",
    "msg.template.publish",
    "msg.audience.manage",
    "msg.campaign.manage",
    "msg.campaign.approve",
    "msg.campaign.run",
    "msg.inbox.view",
    "msg.inbox.respond",
    "msg.inbox.assign",
    "msg.inbound.unmatched.resolve",
    "msg.task.manage",
    "msg.contactCorrection.review",
    "msg.analytics.view",
  ],
  CLIENT_LEAD: [
    "organisation.view",
    "client.list",
    "client.view",
    "client.update",
    "event.list",
    "event.view",
    "event.update",
    "assignment.view",
    "audit.view",
    "mef.view",
    "guest.directory.view",
    "rsvp.directory.view",
    "msg.inbox.view",
    "msg.analytics.view",
  ],
  DEPARTMENT_LEAD: [
    "organisation.view",
    "client.view",
    "event.list",
    "event.view",
    "assignment.view",
    "mef.view",
    "guest.directory.view",
    "rsvp.directory.view",
    "msg.inbox.view",
    "msg.task.manage",
  ],
  PLANNER: [
    "organisation.view",
    "client.list",
    "client.view",
    "event.list",
    "event.view",
    "event.update",
    "assignment.view",
    "mef.view",
    "guest.directory.view",
    "guest.intake.create",
    "guest.record.amend",
    "guest.duplicate.resolve",
    "guest.addressing.view",
    "guest.addressing.manage",
    "guest.relationship.view",
    "guest.relationship.manage",
    "guest.entitlement.view",
    "guest.entitlement.manage",
    "guest.child.view",
    "guest.child.manage",
    "rsvp.directory.view",
    "rsvp.invitation.manage",
    "rsvp.response.amend",
    "msg.template.manage",
    "msg.audience.manage",
    "msg.campaign.manage",
    "msg.inbox.view",
    "msg.inbox.respond",
    "msg.analytics.view",
  ],
  SYSTEM_ADMINISTRATOR: [
    "organisation.view",
    "assignment.view",
    "assignment.manage",
    "role.view",
    "role.manage",
    "audit.view",
    "system.health.view",
  ],
  READ_ONLY_AUDITOR: [
    "organisation.view",
    "client.list",
    "client.view",
    "event.list",
    "event.view",
    "assignment.view",
    "role.view",
    "audit.view",
    "mef.view",
    "consent.view",
    "guest.directory.view",
    "guest.addressing.view",
    "guest.relationship.view",
    "guest.entitlement.view",
    "guest.child.view",
    "rsvp.directory.view",
    "msg.analytics.view",
  ],
};

function permissionRecord(key: PermissionKey): Permission {
  const [resource, ...actionParts] = key.split(".");
  return {
    id: PERMISSION_IDS[key],
    key,
    resource: resource ?? key,
    action: actionParts.join(".") || "unknown",
    description: key,
    sensitivity:
      BUSINESS_PERMISSIONS.includes(key) ||
      key.startsWith("audit.") ||
      (S04A_SENSITIVE_PERMISSIONS as readonly string[]).includes(key)
        ? "SENSITIVE"
        : "NORMAL",
    schemaVersion: SCHEMA_VERSION,
  };
}

export function seededPermissions(): Permission[] {
  return PERMISSION_KEYS.map(permissionRecord);
}

export function seededRoles(): Role[] {
  return SYSTEM_ROLE_KEYS.map((key) => ({
    id: ROLE_IDS[key],
    key,
    name: key.replaceAll("_", " "),
    description: `System role ${key}`,
    systemRole: true,
    organisationWide: key === "CEO" || key === "SYSTEM_ADMINISTRATOR" || key === "READ_ONLY_AUDITOR",
    status: "ACTIVE",
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  }));
}

export function permissionsForRole(key: (typeof SYSTEM_ROLE_KEYS)[number]): readonly PermissionKey[] {
  return ROLE_PERMISSIONS[key];
}

export function roleIdForKey(key: (typeof SYSTEM_ROLE_KEYS)[number]): string {
  return ROLE_IDS[key];
}

export function permissionIdForKey(key: PermissionKey): string {
  return PERMISSION_IDS[key];
}

export function isSystemAdministratorRole(key: string): boolean {
  return key === "SYSTEM_ADMINISTRATOR";
}

export function isCeoRole(key: string): boolean {
  return key === "CEO";
}
