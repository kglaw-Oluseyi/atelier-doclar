"use client";

import { useEffect, useRef } from "react";
import { exchangeVendorAccessAction } from "../server/actions";

export function VendorAccessExchange({ token }: { token: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form ref={formRef} action={exchangeVendorAccessAction} className="vendor-form">
      <input type="hidden" name="token" value={token} />
      <p className="lede">Opening your assigned fulfilments.</p>
      <button type="submit">Continue to assigned fulfilments</button>
    </form>
  );
}
