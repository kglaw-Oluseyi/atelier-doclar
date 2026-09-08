import {
  assignmentIsActive,
  roleKeyForId,
  seededRoles,
  type ActorContext,
  type Assignment,
  type AuditEvent,
  type PlatformService,
} from "@maison-doclar/shared-platform";
import { formatOperationalTimestamp, governedRoleLabel } from "./comms-display";

export const IDENTITY_UNAVAILABLE = "Identity unavailable";

export type GovernanceLabelIndex = {
  persons: Map<string, string>;
  events: Map<string, string>;
  clients: Map<string, string>;
  organisations: Map<string, string>;
  roles: Map<string, string>;
};

export type ResolvedLabel = {
  label: string;
  known: boolean;
  id?: string;
};

export function buildGovernanceLabelIndex(
  service: PlatformService,
  actor: ActorContext,
  organisationId: string,
): GovernanceLabelIndex {
  const persons = new Map<string, string>();
  try {
    for (const person of service.listPersons(actor, organisationId)) {
      persons.set(person.id, person.displayName);
    }
  } catch {
    /* assignment.view absent — keep self-only fallback below */
  }
  try {
    const self = service.resolveActor(actor.personId);
    persons.set(self.person.id, self.person.displayName);
  } catch {
    /* actor snapshot unavailable */
  }

  const events = new Map<string, string>();
  try {
    for (const event of service.listEvents(actor, organisationId)) {
      events.set(event.id, event.name);
    }
  } catch {
    /* event.list absent */
  }

  const clients = new Map<string, string>();
  try {
    for (const client of service.listClients(actor, organisationId)) {
      clients.set(client.id, client.displayName);
    }
  } catch {
    /* client.list absent */
  }

  const organisations = new Map<string, string>();
  try {
    for (const organisation of service.listOrganisations(actor)) {
      organisations.set(organisation.id, organisation.displayName);
    }
  } catch {
    /* organisation.view absent */
  }

  const roles = new Map<string, string>();
  for (const role of seededRoles()) {
    const key = roleKeyForId(role.id);
    if (key) roles.set(role.id, governedRoleLabel(key));
  }

  return { persons, events, clients, organisations, roles };
}

export function resolveAuthorisedLabel(map: Map<string, string>, id: string | undefined): ResolvedLabel {
  if (!id) return { label: "Not provided", known: false };
  const label = map.get(id);
  if (label) return { label, known: true, id };
  return { label: IDENTITY_UNAVAILABLE, known: false, id };
}

export function governedActionLabel(action: string): string {
  const words = action.split(".");
  return words
    .map((word, index) => {
      const lower = word.replaceAll("_", " ");
      return index === 0 ? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}` : lower;
    })
    .join(" ");
}

export function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export type PresentedAssignment = {
  id: string;
  personLabel: string;
  roleLabel: string;
  organisationLabel: string;
  scopeLabel: string;
  clientLabel?: string;
  statusLabel: string;
  status: Assignment["status"];
  active: boolean;
  href?: string;
  destinationLabel: string;
  explanation?: string;
  assignmentId: string;
};

export function presentAssignment(
  assignment: Assignment,
  index: GovernanceLabelIndex,
  now: string,
): PresentedAssignment {
  const person = resolveAuthorisedLabel(index.persons, assignment.personId);
  const organisation = resolveAuthorisedLabel(index.organisations, assignment.organisationId);
  const event = resolveAuthorisedLabel(index.events, assignment.eventId);
  const client = resolveAuthorisedLabel(index.clients, assignment.clientId);
  const roleKey = roleKeyForId(assignment.roleId);
  const roleLabel = roleKey ? governedRoleLabel(roleKey) : resolveAuthorisedLabel(index.roles, assignment.roleId).label;
  const scopedToEvent = Boolean(assignment.eventId);
  const scopeLabel = scopedToEvent
    ? event.known
      ? event.label
      : IDENTITY_UNAVAILABLE
    : `Organisation-wide · ${organisation.label}`;
  const href = scopedToEvent && event.known && assignment.eventId ? `/app/events/${assignment.eventId}` : undefined;
  return {
    id: assignment.id,
    personLabel: person.label,
    roleLabel,
    organisationLabel: organisation.label,
    scopeLabel,
    clientLabel: assignment.clientId ? client.label : undefined,
    statusLabel: statusLabel(assignment.status),
    status: assignment.status,
    active: assignmentIsActive(assignment, now),
    href,
    destinationLabel: href ? `Open ${event.known ? event.label : "assigned event"}` : "Organisation home",
    explanation: href
      ? undefined
      : "This assignment is organisation-wide. It is not a duplicate of an event assignment.",
    assignmentId: assignment.id,
  };
}

export type PresentedAuditRow = {
  id: string;
  whenLabel: string;
  occurredAt: string;
  actorLabel: string;
  actionLabel: string;
  action: string;
  targetLabel: string;
  outcome: AuditEvent["outcome"];
  outcomeLabel: string;
  reason?: string;
  correlationId: string;
  resourceId?: string;
};

export function presentAuditEvent(event: AuditEvent, index: GovernanceLabelIndex): PresentedAuditRow {
  const actor = resolveAuthorisedLabel(index.persons, event.actorPersonId);
  const actorLabel = event.actorPersonId
    ? actor.known
      ? actor.label
      : IDENTITY_UNAVAILABLE
    : statusLabel(event.actorType);
  const eventLabel = resolveAuthorisedLabel(index.events, event.eventId);
  const clientLabel = resolveAuthorisedLabel(index.clients, event.clientId);
  const resourceName =
    event.resourceType === "event"
      ? eventLabel.label
      : event.resourceType === "client"
        ? clientLabel.label
        : event.resourceType === "person"
          ? resolveAuthorisedLabel(index.persons, event.resourceId).label
          : undefined;
  const targetLabel = [governedActionLabel(event.resourceType), resourceName && resourceName !== IDENTITY_UNAVAILABLE ? resourceName : undefined]
    .filter(Boolean)
    .join(" · ");
  return {
    id: event.id,
    whenLabel: formatOperationalTimestamp(event.occurredAt),
    occurredAt: event.occurredAt,
    actorLabel,
    actionLabel: governedActionLabel(event.action),
    action: event.action,
    targetLabel: targetLabel || "Affected resource unavailable",
    outcome: event.outcome,
    outcomeLabel: statusLabel(event.outcome),
    reason: event.reason,
    correlationId: event.correlationId,
    resourceId: event.resourceId,
  };
}
