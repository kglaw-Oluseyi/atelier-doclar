import { buildRoadmap } from "@maison-doclar/programme-tower";
import { DeniedPage } from "../../../components/denied";
import { RoadmapPanel } from "../../../components/roadmap-view";
import { TowerShell } from "../../../components/shell";
import { requireTowerSession } from "../../../server/with-session";

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; q?: string }>;
}) {
  const session = await requireTowerSession();
  if ("denied" in session) return <DeniedPage />;
  const params = await searchParams;
  const roadmap = buildRoadmap(session.snapshot, {
    ...(params.product ? { product: params.product } : {}),
    ...(params.q ? { q: params.q } : {}),
  });
  return (
    <TowerShell actor={session.actor}>
      <h1>Programme roadmap</h1>
      <form method="get" className="form" role="search">
        <label>
          Product filter
          <input name="product" defaultValue={params.product ?? ""} />
        </label>
        <label>
          Slice filter
          <input name="q" defaultValue={params.q ?? ""} />
        </label>
        <button type="submit">Filter</button>
      </form>
      <RoadmapPanel roadmap={roadmap} />
    </TowerShell>
  );
}
