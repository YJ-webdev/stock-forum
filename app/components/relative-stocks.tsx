"use client";

import { useEffect, useRef, useState } from "react";
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
  selectedIndex?: number;
  onNavigate?: () => void;
}

interface RelativeStockRowProps {
  item: MarketSymbolItem;
  setActiveRange: React.Dispatch<React.SetStateAction<SelectedRange>>;
  voteStats: MarketVoteListStats | undefined;
  canVote: boolean;
  showVotingColumns: boolean;
  isSelected: boolean;
  rowRef?: React.RefObject<HTMLTableRowElement | null>;
  onNavigate?: () => void;
}

function isVotingAsset(item: MarketSymbolItem) {
  return (
    item.assetType !== "crypto" &&
    item.assetType !== "currency" &&
    item.assetType !== "commodity"
  );
}

export function RelativeStocks({
  items,
  setActiveRange,
  selectedIndex = -1,
  onNavigate,
}: RelativeStocksProps) {
  const [now] = useState(() => Date.now());

  const [voteStats, setVoteStats] = useState<MarketVoteListStatsMap>({});

  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);

  const showVotingColumns = items.some(isVotingAsset);

  const votingStatuses = showVotingColumns
    ? items.filter(isVotingAsset).map((item) => {
        const votingWindow = getVotingWindow(item.symbol, now);

        return {
          symbol: item.symbol,
          canVote: votingWindow.canVote,
          predictionFor: votingWindow.predictionFor,
        };
      })
    : [];

  const votingSessionKey = votingStatuses
    .map(
      (status) =>
        `${status.symbol}:${status.predictionFor?.getTime() ?? "none"}`,
    )
    .join("|");

  useEffect(() => {
    let cancelled = false;

    async function loadVoteStats() {
      if (!showVotingColumns) {
        setVoteStats({});
        return;
      }

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votingSessionKey, showVotingColumns]);

  useEffect(() => {
    if (selectedIndex < 0) {
      return;
    }

    selectedRowRef.current?.scrollIntoView({
      block: "nearest",
    });
  }, [selectedIndex]);

  return (
    <div className="flex max-h-[calc(100vh-230px)] w-full flex-col overflow-y-auto">
      <div className="w-full border-zinc-200 bg-zinc-100 dark:border-zinc-800/50 dark:bg-zinc-800 md:rounded-lg md:border md:bg-white md:shadow-sm">
        <table className="w-full table-fixed">
          <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-800 md:bg-white ">
            <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-wider text-zinc-400 dark:border-zinc-700/50 dark:text-zinc-500 md:text-xs">
              <th
                className={
                  showVotingColumns
                    ? "w-[25%] py-3 pl-4 text-left md:w-[calc(94%/7)]"
                    : "w-[25%] py-3 pl-4 text-left md:w-[20%]"
                }
              >
                Asset
              </th>

              <th
                className={
                  showVotingColumns
                    ? "hidden pl-2 text-center md:table-cell"
                    : "hidden text-center md:table-cell md:w-[15%]"
                }
              >
                Trend
              </th>

              <th
                className={
                  showVotingColumns
                    ? "w-[25%] pr-2 text-right md:w-[calc(94%/7)]"
                    : "w-[25%] text-right md:w-[15%]"
                }
              >
                Today
              </th>

              <th
                className={
                  showVotingColumns
                    ? "hidden py-3.5 pr-2 text-right md:table-cell md:w-[calc(94%/7)] md:py-3 md:pr-0"
                    : "w-[25%] py-3.5 text-right md:w-[17%] md:py-3"
                }
              >
                Prev
              </th>

              <th
                className={
                  showVotingColumns
                    ? "hidden truncate py-3 text-right md:table-cell md:w-[calc(94%/7)]"
                    : "hidden truncate py-3 text-right md:table-cell md:w-[16.5%]"
                }
              >
                24h %
              </th>

              <th
                className={
                  showVotingColumns
                    ? "hidden py-3 text-right md:table-cell md:w-[calc(94%/7)]"
                    : "w-[25%] py-3 pr-4 text-right md:w-[16.5%]"
                }
              >
                Change
              </th>

              {showVotingColumns && (
                <>
                  <th className="w-[30%] pl-2 md:w-[calc(94%/7)]">Statistic</th>

                  <th className="w-[15%] py-3 pr-4 text-right md:w-[6%]">
                    Vote
                  </th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="font-medium">
            {items.map((item, index) => {
              const status = showVotingColumns
                ? votingStatuses.find((status) => status.symbol === item.symbol)
                : undefined;

              const isSelected = selectedIndex === index;

              return (
                <RelativeStockRow
                  key={item.symbol}
                  item={item}
                  setActiveRange={setActiveRange}
                  voteStats={
                    showVotingColumns ? voteStats[item.symbol] : undefined
                  }
                  canVote={status?.canVote ?? false}
                  showVotingColumns={showVotingColumns}
                  isSelected={isSelected}
                  rowRef={isSelected ? selectedRowRef : undefined}
                  onNavigate={onNavigate}
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
  showVotingColumns,
  isSelected,
  rowRef,
  onNavigate,
}: RelativeStockRowProps) {
  const router = useRouter();

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
    : "text-[#cf0000] dark:text-[#ff1414]";

  const href = `/${encodeURIComponent(item.symbol)}`;

  const handleRowClick = () => {
    setActiveRange("1D");

    onNavigate?.();

    router.push(href, {
      scroll: true,
    });
  };

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();

      handleRowClick();

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      const rows = Array.from(
        document.querySelectorAll<HTMLTableRowElement>(
          '[data-market-row="true"]',
        ),
      );

      const currentIndex = rows.indexOf(event.currentTarget);
      const nextRow = rows[currentIndex + 1];

      nextRow?.focus();

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      const rows = Array.from(
        document.querySelectorAll<HTMLTableRowElement>(
          '[data-market-row="true"]',
        ),
      );

      const currentIndex = rows.indexOf(event.currentTarget);

      if (currentIndex === 0) {
        const activeCategory = document.querySelector<HTMLButtonElement>(
          '[data-active-category="true"]',
        );

        activeCategory?.focus();

        return;
      }

      const previousRow = rows[currentIndex - 1];

      previousRow?.focus();
    }
  };

  const hasVotes = showVotingColumns && (voteStats?.totalVotes ?? 0) > 0;

  const myPrediction = showVotingColumns
    ? (voteStats?.myPrediction ?? null)
    : null;

  const hasVoted = myPrediction !== null;

  const bullPercent = hasVotes ? (voteStats?.bullPercent ?? 0) : 0;

  const bearPercent = hasVotes ? (voteStats?.bearPercent ?? 0) : 0;

  const currencyDecimals =
    item.assetType === "currency"
      ? item.displaySymbol?.toUpperCase().includes("JPY")
        ? 2
        : 4
      : 2;

  return (
    <tr
      ref={rowRef}
      tabIndex={0}
      data-market-row="true"
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      className={`
        border-b border-zinc-200/80
        text-[14px] text-zinc-800
        transition-colors
        last:border-b-0
        hover:cursor-pointer
        hover:bg-zinc-100/60
        focus:bg-zinc-100
        focus:outline-none
        dark:border-zinc-700/50
        dark:text-zinc-100
        dark:hover:bg-zinc-700/20
        dark:focus:bg-zinc-700/60
        md:text-[15px]
        ${isSelected ? "bg-zinc-100 dark:bg-zinc-700/60" : ""}
      `}
    >
      <td
        className={
          showVotingColumns
            ? "w-[37%] overflow-hidden py-3 leading-snug md:w-[calc(94%/7)]"
            : "w-[37%] overflow-hidden py-3 leading-snug md:w-[20%]"
        }
      >
        <div className="ml-4 min-w-0">
          <div className="truncate text-[16px] font-medium leading-4.5 md:text-[17px]">
            {item.displaySymbol}
          </div>

          <p className="mt-0.5 block truncate pr-2 text-[12px] font-normal text-zinc-500 dark:text-zinc-400 md:text-[13px]">
            {item.name}
          </p>
        </div>
      </td>

      <td
        className={
          showVotingColumns
            ? "hidden w-fit overflow-hidden align-middle md:table-cell"
            : "hidden overflow-hidden align-middle md:table-cell md:w-[15%]"
        }
      >
        <div className="flex w-full justify-center overflow-hidden">
          <TrendSparkline
            data={quote?.history}
            isPositive={quote?.isPositive}
            lunchStartMs={quote?.lunchStartMs}
            lunchEndMs={quote?.lunchEndMs}
          />
        </div>
      </td>

      <td
        className={
          showVotingColumns
            ? "w-[27%] whitespace-nowrap pr-2 text-right font-medium dark:font-normal"
            : "w-[37%] whitespace-nowrap text-right font-medium dark:font-normal md:w-[15%]"
        }
      >
        <Numeric decimals={currencyDecimals}>{quote?.value ?? "-"}</Numeric>

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
      </td>

      <td
        className={
          showVotingColumns
            ? "hidden whitespace-nowrap py-3 text-right font-medium text-zinc-500 dark:text-zinc-400 md:table-cell md:w-[calc(94%/7)] md:pr-0"
            : "w-[37%] whitespace-nowrap py-3 text-right font-medium text-zinc-500 dark:text-zinc-400 md:w-[17%]"
        }
      >
        <Numeric>{quote?.previousClose ?? "-"}</Numeric>
      </td>

      <td
        className={`
          hidden whitespace-nowrap py-3.5
          text-right font-medium
          dark:font-semibold
          md:table-cell
          ${showVotingColumns ? "md:w-[37%]" : "md:w-[16.5%]"}
          ${priceColor}
        `}
      >
        <Numeric>{quote?.percent ?? "-"}</Numeric>
      </td>

      <td
        className={`
          whitespace-nowrap py-3.5
          text-right font-medium
          dark:font-semibold
          ${
            showVotingColumns
              ? "hidden md:table-cell md:w-[37%]"
              : "w-1/6 pr-4 md:w-[16.5%]"
          }
          ${priceColor}
        `}
      >
        <Numeric>{quote?.change ?? "-"}</Numeric>
      </td>

      {showVotingColumns && (
        <>
          <td className="w-[37%] pl-5 pr-3 md:w-[20%]">
            <div
              title={
                hasVotes
                  ? `${voteStats?.bullVotes ?? 0} Bull / ${
                      voteStats?.bearVotes ?? 0
                    } Bear`
                  : "No votes yet"
              }
              className="
                flex h-3 w-full
                overflow-hidden
                bg-zinc-200
                dark:bg-zinc-700
              "
            >
              {hasVotes && (
                <>
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

          <td className="w-[5%] justify-center text-center md:w-[6%]">
            <div
              title={
                hasVoted
                  ? `You voted ${myPrediction.direction} · ${myPrediction.pointsBet} pts`
                  : canVote
                    ? "Voting is open"
                    : "Voting is closed"
              }
              className="relative mx-auto w-fit items-center"
            >
              <MdOutlineHowToVote
                className={`
                  h-5 w-5 self-center
                  transition-colors
                  ${
                    canVote
                      ? "text-zinc-700 dark:text-zinc-300"
                      : "text-zinc-400 dark:text-zinc-600"
                  }
                `}
              />

              {hasVoted ? (
                <span
                  className={`
                    absolute
                    -right-2 -top-2
                    flex h-4 w-4
                    items-center justify-center
                    ${
                      myPrediction.direction === "BULL"
                        ? "text-emerald-500"
                        : "text-rose-500"
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
        </>
      )}
    </tr>
  );
}
