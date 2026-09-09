export function ClientSessionNav({ token, current }: { token: string; current: "conversation" | "review" | "investment" | "roadmap" }) {
  const items = [
    { href: `/discover/${token}`, id: "conversation" as const, label: "Conversation" },
    { href: `/discover/${token}/review`, id: "review" as const, label: "Review and sign-off" },
    { href: `/discover/${token}/investment`, id: "investment" as const, label: "Investment" },
    { href: `/discover/${token}/roadmap`, id: "roadmap" as const, label: "Your roadmap" },
  ];
  return (
    <nav className="client-session-nav" aria-label="Client consultation">
      {items.map((item) =>
        item.id === current ? (
          <span key={item.id} aria-current="page">
            {item.label}
          </span>
        ) : (
          <a key={item.id} href={item.href}>
            {item.label}
          </a>
        ),
      )}
    </nav>
  );
}
