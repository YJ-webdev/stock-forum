"use client";

import {
  // MarketItem,
  SelectedRange,
  useMarketQuote,
} from "@/app/hooks/useMarketQuote";

import { MarketSymbolItem } from "@/lib/data/market-symbols";

import { TrendSparkline } from "./trend-sparkline";
import { Numeric } from "./numeric";

// import { useState } from "react";
import { useRouter } from "next/navigation";

// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";

// import { ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";

// import { useCountdown } from "../hooks/useCountdown";
import { useSectionB } from "../context/section-b-context";

interface RelativeStocksProps {
  items: MarketSymbolItem[];
  setActiveRange: React.Dispatch<React.SetStateAction<SelectedRange>>;
}

interface RelativeStockRowProps {
  item: MarketSymbolItem;
  setActiveRange: React.Dispatch<React.SetStateAction<SelectedRange>>;
}

// interface VoteButtonProps {
//   displaySymbol: string;
//   name: string;
//   marketOpenMs: number;
// }

// interface VoteClosedProps {
//   marketOpenMs: number | null;
// }

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

              <th className="w-[25%] md:w-auto py-3 px-2 text-right pr-2 sm:pr-0">
                Price
              </th>

              <th className="hidden md:table-cell py-3 text-right">24h %</th>

              <th className="hidden md:table-cell py-3 text-right pr-4">
                Change
              </th>

              {/* <th className="w-[25%] md:w-auto py-3 pl-2 pr-3 md:pr-4 text-right">
                VOTE
              </th> */}
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
    router.push(href);
  };

  return (
    <tr
      onClick={handleRowClick}
      className="h-8 hover:cursor-pointer border-b last:border-b-0 border-zinc-200/80 dark:border-zinc-700/50 hover:bg-zinc-100/60 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-100 transition-colors text-[14px] md:text-[15px]"
    >
      {/* Symbol & Name */}
      <td className="pl-3 md:pl-4 overflow-hidden text-ellipsis">
        <div className="shrink-0 font-medium text-[15.5px] -mb-0.75">
          {item.displaySymbol}
        </div>

        <p className="truncate block w-full text-sm font-normal text-zinc-900/50 dark:text-zinc-300/70 dark:font-normal">
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
      <td className="py-3 font-medium dark:font-normal pr-2 sm:pr-0 min-w-fit text-right whitespace-nowrap overflow-hidden text-ellipsis">
        <Numeric>{quote?.value ?? "-"}</Numeric>
      </td>

      {/* Change % */}
      <td
        className={`hidden md:table-cell font-medium dark:font-semibold py-3.5 text-right whitespace-nowrap ${priceColor}`}
      >
        <Numeric>{quote?.percent ?? "-"}</Numeric>
      </td>

      {/* Change */}
      <td
        className={`hidden md:table-cell py-3.5 pr-4 font-medium dark:font-semibold text-right self-end whitespace-nowrap ${priceColor}`}
      >
        <Numeric>{quote?.change ?? "-"}</Numeric>
      </td>

      {/* Vote */}
      {/* <td className="pr-3 text-right">
        <VoteStatus quote={quote} loading={loading} item={item} />
      </td> */}
    </tr>
  );
}

// -----------------------------------------------------------------------------
// VOTE STATUS
// -----------------------------------------------------------------------------

// function VoteStatus({
//   quote,
//   loading,
//   item,
// }: {
//   quote: MarketItem | null;
//   loading: boolean;
//   item: MarketSymbolItem;
// }) {
//   if (loading && !quote) {
//     return (
//       <div className="flex justify-end">
//         <div className="h-7 w-20.5 bg-zinc-200/70 dark:bg-zinc-700/60 animate-pulse" />
//       </div>
//     );
//   }

//   if (!quote) {
//     return <VotingUnavailable />;
//   }

//   // Market OPEN → voting disabled
//   if (!quote.isClosed) {
//     return <VotingDisabled />;
//   }

//   // Market CLOSED + next open known → voting available
//   if (quote.marketOpenMs) {
//     return (
//       <VoteButton
//         displaySymbol={item.displaySymbol}
//         name={item.name}
//         marketOpenMs={quote.marketOpenMs}
//       />
//     );
//   }

//   // Closed, but we don't know when it opens again
//   return <VotingUnavailable />;
// }

// function VoteButton({ displaySymbol, name, marketOpenMs }: VoteButtonProps) {
//   const [selectedSide, setSelectedSide] = useState<"bull" | "bear" | null>(
//     null,
//   );

//   const [activeVote, setActiveVote] = useState<"bull" | "bear" | null>(null);

//   const [isOpen, setIsOpen] = useState(false);
//   const [bidAmount, setBidAmount] = useState(0);
//   const [errorMsg, setErrorMsg] = useState<string | null>(null);

//   const handleOpenSide = (side: "bull" | "bear") => {
//     setSelectedSide(side);
//     setErrorMsg(null);
//     setIsOpen(true);
//   };

//   const handleConfirm = () => {
//     if (!selectedSide) {
//       setErrorMsg("Please select Bull or Bear.");
//       return;
//     }

//     const sanitizedBid = Math.min(500, Math.max(50, bidAmount || 50));

//     setBidAmount(sanitizedBid);
//     setActiveVote(selectedSide);
//     setErrorMsg(null);
//     setIsOpen(false);

//     /*
//      * Later:
//      *
//      * submitPrediction({
//      *   symbol,
//      *   side: selectedSide,
//      *   amount: sanitizedBid,
//      * });
//      */
//   };

//   return (
//     <Popover open={isOpen} onOpenChange={setIsOpen}>
//       <div className="flex items-center justify-end">
//         <div className="inline-flex shadow-xs overflow-hidden border border-zinc-300 dark:border-zinc-700">
//           {/* Bull */}
//           <PopoverTrigger
//             onClick={(event) => {
//               event.stopPropagation();
//               handleOpenSide("bull");
//             }}
//           >
//             <div
//               className={`px-2.5 py-1 text-sm transition-colors cursor-pointer ${
//                 activeVote === "bull"
//                   ? "bg-emerald-700 text-white"
//                   : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
//               }`}
//             >
//               Bull
//             </div>
//           </PopoverTrigger>

//           {/* Bear */}
//           <PopoverTrigger
//             onClick={(event) => {
//               event.stopPropagation();
//               handleOpenSide("bear");
//             }}
//           >
//             <div
//               className={`px-2.5 py-1 text-sm transition-colors cursor-pointer border-l border-zinc-300 dark:border-zinc-700 ${
//                 activeVote === "bear"
//                   ? "bg-rose-700 text-white"
//                   : "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-400"
//               }`}
//             >
//               Bear
//             </div>
//           </PopoverTrigger>
//         </div>
//       </div>

//       <PopoverContent
//         align="end"
//         sideOffset={8}
//         className="w-64 p-4 bg-white dark:bg-zinc-800 border rounded-md border-zinc-200 dark:border-zinc-700 shadow-xl text-sm gap-0"
//         onClick={(event) => {
//           event.stopPropagation();
//         }}
//       >
//         {/* Symbol / Name */}
//         <p className="text-lg flex flex-col self-center items-center leading-tight">
//           <span>{displaySymbol}</span>

//           <span className="text-sm font-thin">{name}</span>
//         </p>

//         {/* Balance */}
//         <div className="flex items-center justify-end text-[12px] gap-1 mt-2.5 mb-1 dark:font-thin">
//           <span className="text-zinc-800 dark:text-zinc-300">Balance.</span>

//           <span className="text-zinc-800 dark:text-zinc-300">1,250</span>
//         </div>

//         {/* Bid */}
//         <div className="space-y-2">
//           <div className="relative flex items-center">
//             <input
//               type="number"
//               value={bidAmount || ""}
//               onChange={(event) => {
//                 const value =
//                   event.target.value === "" ? 0 : Number(event.target.value);

//                 setBidAmount(Math.min(500, value));
//               }}
//               onBlur={() => {
//                 setBidAmount((previous) =>
//                   Math.min(500, Math.max(50, previous)),
//                 );
//               }}
//               max={500}
//               min={50}
//               autoFocus
//               placeholder="Enter points"
//               className="w-full h-8.5 placeholder:text-zinc-900 dark:placeholder:text-zinc-100 dark:placeholder:font-thin bg-zinc-300/50 dark:bg-zinc-900 rounded-none py-1.5 pl-2.5 pr-24 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-800 dark:focus:ring-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
//             />

//             <span className="absolute right-1.5 text-[10px] text-zinc-400 uppercase">
//               Min 50 - Max 500
//             </span>
//           </div>

//           {/* Quick amounts */}
//           <div className="grid grid-cols-4 gap-1.5">
//             {[50, 100, 250, 500].map((amount) => (
//               <button
//                 key={amount}
//                 type="button"
//                 onClick={() => setBidAmount(amount)}
//                 className={`py-1 text-[12px] rounded-none transition-colors cursor-pointer ${
//                   bidAmount === amount
//                     ? "bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100 dark:font-thin border-transparent"
//                     : "bg-zinc-200/50 dark:bg-zinc-900/50 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700/50"
//                 }`}
//               >
//                 {amount}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Error */}
//         {errorMsg && (
//           <p className="mt-2 text-[11px] text-red-500 text-right">{errorMsg}</p>
//         )}

//         {/* Actions */}
//         <div className="flex gap-1.5 mt-5 mb-1.5">
//           <button
//             type="button"
//             onClick={() => setIsOpen(false)}
//             className="flex-1 py-1.5 rounded-xs border cursor-pointer border-zinc-200 dark:border-zinc-700 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
//           >
//             Cancel
//           </button>

//           <button
//             type="button"
//             disabled={!selectedSide}
//             onClick={handleConfirm}
//             className={`flex-1 py-1.5 capitalize rounded-xs text-white transition-colors flex items-center justify-center gap-1 ${
//               !selectedSide
//                 ? "bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed opacity-60"
//                 : selectedSide === "bull"
//                   ? "bg-emerald-700 hover:bg-[#009c5d] cursor-pointer"
//                   : "bg-[#e60909] hover:bg-[#f50000] cursor-pointer"
//             }`}
//           >
//             <span className="flex items-center">
//               {selectedSide ?? "Select"}
//             </span>

//             {selectedSide === "bull" && (
//               <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
//             )}

//             {selectedSide === "bear" && (
//               <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
//             )}
//           </button>
//         </div>

//         {/* Time remaining to vote */}
//         <VotingCountdown marketOpenMs={marketOpenMs} />
//       </PopoverContent>
//     </Popover>
//   );
// }

// function VotingCountdown({ marketOpenMs }: { marketOpenMs: number }) {
//   const { hours, minutes, seconds } = useCountdown(marketOpenMs);

//   return (
//     <div className="flex items-center gap-1.5 text-[11px] justify-end -mb-1.5 mt-1 min-h-4">
//       <div className="flex items-center gap-1.5 font-thin text-zinc-500 dark:text-zinc-400">
//         <RefreshCw className="w-2.5 h-2.5 shrink-0" />

//         <div className="flex gap-1">
//           <span>Voting closes in</span>

//           <div className="flex">
//             <span>{hours}</span>:<span>{minutes}</span>:<span>{seconds}</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function VotingUnavailable() {
//   return (
//     <div className="mr-1 flex items-center font-normal justify-end text-zinc-400 dark:text-zinc-600 whitespace-nowrap">
//       -
//     </div>
//   );
// }

// function VotingDisabled() {
//   return (
//     <div className="mr-1 flex items-center font-normal justify-end text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
//       Closed
//     </div>
//   );
// }
