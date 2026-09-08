export type LayoutBinaryKind = "SOURCE" | "DERIVATIVE" | "EXPORT";

export type LayoutBinaryObject = {
  key: string;
  bytes: Uint8Array;
  contentType: string;
};

export interface LayoutBinaryStore {
  configured: boolean;
  put(object: LayoutBinaryObject): Promise<void> | void;
  get(key: string): Promise<LayoutBinaryObject | undefined> | LayoutBinaryObject | undefined;
  delete(key: string): Promise<void> | void;
}

export class MemoryLayoutBinaryStore implements LayoutBinaryStore {
  readonly configured = true;
  private readonly objects = new Map<string, LayoutBinaryObject>();

  put(object: LayoutBinaryObject): void {
    this.objects.set(object.key, { ...object, bytes: Uint8Array.from(object.bytes) });
  }

  get(key: string): LayoutBinaryObject | undefined {
    const found = this.objects.get(key);
    return found ? { ...found, bytes: Uint8Array.from(found.bytes) } : undefined;
  }

  delete(key: string): void {
    this.objects.delete(key);
  }

  get size(): number {
    return this.objects.size;
  }
}

export function layoutSourceObjectKey(input: {
  organisationId: string;
  eventId: string;
  layoutId: string;
  assetId: string;
  ext: string;
}): string {
  return `layout-assets/${input.organisationId}/${input.eventId}/${input.layoutId}/${input.assetId}/source.${input.ext}`;
}

export function layoutDerivativeObjectKey(input: {
  organisationId: string;
  eventId: string;
  layoutId: string;
  assetId: string;
  ext: string;
}): string {
  return `layout-assets/${input.organisationId}/${input.eventId}/${input.layoutId}/${input.assetId}/derivative.${input.ext}`;
}

export function layoutExportObjectKey(input: {
  organisationId: string;
  eventId: string;
  layoutId: string;
  jobId: string;
  format: "PDF" | "PNG";
}): string {
  return `layout-exports/${input.organisationId}/${input.eventId}/${input.layoutId}/${input.jobId}.${input.format.toLowerCase()}`;
}

export function assertSafeObjectKey(key: string): void {
  if (!/^layout-(assets|exports)\/[A-Za-z0-9._/-]+$/.test(key) || key.includes("..")) {
    throw new Error("unsafe object key");
  }
}
