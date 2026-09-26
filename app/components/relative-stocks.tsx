"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MdOutlineHowToVote } from "react-icons/md";

import { SelectedRange, useMarketQuote } from "@/app/hooks/useMarketQuote";

import { MarketSymbolItem } from "@/lib/data/market-symbols";
import { getVotingWindow } from "@/lib/utils/get-voting-window";

import {
  getMarketVoteListStats,
  type MarketVoteListStats,
  type MarketVoteListStatsMap,
} from "@/app/actions/market-vote";

import { TrendSparkline } from "./trend-sparkline";
import { Numeric } from "./numeric";

interface RelativeStocksProps {
  items: MarketSymbolItem[];

  setActiveRange: React.Dispatch<React.SetStateAction<SelectedRange>>;
}

interface RelativeStockRowProps {
  item: MarketSymbolItem;

  setActiveRange: React.Dispatch<React.SetStateAction<SelectedRange>>;

  voteStats: MarketVoteListStats | undefined;

  canVote: boolean;
}

export function RelativeStocks({ items, setActiveRange }: RelativeStocksProps) {
  /*
   * Same approach as MarketPageClient.
   *
   * We intentionally keep one stable timestamp for this render
   * instead of calling Date.now() repeatedly for every row.
   */
  const [now] = useState(() => Date.now());

  const [voteStats, setVoteStats] = useState<MarketVoteListStatsMap>({});

  /*
   * Build the voting status for every market using the SAME
   * getVotingWindow() utility used by MarketPageClient.
   */
  const votingStatuses = items.map((item) => {
    const votingWindow = getVotingWindow(item.symbol, now);

    return {
      symbol: item.symbol,
      canVote: votingWindow.canVote,
      predictionFor: votingWindow.predictionFor,
    };
  });

  /*
   * Primitive dependency representing the current set of
   * prediction sessions.
   *
   * This prevents Date objects created by getVotingWindow()
   * from causing the effect to run continuously.
   */
  const votingSessionKey = votingStatuses
    .map(
      (status) =>
        `${status.symbol}:${status.predictionFor?.getTime() ?? "none"}`,
    )
    .join("|");

  useEffect(() => {
    let cancelled = false;

    async function loadVoteStats() {
      const markets = votingStatuses
        .filter(
          (
            status,
          ): status is typeof status & {
            predictionFor: Date;
          } => status.predictionFor !== null,
        )
        .map((status) => ({
          symbol: status.symbol,
          sessionDate: status.predictionFor,
        }));

      if (markets.length === 0) {
        setVoteStats({});
        return;
      }

      try {
        const result = await getMarketVoteListStats({
          markets,
        });

        if (!cancelled) {
          setVoteStats(result);
        }
      } catch (error) {
        console.error("Failed to load market vote stats:", error);

        if (!cancelled) {
          setVoteStats({});
        }
      }
    }

    loadVoteStats();

    return () => {
      cancelled = true;
    };

    // votingSessionKey represents the symbol/session pairs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votingSessionKey]);

  return (
    <div className="flex w-full flex-col">
      <div className="w-full border-zinc-200 bg-zinc-100 dark:border-zinc-800/50 dark:bg-zinc-800/50 md:rounded-lg md:border md:bg-white md:shadow-sm">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-wider text-zinc-400 dark:border-zinc-700/50 dark:text-zinc-500 md:text-xs">
              {/* Asset */}
              <th className="w-[37%] py-3.5 pl-4 text-left md:w-[17%] md:py-3">
                Asset
              </th>

              {/* Trend */}
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
            {items.map((item) => {
              const status = votingStatuses.find(
                (status) => status.symbol === item.symbol,
              );

              return (
                <RelativeStockRow
                  key={item.symbol}
                  item={item}
                  setActiveRange={setActiveRange}
                  voteStats={voteStats[item.symbol]}
                  canVote={status?.canVote ?? false}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RelativeStockRow({
  item,
  setActiveRange,
  voteStats,
  canVote,
}: RelativeStockRowProps) {
  const router = useRouter();

  /*
   * No polling.
   *
   * Market data is delayed anyway, so RelativeStocks
   * performs the normal cached fetch through useMarketQuote.
   */
  const { data: quote } = useMarketQuote(
    item.symbol,
    item.name,
    "1D",
    item.displaySymbol,
    item.assetType,
    0,
    "15m",
  );

  const priceColor = quote?.isPositive
    ? "text-emerald-700 dark:text-emerald-600"
    : "text-[#cf0000] dark:text-[#cf0000]";

  const href = `/${encodeURIComponent(item.symbol)}`;

  const handleRowClick = () => {
    router.push(href, {
      scroll: true,
    });
  };

  const hasVotes = (voteStats?.totalVotes ?? 0) > 0;
  const myPrediction = voteStats?.myPrediction ?? null;
  const hasVoted = myPrediction !== null;

  /*
   * The width itself communicates sentiment.
   * We don't render percentage numbers because this
   * table doesn't have enough horizontal space.
   */
  const bullPercent = hasVotes ? (voteStats?.bullPercent ?? 0) : 0;

  const bearPercent = hasVotes ? (voteStats?.bearPercent ?? 0) : 0;

  return (
    <tr
      onClick={handleRowClick}
      className="
        border-b border-zinc-200/80
        text-[14px] text-zinc-800
        transition-colors
        last:border-b-0
        hover:cursor-pointer
        hover:bg-zinc-100/60
        dark:border-zinc-700/50
        dark:text-zinc-100
        dark:hover:bg-zinc-900
        md:text-[15px]
      "
    >
      {/* Asset */}
      <td className="w-[37%] overflow-hidden py-3 pl-4 leading-snug md:w-[17%] md:py-2.5">
        <div className="truncate text-[16px] font-medium leading-4.5 md:text-[17px]">
          {item.displaySymbol}
        </div>

        <p className="mt-0.5 block w-full truncate pr-2 text-[12px] font-normal text-zinc-500 dark:text-zinc-400 md:text-[13px]">
          {item.name}
        </p>
      </td>

      {/* Trend */}
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
      <td className="w-[27%] whitespace-nowrap py-3 pr-2 text-right font-medium dark:font-normal md:w-[16%] md:py-3 md:pr-0">
        <Numeric>
          {quote?.value ?? "-"}

          <span
            className={`
              mt-0.5 block
              text-[12px] leading-4 font-medium
              md:hidden
              ${priceColor}
            `}
          >
            {quote?.percent ?? "-"}
          </span>
        </Numeric>
      </td>

      {/* 24h % */}
      <td
        className={`
          hidden whitespace-nowrap py-3.5
          text-right font-medium
          dark:font-semibold
          md:table-cell md:w-[11%]
          ${priceColor}
        `}
      >
        <Numeric>{quote?.percent ?? "-"}</Numeric>
      </td>

      {/* Change */}
      <td
        className={`
          hidden whitespace-nowrap py-3.5
          text-right font-medium
          dark:font-semibold
          md:table-cell md:w-[14%]
          ${priceColor}
        `}
      >
        <Numeric>{quote?.change ?? "-"}</Numeric>
      </td>

      {/* Vote */}
      <td className="w-[25%] px-3 py-3 md:w-[17%] md:px-4 md:py-3.5">
        <div
          title={
            hasVotes
              ? `${voteStats?.bullVotes ?? 0} Bull / ${
                  voteStats?.bearVotes ?? 0
                } Bear`
              : "No votes yet"
          }
          className="
            flex h-2.5 w-full
            overflow-hidden
            bg-zinc-200
            dark:bg-zinc-700
            md:h-2
          "
        >
          {hasVotes && (
            <>
              {/* Bull */}
              <div
                className="
                  bg-emerald-600
                  transition-[width]
                  duration-300
                "
                style={{
                  width: `${bullPercent}%`,
                }}
              />

              {/* Bear */}
              <div
                className="
                  bg-rose-600
                  transition-[width]
                  duration-300
                "
                style={{
                  width: `${bearPercent}%`,
                }}
              />
            </>
          )}
        </div>
      </td>

      {/* Action */}
      <td className="w-[11%] py-3 pr-3 text-center md:w-[8%] md:px-2 md:py-3.5">
        <div
          title={
            hasVoted
              ? `You voted ${myPrediction.direction} · ${myPrediction.pointsBet} pts`
              : canVote
                ? "Voting is open"
                : "Voting is closed"
          }
          className="relative mx-auto w-fit"
        >
          <MdOutlineHowToVote
            className={`
        h-5 w-5
        transition-colors

        ${
          canVote
            ? "text-zinc-700 dark:text-zinc-300"
            : "text-zinc-400 dark:text-zinc-600"
        }
      `}
          />

          {/* Already voted */}
          {hasVoted ? (
            <span
              className={`
      absolute
      -right-2 -top-2
      flex h-4 w-4
      items-center justify-center

      ${
        myPrediction.direction === "BULL" ? "text-emerald-500" : "text-rose-500"
      }
    `}
            >
              ✘
            </span>
          ) : (
            canVote && (
              <span
                className="
        absolute
        -right-1 -top-1
        h-2 w-2
        rounded-full
        bg-emerald-500
        ring-2 ring-white
        dark:ring-zinc-900
        pulse-animation
      "
              />
            )
          )}
        </div>
      </td>
    </tr>
  );
}
