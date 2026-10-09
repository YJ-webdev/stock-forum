// app/components/relative-stocks.tsx

"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { TZDate } from "@date-fns/tz";

import {
  TRADING_HOURS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";

import { useMarketQuote, type SelectedRange } from "@/app/hooks/useMarketQuote";

import {
  useRelativeQuotes,
  type RelativeQuote,
} from "@/app/hooks/useRelativeQuotes";

import { getVotingWindow } from "@/lib/utils/get-voting-window";

import {
  getMarketVoteListStats,
  type MarketVoteListStats,
  type MarketVoteListStatsMap,
} from "@/app/actions/market-vote";

import { TrendSparkline } from "./trend-sparkline";
import { Numeric } from "./numeric";
import { MarketSkeleton } from "./market-skeleton";
import { Vote } from "lucide-react";

interface RelativeStocksProps {
  items: MarketSymbolItem[];
  setActiveRange: Dispatch<SetStateAction<SelectedRange>>;
  selectedIndex?: number;
  onNavigate?: () => void;
}

interface RelativeStockRowProps {
  item: MarketSymbolItem;
  setActiveRange: Dispatch<SetStateAction<SelectedRange>>;
  voteStats?: MarketVoteListStats;
  canVote: boolean;
  showVotingColumns: boolean;
  isSelected: boolean;
  rowRef?: RefObject<HTMLTableRowElement | null>;
  onNavigate?: () => void;
  priceQuote?: RelativeQuote;
  quotesLoading: boolean;
}

interface VotingRequest {
  symbol: string;
  sessionDateMs: number;
}

function isVotingAsset(item: MarketSymbolItem) {
  return item.assetType === "index";
}

function getSparklineSession(
  item: MarketSymbolItem,
  history?: { timestampMs: number }[],
): {
  sessionStartMs: number | null;
  sessionEndMs: number | null;
} {
  const emptySession = {
    sessionStartMs: null,
    sessionEndMs: null,
  };

  if (!item.marketSchedule || !history?.length) {
    return emptySession;
  }

  const schedule = TRADING_HOURS[item.marketSchedule];

  if (!schedule) {
    return emptySession;
  }

  let latestTimestampMs = -Infinity;

  for (const point of history) {
    if (
      Number.isFinite(point.timestampMs) &&
      point.timestampMs > latestTimestampMs
    ) {
      latestTimestampMs = point.timestampMs;
    }
  }

  if (!Number.isFinite(latestTimestampMs)) {
    return emptySession;
  }

  const dataDate = new TZDate(latestTimestampMs, schedule.timezone);
  const [openHour, openMinute] = schedule.open.split(":").map(Number);
  const [closeHour, closeMinute] = schedule.close.split(":").map(Number);

  if (![openHour, openMinute, closeHour, closeMinute].every(Number.isFinite)) {
    return emptySession;
  }

  const year = dataDate.getFullYear();
  const month = dataDate.getMonth();
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  const isOvernight = closeMinutes <= openMinutes;

  let startDay = dataDate.getDate();

  if (isOvernight) {
    const dataMinutes = dataDate.getHours() * 60 + dataDate.getMinutes();

    if (dataMinutes <= closeMinutes) {
      startDay -= 1;
    }
  }

  return {
    sessionStartMs: new TZDate(
      year,
      month,
      startDay,
      openHour,
      openMinute,
      0,
      0,
      schedule.timezone,
    ).getTime(),

    sessionEndMs: new TZDate(
      year,
      month,
      startDay + (isOvernight ? 1 : 0),
      closeHour,
      closeMinute,
      0,
      0,
      schedule.timezone,
    ).getTime(),
  };
}

function handleMarketRowKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  navigate: () => void,
) {
  if (event.key === "Enter") {
    event.preventDefault();
    navigate();
    return;
  }

  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
    return;
  }

  event.preventDefault();

  const table = event.currentTarget.closest("table");

  const rows = Array.from(
    table?.querySelectorAll<HTMLTableRowElement>('[data-market-row="true"]') ??
      [],
  );

  const currentIndex = rows.indexOf(event.currentTarget);

  if (event.key === "ArrowDown") {
    rows[currentIndex + 1]?.focus();
    return;
  }

  if (currentIndex === 0) {
    document
      .querySelector<HTMLButtonElement>('[data-active-category="true"]')
      ?.focus();

    return;
  }

  rows[currentIndex - 1]?.focus();
}

function formatSigned(value: number | null, decimals = 2) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}`;
}

function NumberSkeleton({ className = "w-20" }: { className?: string }) {
  return (
    <div className="flex h-5 w-full items-center justify-end overflow-hidden">
      <MarketSkeleton className={`h-3 max-w-full ${className}`} />
    </div>
  );
}

function SparklineSkeleton() {
  return (
    <div className="flex h-10 w-full items-center justify-center px-3">
      <MarketSkeleton className="h-6 w-full max-w-30" />
    </div>
  );
}

export function RelativeStocks({
  items,
  setActiveRange,
  selectedIndex = -1,
  onNavigate,
}: RelativeStocksProps) {
  const [now, setNow] = useState(() => Date.now());

  const [voteState, setVoteState] = useState<{
    key: string;
    stats: MarketVoteListStatsMap;
  }>({
    key: "",
    stats: {},
  });

  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);

  const { quotes, loading: quotesLoading } = useRelativeQuotes(
    items.map((item) => item.symbol),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  const votingStatuses = useMemo(
    () =>
      items.filter(isVotingAsset).map((item) => {
        const votingWindow = getVotingWindow(item.symbol, now);

        return {
          symbol: item.symbol,
          canVote: votingWindow.canVote,
          predictionFor: votingWindow.predictionFor,
        };
      }),
    [items, now],
  );

  const showVotingColumns = votingStatuses.length > 0;

  const votingStatusMap = useMemo(
    () => new Map(votingStatuses.map((status) => [status.symbol, status])),
    [votingStatuses],
  );

  const votingRequestKey = JSON.stringify(
    votingStatuses.flatMap((status) =>
      status.predictionFor
        ? [
            {
              symbol: status.symbol,
              sessionDateMs: status.predictionFor.getTime(),
            },
          ]
        : [],
    ),
  );

  const voteStats = voteState.key === votingRequestKey ? voteState.stats : {};

  useEffect(() => {
    let cancelled = false;

    const requests = JSON.parse(votingRequestKey) as VotingRequest[];

    if (requests.length === 0) {
      setVoteState({
        key: votingRequestKey,
        stats: {},
      });

      return;
    }

    async function loadVoteStats() {
      try {
        const result = await getMarketVoteListStats({
          markets: requests.map((request) => ({
            symbol: request.symbol,
            sessionDate: new Date(request.sessionDateMs),
          })),
        });

        if (!cancelled) {
          setVoteState({
            key: votingRequestKey,
            stats: result,
          });
        }
      } catch (error) {
        console.error("Failed to load market vote stats:", error);

        if (!cancelled) {
          setVoteState({
            key: votingRequestKey,
            stats: {},
          });
        }
      }
    }

    void loadVoteStats();

    return () => {
      cancelled = true;
    };
  }, [votingRequestKey]);

  useEffect(() => {
    if (selectedIndex >= 0) {
      selectedRowRef.current?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  return (
    <div className="flex max-h-[calc(100vh-145px)] lg:max-h-[calc(100vh-260px)] w-full flex-col overflow-y-auto ">
      <div className="w-full  md:rounded-lg ">
        <table className="w-full table-fixed ">
          <thead className="sticky top-0 -translate-y-1 md:translate-y-0 z-10 dark:bg-zinc-800 lg:bg-white bg-zinc-100">
            <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-wider text-zinc-400 dark:border-zinc-700/50 dark:text-zinc-500 md:text-xs">
              <th
                className={
                  showVotingColumns
                    ? "w-[25%] py-3 pl-4 text-left md:w-[10%]"
                    : "w-[calc(100%/6)] py-3 pl-4 text-left md:w-[10%]"
                }
              >
                Asset
              </th>

              <th
                className={
                  showVotingColumns
                    ? "hidden text-center md:table-cell md:w-[10%]"
                    : "hidden text-center md:table-cell md:w-[10%]"
                }
              >
                Trend
              </th>

              <th
                className={
                  showVotingColumns
                    ? "w-[25%] pr-2 text-right md:w-[10%]"
                    : "w-[25%] pr-2 text-right md:w-[10%]"
                }
              >
                Today
              </th>

              <th
                className={
                  showVotingColumns
                    ? "hidden  text-right md:table-cell md:w-[10%] md:py-3"
                    : "w-[23%]  text-right md:w-[10%] md:py-3"
                }
              >
                Prev
              </th>

              <th
                className={
                  showVotingColumns
                    ? "hidden truncate text-right md:table-cell md:w-[10%]"
                    : "hidden truncate text-right md:table-cell md:w-[10%]"
                }
              >
                24h %
              </th>

              <th
                className={
                  showVotingColumns
                    ? "hidden text-right md:table-cell md:w-[10%]"
                    : "w-[23%] pr-4 text-right md:w-[10%]"
                }
              >
                Change
              </th>

              {showVotingColumns && (
                <>
                  <th className="w-[30%] pl-4 md:w-[10%]">Statistic</th>

                  <th className="w-[15%]  pr-4 text-right md:w-[5%]">Vote</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="font-medium">
            {items.map((item, index) => {
              const status = votingStatusMap.get(item.symbol);
              const isSelected = selectedIndex === index;

              return (
                <RelativeStockRow
                  key={item.symbol}
                  item={item}
                  setActiveRange={setActiveRange}
                  voteStats={voteStats[item.symbol]}
                  canVote={status?.canVote ?? false}
                  showVotingColumns={showVotingColumns}
                  isSelected={isSelected}
                  rowRef={isSelected ? selectedRowRef : undefined}
                  onNavigate={onNavigate}
                  priceQuote={quotes[item.symbol]}
                  quotesLoading={quotesLoading}
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
  priceQuote,
  quotesLoading,
}: RelativeStockRowProps) {
  const router = useRouter();
  const decimals = 2;
  const isInitialLoading = !priceQuote && quotesLoading;

  const formattedPrice = priceQuote
    ? priceQuote.price.toLocaleString("en-US", {
        style: item.assetType === "crypto" ? "currency" : "decimal",
        currency: item.assetType === "crypto" ? "USD" : undefined,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : undefined;

  const formattedChange = priceQuote
    ? formatSigned(priceQuote.change, decimals)
    : undefined;

  const formattedPercent = priceQuote
    ? priceQuote.percent === null
      ? "—"
      : `${formatSigned(priceQuote.percent)}%`
    : undefined;

  const direction = priceQuote?.percent ?? priceQuote?.change;

  const priceColor =
    direction == null
      ? "text-zinc-400 dark:text-zinc-500"
      : direction >= 0
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-[#cf0000] dark:text-[#ff4545]";

  function navigate() {
    setActiveRange("1D");
    onNavigate?.();

    router.push(`/market/${encodeURIComponent(item.symbol)}`, {
      scroll: true,
    });
  }

  const eligibleForVoting = isVotingAsset(item);

  const hasVotes =
    eligibleForVoting && showVotingColumns && (voteStats?.totalVotes ?? 0) > 0;

  const myPrediction =
    eligibleForVoting && showVotingColumns
      ? (voteStats?.myPrediction ?? null)
      : null;

  const bullPercent = hasVotes ? (voteStats?.bullPercent ?? 0) : 0;
  const bearPercent = hasVotes ? (voteStats?.bearPercent ?? 0) : 0;

  return (
    <tr
      ref={rowRef}
      tabIndex={0}
      data-market-row="true"
      onClick={navigate}
      onKeyDown={(event) => handleMarketRowKeyDown(event, navigate)}
      className={`
        border-b border-zinc-200/80
        text-[14px] text-zinc-800
        transition-colors last:border-b-0
        hover:cursor-pointer hover:bg-zinc-100/60
        focus:bg-zinc-100 focus:outline-none
        dark:border-zinc-700/50 dark:text-zinc-100
        dark:hover:bg-zinc-700/20 dark:focus:bg-zinc-700/60
        md:text-[15px]
        ${isSelected ? "bg-zinc-100 dark:bg-zinc-700/60" : ""}
      `}
    >
      <td className="overflow-hidden py-3 align-middle leading-snug">
        <div className="ml-4 min-w-0">
          <div className="truncate text-[16px] font-medium leading-4.5 md:text-[17px]">
            {item.displaySymbol ?? item.symbol}
          </div>

          <p className="mt-0.5 block truncate pr-2 text-[12px] font-normal text-zinc-500 dark:text-zinc-400 md:text-[13px]">
            {item.name}
          </p>
        </div>
      </td>

      <td className="hidden overflow-hidden align-middle md:table-cell">
        <div className="flex w-full justify-center overflow-hidden">
          <RelativeSparkline item={item} />
        </div>
      </td>

      <td
        className={`
          whitespace-nowrap align-middle text-right
          font-medium dark:font-normal
          ${showVotingColumns ? "pr-2" : "pr-2"}
        `}
      >
        <div className="flex h-5 w-full items-center justify-end">
          {isInitialLoading ? (
            <NumberSkeleton className="w-24" />
          ) : (
            <Numeric decimals={decimals}>{formattedPrice ?? "—"}</Numeric>
          )}
        </div>

        <div
          className={`
            mt-0.5 flex h-4 w-full items-center justify-end
            text-[12px] font-medium leading-4
            md:hidden ${priceColor}
          `}
        >
          {isInitialLoading ? (
            <MarketSkeleton className="h-2.5 w-14 max-w-full" />
          ) : (
            <span>{formattedPercent ?? "—"}</span>
          )}
        </div>
      </td>

      <td
        className={`
          whitespace-nowrap py-3 align-middle text-right
          font-medium text-zinc-500 dark:text-zinc-400
          ${showVotingColumns ? "hidden md:table-cell" : ""}
        `}
      >
        <div className="flex h-5 w-full items-center justify-end">
          {isInitialLoading ? (
            <NumberSkeleton className="w-24" />
          ) : (
            <Numeric decimals={decimals}>
              {priceQuote?.previousClose ?? "—"}
            </Numeric>
          )}
        </div>
      </td>

      <td
        className={`
          hidden whitespace-nowrap py-3.5 align-middle
          text-right font-medium dark:font-semibold md:table-cell
          ${priceColor}
        `}
      >
        <div className="flex h-5 w-full items-center justify-end">
          {isInitialLoading ? (
            <NumberSkeleton className="w-14" />
          ) : (
            <Numeric>{formattedPercent ?? "—"}</Numeric>
          )}
        </div>
      </td>

      <td
        className={`
          whitespace-nowrap py-3.5 align-middle text-right
          font-medium dark:font-semibold
          ${showVotingColumns ? "hidden md:table-cell" : "pr-4"}
          ${priceColor}
        `}
      >
        <div className="flex h-5 w-full items-center justify-end">
          {isInitialLoading ? (
            <NumberSkeleton className="w-16" />
          ) : (
            <Numeric decimals={decimals}>{formattedChange ?? "—"}</Numeric>
          )}
        </div>
      </td>

      {showVotingColumns && (
        <>
          <td className="pl-4 align-middle">
            {eligibleForVoting ? (
              <div
                role={voteStats ? "img" : undefined}
                aria-label={
                  voteStats
                    ? hasVotes
                      ? `Bull ${bullPercent} percent, Bear ${bearPercent} percent, ${voteStats.totalVotes} votes`
                      : "No votes yet"
                    : "Vote statistics unavailable"
                }
                title={
                  voteStats
                    ? `${voteStats.bullVotes} Bull / ${voteStats.bearVotes} Bear`
                    : undefined
                }
                className="
        outfit relative mx-auto flex h-7 w-full max-w-28
        items-center overflow-hidden
        bg-[radial-gradient(circle,currentColor_0.75px,transparent_0.75px)]
        bg-size-[3px_3px]
        text-zinc-200 dark:text-zinc-600/50
      "
              >
                <div
                  aria-hidden="true"
                  className="flex w-full items-center justify-around text-[12px] leading-none tabular-nums"
                >
                  {hasVotes ? (
                    <>
                      {bullPercent > 0 && (
                        <span className="font-normal text-zinc-800 dark:text-zinc-100">
                          {bullPercent}%
                        </span>
                      )}

                      {bearPercent > 0 && (
                        <span className="font-normal text-zinc-800 dark:font-light dark:text-zinc-100">
                          {bearPercent}%
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[11px] font-normal text-zinc-800 dark:font-light dark:text-zinc-100">
                      {voteStats === undefined ? "" : "No vote yet"}
                    </span>
                  )}
                </div>

                {hasVotes && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 flex h-[1.5px]"
                  >
                    <div
                      className="
              h-full bg-emerald-600
              transition-[width] duration-300
              motion-reduce:transition-none
              dark:bg-emerald-400
            "
                      style={{ width: `${bullPercent}%` }}
                    />

                    <div
                      className="
              h-full bg-[#cf0000]
              transition-[width] duration-300
              motion-reduce:transition-none
              dark:bg-[#ff4545]
            "
                      style={{ width: `${bearPercent}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <span className="block text-center text-zinc-400">—</span>
            )}
          </td>

          <td className="text-center align-middle">
            {eligibleForVoting ? (
              <span
                role="img"
                aria-label={
                  myPrediction
                    ? `You voted ${myPrediction.direction}`
                    : canVote
                      ? "Voting is open"
                      : "Voting is closed"
                }
                title={
                  myPrediction
                    ? `You voted ${myPrediction.direction} · ${myPrediction.pointsBet} pts`
                    : canVote
                      ? "Voting is open"
                      : "Voting is closed"
                }
                className="relative mx-auto flex size-5 items-center justify-center"
              >
                {myPrediction ? (
                  <span
                    aria-hidden="true"
                    className={`text-base leading-none ${
                      myPrediction.direction === "BULL"
                        ? "text-emerald-500"
                        : "text-rose-500"
                    }`}
                  >
                    ✘
                  </span>
                ) : (
                  <>
                    {canVote && (
                      <span
                        aria-hidden="true"
                        className="absolute size-2 animate-ping rounded-full bg-emerald-500/50 motion-reduce:animate-none"
                      />
                    )}

                    <span
                      aria-hidden="true"
                      className={`relative size-2 rounded-full ${
                        canVote
                          ? "bg-emerald-500"
                          : "bg-zinc-300 dark:bg-zinc-600"
                      }`}
                    />
                  </>
                )}
              </span>
            ) : (
              <span className="text-zinc-400">—</span>
            )}
          </td>
        </>
      )}
    </tr>
  );
}

function RelativeSparkline({ item }: { item: MarketSymbolItem }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(media.matches);

    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);

      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);

    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!desktop || nearViewport) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setNearViewport(true);
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "150px 0px",
        threshold: 0,
      },
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [desktop, nearViewport]);

  return (
    <div
      ref={containerRef}
      className="flex h-10 w-full items-center justify-center"
    >
      {desktop && nearViewport ? (
        <LoadedRelativeSparkline item={item} />
      ) : (
        <SparklineSkeleton />
      )}
    </div>
  );
}

function LoadedRelativeSparkline({ item }: { item: MarketSymbolItem }) {
  const { data, loading, error } = useMarketQuote(
    item.providerSymbol ?? item.symbol,
    item.name,
    "1D",
    item.displaySymbol,
    item.assetType,
    0,
    "15m",
  );

  const { sessionStartMs, sessionEndMs } = useMemo(
    () => getSparklineSession(item, data?.history),
    [item, data?.history],
  );

  if (!data && (loading || !error)) {
    return <SparklineSkeleton />;
  }

  if (!data || !data.history.some((point) => Number.isFinite(point.price))) {
    return <span className="text-zinc-400">—</span>;
  }

  return (
    <TrendSparkline
      data={data.history}
      previousClose={data.previousClose}
      isPositive={data.isPositive}
      lunchStartMs={data.lunchStartMs}
      lunchEndMs={data.lunchEndMs}
      sessionStartMs={sessionStartMs}
      sessionEndMs={sessionEndMs}
    />
  );
}
