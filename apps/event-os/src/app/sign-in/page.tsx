import Link from "next/link";
import { listFixtureUsers, loadConfig } from "@maison-doclar/foundation";
import { signInAction } from "@/server/actions";

export default async function SignInPage({ searchParams }: { searchParams?: { error?: string } }) {
  const config = loadConfig();
  const people = config.allowFixtures ? await listFixtureUsers() : [];
  return (
    <main id="main" className="sign-in">
      <p className="badge">Maison Doclar</p>
      <h1>Sign in</h1>
      <p className="lede">
        Staff enter the operating record for the organisation they are assigned to serve.
      </p>
      {searchParams?.error ? (
        <p className="alert" role="alert">
          {searchParams.error}
        </p>
      ) : null}
      {people.length === 0 ? (
        <p className="empty">Synthetic sign-in is not enabled in this environment.</p>
      ) : (
        <div className="people">
          {people.map((person) => (
            <form key={person.id} action={signInAction} className="panel">
              <input type="hidden" name="userId" value={person.id} />
              <strong>{person.display_name}</strong>
              <p>{person.email}</p>
              <p className="status">{person.status}</p>
              <button type="submit">Sign in as {person.display_name}</button>
            </form>
          ))}
        </div>
      )}
      <p>
        <Link href="/auth/oidc">Sign in with organisation identity</Link>
      </p>
      <p>
        <Link href="/privacy">Privacy</Link> · <Link href="/support">Support</Link>
      </p>
    </main>
  );
}
