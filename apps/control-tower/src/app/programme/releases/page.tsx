import { buildReleaseCandidate } from "@maison-doclar/programme-tower";
import { ApproveButton } from "../../../components/approve-button";
import { DeniedPage } from "../../../components/denied";
import { TowerShell } from "../../../components/shell";
import { requireTowerSession } from "../../../server/with-session";

export default async function ReleasesPage() {
  const session = await requireTowerSession();
  if ("denied" in session) return <DeniedPage />;
  const unsigned = session.snapshot.gates.filter((gate) => gate.status !== "APPROVED").length;
  const candidate = buildReleaseCandidate({
    accepted: Object.values(session.snapshot.statuses).filter((status) => status === "ACCEPTED").length,
    unsignedGates: unsigned,
    blockingItems: session.snapshot.openItems.filter((item) => item.blocker && item.status === "OPEN").length,
  });
  return (
    <TowerShell actor={session.actor}>
      <h1>Releases and gates</h1>
      <p className="banner" data-tone="warn" role="status">
        {candidate.summary} Production authorised: {String(candidate.productionAuthorised)}.
      </p>
      <table className="table">
        <caption>Protected gates require named external authority. Approve does not default to the executor.</caption>
        <thead>
          <tr>
            <th>Gate</th>
            <th>Status</th>
            <th>Authority</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {session.snapshot.gates.map((gate) => (
            <tr key={gate.id}>
              <td>{gate.title}</td>
              <td>
                <span className="status">{gate.status}</span>
              </td>
              <td>{gate.authority}</td>
              <td>
                <ApproveButton gateId={gate.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TowerShell>
  );
}
