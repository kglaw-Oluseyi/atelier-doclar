import type { ReactNode } from "react";

export function AtelierPageHeader({
  eyebrow,
  title,
  lede,
  titleClamp = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  titleClamp?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="atelier-masthead">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <span className="at-thread" aria-hidden="true" />
      <h1 className={titleClamp ? "title-clamp" : undefined} title={title}>
        {title}
      </h1>
      {lede ? <p className="lede">{lede}</p> : null}
      {children}
    </header>
  );
}
