import { SignInForm } from "../../components/sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="sign-in">
      <p className="brand">Maison Doclar</p>
      <h1>Event OS</h1>
      <p className="lede">
        Staff sign-in for the Event OS foundation. This adapter is non-production and does not select a permanent
        identity provider.
      </p>
      <SignInForm next={params.next} error={params.error} />
      <p className="lede">Privacy and support remain outside this slice. Production use is not authorised.</p>
    </main>
  );
}
