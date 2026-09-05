"use client";

import { useState, type FormEvent } from "react";

export function LoginForm() {
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        actorId: String(data.get("actorId") ?? ""),
        role: String(data.get("role") ?? ""),
        accessToken: String(data.get("accessToken") ?? ""),
      }),
    });
    if (!response.ok) {
      setError("Access denied. Check the named actor, role and access token.");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next") ?? "/programme";
    window.location.assign(next.startsWith("/programme") ? next : "/programme");
  }

  return (
    <form className="form" onSubmit={onSubmit} aria-describedby={error ? "login-error" : undefined}>
      <label>
        Named actor
        <input name="actorId" autoComplete="username" required />
      </label>
      <label>
        Role
        <select name="role" defaultValue="reader">
          <option value="reader">reader</option>
          <option value="implementer">implementer</option>
          <option value="reviewer">reviewer</option>
          <option value="executive">executive</option>
        </select>
      </label>
      <label>
        Access token
        <input name="accessToken" type="password" autoComplete="current-password" required />
      </label>
      {error ? (
        <p id="login-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Enter Control Tower</button>
    </form>
  );
}
