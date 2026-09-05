import { formatCyclePath, validationError, type ProgrammeValidationError } from "./errors.js";
import type { Dependency, SliceManifest } from "./schemas.js";

export interface CycleDetectionResult {
  nodes: string[];
  edges: Dependency[];
  cycles: string[][];
  cyclePaths: string[];
}

export function collectDependencies(manifests: SliceManifest[]): Dependency[] {
  const edges: Dependency[] = [];
  for (const manifest of manifests) {
    for (const to of manifest.dependsOn) {
      edges.push({ from: manifest.id, to });
    }
  }
  return edges;
}

export function detectCycles(
  sliceIds: string[],
  edges: Dependency[],
): CycleDetectionResult {
  const nodes = [...new Set([...sliceIds, ...edges.flatMap((edge) => [edge.from, edge.to])])].sort();
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node, []);

  const sortedEdges = [...edges].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  for (const edge of sortedEdges) {
    const list = adjacency.get(edge.from);
    if (list) list.push(edge.to);
  }
  for (const node of nodes) {
    const list = adjacency.get(node);
    if (list) list.sort();
  }

  const color = new Map<string, "white" | "gray" | "black">();
  for (const node of nodes) color.set(node, "white");
  const cycles: string[][] = [];

  function visit(node: string, stack: string[]): void {
    color.set(node, "gray");
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      const nextColor = color.get(next) ?? "white";
      if (nextColor === "gray") {
        const start = stack.indexOf(next);
        const path = start >= 0 ? [...stack.slice(start), next] : [node, next];
        cycles.push(path);
      } else if (nextColor === "white") {
        visit(next, stack);
      }
    }
    stack.pop();
    color.set(node, "black");
  }

  for (const node of nodes) {
    if (color.get(node) === "white") visit(node, []);
  }

  const uniqueCycles: string[][] = [];
  const seen = new Set<string>();
  for (const cycle of cycles) {
    const key = cycle.join("\0");
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueCycles.push(cycle);
  }

  return {
    nodes,
    edges: sortedEdges,
    cycles: uniqueCycles,
    cyclePaths: uniqueCycles.map(formatCyclePath),
  };
}

export function cycleErrors(
  result: CycleDetectionResult,
  sourceFile?: string,
): ProgrammeValidationError[] {
  return result.cycles.map((cycle) => {
    const path = formatCyclePath(cycle);
    const start = cycle[0] ?? "unknown";
    return validationError({
      code: "DEPENDENCY_CYCLE",
      entityType: "dependency",
      entityId: start,
      field: "dependsOn",
      value: path,
      message: `dependency cycle: ${path}`,
      sourceFile,
    });
  });
}

export function duplicateEdgeErrors(
  edges: Dependency[],
  sourceFile?: string,
): ProgrammeValidationError[] {
  const seen = new Set<string>();
  const errors: ProgrammeValidationError[] = [];
  const sorted = [...edges].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  for (const edge of sorted) {
    const key = `${edge.from}\0${edge.to}`;
    if (seen.has(key)) {
      errors.push(
        validationError({
          code: "DUPLICATE_EDGE",
          entityType: "dependency",
          entityId: edge.from,
          field: "dependsOn",
          value: edge.to,
          message: `duplicate dependency edge ${edge.from} → ${edge.to}`,
          sourceFile,
        }),
      );
    }
    seen.add(key);
  }
  return errors;
}
