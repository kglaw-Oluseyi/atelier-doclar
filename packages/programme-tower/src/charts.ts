import type { ControlSnapshot, WorkStatus } from "@maison-doclar/programme-domain";
import { buildProgrammeIndex } from "./rag.js";
import { buildFreshness, type SurfaceFreshness, type SurfaceState } from "./surface.js";

export type ChartTone = "unknown" | "warn" | "ok" | "danger";

export interface ChartRow {
  label: string;
  value: number;
  tone: ChartTone;
}

export interface ChartSeries {
  id: string;
  title: string;
  question: string;
  rows: ChartRow[];
}

export interface ProgrammeNotice {
  id: string;
  kind: "blocker" | "decision" | "review" | "gate";
  title: string;
  href: string;
}

export interface ChartsView {
  state: SurfaceState;
  freshness: SurfaceFreshness;
  series: ChartSeries[];
  notifications: ProgrammeNotice[];
  message?: string;
}

export function toneForStatus(status: string): ChartTone {
  if (status === "UNKNOWN" || status === "NOT_STARTED" || status === "NOT_READY") return "unknown";
  if (status === "REJECTED" || status === "FAIL" || status === "ERROR" || status === "EXPIRED") return "danger";
  if (status === "ACCEPTED" || status === "APPROVED" || status === "PASS") return "ok";
  return "warn";
}

export function dedupeNotifications(notices: readonly ProgrammeNotice[]): ProgrammeNotice[] {
  const seen = new Set<string>();
  const out: ProgrammeNotice[] = [];
  for (const notice of notices) {
    if (seen.has(notice.id)) continue;
    seen.add(notice.id);
    out.push(notice);
  }
  return out;
}

export function buildNotifications(snapshot: ControlSnapshot): ProgrammeNotice[] {
  const notices: ProgrammeNotice[] = [];
  for (const item of snapshot.openItems) {
    if (item.status === "OPEN" && item.blocker) {
      notices.push({
        id: `blocker:${item.id}`,
        kind: "blocker",
        title: `Blocker ${item.id} remains open`,
        href: "/programme/open-items",
      });
    }
    if (item.status === "OPEN" && item.decisionAuthority) {
      notices.push({
        id: `decision:${item.id}`,
        kind: "decision",
        title: `Decision required for ${item.id}`,
        href: "/programme/decisions",
      });
    }
  }
  for (const [sliceId, status] of Object.entries(snapshot.statuses) as Array<[string, WorkStatus]>) {
    if (status === "IN_REVIEW") {
      notices.push({
        id: `review:${sliceId}`,
        kind: "review",
        title: `${sliceId} is ready for named review`,
        href: `/programme/slices/${sliceId}`,
      });
    }
  }
  for (const gate of snapshot.gates) {
    notices.push({
      id: `gate:${gate.id}:${gate.status}`,
      kind: "gate",
      title: `Gate ${gate.id} is ${gate.status}`,
      href: "/programme/releases",
    });
  }
  return dedupeNotifications(notices);
}

function countBy(labels: string[]): ChartRow[] {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, value]) => ({ label, value, tone: toneForStatus(label) }));
}

export function buildCharts(input: {
  snapshot: ControlSnapshot;
  now: string;
  unavailable?: boolean;
  stale?: boolean;
  conflict?: boolean;
  empty?: boolean;
  error?: boolean;
  recovery?: boolean;
}): ChartsView {
  const freshness = buildFreshness({
    source: input.snapshot.freshness.source,
    generatedAt: input.stale ? "2020-01-01T00:00:00.000Z" : input.snapshot.generatedAt,
    now: input.now,
    ingestionState: input.stale ? "STALE" : input.unavailable || input.error ? "ERROR" : "UNKNOWN",
    liveGithub: "UNKNOWN",
    latestObservedCi: undefined,
  });

  if (input.unavailable) {
    return {
      state: "degraded",
      freshness,
      series: [],
      notifications: [],
      message: "Charts are unavailable. Unknown is not healthy. The roadmap remains authoritative.",
    };
  }
  if (input.error) {
    return { state: "error", freshness, series: [], notifications: [], message: "Charts failed to render from the snapshot." };
  }
  if (input.recovery) {
    return {
      state: "recovery",
      freshness,
      series: [],
      notifications: [],
      message: "Restore the last verified snapshot and re-run programme:project.",
    };
  }
  if (input.conflict) {
    return { state: "conflict", freshness, series: [], notifications: [], message: "Chart projection conflict; do not treat bars as authoritative." };
  }
  if (input.empty) {
    return { state: "empty", freshness, series: [], notifications: [], message: "No programme rows are available for charts." };
  }

  const statuses = Object.values(input.snapshot.statuses);
  const index = buildProgrammeIndex({ now: input.now });
  const indexed = new Set(index.chunks.map((chunk) => chunk.sourcePath)).size;
  const withCommits = input.snapshot.slices.filter((slice) => slice.commits.length > 0).length;
  const withoutCommits = input.snapshot.slices.length - withCommits;

  const series: ChartSeries[] = [
    {
      id: "status-counts",
      title: "Slice status counts",
      question: "How is work distributed by evidence-derived status?",
      rows: countBy(statuses),
    },
    {
      id: "accepted-work",
      title: "Cumulative accepted work",
      question: "How many mandatory slices are ACCEPTED versus remaining?",
      rows: [
        { label: "ACCEPTED", value: statuses.filter((status) => status === "ACCEPTED").length, tone: "ok" },
        { label: "REMAINING", value: statuses.filter((status) => status !== "ACCEPTED").length, tone: "warn" },
      ],
    },
    {
      id: "open-item-ageing",
      title: "Open-item severity",
      question: "Which open items are still ageing by severity?",
      rows: countBy(input.snapshot.openItems.filter((item) => item.status === "OPEN").map((item) => item.severity)),
    },
    {
      id: "gate-matrix",
      title: "Gate matrix",
      question: "Which protected gates remain unsigned?",
      rows: input.snapshot.gates.map((gate) => ({
        label: `${gate.id}:${gate.status}`,
        value: 1,
        tone: toneForStatus(gate.status),
      })),
    },
    {
      id: "commit-coverage",
      title: "Commit-to-slice coverage",
      question: "How many slices have linked commits?",
      rows: [
        { label: "WITH_COMMITS", value: withCommits, tone: withCommits > 0 ? "warn" : "unknown" },
        { label: "WITHOUT_COMMITS", value: withoutCommits, tone: "unknown" },
      ],
    },
    {
      id: "rag-coverage",
      title: "RAG source coverage",
      question: "How many allow-listed sources are in the current index?",
      rows: [{ label: "INDEXED_SOURCES", value: indexed, tone: indexed > 0 ? "warn" : "unknown" }],
    },
  ];

  return {
    state: freshness.ingestionState === "STALE" ? "stale" : freshness.healthy ? "ok" : "degraded",
    freshness,
    series,
    notifications: buildNotifications(input.snapshot),
    message: freshness.healthy ? undefined : "Last CI and live GitHub are UNKNOWN — this is not healthy.",
  };
}
