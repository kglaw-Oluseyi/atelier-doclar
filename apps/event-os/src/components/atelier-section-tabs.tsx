"use client";

import { useEffect, useState } from "react";

export function AtelierSectionTabs({
  items,
  label,
  sticky = false,
}: {
  items: readonly { href: string; label: string }[];
  label: string;
  sticky?: boolean;
}) {
  const [current, setCurrent] = useState(items[0]?.href);
  const hrefs = items.map((item) => item.href).join("\0");

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash && hrefs.split("\0").includes(hash)) setCurrent(hash);
  }, [hrefs]);

  return (
    <nav className={sticky ? "at-tabs dossier-tabs-sticky" : "at-tabs"} aria-label={label}>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          aria-current={current === item.href ? "true" : undefined}
          onClick={() => setCurrent(item.href)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
