import "server-only";
import { join } from "node:path";
import {
  LOCAL_STORE_PRODUCTION_STATUS,
  loadNonProductionFixtures,
  PlatformService,
  type PlatformStore,
} from "@maison-doclar/shared-platform";
import { fixturesAllowed } from "./config";
import { FileBackedPlatformStore } from "./file-store";

interface Runtime {
  service: PlatformService;
  store: PlatformStore;
  fixtures: boolean;
}

const globalStore = globalThis as typeof globalThis & { __eventOsRuntime?: Runtime };

function storePath(): string {
  return join(process.cwd(), "data", "event-os-non-production.json");
}

export function getRuntime(): Runtime {
  if (globalStore.__eventOsRuntime) return globalStore.__eventOsRuntime;
  if (!fixturesAllowed()) {
    throw new Error("Event OS local runtime requires EVENT_OS_ALLOW_FIXTURES=1; production IdP remains unselected");
  }
  const store = new FileBackedPlatformStore(storePath());
  const service = store.snapshot().organisations.length > 0 ? new PlatformService(store) : loadNonProductionFixtures(store);
  const runtime = { service, store, fixtures: true };
  globalStore.__eventOsRuntime = runtime;
  return runtime;
}

export function persistenceLabel(): string {
  return getRuntime().store.productionStatus === LOCAL_STORE_PRODUCTION_STATUS
    ? "MEMORY_NON_PRODUCTION"
    : getRuntime().store.productionStatus;
}
