import type { StoreProductionStatus } from "./constants.js";
import type {
  Assignment,
  AuditEvent,
  Client,
  ConsentRecord,
  EventPhaseHistory,
  EventProgramme,
  EventRecord,
  GuestReference,
  MasterEventFile,
  Membership,
  Organisation,
  Permission,
  Person,
  PolicyVersionRef,
  Role,
  RolePermission,
} from "./schemas.js";

export interface IdempotencyRecord {
  key: string;
  action: string;
  hash: string;
  resultRef: string;
  createdAt: string;
}

export interface PlatformSnapshot {
  organisations: Organisation[];
  clients: Client[];
  programmes: EventProgramme[];
  events: EventRecord[];
  phaseHistory: EventPhaseHistory[];
  persons: Person[];
  memberships: Membership[];
  roles: Role[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
  assignments: Assignment[];
  masterEventFiles: MasterEventFile[];
  consents: ConsentRecord[];
  guestReferences: GuestReference[];
  policyVersions: PolicyVersionRef[];
  audit: AuditEvent[];
  idempotency: IdempotencyRecord[];
}

export interface PlatformStore {
  readonly productionStatus: StoreProductionStatus;
  snapshot(): PlatformSnapshot;
  replace(next: PlatformSnapshot): void;
}

export function emptySnapshot(): PlatformSnapshot {
  return {
    organisations: [],
    clients: [],
    programmes: [],
    events: [],
    phaseHistory: [],
    persons: [],
    memberships: [],
    roles: [],
    permissions: [],
    rolePermissions: [],
    assignments: [],
    masterEventFiles: [],
    consents: [],
    guestReferences: [],
    policyVersions: [],
    audit: [],
    idempotency: [],
  };
}
