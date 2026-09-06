import { LogoutButton } from "../../components/logout-button";

export default function AccessPendingPage() {
  return (
    <div className="atelier-chamber at-scope">
      <main className="sign-in">
        <p className="eyebrow">Command Atelier</p>
        <span className="at-thread" aria-hidden="true" />
        <h1>Access pending</h1>
        <p className="lede">
          Your identity is recognised. An assignment is required before Event OS can show organisation or event records.
        </p>
        <LogoutButton />
      </main>
    </div>
  );
}
