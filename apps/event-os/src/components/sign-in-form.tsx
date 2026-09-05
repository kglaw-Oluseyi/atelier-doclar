import { signInAction } from "../server/actions";

export function SignInForm({ next, error }: { next?: string; error?: string }) {
  return (
    <form className="form" action={signInAction} aria-describedby={error ? "sign-in-error" : undefined}>
      <input type="hidden" name="next" value={next && next.startsWith("/") && !next.startsWith("//") ? next : "/app"} />
      <label>
        Staff email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Access token
        <input name="accessToken" type="password" autoComplete="current-password" required />
      </label>
      {error ? (
        <p id="sign-in-error" className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Sign in</button>
    </form>
  );
}
