import { buildSliceDetail } from "@maison-doclar/programme-tower";
import { DeniedPage } from "../../../../components/denied";
import { TowerShell } from "../../../../components/shell";
import { requireTowerSession } from "../../../../server/with-session";

export default async function SlicePage({ params }: { params: Promise<{ sliceId: string }> }) {
  const session = await requireTowerSession();
  if ("denied" in session) return <DeniedPage />;
  const { sliceId } = await params;
  const detail = buildSliceDetail(session.snapshot, sliceId);
  if (!detail) {
    return (
      <TowerShell actor={session.actor}>
        <h1>Unknown slice</h1>
        <p>Slice {sliceId} is not in the current projection.</p>
      </TowerShell>
    );
  }
  const slice = detail.record;
  return (
    <TowerShell actor={session.actor}>
      <h1>{slice.id}</h1>
      <p className="meta">
        {slice.product} · {slice.phaseId} · <span className="status">{detail.status}</span>
      </p>
      <section>
        <h2>Outcome</h2>
        <p>{slice.outcome}</p>
      </section>
      <section>
        <h2>Dependencies</h2>
        <ul>
          {slice.dependsOn.length === 0 ? <li>None</li> : slice.dependsOn.map((id) => (
            <li key={id}>
              <a href={`/programme/slices/${id}`}>{id}</a>
            </li>
          ))}
        </ul>
        <p className="meta">Dependents: {detail.dependents.join(", ") || "none"}</p>
      </section>
      <section>
        <h2>Canonical references</h2>
        <ul>
          {slice.canonicalRefs.map((ref) => (
            <li key={ref}>{ref}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Expected files</h2>
        <ul>
          {slice.expectedFiles.map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
      </section>
      <section id="commits">
        <h2>Commits</h2>
        <ul>
          {slice.commits.length === 0 ? <li>None recorded</li> : slice.commits.map((sha) => <li key={sha}>{sha}</li>)}
        </ul>
      </section>
      <section id="evidence">
        <h2>Evidence</h2>
        <ul>
          {slice.evidence.length === 0
            ? <li>None recorded</li>
            : slice.evidence.map((item) => (
                <li key={item.id}>
                  {item.kind} · {item.uri} · {item.summary}
                </li>
              ))}
        </ul>
      </section>
      <section>
        <h2>Open items</h2>
        <ul>
          {detail.openItems.length === 0
            ? <li>None on this slice</li>
            : detail.openItems.map((item) => (
                <li key={item.id}>
                  {item.id} · {item.status} · {item.title}
                </li>
              ))}
        </ul>
      </section>
      <section>
        <h2>Acceptance and next action</h2>
        <p>Accepted by {slice.acceptedBy ?? "not accepted"}.</p>
        <p>{detail.nextEligibleAction}</p>
      </section>
    </TowerShell>
  );
}
