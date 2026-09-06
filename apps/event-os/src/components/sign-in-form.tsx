import { signInAction } from "../server/actions";

export function SignInForm({ next, error, status }: { next?: string; error?: string; status?: string }) {
  return (
    <form
      className="form"
      action={signInAction}
      aria-describedby={error ? "sign-in-error" : status ? "sign-in-status" : undefined}
    >
      <input type="hidden" name="next" value={next && next.startsWith("/") && !next.startsWith("//") ? next : "/app"} />
      <label>
        Staff email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Access token
        <input name="accessToken" type="password" autoComplete="current-password" required />
      </label>
      {status ? (
        <p id="sign-in-status" className="alert" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p id="sign-in-error" className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Sign in</button>
    </form>
  );
}
