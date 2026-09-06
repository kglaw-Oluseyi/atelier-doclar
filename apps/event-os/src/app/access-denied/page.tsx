import Link from "next/link";
import { PublicChrome } from "../../components/public-chrome";

export default function AccessDeniedPage() {
  return (
    <main className="sign-in">
      <PublicChrome />
      <h1>Access denied</h1>
      <p className="lede">You do not have permission for that action. No protected records are shown here.</p>
      <Link href="/app">Return home</Link>
    </main>
  );
}
