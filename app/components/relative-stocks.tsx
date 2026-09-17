"use client";

import { SelectedRange, useMarketQuote } from "@/app/hooks/useMarketQuote";

import { MarketSymbolItem } from "@/lib/data/market-symbols";

import { TrendSparkline } from "./trend-sparkline";
import { Numeric } from "./numeric";

import { useRouter } from "next/navigation";

import { useSectionB } from "../context/section-b-context";

interface RelativeStocksProps {
  items: MarketSymbolItem[];
  setActiveRange: React.Dispatch<React.SetStateAction<SelectedRange>>;
}

interface RelativeStockRowProps {
  item: MarketSymbolItem;
  setActiveRange: React.Dispatch<React.SetStateAction<SelectedRange>>;
}

export function RelativeStocks({ items, setActiveRange }: RelativeStocksProps) {
  return (
    <div className="w-full flex flex-col">
      <div className="w-full bg-zinc-100 dark:bg-zinc-800/50 md:bg-white md:shadow-sm md:border md:rounded-lg border-zinc-200 dark:border-zinc-800/50">
        <table className="w-full table-fixed text-left text-[14px] md:text-[15px] border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700/50 text-zinc-400 dark:text-zinc-500 uppercase text-xs tracking-wider">
              <th className="w-[25%] md:w-auto py-3 px-2 text-left pl-3 md:pl-4">
                Asset
              </th>

              <th className="w-[25%] md:w-auto py-3 px-2 text-center">Trend</th>

              <th className="w-[25%] md:w-auto py-3 px-2 text-right pr-3 md:pr-0">
                Price
              </th>

              <th className="hidden md:table-cell py-3 text-right">24h %</th>

              <th className="hidden md:table-cell py-3 text-right">Change</th>

              <th className="w-[25%] md:w-auto py-3 pl-2 pr-3 md:pr-4 text-right">
                VOTE
              </th>
            </tr>
          </thead>

          <tbody className="font-medium">
            {items.map((item) => (
              <RelativeStockRow
                key={item.symbol}
                item={item}
                setActiveRange={setActiveRange}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RelativeStockRow({ item, setActiveRange }: RelativeStockRowProps) {
  const router = useRouter();
  const { showWrite } = useSectionB();
  /*
   * No polling.
   *
   * Your market data is delayed anyway, so RelativeStocks
   * performs the normal cached fetch through useMarketQuote.
   */
  const { data: quote, loading } = useMarketQuote(
    item.symbol,
    item.name,
    "1D",
    item.displaySymbol,
    item.assetType,
  );

  const priceColor = quote?.isPositive
    ? "text-emerald-700 dark:text-emerald-600"
    : "text-[#cf0000] dark:text-[#cf0000]";

  const href = `/market?symbol=${encodeURIComponent(
    item.symbol,
  )}&name=${encodeURIComponent(item.name)}&category=${encodeURIComponent(
    item.assetType === "index" ? item.region : item.assetType,
  )}&range=1D`;

  const handleRowClick = () => {
    showWrite();
    router.push(href, { scroll: true });
  };

  return (
    <tr
      onClick={handleRowClick}
      className="h-8 hover:cursor-pointer border-b last:border-b-0 border-zinc-200/80 dark:border-zinc-700/50 hover:bg-zinc-100/60 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-100 transition-colors text-[14px] md:text-[15px]"
    >
      {/* Symbol & Name */}
      <td className="pl-3 md:pl-4 overflow-hidden text-ellipsis leading-snug">
        <div className="shrink-0 font-medium text-[17px] -mb-0.75">
          {item.displaySymbol}
        </div>

        <p className="truncate block w-full text-[13px] font-normal text-zinc-900/50 dark:text-zinc-300/70 dark:font-normal">
          {item.name}
        </p>
      </td>

      {/* Trend */}
      <td className="py-2.5 align-middle overflow-hidden">
        <div className="w-full overflow-hidden flex justify-center">
          <TrendSparkline
            data={quote?.history}
            isPositive={quote?.isPositive}
            lunchStartMs={quote?.lunchStartMs}
            lunchEndMs={quote?.lunchEndMs}
          />
        </div>
      </td>

      {/* Price */}
      <td className="md:py-3 pr-3 md:pr-0 font-medium dark:font-normal min-w-fit text-right whitespace-nowrap overflow-hidden text-ellipsis">
        <Numeric className="">
          {quote?.value ?? "-"}
          <span
            className={`block md:hidden font-medium dark:font-semibold text-right whitespace-nowrap ${priceColor}`}
          >
            {quote?.percent ?? "-"}
          </span>
        </Numeric>{" "}
      </td>

      {/* Change % */}
      <td
        className={`hidden md:table-cell font-medium dark:font-semibold py-3.5 text-right whitespace-nowrap ${priceColor}`}
      >
        <Numeric>{quote?.percent ?? "-"}</Numeric>
      </td>

      {/* Change */}
      <td
        className={`hidden md:table-cell py-3.5 font-medium dark:font-semibold text-right self-end whitespace-nowrap ${priceColor}`}
      >
        <Numeric>{quote?.change ?? "-"}</Numeric>
      </td>

      {/* Vote */}
      <td
        className={` py-3.5 pr-4 md:pl-5 font-medium dark:font-semibold text-right self-end whitespace-nowrap ${priceColor}`}
      >
        <div className="flex h-2 w-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 ml-auto">
          <div
            className="bg-emerald-600 transition-[width] duration-300"
            style={{ width: `${50}%` }}
          />

          <div
            className="bg-rose-600 transition-[width] duration-300"
            style={{ width: `${50}%` }}
          />
        </div>
      </td>
    </tr>
  );
}
