import { validateS04APersistedCollections } from "./addressing-persistence.js";
import { validateS04BPersistedCollections } from "./programme-persistence.js";
import { validateS04CPersistedCollections } from "./merchandise-persistence.js";
import { validateS04DPersistedCollections } from "./forecast-persistence.js";
import { validateS04EPersistedCollections } from "./atelier-persistence.js";
import { validateS04FPersistedCollections } from "./language-persistence.js";
import { validateS05PersistedCollections } from "./venue-persistence.js";
import { validateS05APersistedCollections } from "./eec-persistence.js";
import { validateS05BPersistedCollections } from "./risk-persistence.js";
import { LOCAL_STORE_PRODUCTION_STATUS, type StoreProductionStatus } from "./constants.js";
import type { Person, StaffSession } from "./schemas.js";
import {
  normalizeStaffEmail,
  type StaffAuthCapableStore,
  type StaffAuthMutation,
  type StaffAuthPerfMark,
} from "./staff-auth-store.js";
import { emptySnapshot, normalizeSnapshot, type PlatformSnapshot, type PlatformStore } from "./store.js";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class MemoryPlatformStore implements PlatformStore, StaffAuthCapableStore {
  readonly productionStatus: StoreProductionStatus = LOCAL_STORE_PRODUCTION_STATUS;
  private state: PlatformSnapshot = emptySnapshot();
  private readonly authPerfMarks: StaffAuthPerfMark[] = [];

  snapshot(): PlatformSnapshot {
    return clone(this.state);
  }

  findPersonsByNormalizedEmail(email: string): Person[] {
    const normalized = normalizeStaffEmail(email);
    return clone(
      this.state.persons.filter((item) => normalizeStaffEmail(item.email) === normalized),
    );
  }

  findPersonById(id: string): Person | undefined {
    const hit = this.state.persons.find((item) => item.id === id);
    return hit ? clone(hit) : undefined;
  }

  findStaffSessionById(id: string): StaffSession | undefined {
    const hit = this.state.staffSessions.find((item) => item.id === id);
    return hit ? clone(hit) : undefined;
  }

  applyStaffAuthMutation(mutation: StaffAuthMutation): void {
    const started = Date.now();
    let rowsTouched = 0;
    if (mutation.person) {
      const idx = this.state.persons.findIndex((item) => item.id === mutation.person!.id);
      if (idx >= 0) this.state.persons[idx] = clone(mutation.person);
      else this.state.persons.push(clone(mutation.person));
      rowsTouched += 1;
    }
    if (mutation.sessionInsert) {
      this.state.staffSessions.push(clone(mutation.sessionInsert));
      rowsTouched += 1;
    }
    if (mutation.sessionUpdate) {
      const idx = this.state.staffSessions.findIndex((item) => item.id === mutation.sessionUpdate!.id);
      if (idx >= 0) this.state.staffSessions[idx] = clone(mutation.sessionUpdate);
      else this.state.staffSessions.push(clone(mutation.sessionUpdate));
      rowsTouched += 1;
    }
    // Audit is frozen after full-snapshot replace; keep a mutable view for bounded auth writes.
    const audit = this.state.audit.slice();
    audit.push(clone(mutation.audit));
    this.state.audit = audit;
    Object.freeze(this.state.audit);
    rowsTouched += 1;
    this.recordStaffAuthPerf({
      correlationId: mutation.audit.correlationId,
      phase: "memory.applyStaffAuthMutation",
      durationMs: Date.now() - started,
      queryCount: 0,
      rowsTouched,
    });
  }

  recordStaffAuthPerf(mark: StaffAuthPerfMark): void {
    this.authPerfMarks.push(mark);
  }

  drainStaffAuthPerf(): StaffAuthPerfMark[] {
    return this.authPerfMarks.splice(0, this.authPerfMarks.length);
  }

  loadEventById(eventId: string) {
    const hit = this.state.events.find((item) => item.id === eventId);
    return hit ? clone(hit) : undefined;
  }

  loadLayoutPublicationById(id: string, organisationId: string, eventId: string) {
    const hit = this.state.layoutPublications.find(
      (item) => item.id === id && item.organisationId === organisationId && item.eventId === eventId,
    );
    return hit ? clone(hit) : undefined;
  }

  loadLayoutRevisionById(id: string, organisationId: string, eventId: string) {
    const hit = this.state.layoutRevisions.find(
      (item) => item.id === id && item.organisationId === organisationId && item.eventId === eventId,
    );
    return hit ? clone(hit) : undefined;
  }

  loadCurrentLayoutPublication(organisationId: string, eventId: string, layoutId: string) {
    const hit = this.state.layoutPublications.find(
      (item) =>
        item.organisationId === organisationId &&
        item.eventId === eventId &&
        item.layoutId === layoutId &&
        item.status === "CURRENT",
    );
    return hit ? clone(hit) : undefined;
  }

  listOperationalGuestsByEventId(organisationId: string, eventId: string) {
    return clone(
      this.state.operationalGuests.filter((item) => item.organisationId === organisationId && item.eventId === eventId),
    );
  }

  listRsvpResponsesByEventId(organisationId: string, eventId: string) {
    return clone(
      this.state.rsvpResponses.filter((item) => item.organisationId === organisationId && item.eventId === eventId),
    );
  }

  listDiscoveryEngagementsByEventId(organisationId: string, eventId: string) {
    return clone(
      this.state.discoveryEngagements.filter(
        (item) =>
          item.organisationId === organisationId &&
          (item.convertedEventId === eventId || item.opportunityId === eventId),
      ),
    );
  }

  listPublishedEventBriefsForEvent(organisationId: string, eventId: string) {
    const engagement = this.state.discoveryEngagements.find(
      (item) =>
        item.organisationId === organisationId &&
        (item.convertedEventId === eventId || item.opportunityId === eventId),
    );
    return clone(
      this.state.eventBriefEditions.filter(
        (item) =>
          item.organisationId === organisationId &&
          item.status === "PUBLISHED" &&
          item.current &&
          (!engagement || item.engagementId === engagement.id),
      ),
    );
  }

  listRiskApplicabilitySnapshotsByEventId(organisationId: string, eventId: string) {
    return clone(
      this.state.riskApplicabilitySnapshots.filter(
        (item) => item.organisationId === organisationId && item.eventId === eventId,
      ),
    );
  }

  replace(next: PlatformSnapshot): void {
    const normalised = normalizeSnapshot(next);
    validateS04APersistedCollections(normalised);
    validateS04BPersistedCollections(normalised);
    validateS04CPersistedCollections(normalised);
    validateS04DPersistedCollections(normalised);
    validateS04EPersistedCollections(normalised);
    validateS04FPersistedCollections(normalised);
    validateS05PersistedCollections(normalised);
    validateS05APersistedCollections(normalised);
    validateS05BPersistedCollections(normalised);
    this.state = clone(normalised);
    Object.freeze(this.state.audit);
  }

  /** Test/helper: expose live state size without cloning guest collections. */
  authCollectionSizes(): { persons: number; staffSessions: number; audit: number; operationalGuests: number } {
    return {
      persons: this.state.persons.length,
      staffSessions: this.state.staffSessions.length,
      audit: this.state.audit.length,
      operationalGuests: this.state.operationalGuests.length,
    };
  }
}
