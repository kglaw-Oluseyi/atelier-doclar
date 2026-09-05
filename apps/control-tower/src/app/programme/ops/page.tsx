import { assessHealth, classifyFailure, evaluateRuntimeConfig, type FailureKind } from "@maison-doclar/programme-tower";
import { DeniedPage } from "../../../components/denied";
import { TowerShell } from "../../../components/shell";
import { fixturesAllowed } from "../../../server/config";
import { githubIngestionState, usesProductionPersistence } from "../../../server/runtime";
import { requireTowerSession } from "../../../server/with-session";

const FAILURES: FailureKind[] = [
  "github-unavailable",
  "ci-unavailable",
  "rag-unavailable",
  "stale-snapshot",
  "corrupt-event",
  "inaccessible-evidence",
  "permission-failure",
  "partial-data",
  "restore",
];

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ fail?: string }>;
}) {
  const session = await requireTowerSession();
  if ("denied" in session) return <DeniedPage />;
  const fail = fixturesAllowed() ? (await searchParams).fail : undefined;
  const kind = FAILURES.find((item) => item === fail);
  const runtime = evaluateRuntimeConfig();
  const health = kind
    ? classifyFailure(kind, session.snapshot)
    : assessHealth({
        snapshot: session.snapshot,
        github: runtime.githubLiveEnabled
          ? githubIngestionState() === "AVAILABLE"
            ? "AVAILABLE"
            : githubIngestionState() === "UNAVAILABLE"
              ? "UNAVAILABLE"
              : "UNKNOWN"
          : "SYNTHETIC",
        githubIngestion: runtime.githubLiveEnabled ? githubIngestionState() : "SYNTHETIC",
        webhook: runtime.webhookConfigured ? "CONFIGURED" : "UNCONFIGURED",
        persistence: usesProductionPersistence() ? "AVAILABLE" : "LOCAL_ONLY",
      });

  return (
    <TowerShell actor={session.actor}>
      <h1>Operations and evidence pack</h1>
      <p className="banner" data-tone="warn" role="status">
        {health.controlTower} — CT9 IMPLEMENTATION COMPLETE. PRODUCTION APPROVED: no. Event OS implied failed:{" "}
        {String(health.eventOsImpliedFailed)}. Event-Day implied failed: {String(health.eventDayImpliedFailed)}.
      </p>
      <table className="table">
        <caption>Operational health. Control Tower failure does not imply Event OS or Event-Day failure.</caption>
        <thead>
          <tr>
            <th>Signal</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Application alive</td>
            <td>
              <span className="status">{String(health.applicationAlive)}</span>
            </td>
          </tr>
          <tr>
            <td>Programme data</td>
            <td>
              <span className="status">{health.programmeData}</span>
            </td>
          </tr>
          <tr>
            <td>Persistence</td>
            <td>
              <span className="status">{health.persistence}</span>
            </td>
          </tr>
          <tr>
            <td>GitHub ingestion</td>
            <td>
              <span className="status">{health.githubIngestion}</span>
            </td>
          </tr>
          <tr>
            <td>Webhook</td>
            <td>
              <span className="status">{health.webhook}</span>
            </td>
          </tr>
          <tr>
            <td>CI freshness</td>
            <td>
              <span className="status">{health.ci}</span>
            </td>
          </tr>
          <tr>
            <td>RAG</td>
            <td>
              <span className="status">{health.rag}</span>
            </td>
          </tr>
          <tr>
            <td>Snapshot</td>
            <td>
              <span className="status">{health.snapshot}</span>
            </td>
          </tr>
          <tr>
            <td>Protected gates</td>
            <td>
              <span className="status">UNSIGNED</span>
            </td>
          </tr>
          <tr>
            <td>Production authorised</td>
            <td>
              <span className="status">{String(health.productionAuthorised)}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <h2>Unsigned protected gates</h2>
      <ul>
        {health.unsignedProtectedGates.map((gate) => (
          <li key={gate}>{gate}</li>
        ))}
      </ul>
      <p>Recovery: {health.recovery}</p>
      <p className="meta">
        Runbook: docs/control/CT9_RUNBOOK.md. Backup/restore: docs/control/BACKUP_RESTORE.md.
      </p>
    </TowerShell>
  );
}
