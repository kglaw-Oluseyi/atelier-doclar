import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface DeliveryStore {
  has(deliveryId: string): boolean;
  remember(deliveryId: string): void;
}

export class MemoryDeliveryStore implements DeliveryStore {
  private readonly seen = new Set<string>();

  has(deliveryId: string): boolean {
    return this.seen.has(deliveryId);
  }

  remember(deliveryId: string): void {
    this.seen.add(deliveryId);
  }
}

/** Durable replay protection for a single Control Tower process/volume. */
export class FileDeliveryStore implements DeliveryStore {
  constructor(private readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    if (!existsSync(path)) writeFileSync(path, "[]\n", "utf8");
  }

  private read(): Set<string> {
    const raw = JSON.parse(readFileSync(this.path, "utf8")) as unknown;
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.filter((item): item is string => typeof item === "string"));
  }

  has(deliveryId: string): boolean {
    return this.read().has(deliveryId);
  }

  remember(deliveryId: string): void {
    const seen = this.read();
    seen.add(deliveryId);
    writeFileSync(this.path, `${JSON.stringify([...seen].sort())}\n`, "utf8");
  }
}
