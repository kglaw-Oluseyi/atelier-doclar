"use client";

import { useEffect, useRef } from "react";
import { exchangeAtelierAccessAction } from "../server/actions";

export function AtelierAccessExchange({ token }: { token: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form ref={formRef} action={exchangeAtelierAccessAction} className="host-atelier-form">
      <input type="hidden" name="token" value={token} />
      <p className="lede">Opening your private Atelier. This invitation is used once.</p>
      <button type="submit">Continue</button>
    </form>
  );
}
