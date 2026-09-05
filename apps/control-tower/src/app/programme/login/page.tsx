import { LoginForm } from "../../../components/login-form";

export default function LoginPage() {
  return (
    <main className="main" id="main">
      <h1>Control Tower access</h1>
      <p className="meta">
        Production identity-provider is unselected. This bounded shared-token session is non-production
        and cannot approve protected gates.
      </p>
      <LoginForm />
    </main>
  );
}
