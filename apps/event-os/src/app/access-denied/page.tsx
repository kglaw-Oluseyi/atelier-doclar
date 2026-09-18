import Link from "next/link";
import { signOutAction } from "@/server/actions";

export default function DeniedPage({ searchParams }: { searchParams?: { reason?: string } }) {
  return (
    <main id="main" className="sign-in">
      <h1>Access denied</h1>
      <p className="lede">
        {searchParams?.reason === "suspended"
          ? "This identity is suspended."
          : "This action is not available."}{" "}
        No client, event or policy detail is shown.
      </p>
      <form action={signOutAction}>
        <button type="submit">Sign out</button>
      </form>
      <p>
        <Link href="/support">Support</Link>
      </p>
    </main>
  );
}
