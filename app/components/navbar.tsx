import Link from "next/link";
import { NavbarBalance } from "./navbar-balance";
import { UserAccountNav } from "./user-account-nav";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">
        <Link href="/" className="font-bold text-lg tracking-tight">
          TradingHub
        </Link>

        {/* Live Equity & Cash Widget */}
        <NavbarBalance />

        <div className="flex items-center gap-4">
          <UserAccountNav />
        </div>
      </div>
    </header>
  );
}
