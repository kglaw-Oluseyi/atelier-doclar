import type {
  CreateVendorAssignmentInput,
  IssueMerchandiseGuestAccessInput,
  MerchandiseGuestGrant,
  RenewMerchandiseGuestAccessInput,
  RenewVendorAssignmentInput,
  RevokeMerchandiseGuestAccessInput,
  RevokeVendorAssignmentInput,
  VendorAssignment,
} from "./merchandise-schemas.js";
import type { PlatformSnapshot } from "./store.js";

function sameIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((id, index) => id === b[index]);
}

export function vendorAssignmentAlreadyIssued(
  snap: PlatformSnapshot,
  input: CreateVendorAssignmentInput,
): VendorAssignment | undefined {
  return snap.vendorAssignments.find(
    (item) =>
      item.vendorId === input.vendorId &&
      item.eventId === input.eventId &&
      item.organisationId === input.organisationId &&
      item.status === "ACTIVE" &&
      item.expiresAt === input.expiresAt &&
      sameIds(item.collectionIds, input.collectionIds) &&
      sameIds(item.itemIds, input.itemIds),
  );
}

export function vendorAssignmentAlreadyRenewed(
  snap: PlatformSnapshot,
  input: RenewVendorAssignmentInput,
): VendorAssignment | undefined {
  const assignment = snap.vendorAssignments.find((item) => item.id === input.assignmentId);
  if (!assignment || assignment.organisationId !== input.organisationId || assignment.eventId !== input.eventId) {
    return undefined;
  }
  if (assignment.status !== "ACTIVE" || assignment.expiresAt !== input.expiresAt || !assignment.renewedAt) {
    return undefined;
  }
  if (assignment.version <= input.expectedVersion) return undefined;
  return assignment;
}

export function vendorAssignmentAlreadyRevoked(
  snap: PlatformSnapshot,
  input: RevokeVendorAssignmentInput,
): VendorAssignment | undefined {
  const assignment = snap.vendorAssignments.find((item) => item.id === input.assignmentId);
  if (!assignment || assignment.organisationId !== input.organisationId || assignment.eventId !== input.eventId) {
    return undefined;
  }
  if (assignment.status !== "REVOKED" && !assignment.revokedAt) return undefined;
  return assignment;
}

export function merchandiseGuestGrantAlreadyIssued(
  snap: PlatformSnapshot,
  input: IssueMerchandiseGuestAccessInput,
): MerchandiseGuestGrant | undefined {
  return snap.merchandiseGuestGrants.find(
    (item) =>
      item.guestId === input.guestId &&
      item.eventId === input.eventId &&
      item.organisationId === input.organisationId &&
      item.status === "ACTIVE",
  );
}

export function merchandiseGuestGrantAlreadyRenewed(
  snap: PlatformSnapshot,
  input: RenewMerchandiseGuestAccessInput,
): MerchandiseGuestGrant | undefined {
  const previous = snap.merchandiseGuestGrants.find((item) => item.id === input.grantId);
  if (!previous || previous.organisationId !== input.organisationId || previous.eventId !== input.eventId) {
    return undefined;
  }
  if (previous.status === "SUPERSEDED" && previous.supersededById) {
    const next = snap.merchandiseGuestGrants.find((item) => item.id === previous.supersededById);
    if (next?.status === "ACTIVE" && next.expiresAt === input.expiresAt) return next;
  }
  return undefined;
}

export function merchandiseGuestGrantAlreadyRevoked(
  snap: PlatformSnapshot,
  input: RevokeMerchandiseGuestAccessInput,
): MerchandiseGuestGrant | undefined {
  const grant = snap.merchandiseGuestGrants.find((item) => item.id === input.grantId);
  if (!grant || grant.organisationId !== input.organisationId || grant.eventId !== input.eventId) {
    return undefined;
  }
  if (grant.status !== "REVOKED" && !grant.revokedAt) return undefined;
  return grant;
}
