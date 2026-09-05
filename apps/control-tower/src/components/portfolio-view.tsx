import type { PortfolioView } from "@maison-doclar/programme-tower";

function Banner({ view }: { view: PortfolioView }) {
  if (view.state === "ok" && view.freshness.liveGithub === "UNKNOWN") {
    return (
      <div className="banner" data-tone="warn" role="status">
        Live GitHub ingestion was not invoked in this process. Source state is UNKNOWN — this is not healthy.
      </div>
    );
  }
  if (view.state === "ok") return null;
  const tone = view.state === "error" || view.state === "denied" ? "danger" : "warn";
  return (
    <div className="banner" data-tone={tone} role="status">
      <strong>{view.state.toUpperCase()}</strong>
      {view.message ? ` — ${view.message}` : ""}
    </div>
  );
}

export function PortfolioPanel({ view }: { view: PortfolioView }) {
  const now = view.horizon.filter((item) => item.band === "now");
  const next = view.horizon.filter((item) => item.band === "next");
  const later = view.horizon.filter((item) => item.band === "later").slice(0, 12);

  return (
    <article>
      <Banner view={view} />
      {view.state === "denied" || view.state === "error" || view.state === "empty" || view.state === "recovery" ? (
        <section className="card">
          <h2>Portfolio unavailable</h2>
          <p>{view.message ?? "No executive portfolio can be shown in this state."}</p>
          {view.state === "recovery" || view.state === "error" ? (
            <p>Recovery: restore the last verified corpus snapshot and run `pnpm programme:project`.</p>
          ) : null}
        </section>
      ) : (
        <>
          <section aria-labelledby="counts-heading">
            <h2 id="counts-heading">Programme counts</h2>
            <p>
              Accepted {view.acceptedTotal} · Remaining {view.remainingTotal} · Percentage{" "}
              {view.percentageAvailable ? "available" : "UNAVAILABLE (no controlled weights)"}
            </p>
            <p className="meta">
              Snapshot {view.snapshotId} · generated {view.generatedAt} · GitHub {view.freshness.liveGithub} ·
              healthy={String(view.freshness.healthy)}
            </p>
          </section>

          <section aria-labelledby="products-heading">
            <h2 id="products-heading">Products</h2>
            <div className="grid">
              {view.products.map((product) => (
                <article className="card" key={product.code}>
                  <h3>{product.name}</h3>
                  <p>
                    <span className="status">{product.code}</span> {product.accepted}/{product.total} accepted
                  </p>
                  <p className="meta">
                    Remaining {product.remaining} · Blockers {product.blockers}
                    {product.nextEligibleSlice ? ` · Next ${product.nextEligibleSlice}` : ""}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="horizon-heading">
            <h2 id="horizon-heading">Now / next / later</h2>
            <table className="table">
              <caption>Evidence-derived horizon. Not a painted kanban.</caption>
              <thead>
                <tr>
                  <th>Band</th>
                  <th>Slice</th>
                  <th>Status</th>
                  <th>Product</th>
                </tr>
              </thead>
              <tbody>
                {[...now, ...next, ...later].map((item) => (
                  <tr key={`${item.band}-${item.sliceId}`}>
                    <td>{item.band}</td>
                    <td>{item.sliceId}</td>
                    <td>
                      <span className="status">{item.status}</span>
                    </td>
                    <td>{item.product}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="path-heading">
            <h2 id="path-heading">Critical path</h2>
            <ol>
              {view.criticalPath.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="blockers-heading">
            <h2 id="blockers-heading">Blockers</h2>
            {view.blockers.length === 0 ? (
              <p>No open blocking items in the current projection.</p>
            ) : (
              <ul>
                {view.blockers.map((item) => (
                  <li key={item.id}>
                    {item.id} · {item.severity} · {item.sliceId} · {item.title}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="commits-heading">
            <h2 id="commits-heading">Commit activity</h2>
            {view.commits.length === 0 ? (
              <p>No linked commits in the current snapshot.</p>
            ) : (
              <ul>
                {view.commits.map((item) => (
                  <li key={`${item.sliceId}-${item.sha}`}>
                    {item.unlinked ? "UNLINKED COMMIT" : item.sliceId} · {item.sha}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="checks-heading">
            <h2 id="checks-heading">Quality / checks</h2>
            {view.checks.length === 0 ? (
              <p>No incomplete-check markers beyond unsigned gates.</p>
            ) : (
              <ul>
                {view.checks.map((item) => (
                  <li key={item.id}>
                    {item.sliceId} · {item.name} · {item.result}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="gates-heading">
            <h2 id="gates-heading">Gates</h2>
            <table className="table">
              <caption>Protected gates remain unsigned. This UI cannot approve them.</caption>
              <thead>
                <tr>
                  <th>Gate</th>
                  <th>Status</th>
                  <th>Authority</th>
                </tr>
              </thead>
              <tbody>
                {view.gates.map((gate) => (
                  <tr key={gate.id}>
                    <td>{gate.title}</td>
                    <td>
                      <span className="status">{gate.status}</span>
                      {gate.unsigned ? " unsigned" : ""}
                    </td>
                    <td>{gate.authority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </article>
  );
}
