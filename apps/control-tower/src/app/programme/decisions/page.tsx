import { DeniedPage } from "../../../components/denied";
import { TowerShell } from "../../../components/shell";
import { requireTowerSession } from "../../../server/with-session";

export default async function DecisionsPage() {
  const session = await requireTowerSession();
  if ("denied" in session) return <DeniedPage />;
  return (
    <TowerShell actor={session.actor}>
      <h1>Decisions</h1>
      {session.snapshot.decisions.length === 0 ? (
        <p>No controlling decisions are recorded in the current snapshot.</p>
      ) : (
        <ul>
          {session.snapshot.decisions.map((decision) => (
            <li key={decision.id}>
              {decision.id} · {decision.disposition} · {decision.title}
            </li>
          ))}
        </ul>
      )}
    </TowerShell>
  );
}
