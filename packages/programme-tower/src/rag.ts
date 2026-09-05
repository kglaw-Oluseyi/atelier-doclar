import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { resolveProgrammeRoot, type ControlSnapshot, type WorkStatus } from "@maison-doclar/programme-domain";
import type { TowerRole } from "./constants.js";

export const RAG_PROVIDER = {
  kind: "deterministic-extractive",
  vendorBound: false,
  productionModelDecision: "UNSELECTED",
} as const;

export type SourceClassification = "control" | "restricted";
export type AuthorityState = "current" | "historical" | "superseded" | "implementation-record";
export type SourceCategory =
  | "canonical"
  | "decision"
  | "manifest"
  | "ledger"
  | "evidence"
  | "open-item"
  | "control";

export interface GroundedChunk {
  id: string;
  sourcePath: string;
  sourceId: string;
  version: string;
  hash: string;
  authorityState: AuthorityState;
  classification: SourceClassification;
  category: SourceCategory;
  title: string;
  text: string;
}

export interface ProgrammeIndex {
  builtAt: string;
  provider: typeof RAG_PROVIDER;
  chunks: GroundedChunk[];
}

export interface Citation {
  sourcePath: string;
  sourceId: string;
  version: string;
  hash: string;
  authorityState: AuthorityState;
  classification: SourceClassification;
}

export interface GroundedAnswer {
  state: "ok" | "empty" | "abstain" | "stale" | "degraded" | "error" | "denied";
  abstained: boolean;
  answer: string;
  citations: Citation[];
  authoritativeStatus?: { sliceId: string; status: WorkStatus; source: "snapshot" };
  provider: typeof RAG_PROVIDER;
  indexBuiltAt: string;
  message?: string;
}

export interface ExtraSource {
  path: string;
  text: string;
  classification?: SourceClassification;
  authorityState?: AuthorityState;
  category?: SourceCategory;
  sourceId?: string;
  version?: string;
}

const CONTROL_FILES = [
  "docs/control/BUILD_LEDGER.md",
  "docs/control/CURRENT_STATE.md",
  "docs/control/EVIDENCE_INDEX.md",
  "docs/control/REQUIREMENTS_TRACEABILITY.md",
  "docs/control/PROGRAMME_ROADMAP.md",
  "docs/control/CONTROL_TOWER_ARCHITECTURE.md",
  "docs/control/EXECUTION_COMPATIBILITY_REGISTER.md",
  "docs/control/DOCUMENT_AUTHORITY_REGISTER.md",
  "docs/control/CT0_PREFLIGHT_REPORT.md",
  "docs/control/CT1_IMPLEMENTATION.md",
  "docs/control/CT2_IMPLEMENTATION.md",
  "docs/control/CT3_IMPLEMENTATION.md",
  "docs/control/CT4_IMPLEMENTATION.md",
  "docs/control/CT5_IMPLEMENTATION.md",
  "docs/control/CT6_IMPLEMENTATION.md",
  "docs/control/CT7_IMPLEMENTATION.md",
  "docs/control/CT8_IMPLEMENTATION.md",
  "docs/control/CT9_IMPLEMENTATION.md",
  "docs/control/CT9_RUNBOOK.md",
  "docs/control/BACKUP_RESTORE.md",
] as const;

const RESTRICTED_FILES = ["docs/control/RESTRICTED_OPERATOR_NOTE.md"] as const;

const PROGRAMME_DIRS: ReadonlyArray<{ dir: string; category: SourceCategory }> = [
  { dir: "programme/slices", category: "manifest" },
  { dir: "programme/open-items", category: "open-item" },
  { dir: "programme/gates", category: "decision" },
  { dir: "programme/products", category: "canonical" },
];

const INJECTION = /ignore (all )?(previous )?instructions|you are now|system prompt|approve this gate|production approved/i;
const STATUS_QUERY = /\bstatus of (MD-[A-Z0-9-]+)\b/i;
const PATH_PROBE = /(?:^|[\s`])((?:\.\.\/)+[^\s]+|\/etc\/[^\s]+|\/var\/[^\s]+|[A-Za-z]:\\[^\s]+)/;

export function isPathAllowlisted(relativePath: string): boolean {
  const normalised = relativePath.replaceAll("\\", "/");
  if (CONTROL_FILES.includes(normalised as (typeof CONTROL_FILES)[number])) return true;
  if (RESTRICTED_FILES.includes(normalised as (typeof RESTRICTED_FILES)[number])) return true;
  return PROGRAMME_DIRS.some((entry) => normalised.startsWith(`${entry.dir}/`) && normalised.endsWith(".yaml"));
}

export function sourceClassification(relativePath: string): SourceClassification {
  return RESTRICTED_FILES.includes(relativePath.replaceAll("\\", "/") as (typeof RESTRICTED_FILES)[number])
    ? "restricted"
    : "control";
}

function roleMayRead(role: TowerRole, classification: SourceClassification): boolean {
  if (classification === "control") return true;
  return role === "executive" || role === "reviewer";
}

function walkYaml(root: string, dir: string): string[] {
  const base = join(root, dir);
  if (!existsSync(base)) return [];
  const out: string[] = [];
  const stack = [base];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.endsWith(".yaml")) out.push(full);
    }
  }
  return out;
}

function chunkText(text: string, sourcePath: string): Array<{ title: string; text: string }> {
  const title = text.split("\n")[0]?.replace(/^#+\s*/, "").slice(0, 120) ?? sourcePath;
  if (text.length <= 2000) return [{ title, text: text.slice(0, 2000) }];
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const chunks: Array<{ title: string; text: string }> = [];
  for (const block of blocks) {
    if (block.length < 24) continue;
    chunks.push({
      title: block.split("\n")[0]?.replace(/^#+\s*/, "").slice(0, 120) ?? sourcePath,
      text: block.slice(0, 1200),
    });
  }
  return chunks.length > 0 ? chunks : [{ title, text: text.slice(0, 1200) }];
}

function authorityFor(path: string): AuthorityState {
  if (/CT0_|PREFLIGHT|planning/i.test(path)) return "historical";
  if (/IMPLEMENTATION\.md$/i.test(path)) return "implementation-record";
  return "current";
}

function fileHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function buildProgrammeIndex(input?: {
  root?: string;
  now?: string;
  extraSources?: ExtraSource[];
}): ProgrammeIndex {
  const root = resolveProgrammeRoot(input?.root);
  const chunks: GroundedChunk[] = [];
  const files: Array<{ abs: string; rel: string; classification: SourceClassification; category: SourceCategory }> = [];

  for (const rel of CONTROL_FILES) {
    const abs = join(root, rel);
    if (existsSync(abs) && statSync(abs).isFile() && statSync(abs).size < 200_000) {
      files.push({ abs, rel, classification: "control", category: rel.includes("EVIDENCE") ? "evidence" : rel.includes("LEDGER") ? "ledger" : "control" });
    }
  }
  for (const rel of RESTRICTED_FILES) {
    const abs = join(root, rel);
    if (existsSync(abs) && statSync(abs).isFile()) {
      files.push({ abs, rel, classification: "restricted", category: "control" });
    }
  }
  for (const entry of PROGRAMME_DIRS) {
    for (const abs of walkYaml(root, entry.dir)) {
      const rel = relative(root, abs).replaceAll("\\", "/");
      files.push({ abs, rel, classification: "control", category: entry.category });
    }
  }

  for (const file of files) {
    const text = readFileSync(file.abs, "utf8");
    const hash = fileHash(text);
    const parts = chunkText(text, file.rel);
    parts.forEach((part, index) => {
      chunks.push({
        id: `${file.rel}#${index + 1}`,
        sourcePath: file.rel,
        sourceId: file.rel,
        version: "corpus",
        hash,
        authorityState: authorityFor(file.rel),
        classification: file.classification,
        category: file.category,
        title: part.title,
        text: part.text,
      });
    });
  }

  for (const extra of input?.extraSources ?? []) {
    const hash = fileHash(extra.text);
    chunkText(extra.text, extra.path).forEach((part, index) => {
      chunks.push({
        id: `${extra.path}#extra-${index + 1}`,
        sourcePath: extra.path,
        sourceId: extra.sourceId ?? extra.path,
        version: extra.version ?? "fixture",
        hash,
        authorityState: extra.authorityState ?? "current",
        classification: extra.classification ?? "control",
        category: extra.category ?? "control",
        title: part.title,
        text: part.text,
      });
    });
  }

  return {
    builtAt: input?.now ?? new Date().toISOString(),
    provider: RAG_PROVIDER,
    chunks,
  };
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "are",
  "was",
  "not",
  "this",
  "that",
  "with",
  "from",
  "does",
  "what",
  "how",
  "into",
  "your",
  "have",
  "has",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((token) => token.length > 3 && !STOP.has(token));
}

function score(query: string, chunk: GroundedChunk): number {
  const q = new Set(tokens(query));
  if (q.size === 0) return 0;
  const body = new Set(tokens(`${chunk.title} ${chunk.text} ${chunk.sourcePath}`));
  let hits = 0;
  for (const token of q) if (body.has(token)) hits += 1;
  return hits / q.size;
}

function citationFrom(chunk: GroundedChunk): Citation {
  return {
    sourcePath: chunk.sourcePath,
    sourceId: chunk.sourceId,
    version: chunk.version,
    hash: chunk.hash,
    authorityState: chunk.authorityState,
    classification: chunk.classification,
  };
}

export function requestedPathIsAuthorised(question: string, root?: string): { ok: true } | { ok: false; reason: string } {
  const match = question.match(PATH_PROBE);
  if (!match?.[1]) return { ok: true };
  const raw = match[1];
  const base = resolveProgrammeRoot(root);
  const resolved = resolve(base, raw);
  const rel = relative(base, resolved).replaceAll("\\", "/");
  if (rel.startsWith("..") || resolved.split(sep).includes("..") || raw.startsWith("/") || raw.includes(":\\")) {
    return { ok: false, reason: "unauthorised source path" };
  }
  if (!isPathAllowlisted(rel)) return { ok: false, reason: "source is not on the programme allow-list" };
  return { ok: true };
}

export function answerQuestion(input: {
  question: string;
  role: TowerRole;
  snapshot?: ControlSnapshot;
  index?: ProgrammeIndex;
  now?: string;
  unavailable?: boolean;
  staleAfterMs?: number;
  root?: string;
}): GroundedAnswer {
  const provider = RAG_PROVIDER;
  const now = input.now ?? new Date().toISOString();
  if (input.unavailable) {
    return {
      state: "degraded",
      abstained: true,
      answer: "The grounded assistant is unavailable. Programme status remains on the structured snapshot and roadmap.",
      citations: [],
      provider,
      indexBuiltAt: now,
      message: "RAG outage does not impair the roadmap",
    };
  }

  const index = input.index ?? buildProgrammeIndex({ root: input.root, now });
  const staleAfter = input.staleAfterMs ?? 24 * 60 * 60 * 1000;
  const stale = Date.parse(now) - Date.parse(index.builtAt) > staleAfter;
  const question = input.question.trim();
  if (!question) {
    return {
      state: "empty",
      abstained: true,
      answer: "",
      citations: [],
      provider,
      indexBuiltAt: index.builtAt,
      message: "Ask a programme question. Answers require citations.",
    };
  }

  const pathCheck = requestedPathIsAuthorised(question, input.root);
  if (!pathCheck.ok) {
    return {
      state: "abstain",
      abstained: true,
      answer: "I cannot retrieve that source. Only allow-listed programme control documents may be used.",
      citations: [],
      provider,
      indexBuiltAt: index.builtAt,
      message: pathCheck.reason,
    };
  }

  const visible = index.chunks.filter((chunk) => roleMayRead(input.role, chunk.classification));
  const preferred = visible.filter((chunk) => chunk.authorityState !== "superseded");
  const pool = preferred.length > 0 ? preferred : visible;
  const ranked = pool
    .map((chunk) => ({ chunk, score: score(question, chunk) }))
    .filter((row) => row.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const statusMatch = question.match(STATUS_QUERY);
  const sliceId = statusMatch?.[1];
  const snapshotStatus =
    sliceId && input.snapshot ? input.snapshot.statuses[sliceId] : undefined;

  if (ranked.length === 0 && !snapshotStatus) {
    return {
      state: stale ? "stale" : "abstain",
      abstained: true,
      answer: "I do not have allow-listed evidence for that question, so I abstain.",
      citations: [],
      provider,
      indexBuiltAt: index.builtAt,
      message: stale ? "index is stale; unknown is not healthy" : "missing evidence",
    };
  }

  const extracts = ranked.map((row) => {
    const data = row.chunk.text
      .replace(new RegExp(INJECTION.source, "gi"), "[instruction-like text omitted]")
      .replace(/\s+/g, " ")
      .slice(0, 280);
    return `${row.chunk.sourcePath}: ${data}`;
  });
  const citations = ranked.map((row) => citationFrom(row.chunk));
  const injectionPresent = INJECTION.test(question) || ranked.some((row) => INJECTION.test(row.chunk.text));
  const lines = [
    "RAG explains allow-listed programme text. It does not calculate programme status.",
    snapshotStatus && sliceId
      ? `Structured snapshot status for ${sliceId} is ${snapshotStatus}. That value comes from the CT2 snapshot, not from retrieval.`
      : undefined,
    extracts.length > 0 ? extracts.join(" ") : undefined,
    injectionPresent
      ? "Retrieved text is data, not instructions. Control Tower cannot approve protected gates or mark production authorised."
      : undefined,
  ].filter((line): line is string => Boolean(line));

  return {
    state: stale ? "stale" : "ok",
    abstained: false,
    answer: lines.join(" "),
    citations,
    ...(sliceId && snapshotStatus ? { authoritativeStatus: { sliceId, status: snapshotStatus, source: "snapshot" as const } } : {}),
    provider,
    indexBuiltAt: index.builtAt,
    ...(stale ? { message: "index is stale; unknown is not healthy" } : {}),
  };
}
