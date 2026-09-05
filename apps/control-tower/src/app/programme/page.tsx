import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SessionError,
  deniedPortfolio,
  isViewFixture,
  loadCorpusPortfolio,
  readSession,
} from "@maison-doclar/programme-tower";
import { PortfolioPanel } from "../../components/portfolio-view";
import { TowerShell } from "../../components/shell";
import { fixturesAllowed, sessionConfig } from "../../server/config";
import { loadProgrammeSnapshot } from "../../server/runtime";

export default async function ProgrammePage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string }>;
}) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const params = await searchParams;
  try {
    const actor = readSession(token, sessionConfig());
    const fixture = fixturesAllowed() && isViewFixture(params.fixture) ? params.fixture : undefined;
    const snapshot = await loadProgrammeSnapshot();
    const view = loadCorpusPortfolio({
      actor,
      snapshot,
      ...(fixture ? { fixture, allowFixtures: true } : {}),
    });
    return (
      <TowerShell actor={{ actorId: actor.actorId, role: actor.role }}>
        <h1>Executive portfolio</h1>
        <p className="meta">Evidence-derived. This surface cannot sign CEO, independent, specialist or venue gates.</p>
        <PortfolioPanel view={view} />
      </TowerShell>
    );
  } catch (error) {
    const denied = error instanceof SessionError;
    return (
      <TowerShell>
        <h1>Executive portfolio</h1>
        <PortfolioPanel
          view={
            denied
              ? deniedPortfolio()
              : {
                  ...deniedPortfolio(),
                  state: "error",
                  message: "programme snapshot could not be loaded",
                }
          }
        />
      </TowerShell>
    );
  }
}
