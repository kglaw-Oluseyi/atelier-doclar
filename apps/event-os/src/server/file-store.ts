import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { MemoryPlatformStore, type PlatformSnapshot } from "@maison-doclar/shared-platform";

export class FileBackedPlatformStore extends MemoryPlatformStore {
  private loadedMtime = 0;
  private hydrating = false;

  constructor(private readonly filePath: string) {
    super();
    this.hydrateFromDisk();
  }

  private hydrateFromDisk(): void {
    if (!existsSync(this.filePath)) return;
    const mtime = statSync(this.filePath).mtimeMs;
    if (mtime === this.loadedMtime) return;
    const raw = JSON.parse(readFileSync(this.filePath, "utf8")) as PlatformSnapshot;
    this.hydrating = true;
    try {
      super.replace(raw);
      this.loadedMtime = mtime;
    } finally {
      this.hydrating = false;
    }
  }

  override snapshot(): PlatformSnapshot {
    this.hydrateFromDisk();
    return super.snapshot();
  }

  override replace(next: PlatformSnapshot): void {
    super.replace(next);
    if (this.hydrating) return;
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(next));
    this.loadedMtime = existsSync(this.filePath) ? statSync(this.filePath).mtimeMs : Date.now();
  }
}
