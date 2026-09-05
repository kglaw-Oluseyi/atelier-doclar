import { BUSINESS_PERMISSIONS, PERMISSION_KEYS, SCHEMA_VERSION, SYSTEM_ROLE_KEYS } from "./constants.js";
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
  ],
  DEPARTMENT_LEAD: ["organisation.view", "client.view", "event.list", "event.view", "assignment.view", "mef.view"],
  PLANNER: [
    "organisation.view",
    "client.list",
    "client.view",
    "event.list",
    "event.view",
    "event.update",
    "assignment.view",
    "mef.view",
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
    sensitivity: BUSINESS_PERMISSIONS.includes(key) || key.startsWith("audit.") ? "SENSITIVE" : "NORMAL",
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
