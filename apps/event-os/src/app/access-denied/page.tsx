import Link from "next/link";

export default function AccessDeniedPage() {
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
