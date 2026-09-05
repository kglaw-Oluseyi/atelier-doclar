import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { appendAudit, type AuditEntry } from "./authority.js";

export interface AuditRepository {
  append(entry: AuditEntry): { kind: "appended" | "duplicate"; entry: AuditEntry };
  list(): AuditEntry[];
}

function sameEntry(left: AuditEntry, right: AuditEntry): boolean {
  return (
    left.id === right.id &&
    left.at === right.at &&
    left.actorId === right.actorId &&
    left.action === right.action &&
    left.targetId === right.targetId &&
    left.result === right.result &&
    left.reason === right.reason
  );
}

export class MemoryAuditRepository implements AuditRepository {
  constructor(private entries: AuditEntry[] = []) {}

  append(entry: AuditEntry): { kind: "appended" | "duplicate"; entry: AuditEntry } {
    const existing = this.entries.find((item) => item.id === entry.id);
    if (existing) {
      if (!sameEntry(existing, entry)) {
        throw new Error(`audit identity conflict for ${entry.id}`);
      }
      return { kind: "duplicate", entry: existing };
    }
    this.entries = appendAudit(this.entries, entry);
    return { kind: "appended", entry };
  }

  list(): AuditEntry[] {
    return [...this.entries];
  }
}

/**
 * Append-only JSONL audit. Local/test adapter. Production durability uses the
 * ProgrammeStore / selected production database — not this file format.
 */
export class FileAuditRepository implements AuditRepository {
  constructor(private readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    if (!existsSync(path)) appendFileSync(path, "", "utf8");
  }

  list(): AuditEntry[] {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as AuditEntry);
  }

  append(entry: AuditEntry): { kind: "appended" | "duplicate"; entry: AuditEntry } {
    const existing = this.list().find((item) => item.id === entry.id);
    if (existing) {
      if (!sameEntry(existing, entry)) {
        throw new Error(`audit identity conflict for ${entry.id}`);
      }
      return { kind: "duplicate", entry: existing };
    }
    appendFileSync(this.path, `${JSON.stringify(entry)}\n`, "utf8");
    return { kind: "appended", entry };
  }
}
