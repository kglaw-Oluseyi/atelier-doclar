import type { ReactNode } from "react";

export function AtelierPageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <header className="atelier-masthead">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <span className="at-thread" aria-hidden="true" />
      <h1>{title}</h1>
      {lede ? <p className="lede">{lede}</p> : null}
      {children}
    </header>
  );
}
