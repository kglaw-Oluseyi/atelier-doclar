import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { resolveProgrammeRoot } from "@maison-doclar/programme-domain";
import { buildProgrammeIndex, type ProgrammeIndex } from "./rag.js";

export interface CachedProgrammeIndex extends ProgrammeIndex {
  sourceFingerprint: string;
}

function walk(root: string, rel: string, acc: string[]): void {
  const abs = join(root, rel);
  if (!existsSync(abs)) return;
  const stat = statSync(abs);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(abs).sort()) walk(root, join(rel, entry), acc);
    return;
  }
  if (stat.isFile()) acc.push(`${rel.replaceAll("\\", "/")}:${stat.size}:${stat.mtimeMs}`);
}

export function programmeSourceFingerprint(root?: string): string {
  const base = resolveProgrammeRoot(root);
  const parts: string[] = [];
  walk(base, "docs/control", parts);
  walk(base, "programme", parts);
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}

export class ProgrammeIndexCache {
  private memory?: CachedProgrammeIndex;

  constructor(private readonly persistPath?: string) {}

  getOrBuild(input?: { root?: string; now?: string }): CachedProgrammeIndex {
    const fingerprint = programmeSourceFingerprint(input?.root);
    if (this.memory && this.memory.sourceFingerprint === fingerprint) {
      return this.memory;
    }
    if (this.persistPath && existsSync(this.persistPath)) {
      const stored = JSON.parse(readFileSync(this.persistPath, "utf8")) as CachedProgrammeIndex;
      if (stored.sourceFingerprint === fingerprint && Array.isArray(stored.chunks)) {
        this.memory = stored;
        return stored;
      }
    }
    const built = buildProgrammeIndex({ root: input?.root, now: input?.now });
    const cached: CachedProgrammeIndex = { ...built, sourceFingerprint: fingerprint };
    this.memory = cached;
    if (this.persistPath) {
      mkdirSync(dirname(this.persistPath), { recursive: true });
      writeFileSync(this.persistPath, `${JSON.stringify(cached)}\n`, "utf8");
    }
    return cached;
  }

  invalidate(): void {
    this.memory = undefined;
  }
}

const defaultCache = new ProgrammeIndexCache();

export function getCachedProgrammeIndex(input?: { root?: string; now?: string }): CachedProgrammeIndex {
  return defaultCache.getOrBuild(input);
}
