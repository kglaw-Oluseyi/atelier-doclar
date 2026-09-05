"use client";

import { useEffect, useRef } from "react";
import { exchangeGuestAccessAction } from "../server/actions";

export function GuestAccessExchange({ token }: { token: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form ref={formRef} action={exchangeGuestAccessAction} className="guest-form">
      <input type="hidden" name="token" value={token} />
      <p className="lede">Opening your response page.</p>
      <button type="submit">Continue</button>
    </form>
  );
}
