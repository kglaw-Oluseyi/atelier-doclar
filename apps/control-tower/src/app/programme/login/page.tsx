import { LoginForm } from "../../../components/login-form";

export default function LoginPage() {
  return (
    <main className="main" id="main">
      <h1>Control Tower access</h1>
      <p className="meta">
        TEMPORARY live-verification access for a named reviewer. This is not a final production identity provider.
        Sessions are short-lived, HTTPS-only in production, and cannot sign protected gates. Revoke access by rotating
        the environment credential in Railway.
      </p>
      <LoginForm />
    </main>
  );
}
