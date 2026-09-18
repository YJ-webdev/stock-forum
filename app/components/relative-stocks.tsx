"use client";

import { SelectedRange, useMarketQuote } from "@/app/hooks/useMarketQuote";
import { MarketSymbolItem } from "@/lib/data/market-symbols";
import { TrendSparkline } from "./trend-sparkline";
import { Numeric } from "./numeric";
import { useRouter } from "next/navigation";
import { useSectionB } from "../context/section-b-context";
import { MdOutlineHowToVote } from "react-icons/md";

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
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-wider text-zinc-400 dark:border-zinc-700/50 dark:text-zinc-500 md:text-xs">
              {/* Asset */}
              <th className="w-[37%] py-3.5 pl-4 text-left md:w-[17%] md:py-3">
                Asset
              </th>

              {/* Trend - desktop only */}
              <th className="hidden py-3 text-center md:table-cell md:w-[17%]">
                Trend
              </th>

              {/* Price */}
              <th className="w-[27%] py-3.5 pr-2 text-right md:w-[16%] md:py-3 md:pr-0">
                Price
              </th>

              {/* 24h % */}
              <th className="hidden py-3 text-right md:table-cell md:w-[11%]">
                24h %
              </th>

              {/* Change */}
              <th className="hidden py-3 text-right md:table-cell md:w-[14%]">
                Change
              </th>

              {/* Vote */}
              <th className="w-[25%] px-3 py-3.5 text-right md:w-[17%] md:px-4 md:py-3">
                Vote
              </th>

              {/* Action */}
              <th className="w-[11%] py-3.5 pr-3 md:w-[8%] md:py-3">
                <span className="sr-only md:not-sr-only">Action</span>
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
      className="
      border-b border-zinc-200/80
      text-[14px] text-zinc-800
      transition-colors
      last:border-b-0
      hover:cursor-pointer hover:bg-zinc-100/60
      dark:border-zinc-700/50 dark:text-zinc-100 dark:hover:bg-zinc-900
      md:text-[15px]
    "
    >
      {/* Asset */}
      <td className="w-[37%] overflow-hidden py-3 pl-4 leading-snug md:w-[17%] md:py-2.5">
        <div className="truncate text-[16px] font-medium leading-[18px] md:text-[17px]">
          {item.displaySymbol}
        </div>

        <p className="mt-0.5 block w-full truncate pr-2 text-[12px] font-normal text-zinc-500 dark:text-zinc-400 md:text-[13px]">
          {item.name}
        </p>
      </td>

      {/* Trend - desktop only */}
      <td className="hidden overflow-hidden py-2.5 align-middle md:table-cell md:w-[17%]">
        <div className="flex w-full justify-center overflow-hidden">
          <TrendSparkline
            data={quote?.history}
            isPositive={quote?.isPositive}
            lunchStartMs={quote?.lunchStartMs}
            lunchEndMs={quote?.lunchEndMs}
          />
        </div>
      </td>

      {/* Price */}
      <td className="w-[27%] whitespace-nowrap py-3 pr-2 text-right font-medium md:w-[16%] md:py-3 md:pr-0 dark:font-normal">
        <Numeric>
          {quote?.value ?? "-"}

          <span
            className={`mt-0.5 block text-[12px] leading-[16px] font-medium md:hidden ${priceColor}`}
          >
            {quote?.percent ?? "-"}
          </span>
        </Numeric>
      </td>

      {/* 24h % */}
      <td
        className={`hidden whitespace-nowrap py-3.5 text-right font-medium dark:font-semibold md:table-cell md:w-[11%] ${priceColor}`}
      >
        <Numeric>{quote?.percent ?? "-"}</Numeric>
      </td>

      {/* Change */}
      <td
        className={`hidden whitespace-nowrap py-3.5 text-right font-medium dark:font-semibold md:table-cell md:w-[14%] ${priceColor}`}
      >
        <Numeric>{quote?.change ?? "-"}</Numeric>
      </td>

      {/* Vote */}
      <td className="w-[25%] px-3 py-3 md:w-[17%] md:px-4 md:py-3.5">
        <div className="flex h-2.5 w-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 md:h-2">
          <div
            className="bg-emerald-600 transition-[width] duration-300"
            style={{ width: "50%" }}
          />
          <div
            className="bg-rose-600 transition-[width] duration-300"
            style={{ width: "50%" }}
          />
        </div>
      </td>

      {/* Action */}
      <td className="w-[11%] py-3 pr-3 text-center md:w-[8%] md:px-2 md:py-3.5">
        <MdOutlineHowToVote className="mx-auto h-5 w-5 text-zinc-700 dark:text-zinc-300" />
      </td>
    </tr>
  );
}
