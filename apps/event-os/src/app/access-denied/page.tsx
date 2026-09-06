import Link from "next/link";
import { AtelierOperationalState } from "../../components/atelier-operational-state";
import { operationalStateFromCode } from "../../server/operational-state";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const state = (await searchParams).state;
  if (state === "DEPENDENCY_UNAVAILABLE") {
    return (
      <div className="atelier-chamber at-scope">
        <main className="sign-in">
          <p className="eyebrow">Command Atelier</p>
          <span className="at-thread" aria-hidden="true" />
          <AtelierOperationalState state={operationalStateFromCode("DEPENDENCY_UNAVAILABLE")} />
          <p className="actions">
            <Link className="button" href="/app">
              Retry home
            </Link>
          </p>
        </main>
      </div>
    );
  }
  return (
    <div className="atelier-chamber at-scope">
      <main className="sign-in">
        <p className="eyebrow">Command Atelier</p>
        <span className="at-thread" aria-hidden="true" />
        <h1>Access denied</h1>
        <p className="lede">You do not have permission for that action. No protected records are shown here.</p>
        <p className="actions">
          <Link className="button" href="/app">
            Return home
          </Link>
        </p>
      </main>
    </div>
  );
}
