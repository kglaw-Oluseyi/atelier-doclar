import type { RoadmapView } from "@maison-doclar/programme-tower";

export function RoadmapPanel({ roadmap }: { roadmap: RoadmapView }) {
  return (
    <article>
      {roadmap.cycles.length > 0 ? (
        <div className="banner" data-tone="danger" role="alert">
          Cycles detected: {roadmap.cycles.join(" · ")}
        </div>
      ) : null}
      {roadmap.missingDependencies.length > 0 ? (
        <div className="banner" data-tone="danger" role="alert">
          Missing dependencies: {roadmap.missingDependencies.join(" · ")}
        </div>
      ) : null}

      <section aria-labelledby="dag-heading">
        <h2 id="dag-heading">Dependency graph</h2>
        <p className="meta">Derived from slice manifests. Not a decorative diagram.</p>
        <svg role="img" aria-label="Programme dependency graph" viewBox="0 0 640 200" width="100%" height="200">
          {roadmap.nodes.slice(0, 12).map((node, index) => (
            <g key={node.id}>
              <rect x={(index % 6) * 100 + 8} y={Math.floor(index / 6) * 90 + 20} width="88" height="48" fill="#1b1916" stroke="#3a362f" />
              <text x={(index % 6) * 100 + 16} y={Math.floor(index / 6) * 90 + 48} fill="#f3efe6" fontSize="10">
                {node.id}
              </text>
            </g>
          ))}
        </svg>
      </section>

      <section aria-labelledby="table-heading">
        <h2 id="table-heading">Accessible dependency table</h2>
        <table className="table">
          <caption>Every graph node has this table equivalent.</caption>
          <thead>
            <tr>
              <th>Slice</th>
              <th>Product</th>
              <th>Status</th>
              <th>Depends on</th>
            </tr>
          </thead>
          <tbody>
            {roadmap.nodes.map((node) => (
              <tr key={node.id}>
                <td>
                  <a href={node.href}>{node.id}</a>
                </td>
                <td>{node.product}</td>
                <td>
                  <span className="status">{node.status}</span>
                </td>
                <td>
                  {roadmap.edges
                    .filter((edge) => edge.from === node.id)
                    .map((edge) => edge.to)
                    .join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}
