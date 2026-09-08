import { validateS04APersistedCollections } from "./addressing-persistence.js";
import { validateS04BPersistedCollections } from "./programme-persistence.js";
import { validateS04CPersistedCollections } from "./merchandise-persistence.js";
import { validateS04DPersistedCollections } from "./forecast-persistence.js";
import { validateS04EPersistedCollections } from "./atelier-persistence.js";
import { validateS04FPersistedCollections } from "./language-persistence.js";
import { validateS05PersistedCollections } from "./venue-persistence.js";
import { validateS05APersistedCollections } from "./eec-persistence.js";
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
    this.state = clone(normalised);
    Object.freeze(this.state.audit);
  }
}
