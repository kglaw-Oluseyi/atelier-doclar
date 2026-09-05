"use client";

export function GuestAccessLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        window.location.assign(href);
      }}
    >
      Open guest access
    </a>
  );
}
