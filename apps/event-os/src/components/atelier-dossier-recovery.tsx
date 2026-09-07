"use client";

import { useEffect } from "react";

export function AtelierDossierRecovery({
  active,
  canonicalPath,
}: {
  active: boolean;
  canonicalPath: string;
}) {
  useEffect(() => {
    if (!active) return;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== canonicalPath) {
      window.history.replaceState(window.history.state, "", canonicalPath);
    }
  }, [active, canonicalPath]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
