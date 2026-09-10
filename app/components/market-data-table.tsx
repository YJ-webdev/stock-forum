// "use client";

// import { useEffect, useRef, useState } from "react";
// import { MarketAssetClient } from "../../types/index.ts";

// // 1. Custom hook to track price changes
// function usePriceFlash(currentPrice: number) {
//   const [flash, setFlash] = useState<"up" | "down" | "none">("none");
//   const prevPriceRef = useRef<number>(currentPrice);

//   useEffect(() => {
//     const prevPrice = prevPriceRef.current;

//     if (currentPrice > prevPrice) {
//       setFlash("up");
//     } else if (currentPrice < prevPrice) {
//       setFlash("down");
//     }

//     prevPriceRef.current = currentPrice;

//     // Reset animation state after 1 second
//     const timer = setTimeout(() => {
//       setFlash("none");
//     }, 1000);

//     return () => clearTimeout(timer);
//   }, [currentPrice]);

//   return flash;
// }

// // 2. Animated Price Cell Sub-Component
// function PriceCell({ price }: { price: number }) {
//   const flash = usePriceFlash(price);

//   return (
//     <td
//       className={`px-4 py-3 font-mono transition-colors rounded ${
//         flash === "up"
//           ? "animate-flash-green"
//           : flash === "down"
//             ? "animate-flash-red"
//             : ""
//       }`}
//     >
//       ${price ? price.toFixed(2) : "0.00"}
//     </td>
//   );
// }

// // 3. Main MarketDataTable Component
// export function MarketDataTable({
//   marketData,
// }: {
//   marketData: MarketAssetClient[];
// }) {
//   return (
//     <div className="w-full overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
//       <table className="w-full text-left text-sm border-collapse">
//         <thead>
//           <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
//             <th className="px-4 py-3 font-medium">Symbol</th>
//             <th className="px-4 py-3 font-medium">Price</th>
//             <th className="px-4 py-3 font-medium">Change</th>
//             <th className="px-4 py-3 font-medium">Change %</th>
//             <th className="px-4 py-3 font-medium">Volume</th>
//           </tr>
//         </thead>
//         <tbody>
//           {marketData.map((item) => {
//             const isPositive = (item.change ?? 0) >= 0;

//             return (
//               <tr
//                 key={item.symbol}
//                 className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
//               >
//                 <td className="px-4 py-3 font-semibold">{item.symbol}</td>

//                 {/* Live Animated Price Cell */}
//                 <PriceCell price={item.price ?? item.lastPrice ?? 0} />

//                 <td
//                   className={`px-4 py-3 font-mono ${
//                     isPositive
//                       ? "text-green-600 dark:text-green-400"
//                       : "text-red-600 dark:text-red-400"
//                   }`}
//                 >
//                   {isPositive
//                     ? `+${item.change?.toFixed(2)}`
//                     : item.change?.toFixed(2)}
//                 </td>
//                 <td
//                   className={`px-4 py-3 font-mono ${
//                     isPositive
//                       ? "text-green-600 dark:text-green-400"
//                       : "text-red-600 dark:text-red-400"
//                   }`}
//                 >
//                   {isPositive
//                     ? `+${item.changePercent?.toFixed(2)}%`
//                     : `${item.changePercent?.toFixed(2)}%`}
//                 </td>
//                 <td className="px-4 py-3 font-mono text-zinc-500">
//                   {item.volume || "N/A"}
//                 </td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>
//     </div>
//   );
// }
