import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  openSync,
  closeSync,
  unlinkSync,
  renameSync,
  rmSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import {
  MemorySeatingV2Repository,
  emptySeatingV2State,
  type AuditEvent,
  type SeatingV2State,
  type SeatingV2Transaction,
} from "@maison-doclar/shared-platform";

type PersistedSeatingV2 = {
  schemaVersion: 1;
  platformStorePath: string;
  state: SeatingV2State;
  audit: AuditEvent[];
};

/** Sibling path for seating V2 durable state next to the platform file store. */
export function seatingV2StorePathFor(platformStorePath: string): string {
  return platformStorePath.replace(/\.json$/i, ".seating-v2.json");
}

function lockPathFor(filePath: string): string {
  return `${filePath}.lock`;
}

/**
 * File-backed seating V2 repository for non-production checkpoint runs.
 * Hydrates on construct; persists atomically after every successful transaction.
 * Local single-writer enforcement via exclusive lock file; corrupt files fail closed.
 */
export class FileBackedSeatingV2Repository extends MemorySeatingV2Repository {
  private persisting = false;
  private lockFd: number | undefined;
  private readonly platformStorePath: string;

  constructor(
    private readonly filePath: string,
    options?: { platformStorePath?: string },
  ) {
    super();
    this.platformStorePath = resolve(options?.platformStorePath ?? filePath.replace(/\.seating-v2\.json$/i, ".json"));
    this.acquireExclusiveLock();
    try {
      this.hydrateFromDisk();
    } catch (error) {
      this.releaseExclusiveLock();
      throw error;
    }
  }

  get lockedPlatformStorePath(): string {
    return this.platformStorePath;
  }

  dispose(): void {
    this.releaseExclusiveLock();
  }

  private acquireExclusiveLock(): void {
    const lockPath = lockPathFor(this.filePath);
    mkdirSync(dirname(this.filePath), { recursive: true });
    const tryAcquire = (): void => {
      this.lockFd = openSync(lockPath, "wx");
      writeFileSync(lockPath, `${process.pid}\n`);
    };
    try {
      tryAcquire();
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
      if (code !== "EEXIST") throw error;
    }
    // Checkpoint runners restart next-dev between phases; reclaim locks left by dead PIDs only.
    let holderPid = 0;
    try {
      holderPid = Number.parseInt(readFileSync(lockPath, "utf8").trim().split("\n")[0] ?? "", 10);
    } catch {
      holderPid = 0;
    }
    if (holderPid > 0) {
      try {
        process.kill(holderPid, 0);
        throw new Error(
          `EVENT_OS seating V2 file store is already locked (single-writer). path=${lockPath} pid=${holderPid}`,
        );
      } catch (error) {
        if (error instanceof Error && /already locked/.test(error.message)) throw error;
        // ESRCH / dead process — reclaim
      }
    }
    try {
      unlinkSync(lockPath);
    } catch {
      // race: another writer may have removed it
    }
    try {
      tryAcquire();
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
      if (code === "EEXIST") {
        throw new Error(
          `EVENT_OS seating V2 file store is already locked (single-writer). path=${lockPath}`,
        );
      }
      throw error;
    }
  }

  private releaseExclusiveLock(): void {
    if (this.lockFd === undefined) return;
    try {
      closeSync(this.lockFd);
    } catch {
      // ignore
    }
    this.lockFd = undefined;
    try {
      unlinkSync(lockPathFor(this.filePath));
    } catch {
      // ignore
    }
  }

  private hydrateFromDisk(): void {
    if (!existsSync(this.filePath)) return;
    let rawText: string;
    try {
      rawText = readFileSync(this.filePath, "utf8");
    } catch (error) {
      throw new Error(`seating V2 store unreadable: ${this.filePath}`, { cause: error });
    }
    if (!rawText.trim()) {
      throw new Error(`seating V2 store is empty (fail-closed): ${this.filePath}`);
    }
    let raw: PersistedSeatingV2;
    try {
      raw = JSON.parse(rawText) as PersistedSeatingV2;
    } catch (error) {
      throw new Error(`seating V2 store is corrupt or truncated (fail-closed): ${this.filePath}`, {
        cause: error,
      });
    }
    if (!raw || typeof raw !== "object" || raw.schemaVersion !== 1 || !raw.state || typeof raw.state !== "object") {
      throw new Error(`seating V2 store schema is invalid (fail-closed): ${this.filePath}`);
    }
    if (typeof raw.platformStorePath !== "string" || !raw.platformStorePath.trim()) {
      throw new Error(`seating V2 store missing platformStorePath (fail-closed): ${this.filePath}`);
    }
    if (resolve(raw.platformStorePath) !== this.platformStorePath) {
      throw new Error(
        `seating V2 store identity drift: expected platform ${this.platformStorePath}, found ${raw.platformStorePath}`,
      );
    }
    this.backingStore.replaceState(raw.state ?? emptySeatingV2State());
    this.backingStore.replaceAudit(Array.isArray(raw.audit) ? raw.audit : []);
  }

  private persistToDisk(): void {
    if (this.persisting) return;
    this.persisting = true;
    const tmpPath = `${this.filePath}.${process.pid}.tmp`;
    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      const payload: PersistedSeatingV2 = {
        schemaVersion: 1,
        platformStorePath: this.platformStorePath,
        state: this.backingStore.snapshot(),
        audit: [...this.backingStore.audit],
      };
      writeFileSync(tmpPath, JSON.stringify(payload));
      renameSync(tmpPath, this.filePath);
    } catch (error) {
      try {
        if (existsSync(tmpPath)) rmSync(tmpPath, { force: true });
      } catch {
        // ignore cleanup
      }
      throw error;
    } finally {
      this.persisting = false;
    }
  }

  override async transaction<T>(fn: (tx: SeatingV2Transaction) => Promise<T>): Promise<T> {
    const before = this.backingStore.snapshot();
    const beforeAudit = [...this.backingStore.audit];
    try {
      const result = await super.transaction(fn);
      this.persistToDisk();
      return result;
    } catch (error) {
      this.backingStore.replaceState(before);
      this.backingStore.replaceAudit(beforeAudit);
      throw error;
    }
  }
}
