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
import { emptySnapshot, normalizeSnapshot, type PlatformSnapshot, type PlatformStore } from "./store.js";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class MemoryPlatformStore implements PlatformStore {
  readonly productionStatus: StoreProductionStatus = LOCAL_STORE_PRODUCTION_STATUS;
  private state: PlatformSnapshot = emptySnapshot();

  snapshot(): PlatformSnapshot {
    return clone(this.state);
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
}
