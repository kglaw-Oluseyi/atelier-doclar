/**
 * Architectural regression: Event OS "use client" modules must not pull the
 * shared-platform root barrel or Node-only server runtime into the browser graph.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const eventOsSrc = resolve(root, "apps/event-os/src");
const clientContractPath = resolve(root, "packages/shared-platform/src/cpsat/client-contract.ts");
const clientTypesPath = resolve(root, "packages/shared-platform/src/client-types.ts");

const FORBIDDEN_NODE_BUILTINS = [
  "node:assert",
  "node:async_hooks",
  "node:child_process",
  "node:crypto",
  "node:fs",
  "node:net",
  "node:os",
  "node:path",
  "node:process",
  "node:stream",
  "node:zlib",
  "from \"pg\"",
  "from 'pg'",
];

const FORBIDDEN_SERVER_CPSAT_MODULES = [
  "cpsat/postgres-schema",
  "cpsat/queue",
  "cpsat/worker-settlement",
  "cpsat/worker-registry",
  "cpsat/execute-claimed-run",
  "cpsat/durable-launch",
  "cpsat/admission",
  "cpsat/review-adoption",
  "cpsat/local-solve",
  "migrations",
  "postgres-store",
];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSourceFiles(full));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function isUseClient(source: string): boolean {
  return /^["']use client["']\s*;?/m.test(source);
}

function sharedPlatformImportSources(source: string): string[] {
  const hits: string[] = [];
  const re = /from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const spec = m[1]!;
    if (
      spec === "@maison-doclar/shared-platform" ||
      spec.startsWith("@maison-doclar/shared-platform/") ||
      spec.includes("packages/shared-platform/src")
    ) {
      hits.push(spec);
    }
  }
  return hits;
}

function hasRuntimeBarrelImport(source: string): boolean {
  // Value import from the root barrel (not import type, not subpath).
  return /(?:^|\n)import\s+(?!type\b)[^;]*from\s+["']@maison-doclar\/shared-platform["']/m.test(source);
}

function hasAnyRootBarrelImport(source: string): boolean {
  return /from\s+["']@maison-doclar\/shared-platform["']/.test(source);
}

describe("Event OS client/server import boundary", () => {
  const clientFiles = listSourceFiles(eventOsSrc).filter((path) => isUseClient(readFileSync(path, "utf8")));

  it("discovers use client modules under apps/event-os/src", () => {
    assert.ok(clientFiles.length >= 10, `expected client modules, found ${clientFiles.length}`);
  });

  it("forbids root shared-platform barrel imports from use client modules", () => {
    const offenders: string[] = [];
    for (const path of clientFiles) {
      const source = readFileSync(path, "utf8");
      if (hasAnyRootBarrelImport(source) || hasRuntimeBarrelImport(source)) {
        offenders.push(relative(root, path));
      }
    }
    assert.deepEqual(offenders, [], `client modules must not import the root barrel:\n${offenders.join("\n")}`);
  });

  it("forbids known server-only CP-SAT module imports from use client modules", () => {
    const offenders: string[] = [];
    for (const path of clientFiles) {
      const source = readFileSync(path, "utf8");
      for (const spec of sharedPlatformImportSources(source)) {
        for (const forbidden of FORBIDDEN_SERVER_CPSAT_MODULES) {
          if (spec.includes(forbidden)) offenders.push(`${relative(root, path)} -> ${spec}`);
        }
      }
    }
    assert.deepEqual(offenders, [], `client modules must not import server CP-SAT modules:\n${offenders.join("\n")}`);
  });

  it("forbids Node built-ins and pg in use client module sources", () => {
    const offenders: string[] = [];
    for (const path of clientFiles) {
      const source = readFileSync(path, "utf8");
      for (const needle of FORBIDDEN_NODE_BUILTINS) {
        if (source.includes(needle)) offenders.push(`${relative(root, path)} contains ${needle}`);
      }
    }
    assert.deepEqual(offenders, [], `client modules must not reference Node/pg:\n${offenders.join("\n")}`);
  });

  it("cpsat client contract has no server-runtime imports", () => {
    const source = readFileSync(clientContractPath, "utf8");
    assert.doesNotMatch(source, /\bfrom\s+["'][^"']+["']/);
    for (const needle of FORBIDDEN_NODE_BUILTINS) {
      assert.ok(!source.includes(needle), `client-contract must not contain ${needle}`);
    }
    assert.match(source, /export function cancelConfirmCopy/);
    assert.match(source, /export function keepBestConfirmCopy/);
    assert.match(source, /export type CpsatRunUiModel/);
    assert.match(source, /export type CpsatCandidateReviewModel/);
  });

  it("client-types module is type-only re-exports", () => {
    const source = readFileSync(clientTypesPath, "utf8");
    assert.match(source, /export type \{/);
    assert.doesNotMatch(source, /(?:^|\n)export\s+(?!type\b)/);
    for (const needle of FORBIDDEN_NODE_BUILTINS) {
      assert.ok(!source.includes(needle), `client-types must not contain ${needle}`);
    }
  });

  it("cpsat panels import the dedicated cpsat-client subpath", () => {
    const status = readFileSync(resolve(root, "apps/event-os/src/components/cpsat-run-status-panel.tsx"), "utf8");
    const review = readFileSync(resolve(root, "apps/event-os/src/components/cpsat-candidate-review-panel.tsx"), "utf8");
    assert.match(status, /@maison-doclar\/shared-platform\/cpsat-client/);
    assert.match(review, /@maison-doclar\/shared-platform\/cpsat-client/);
    assert.doesNotMatch(status, /from\s+["']@maison-doclar\/shared-platform["']/);
    assert.doesNotMatch(review, /from\s+["']@maison-doclar\/shared-platform["']/);
    assert.match(status, /cancelConfirmCopy/);
    assert.match(status, /keepBestConfirmCopy/);
  });

  it("package exports expose cpsat-client and client-types subpaths", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "packages/shared-platform/package.json"), "utf8")) as {
      exports?: Record<string, string>;
    };
    assert.equal(pkg.exports?.["./cpsat-client"], "./src/cpsat/client-contract.ts");
    assert.equal(pkg.exports?.["./client-types"], "./src/client-types.ts");
  });
});
