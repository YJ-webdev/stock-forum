import { auth } from "@/auth";
import { getNavbarBalance } from "@/app/actions/get-navbar-balance";

export async function NavbarBalance() {
  const session = await auth();

  if (!session?.user?.id) return null;

  const { cash, totalEquity } = await getNavbarBalance(session.user.id);

  return (
    <div className="hidden md:flex items-center gap-4 px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-xs font-mono">
      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase font-sans">
          Equity
        </span>
        <span className="font-bold text-foreground">
          $
          {totalEquity.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
      <div className="h-6 w-px bg-border" />
      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase font-sans">
          Cash
        </span>
        <span className="font-semibold text-muted-foreground">
          $
          {cash.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}
