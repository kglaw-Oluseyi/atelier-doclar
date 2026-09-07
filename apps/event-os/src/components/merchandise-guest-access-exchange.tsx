"use client";

import { useEffect, useRef } from "react";
import { exchangeMerchandiseGuestAccessAction } from "../server/actions";

export function MerchandiseGuestAccessExchange({ token }: { token: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form ref={formRef} action={exchangeMerchandiseGuestAccessAction} className="guest-form">
      <input type="hidden" name="token" value={token} />
      <p className="lede">Opening your private merchandise view. This is not an invitation or RSVP.</p>
      <button type="submit">Continue</button>
    </form>
  );
}
