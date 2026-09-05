import { listCommits } from "@maison-doclar/programme-tower";
import { DeniedPage } from "../../../components/denied";
import { TowerShell } from "../../../components/shell";
import { requireTowerSession } from "../../../server/with-session";

export default async function CommitsPage() {
  const session = await requireTowerSession();
  if ("denied" in session) return <DeniedPage />;
  const commits = listCommits(session.snapshot);
  return (
    <TowerShell actor={session.actor}>
      <h1>Commits</h1>
      <table className="table">
        <caption>Slice-linked commits. Unlinked work is listed separately when ingested.</caption>
        <thead>
          <tr>
            <th>SHA</th>
            <th>Slice</th>
          </tr>
        </thead>
        <tbody>
          {commits.map((item) => (
            <tr key={`${item.sliceId}-${item.sha}`}>
              <td>{item.sha}</td>
              <td>
                <a href={item.href}>{item.sliceId}</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TowerShell>
  );
}
