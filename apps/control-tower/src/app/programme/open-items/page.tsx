import { DeniedPage } from "../../../components/denied";
import { TowerShell } from "../../../components/shell";
import { requireTowerSession } from "../../../server/with-session";

export default async function OpenItemsPage() {
  const session = await requireTowerSession();
  if ("denied" in session) return <DeniedPage />;
  const items = session.snapshot.openItems;
  return (
    <TowerShell actor={session.actor}>
      <h1>Open items</h1>
      <table className="table">
        <caption>Controlled open items. This surface cannot close protected gates.</caption>
        <thead>
          <tr>
            <th>ID</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Slice</th>
            <th>Owner</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.severity}</td>
              <td>
                <span className="status">{item.status}</span>
                {item.blocker ? " blocker" : ""}
              </td>
              <td>
                <a href={`/programme/slices/${item.sliceId}`}>{item.sliceId}</a>
              </td>
              <td>{item.owner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TowerShell>
  );
}
