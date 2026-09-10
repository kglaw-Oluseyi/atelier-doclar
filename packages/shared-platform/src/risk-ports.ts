export type RiskAdapterKind = "OBJECT_STORE" | "SCAN" | "OCR" | "SOURCE_MONITOR" | "COMMUNICATIONS";
export type RiskAdapterState = "INACTIVE" | "MISCONFIGURED" | "READY" | "DEGRADED";

export interface RiskObjectStorePort {
  readonly state: RiskAdapterState;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void> | void;
  get(key: string): Promise<{ bytes: Uint8Array; contentType: string } | undefined> | { bytes: Uint8Array; contentType: string } | undefined;
}

export interface RiskScanPort {
  readonly state: RiskAdapterState;
  scan?(bytes: Uint8Array): Promise<"CLEAN" | "QUARANTINED" | "SCAN_FAILED"> | "CLEAN" | "QUARANTINED" | "SCAN_FAILED";
}

export interface RiskOcrPort {
  readonly state: RiskAdapterState;
}

export interface RiskSourceMonitorPort {
  readonly state: RiskAdapterState;
}

export interface RiskCommunicationsPort {
  readonly state: RiskAdapterState;
}

export interface RiskProviderPorts {
  objectStore: RiskObjectStorePort;
  scan: RiskScanPort;
  ocr: RiskOcrPort;
  sourceMonitor: RiskSourceMonitorPort;
  communications: RiskCommunicationsPort;
}

export function inactivePorts(): RiskProviderPorts {
  const inactive = { state: "INACTIVE" as const };
  return {
    objectStore: {
      state: "INACTIVE",
      put() {
        throw new Error("object store adapter is inactive");
      },
      get() {
        return undefined;
      },
    },
    scan: inactive,
    ocr: inactive,
    sourceMonitor: inactive,
    communications: inactive,
  };
}

export function fixtureObjectStore(): RiskObjectStorePort {
  const objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
  return {
    state: "READY",
    put(key, bytes, contentType) {
      objects.set(key, { bytes: Uint8Array.from(bytes), contentType });
    },
    get(key) {
      const found = objects.get(key);
      return found ? { bytes: Uint8Array.from(found.bytes), contentType: found.contentType } : undefined;
    },
  };
}

export function fixturePorts(objectStore?: RiskObjectStorePort): RiskProviderPorts {
  return {
    ...inactivePorts(),
    objectStore: objectStore ?? fixtureObjectStore(),
  };
}

export function adapterStates(ports: RiskProviderPorts): Record<RiskAdapterKind, RiskAdapterState> {
  return {
    OBJECT_STORE: ports.objectStore.state,
    SCAN: ports.scan.state,
    OCR: ports.ocr.state,
    SOURCE_MONITOR: ports.sourceMonitor.state,
    COMMUNICATIONS: ports.communications.state,
  };
}
