"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { signInAction } from "../server/actions";
import { PendingSubmit } from "./atelier-pending-submit";

function SignInPendingStatus() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <p id="sign-in-pending" className="alert" role="status" aria-live="polite">
      Signing in…
    </p>
  );
}

function SignInFormFields({ error, status }: { error?: string; status?: string }) {
  const { pending } = useFormStatus();
  const errorRef = useRef<HTMLParagraphElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
      return;
    }
    if (status) statusRef.current?.focus();
  }, [error, status]);

  return (
    <>
      <label>
        Staff email
        <input name="email" type="email" autoComplete="username" required disabled={pending} />
      </label>
      <label>
        Access token
        <input
          name="accessToken"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </label>
      <SignInPendingStatus />
      {status ? (
        <p
          id="sign-in-status"
          className="alert"
          role="status"
          tabIndex={-1}
          ref={statusRef}
        >
          {status}
        </p>
      ) : null}
      {error ? (
        <p
          id="sign-in-error"
          className="alert"
          data-tone="danger"
          role="alert"
          tabIndex={-1}
          ref={errorRef}
        >
          {error}
        </p>
      ) : null}
      <PendingSubmit pendingLabel="Signing in…">Sign in</PendingSubmit>
    </>
  );
}

export function SignInForm({ next, error, status }: { next?: string; error?: string; status?: string }) {
  return (
    <form
      className="form"
      action={signInAction}
      aria-describedby={error ? "sign-in-error" : status ? "sign-in-status" : undefined}
    >
      <input
        type="hidden"
        name="next"
        value={next && next.startsWith("/") && !next.startsWith("//") ? next : "/app"}
      />
      <SignInFormFields error={error} status={status} />
    </form>
  );
}
