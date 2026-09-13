"use client";

import Link from "next/link";
import { useMarketQuote } from "@/app/hooks/useMarketQuote";
import {
  getMarketCloseTarget,
  getMarketOpenTarget,
  isMarketOpen,
  MarketSymbolItem,
} from "@/lib/data/market-symbols";
import { TrendSparkline } from "./trend-sparkline";
import { useCallback, useMemo, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useCountdown } from "../hooks/useCountdown";
import { useRouter } from "next/navigation";
import { Numeric } from "./numeric";

interface RelativeStocksProps {
  items: MarketSymbolItem[]; // 🟢 Accepts the filtered list directly
}
export function RelativeStocks({ items }: RelativeStocksProps) {
  return (
    <div className="w-full flex flex-col">
      {/* Container: No margins, paddings, or extra constraints */}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800/50 md:bg-white md:shadow-sm md:border md:rounded-lg border-zinc-200 dark:border-zinc-800/50">
        <table className="w-full table-fixed text-left text-[14px] md:text-[15px] border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700/50 text-zinc-400 dark:text-zinc-500 uppercase text-xs tracking-wider">
              <th className="w-[25%] md:w-auto py-3 px-2 text-left pl-3 md:pl-4">
                Asset
              </th>
              <th className="w-[25%] md:w-auto py-3 px-2 text-center">Trend</th>

              <th className="w-[25%] md:w-auto py-3 px-2 text-right pr-2 sm:pr-0">
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
              <RelativeStockRow key={item.symbol} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RelativeStockRow({ item }: { item: MarketSymbolItem }) {
  const { data: quote } = useMarketQuote(
    item.symbol,
    item.name,
    "1D",
    item.displaySymbol,
    item.assetType,
  );
  const router = useRouter();

  const priceColor = quote?.isPositive
    ? "text-emerald-700 dark:text-emerald-600"
    : "text-[#cf0000] dark:text-[#cf0000]";

  const [marketOpened, setMarketOpened] = useState(() => isMarketOpen(item));

  const handleMarketStatusCheck = useCallback(() => {
    setMarketOpened(isMarketOpen(item));
  }, [item]);

  const href = `/market?symbol=${encodeURIComponent(
    item.symbol,
  )}&name=${encodeURIComponent(
    item.name,
  )}&category=${encodeURIComponent(item.region)}`;

  const handleRowClick = () => {
    router.push(href);
  };

  return (
    <tr
      onClick={handleRowClick}
      className="hover:cursor-pointer border-b last:border-b-0 border-zinc-200/80 dark:border-zinc-700/50 hover:bg-zinc-100/60 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-100 transition-colors text-[14px] md:text-[15px]"
    >
      {/* Symbol & Name */}
      <td className="pl-3 md:pl-4 overflow-hidden text-ellipsis">
        {/* <Link
          href={`/market?symbol=${encodeURIComponent(
            item.symbol,
          )}&name=${encodeURIComponent(
            item.name,
          )}&category=${encodeURIComponent(item.region)}`}
          className="flex flex-col items-start gap-0.5 justify-center min-w-0"
        > */}
        <div className="shrink-0 font-medium text-[15.5px] -mb-0.75">
          {item.displaySymbol}
        </div>
        <p className="truncate block w-full text-sm font-normal text-zinc-900/50 dark:text-zinc-300/70 dark:font-normal">
          {item.name}
        </p>
        {/* </Link> */}
      </td>

      {/* Trend */}
      <td className="py-3  align-middle overflow-hidden">
        <div className="w-full overflow-hidden flex justify-center">
          <TrendSparkline
            data={quote?.history}
            isPositive={quote?.isPositive}
          />
        </div>
      </td>

      {/* Price */}
      <td className="py-3 font-medium dark:font-normal pr-2 sm:pr-0 min-w-fit text-right whitespace-nowrap overflow-hidden text-ellipsis">
        <Numeric>{quote?.value ?? "-"}</Numeric>
        {/* <Numeric className={`md:hidden ${priceColor}`}>
          {quote?.percent ?? "-"}
        </Numeric> */}
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

      {/* Users Prediction */}
      <td className="pr-3 text-right">
        {marketOpened ? (
          <VoteButton
            item={item}
            displaySymbol={item.displaySymbol}
            name={item.name}
            onExpire={handleMarketStatusCheck}
          />
        ) : (
          <VoteClosed item={item} onExpire={handleMarketStatusCheck} />
        )}
      </td>
    </tr>
  );
}

interface VoteButtonProps {
  displaySymbol: string;
  name: string;
  item: MarketSymbolItem;
  isMarketOpen?: boolean; // Optional prop, or check dynamically
  onMarketClosed?: () => void;
  onExpire: () => void;
}

function VoteButton({
  displaySymbol,
  name,
  item,
  onMarketClosed,
  isMarketOpen,
  onExpire,
}: VoteButtonProps) {
  // Determine target date and callback dynamically based on open/closed state
  const targetDate = useMemo(() => {
    return isMarketOpen
      ? getMarketCloseTarget(item)
      : getMarketOpenTarget(item);
  }, [item, isMarketOpen]);

  const onTimerExpire = isMarketOpen ? onMarketClosed : onExpire;

  const { hours, minutes, seconds } = useCountdown(targetDate, onTimerExpire);

  const [selectedSide, setSelectedSide] = useState<"bull" | "bear" | null>(
    null,
  );
  const [activeVote, setActiveVote] = useState<"bull" | "bear" | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [bidAmount, setBidAmount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // const handleConfirm = () => {
  //   const currentlyOpen = isMarketOpen(item);

  //   if (!currentlyOpen) {
  //     setErrorMsg("Market is currently closed for this asset.");
  //     if (onMarketClosed) {
  //       setTimeout(() => {
  //         onMarketClosed();
  //         setIsOpen(false);
  //       }, 1500);
  //     }
  //     return;
  //   }

  //   const sanitizedBid = Math.min(500, Math.max(50, bidAmount || 50));
  //   setBidAmount(sanitizedBid);
  //   setActiveVote(selectedSide);
  //   setErrorMsg(null);
  //   setIsOpen(false);

  //   // Proceed to backend API call
  //   // submitPrediction({ symbol: item.symbol, side: selectedSide, amount: sanitizedBid });
  // };

  const handleOpenSide = (side: "bull" | "bear") => {
    setSelectedSide(side);
    setErrorMsg(null); // Clear previous errors
    setIsOpen(true);
  };

  return (
    // 2. Pass explicit open state and onOpenChange handler
    <Popover open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <div className="flex items-center justify-end">
        <div className="inline-flex shadow-xs overflow-hidden border border-zinc-300 dark:border-zinc-700">
          {/* 3. Remove asChild from buttons and trigger manually, or use PopoverTrigger with a container */}
          <PopoverTrigger onClick={(e) => e.stopPropagation()}>
            <div
              className={`px-2.5 py-1 text-sm  transition-colors cursor-pointer ${
                activeVote === "bull"
                  ? "bg-emerald-700 text-white"
                  : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
              }`}
            >
              Bull
            </div>
          </PopoverTrigger>

          <PopoverTrigger onClick={(e) => e.stopPropagation()}>
            <div
              onClick={() => handleOpenSide("bear")}
              className={`px-2.5 py-1 text-sm  transition-colors cursor-pointer border-l border-zinc-300 dark:border-zinc-700 ${
                activeVote === "bear"
                  ? "bg-rose-700 text-white"
                  : "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-400"
              }`}
            >
              Bear
            </div>
          </PopoverTrigger>
        </div>
      </div>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-64 p-4 bg-white dark:bg-zinc-800 border rounded-md border-zinc-200 dark:border-zinc-700 shadow-xl text-sm gap-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* symbol and namex */}
        <p className="text-lg flex flex-col self-center items-center leading-tight">
          <span>{displaySymbol}</span>
          <span className="text-sm font-thin">{name}</span>
        </p>

        {/* Available Balance */}
        <div className="flex items-center justify-end text-[12px] gap-1 mt-2.5 mb-1 dark:font-thin">
          <span className="text-zinc-800 dark:text-zinc-200">Balance.</span>
          <span className=" text-zinc-800 dark:text-zinc-200">1,250</span>
        </div>

        {/* user balance and bidding value limit as much as 500 */}
        <div className="space-y-2">
          {/* Input Box with Max Constraint */}
          <div className="relative flex items-center">
            <input
              type="number"
              value={bidAmount || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : Number(e.target.value);
                setBidAmount(Math.min(500, val));
              }}
              onBlur={() =>
                setBidAmount((prev) => Math.min(500, Math.max(50, prev)))
              }
              max={500}
              min={50}
              autoFocus
              placeholder="Enter points"
              disabled={!isMarketOpen}
              className={`w-full h-8.5 placeholder:text-zinc-900 dark:placeholder:text-zinc-100 dark:placeholder:font-thin bg-zinc-300/50 dark:bg-zinc-900 rounded-none py-1.5 pl-2.5 pr-24 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-800 dark:focus:ring-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                !isMarketOpen
                  ? "opacity-50 cursor-not-allowed bg-zinc-200/50 dark:bg-zinc-800/50"
                  : ""
              }`}
            />
            {isMarketOpen && (
              <span className="absolute right-1.5 text-[10px] text-zinc-400 uppercase">
                Min 50 - Max 500
              </span>
            )}
          </div>

          {/* Quick Select Presets */}
          {
            <div className="grid grid-cols-4 gap-1.5">
              {[50, 100, 250, 500].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  disabled={!isMarketOpen}
                  onClick={() => setBidAmount(amount)}
                  className={`py-1 text-[12px] rounded-none transition-colors ${
                    bidAmount === amount
                      ? "bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100 dark:font-thin border-transparent"
                      : "bg-zinc-200/50 dark:bg-zinc-900/50 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700/50"
                  } ${isMarketOpen ? "cursor-pointer" : "cursor-not-allowed"}`}
                >
                  {amount}
                </button>
              ))}
            </div>
          }
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 mt-5 mb-1.5">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex-1 py-1.5 rounded-xs border cursor-pointer border-zinc-200 dark:border-zinc-700 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-300  hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isMarketOpen}
            // onClick={handleConfirm}
            className={`flex-1 py-1.5 capitalize rounded-xs text-white transition-colors flex items-center justify-center gap-1 ${
              !isMarketOpen
                ? "bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed opacity-60"
                : selectedSide === "bull"
                  ? "bg-emerald-700 hover:bg-[#009c5d] cursor-pointer"
                  : "bg-[#e60909] hover:bg-[#f50000] cursor-pointer"
            }`}
          >
            <span className="flex items-center">
              {isMarketOpen ? selectedSide : <span>Market closed</span>}
            </span>

            {isMarketOpen && selectedSide === "bull" && (
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            )}

            {isMarketOpen && selectedSide === "bear" && (
              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>
        </div>

        {/* Editability Remaining Time */}
        {/* <div className="flex items-center gap-1.5 text-[11px] justify-end font-thin -mb-1.5 mt-1">
          <RefreshCw className="w-2.5 h-2.5 shrink-0" />

          <div className="flex gap-1">
            Adjustable within
            <div className="flex gap-0.5">
              <span>{hours}</span>h
              <p>
                <span>{minutes}</span>m
              </p>
              <p>
                <span>{seconds}</span>s
              </p>
            </div>
          </div>
        </div> */}
        {/* Footer: Dynamic Error Message OR Remaining Time Timer */}
        <div className="flex items-center gap-1.5 text-[11px] justify-end -mb-1.5 mt-1 min-h-4">
          {isMarketOpen ? (
            <div className="flex items-center gap-1.5 font-thin text-zinc-500 dark:text-zinc-400">
              <RefreshCw className="w-2.5 h-2.5 shrink-0" />
              <div className="flex gap-1">
                <span>Adjustable within</span>
                <div className="flex ">
                  <span>{hours}</span>:<span>{minutes}</span>:
                  <span>{seconds}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-thin text-zinc-500 dark:text-zinc-400">
              <Clock className="w-2.5 h-2.5 shrink-0" />
              <div className="flex gap-1">
                <span>Market opens in</span>
                <div className="flex ">
                  <span>{hours}</span>:<span>{minutes}</span>:
                  <span>{seconds}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function VoteClosed({
  item,
  onExpire,
}: {
  item: MarketSymbolItem;
  onExpire?: () => void;
}) {
  const targetOpenDate = useMemo(() => getMarketOpenTarget(item), [item]);

  // 만료 시 trigger될 콜백 전달
  const { hours, minutes, seconds } = useCountdown(targetOpenDate, onExpire);

  return (
    <>
      {/* <div className="flex items-center justify-end text-[12px] gap-1 text-zinc-500 dark:text-zinc-400 dark:font-thin whitespace-nowrap">
        <div className="flex text-[13px] dark:font-thin text-zinc-700 dark:text-zinc-300">
          <span>{hours}</span>:<span>{minutes}</span>:<span>{seconds}</span>
        </div>
      </div> */}
      <div className="mr-1 flex items-center font-normal justify-end text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
        Closed
      </div>
    </>
  );
}
