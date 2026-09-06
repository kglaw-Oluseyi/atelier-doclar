"use client";

import { useState } from "react";

export function AtelierSectionTabs({
  items,
  label,
}: {
  items: readonly { href: string; label: string }[];
  label: string;
}) {
  const [current, setCurrent] = useState(items[0]?.href);

  return (
    <nav className="at-tabs" aria-label={label}>
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
