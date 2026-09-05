import { buildRoadmap } from "@maison-doclar/programme-tower";
import { DeniedPage } from "./denied";
import { RoadmapPanel } from "./roadmap-view";
import { TowerShell } from "./shell";
import { requireTowerSession } from "../server/with-session";

export async function ProductPage({ code, title }: { code: string; title: string }) {
  const session = await requireTowerSession();
  if ("denied" in session) return <DeniedPage />;
  const product = session.snapshot.products.find((item) => item.code === code);
  const roadmap = buildRoadmap(session.snapshot, { product: code });
  return (
    <TowerShell actor={session.actor}>
      <h1>{title}</h1>
      <p className="meta">{product?.route ?? code} · evidence-derived product view</p>
      <RoadmapPanel roadmap={roadmap} />
    </TowerShell>
  );
}
