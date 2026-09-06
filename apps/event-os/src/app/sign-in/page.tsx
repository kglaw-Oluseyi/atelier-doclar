import { SignInForm } from "../../components/sign-in-form";
import { signInStatusMessage } from "../../server/staff-session-status";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; status?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="atelier-sign-in at-scope">
      <main className="sign-in">
        <p className="brand">Maison Doclar</p>
        <span className="at-thread" aria-hidden="true" />
        <h1>Event OS</h1>
        <p className="lede">
          Staff sign-in for the Event OS foundation. This adapter is non-production and does not select a permanent
          identity provider.
        </p>
        <SignInForm next={params.next} error={params.error} status={signInStatusMessage(params.status)} />
        <p className="lede">Privacy and support remain outside this slice. Production use is not authorised.</p>
      </main>
    </div>
  );
}
