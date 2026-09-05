import type { ControlSnapshot, WorkStatus } from "@maison-doclar/programme-domain";
import type { SurfaceFreshness, SurfaceState } from "./surface.js";

export interface ProductCard {
  code: string;
  name: string;
  route: string;
  accepted: number;
  total: number;
  remaining: number;
  blockers: number;
  nextEligibleSlice?: string;
  statuses: Record<string, number>;
}

export interface HorizonItem {
  sliceId: string;
  title: string;
  product: string;
  status: WorkStatus;
  band: "now" | "next" | "later";
}

export interface CommitActivity {
  sha: string;
  sliceId: string;
  unlinked: boolean;
}

export interface CheckActivity {
  id: string;
  name: string;
  result: string;
  sliceId: string;
}

export interface GateSummary {
  id: string;
  title: string;
  status: string;
  authority: string;
  unsigned: boolean;
}

export interface PortfolioView {
  state: SurfaceState;
  snapshotId: string;
  generatedAt: string;
  calculationVersion: string;
  actor?: { actorId: string; role: string };
  products: ProductCard[];
  acceptedTotal: number;
  remainingTotal: number;
  blockers: Array<{ id: string; title: string; severity: string; sliceId: string; owner: string }>;
  criticalPath: string[];
  horizon: HorizonItem[];
  commits: CommitActivity[];
  checks: CheckActivity[];
  gates: GateSummary[];
  freshness: SurfaceFreshness;
  percentageAvailable: boolean;
  cannotApprove: true;
  reservedSurfaces: ReadonlyArray<{ href: string; label: string; slice: string }>;
  message?: string;
}

function countStatus(statuses: Record<string, WorkStatus>, ids: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of ids) {
    const status = statuses[id] ?? "NOT_STARTED";
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

export function buildPortfolio(input: {
  snapshot: ControlSnapshot;
  freshness: SurfaceFreshness;
  state: SurfaceState;
  reservedSurfaces: PortfolioView["reservedSurfaces"];
  actor?: { actorId: string; role: string };
  unlinkedCommits?: Array<{ sha: string }>;
  message?: string;
}): PortfolioView {
  const snapshot = input.snapshot;
  const products: ProductCard[] = snapshot.products.map((product) => {
    const slices = snapshot.slices.filter((slice) => slice.product === product.code);
    const ids = slices.map((slice) => slice.id);
    const accepted = ids.filter((id) => snapshot.statuses[id] === "ACCEPTED").length;
    const blockers = snapshot.openItems.filter((item) => item.product === product.code && item.blocker && item.status === "OPEN").length;
    const nextEligible = snapshot.outstanding.unlockedUnacceptedSlices.find((id) =>
      slices.some((slice) => slice.id === id),
    );
    const card: ProductCard = {
      code: product.code,
      name: product.name,
      route: product.route,
      accepted,
      total: slices.length,
      remaining: slices.length - accepted,
      blockers,
      statuses: countStatus(snapshot.statuses, ids),
    };
    if (nextEligible) card.nextEligibleSlice = nextEligible;
    return card;
  });

  const horizon: HorizonItem[] = snapshot.slices.map((slice) => {
    const status = snapshot.statuses[slice.id] ?? "NOT_STARTED";
    let band: HorizonItem["band"] = "later";
    if (status === "IN_PROGRESS" || status === "IN_REVIEW") band = "now";
    else if (status === "READY") band = "next";
    return { sliceId: slice.id, title: slice.title, product: slice.product, status, band };
  });

  const foundationOrder = snapshot.slices
    .filter((slice) => slice.product === "FOUNDATION")
    .sort((a, b) => a.order - b.order);
  const criticalPath = foundationOrder
    .filter((slice) => snapshot.statuses[slice.id] !== "ACCEPTED" && snapshot.statuses[slice.id] !== "SUPERSEDED")
    .map((slice) => slice.id);

  const commits: CommitActivity[] = snapshot.slices.flatMap((slice) =>
    slice.commits.map((sha) => ({ sha, sliceId: slice.id, unlinked: false })),
  );
  for (const item of input.unlinkedCommits ?? []) {
    commits.push({ sha: item.sha, sliceId: "UNLINKED", unlinked: true });
  }

  const checks: CheckActivity[] = [];
  // Slice records do not embed checks; surface gate/check absence explicitly via outstanding.
  for (const slice of snapshot.slices) {
    if (slice.status === "IN_REVIEW" && slice.commits.length === 0 && slice.evidence.length === 0) {
      checks.push({
        id: `CHK-ABSENT-${slice.id}`,
        name: "required evidence",
        result: "MISSING",
        sliceId: slice.id,
      });
    }
  }

  const view: PortfolioView = {
    state: input.state,
    snapshotId: snapshot.snapshotId,
    generatedAt: snapshot.generatedAt,
    calculationVersion: snapshot.calculationVersion,
    products,
    acceptedTotal: Object.values(snapshot.statuses).filter((status) => status === "ACCEPTED").length,
    remainingTotal: snapshot.outstanding.unacceptedMandatorySlices.length,
    blockers: snapshot.openItems
      .filter((item) => item.blocker && item.status === "OPEN")
      .map((item) => ({
        id: item.id,
        title: item.title,
        severity: item.severity,
        sliceId: item.sliceId,
        owner: item.owner,
      })),
    criticalPath,
    horizon,
    commits,
    checks: [
      ...checks,
      ...snapshot.outstanding.missingRequiredEvidence.map((id) => ({
        id: `CHK-EVIDENCE-${id}`,
        name: "acceptance evidence",
        result: "INCOMPLETE",
        sliceId: id,
      })),
    ],
    gates: snapshot.gates.map((gate) => ({
      id: gate.id,
      title: gate.title,
      status: gate.status,
      authority: gate.authority,
      unsigned: gate.status !== "APPROVED",
    })),
    freshness: input.freshness,
    percentageAvailable: snapshot.outstanding.percentage.available,
    cannotApprove: true,
    reservedSurfaces: input.reservedSurfaces,
  };
  if (input.actor) view.actor = input.actor;
  if (input.message) view.message = input.message;
  return view;
}
