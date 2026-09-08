export const GLOBAL_EXCHANGE_LOGOS = [
  {
    name: "S&P 500",
    symbol: "US500",
    logoUrl: "https://cdn.simpleicons.org/spglobal/E11925",
  },
  {
    name: "NASDAQ 100",
    symbol: "US100",
    logoUrl: "https://cdn.simpleicons.org/nasdaq/00A4E4",
  },
  {
    name: "Nikkei 225",
    symbol: "JP225",
    logoUrl: "https://cdn.simpleicons.org/japanexchangegroup/000000",
  },
  {
    name: "Euronext 50",
    symbol: "EU50",
    logoUrl: "https://cdn.simpleicons.org/euronext/003865",
  },
];

export function ExchangeBadge({
  logoUrl,
  name,
  symbol,
}: {
  logoUrl: string;
  name: string;
  symbol: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <img src={logoUrl} alt={name} className="h-4 w-4 object-contain" />
      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
        {name}
      </span>
      <span className="text-[10px] font-mono text-zinc-400">{symbol}</span>
    </div>
  );
}
