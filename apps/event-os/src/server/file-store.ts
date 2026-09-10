import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { MemoryPlatformStore, type PlatformSnapshot } from "@maison-doclar/shared-platform";

export class FileBackedPlatformStore extends MemoryPlatformStore {
  private hydrating = false;

  constructor(private readonly filePath: string) {
    super();
    this.hydrateFromDisk();
  }

  private hydrateFromDisk(): void {
    if (!existsSync(this.filePath)) return;
    let raw: PlatformSnapshot;
    try {
      raw = JSON.parse(readFileSync(this.filePath, "utf8")) as PlatformSnapshot;
    } catch {
      return;
    }
    this.hydrating = true;
    try {
      super.replace(raw);
    } finally {
      this.hydrating = false;
    }
  }

  override snapshot(): PlatformSnapshot {
    return super.snapshot();
  }

  override replace(next: PlatformSnapshot): void {
    super.replace(next);
    if (this.hydrating) return;
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(next));
  }
}
