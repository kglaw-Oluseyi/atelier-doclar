import { answerQuestion, buildProgrammeIndex } from "@maison-doclar/programme-tower";
import { AskForm } from "../../../components/ask-form";
import { DeniedPage } from "../../../components/denied";
import { TowerShell } from "../../../components/shell";
import { fixturesAllowed } from "../../../server/config";
import { requireTowerSession } from "../../../server/with-session";

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rag?: string }>;
}) {
  const session = await requireTowerSession();
  if ("denied" in session) return <DeniedPage />;
  const params = await searchParams;
  const fixture = fixturesAllowed() ? params.rag : undefined;
  const result = answerQuestion({
    question: params.q ?? "",
    role: session.actor.role,
    snapshot: session.snapshot,
    unavailable: fixture === "unavailable" || fixture === "error",
    ...(fixture === "stale"
      ? { index: buildProgrammeIndex({ now: "2020-01-01T00:00:00.000Z" }), now: "2026-09-05T13:10:00.000Z" }
      : {}),
  });
  const state =
    fixture === "error" ? "error" : fixture === "recovery" ? "recovery" : fixture === "conflict" ? "conflict" : result.state;

  return (
    <TowerShell actor={session.actor}>
      <h1>Ask the programme</h1>
      <p className="meta">
        Allow-listed retrieval with citations. RAG explains; the snapshot owns status. No model vendor is bound.
      </p>
      {state !== "ok" && state !== "empty" ? (
        <p className="banner" data-tone={state === "degraded" || state === "stale" || state === "conflict" ? "warn" : "danger"} role="status">
          {state.toUpperCase()}
          {result.message ? ` — ${result.message}` : ""}
        </p>
      ) : null}
      {state === "recovery" ? (
        <p className="banner" data-tone="warn" role="status">
          Restore the last verified programme index and re-run programme:project. The roadmap remains authoritative.
        </p>
      ) : null}
      <AskForm defaultQuestion={params.q ?? ""} />
      {!params.q ? <p>Empty — ask a question grounded in programme control documents.</p> : null}
      {params.q && result.abstained ? <p role="status">{result.answer}</p> : null}
      {params.q && !result.abstained ? (
        <section>
          <h2>Answer</h2>
          <p>{result.answer}</p>
          {result.authoritativeStatus ? (
            <p className="meta">
              Snapshot status for {result.authoritativeStatus.sliceId}: {result.authoritativeStatus.status} (not
              RAG-calculated)
            </p>
          ) : null}
          <table className="table">
            <caption>Citations from the allow-listed index</caption>
            <thead>
              <tr>
                <th>Source</th>
                <th>Version</th>
                <th>Authority</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              {result.citations.map((citation) => (
                <tr key={`${citation.sourcePath}:${citation.hash}`}>
                  <td>{citation.sourcePath}</td>
                  <td>{citation.version}</td>
                  <td>{citation.authorityState}</td>
                  <td>{citation.hash.slice(0, 12)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </TowerShell>
  );
}
