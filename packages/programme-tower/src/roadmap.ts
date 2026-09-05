import { collectDependencies, detectCycles, type ControlSnapshot, type WorkStatus } from "@maison-doclar/programme-domain";

export interface RoadmapNode {
  id: string;
  title: string;
  product: string;
  phaseId: string;
  status: WorkStatus;
  href: string;
}

export interface RoadmapEdge {
  from: string;
  to: string;
  missing: boolean;
}

export interface RoadmapView {
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  cycles: string[];
  missingDependencies: string[];
  filter?: { product?: string; q?: string };
}

export function buildRoadmap(snapshot: ControlSnapshot, filter?: { product?: string; q?: string }): RoadmapView {
  const ids = new Set(snapshot.slices.map((slice) => slice.id));
  const edges: RoadmapEdge[] = [];
  const missingDependencies: string[] = [];
  for (const slice of snapshot.slices) {
    for (const dep of slice.dependsOn) {
      const missing = !ids.has(dep);
      edges.push({ from: slice.id, to: dep, missing });
      if (missing) missingDependencies.push(`${slice.id}→${dep}`);
    }
  }
  const cycleResult = detectCycles(
    snapshot.slices.map((slice) => slice.id),
    collectDependencies(
      snapshot.slices.map((slice) => ({
        id: slice.id,
        product: slice.product,
        title: slice.title,
        phaseId: slice.phaseId,
        order: slice.order,
        dependsOn: slice.dependsOn,
        canonicalRefs: slice.canonicalRefs,
        outcome: slice.outcome,
        entryCriteria: slice.entryCriteria,
        exitCriteria: slice.exitCriteria,
        expectedFiles: slice.expectedFiles,
        verification: ["projected"],
      })),
    ),
  );

  let nodes: RoadmapNode[] = snapshot.slices.map((slice) => ({
    id: slice.id,
    title: slice.title,
    product: slice.product,
    phaseId: slice.phaseId,
    status: snapshot.statuses[slice.id] ?? "NOT_STARTED",
    href: `/programme/slices/${slice.id}`,
  }));
  if (filter?.product) nodes = nodes.filter((node) => node.product === filter.product);
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    nodes = nodes.filter((node) => node.id.toLowerCase().includes(q) || node.title.toLowerCase().includes(q));
  }
  const kept = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    edges: edges.filter((edge) => kept.has(edge.from) || kept.has(edge.to)),
    cycles: cycleResult.cyclePaths,
    missingDependencies: [...new Set(missingDependencies)].sort(),
    ...(filter ? { filter } : {}),
  };
}

export function productCodeFromRoute(pathname: string): string | undefined {
  const map: Record<string, string> = {
    "/programme/event-os": "EVENT_OS",
    "/programme/event-day": "EVENT_DAY",
    "/programme/academy": "ACADEMY",
    "/programme/marketing": "MARKETING",
    "/programme/ushering": "USHERING",
    "/programme/integration": "INTEGRATION",
    "/programme": "FOUNDATION",
  };
  return map[pathname];
}
