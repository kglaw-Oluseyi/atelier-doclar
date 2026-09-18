import Link from "next/link";

export default function CallbackPage() {
  return (
    <main id="main" className="sign-in">
      <h1>Checking sign-in</h1>
      <p className="lede">The callback did not receive a verified identity provider response.</p>
      <p className="alert" role="alert">
        Sign-in could not be completed. Start again. Do not resubmit this page.
      </p>
      <p>
        <Link href="/sign-in">Return to sign in</Link>
      </p>
    </main>
  );
}
