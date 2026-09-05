import { buildCharts } from "@maison-doclar/programme-tower";
import { DeniedPage } from "../../../components/denied";
import { TowerShell } from "../../../components/shell";
import { fixturesAllowed } from "../../../server/config";
import { requireTowerSession } from "../../../server/with-session";

export default async function ChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ charts?: string }>;
}) {
  const session = await requireTowerSession();
  if ("denied" in session) return <DeniedPage />;
  const fixture = fixturesAllowed() ? (await searchParams).charts : undefined;
  const view = buildCharts({
    snapshot: session.snapshot,
    now: new Date().toISOString(),
    unavailable: fixture === "unavailable",
    stale: fixture === "stale",
    conflict: fixture === "conflict",
    empty: fixture === "empty",
    error: fixture === "error",
    recovery: fixture === "recovery",
  });
  const max = Math.max(1, ...view.series.flatMap((series) => series.rows.map((row) => row.value)));

  return (
    <TowerShell actor={session.actor}>
      <h1>Charts and freshness</h1>
      <p className="banner" data-tone={view.freshness.healthy ? undefined : "warn"} role="status">
        {view.state.toUpperCase()} — last verified source {view.freshness.lastSuccessfulIngestion ?? "UNKNOWN"}; last
        CI {view.freshness.latestObservedCi ?? "UNKNOWN"}; snapshot age {view.freshness.snapshotAgeSeconds}s; healthy=
        {String(view.freshness.healthy)}. Unknown is not green.
      </p>
      {view.message ? <p>{view.message}</p> : null}
      {view.series.length === 0 ? <p>No charts in this state. The roadmap remains available.</p> : null}
      {view.series.map((series) => (
        <section key={series.id} className="card" aria-labelledby={series.id}>
          <h2 id={series.id}>{series.title}</h2>
          <p className="meta">{series.question}</p>
          <ul className="bars" aria-hidden="true">
            {series.rows.map((row) => (
              <li key={row.label}>
                <span>
                  {row.label} {row.value}
                </span>
                <span className="bar" data-tone={row.tone}>
                  <span style={{ width: `${Math.round((row.value / max) * 100)}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <table className="table">
            <caption>Accessible equivalent for {series.title}</caption>
            <thead>
              <tr>
                <th>Label</th>
                <th>Value</th>
                <th>Tone</th>
              </tr>
            </thead>
            <tbody>
              {series.rows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.value}</td>
                  <td>
                    <span className="status">{row.tone}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <section aria-labelledby="notices-heading">
        <h2 id="notices-heading">Notifications</h2>
        <p className="meta">In-app only. Duplicate ids are suppressed. No external messaging provider is bound.</p>
        {view.notifications.length === 0 ? <p>No current programme notices.</p> : null}
        <ul>
          {view.notifications.map((notice) => (
            <li key={notice.id}>
              <a href={notice.href}>
                {notice.kind}: {notice.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </TowerShell>
  );
}
