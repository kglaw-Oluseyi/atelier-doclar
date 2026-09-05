import { LOCAL_STORE_PRODUCTION_STATUS, type StoreProductionStatus } from "./constants.js";
import { emptySnapshot, type PlatformSnapshot, type PlatformStore } from "./store.js";

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
    this.state = clone(next);
    Object.freeze(this.state.audit);
  }
}
