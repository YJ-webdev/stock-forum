// import { ArrowDown, ArrowUp } from "lucide-react";
// import { Sparkline } from "./sparkline";
// import { useFinnhubQuote } from "../hooks/useFinnhubQuote";
// import { Skeleton } from "@/components/ui/skeleton";
// import { Card } from "@/components/ui/card";
// import { DetailChart } from "./detail-chart";

// interface MarketCardProps {
//   symbol: string;
//   name: string;
//   category: string;
//   isSelected?: boolean;
//   onClick?: () => void;
//   range?: string;
// }

// export function MarketCard({
//   symbol,
//   name,
//   category,
//   isSelected,
//   range = "1D",
//   onClick,
// }: MarketCardProps) {
//   const { data, loading } = useFinnhubQuote(symbol, name);

//   if (loading) {
//     return (
//       <div className="bg-gray-100/80 border-none dark:bg-muted-foreground/5 rounded-lg h-44 p-4 flex flex-col justify-between animate-pulse">
//         <Skeleton className="h-5 w-full bg-zinc-200 dark:bg-zinc-800" />
//         <Skeleton className="h-6 w-1/2 bg-zinc-200 dark:bg-zinc-800" />
//       </div>
//     );
//   }

//   if (!data) {
//     return (
//       <Card className="border-none bg-gray-100/80 dark:bg-muted-foreground/5 rounded-2xl h-44 p-4 flex flex-col justify-center items-center">
//         <p className="text-xs text-slate-400 dark:text-white font-medium">
//           Failed to load {name}
//         </p>
//       </Card>
//     );
//   }

//   return (
//     <div
//       onClick={onClick}
//       className={`h-44 overflow-hidden m-0 p-0 rounded-lg cursor-pointer transition-all border ${
//         isSelected
//           ? "border-emerald-600 bg-emerald-50/20 dark:border-emerald-500 dark:bg-emerald-950/20"
//           : "border-transparent bg-gray-100/80 dark:bg-zinc-800 hover:bg-gray-200/80 dark:hover:bg-zinc-700/50"
//       }`}
//     >
//       <div className="flex flex-col justify-between h-48 m-0 p-0">
//         <div className="flex flex-col">
//           <div className="flex items-center justify-between w-full">
//             <span className="mx-2 my-1.5 border w-fit ml-auto rounded-full shrink-0 text-[9px] uppercase text-zinc-500 dark:text-zinc-200 bg-white dark:bg-zinc-700 px-1">
//               15min delay
//             </span>
//           </div>
//           <div className="flex items-start justify-between mx-3.5">
//             <h3 className="line-clamp-2 text-zinc-800 font-medium dark:text-zinc-200 text-lg tracking-tight leading-tight">
//               {data.name}
//             </h3>
//           </div>
//           <p className="text-zinc-700 dark:text-zinc-400 text-sm mx-3.5">
//             {data.value}{" "}
//             <span className="text-zinc-500 dark:text-zinc-400 font-normal">
//               ({data.change})
//             </span>
//           </p>
//         </div>

//         <div className="-translate-y-1">
//           <div className="flex items-center justify-end gap-1.5 font-semibold text-xl mx-2">
//             <span
//               className={
//                 data.isPositive ? "text-emerald-700" : "text-[#cf0000]"
//               }
//             >
//               {data.percent}
//             </span>
//             <div
//               className={`flex items-center justify-center w-5 h-5 rounded-full text-white text-xs ${data.isPositive ? "bg-emerald-700" : "bg-[#cf0000]"}`}
//             >
//               {data.isPositive ? (
//                 <ArrowUp className="w-3 h-3" />
//               ) : (
//                 <ArrowDown className="w-3 h-3" />
//               )}
//             </div>
//           </div>
//           <div className="-translate-y-4">
//             <DetailChart  />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
