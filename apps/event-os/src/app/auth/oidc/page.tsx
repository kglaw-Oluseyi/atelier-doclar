import Link from "next/link";

export default function OidcPage() {
  return (
    <main id="main" className="sign-in">
      <h1>Organisation identity</h1>
      <p className="alert" role="alert">
        The identity provider is unavailable. Retry later or use synthetic sign-in while production
        remains unauthorised.
      </p>
      <p>
        <Link href="/sign-in">Return to sign in</Link>
      </p>
    </main>
  );
}
