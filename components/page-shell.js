import Link from "next/link";
import { RccgMark } from "@/components/rccg-mark";

export function PageShell({ children }) {
  return (
    <main className="app-shell">
      <header className="site-header">
        <Link href="/" className="header-brand" aria-label="Go to home page">
          <RccgMark compact />
          <div className="header-copy">
            <strong>RCCG Region 46</strong>
            <span>Regional Quiz Portal</span>
          </div>
        </Link>
      </header>
      {children}
    </main>
  );
}
