import { listEvidence } from "@maison-doclar/programme-tower";
import { DeniedPage } from "../../../components/denied";
import { TowerShell } from "../../../components/shell";
import { requireTowerSession } from "../../../server/with-session";

export default async function EvidencePage() {
  const session = await requireTowerSession();
  if ("denied" in session) return <DeniedPage />;
  const evidence = listEvidence(session.snapshot);
  return (
    <TowerShell actor={session.actor}>
      <h1>Evidence</h1>
      <table className="table">
        <caption>Evidence drill-down from the current projection.</caption>
        <thead>
          <tr>
            <th>ID</th>
            <th>Kind</th>
            <th>Slice</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {evidence.length === 0 ? (
            <tr>
              <td colSpan={4}>No evidence records in the current snapshot.</td>
            </tr>
          ) : (
            evidence.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.kind}</td>
                <td>
                  <a href={item.href}>{item.sliceId}</a>
                </td>
                <td>{item.summary}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TowerShell>
  );
}
