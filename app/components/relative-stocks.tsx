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
import { Vote } from "lucide-react";

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
import { RollingPrice } from "./rolling-price";
import { SparklineLoading } from "./sparkline-loading";

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
        const window = getVotingWindow(item.symbol, now);

        return {
          symbol: item.symbol,
          canVote: window.canVote,
          predictionFor: window.predictionFor,
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
    <div className="flex max-h-[calc(100vh-230px)] w-full flex-col overflow-y-auto">
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 md:rounded-lg md:bg-white">
        <table className="w-full table-fixed">
          <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-800 md:bg-white">
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
  const priceTemplate = "00,000.00";
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
        ? "text-emerald-700 dark:text-emerald-600"
        : "text-[#cf0000] dark:text-[#ff1414]";

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
      <td
        className={
          showVotingColumns
            ? "w-[37%] overflow-hidden py-3 leading-snug md:w-[calc(94%/7)]"
            : "w-[37%] overflow-hidden py-3 leading-snug md:w-[20%]"
        }
      >
        <div className="ml-4 min-w-0">
          <div className="truncate text-[16px] font-medium leading-4.5 md:text-[17px]">
            {item.displaySymbol ?? item.symbol}
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
          <RelativeSparkline item={item} />
        </div>
      </td>

      <td
        className={
          showVotingColumns
            ? "w-[27%] whitespace-nowrap pr-2 text-right font-medium dark:font-normal"
            : "w-[37%] whitespace-nowrap text-right font-medium dark:font-normal md:w-[15%]"
        }
      >
        <Numeric decimals={decimals}>
          {formattedPrice ??
            (isInitialLoading ? (
              <RollingPrice template={priceTemplate} />
            ) : (
              "—"
            ))}
        </Numeric>

        <span
          className={`
            mt-0.5 block text-[12px] font-medium leading-4
            md:hidden ${priceColor}
          `}
        >
          {formattedPercent ??
            (isInitialLoading ? <RollingPrice template="0.00%" /> : "—")}
        </span>
      </td>

      <td
        className={
          showVotingColumns
            ? "hidden whitespace-nowrap py-3 text-right font-medium text-zinc-500 dark:text-zinc-400 md:table-cell md:w-[calc(94%/7)] md:pr-0"
            : "w-[37%] whitespace-nowrap py-3 text-right font-medium text-zinc-500 dark:text-zinc-400 md:w-[17%]"
        }
      >
        <Numeric decimals={decimals}>
          {priceQuote?.previousClose ??
            (isInitialLoading ? (
              <RollingPrice template={priceTemplate} />
            ) : (
              "—"
            ))}
        </Numeric>
      </td>

      <td
        className={`
          hidden whitespace-nowrap py-3.5
          text-right font-medium dark:font-semibold md:table-cell
          ${showVotingColumns ? "md:w-[37%]" : "md:w-[16.5%]"}
          ${priceColor}
        `}
      >
        <Numeric>
          {formattedPercent ??
            (isInitialLoading ? <RollingPrice template="0.00%" /> : "—")}
        </Numeric>
      </td>

      <td
        className={`
          whitespace-nowrap py-3.5 text-right font-medium
          dark:font-semibold
          ${
            showVotingColumns
              ? "hidden md:table-cell md:w-[37%]"
              : "w-1/6 pr-4 md:w-[16.5%]"
          }
          ${priceColor}
        `}
      >
        <Numeric decimals={decimals}>
          {formattedChange ??
            (isInitialLoading ? <RollingPrice template="00.00" /> : "—")}
        </Numeric>
      </td>

      {showVotingColumns && (
        <>
          <td className="w-[37%] pl-5 pr-3 md:w-[20%]">
            {eligibleForVoting ? (
              <div
                title={
                  voteStats === undefined
                    ? "Vote statistics unavailable"
                    : hasVotes
                      ? `${voteStats.bullVotes} Bull / ${voteStats.bearVotes} Bear`
                      : "No votes yet"
                }
                className="
                  flex h-3 w-full overflow-hidden
                  bg-zinc-200 dark:bg-zinc-700
                "
              >
                {hasVotes && (
                  <>
                    <div
                      className="bg-emerald-600 transition-[width] duration-300"
                      style={{ width: `${bullPercent}%` }}
                    />

                    <div
                      className="bg-rose-600 transition-[width] duration-300"
                      style={{ width: `${bearPercent}%` }}
                    />
                  </>
                )}
              </div>
            ) : (
              <span className="block text-center text-zinc-400">—</span>
            )}
          </td>

          <td className="w-[5%] text-center md:w-[6%]">
            {eligibleForVoting ? (
              <div
                title={
                  myPrediction
                    ? `You voted ${myPrediction.direction} · ${myPrediction.pointsBet} pts`
                    : canVote
                      ? "Voting is open"
                      : "Voting is closed"
                }
                className="relative mx-auto w-fit items-center"
              >
                <Vote
                  strokeWidth={1.75}
                  className={`
                    h-5 w-5 self-center transition-colors
                    ${
                      canVote
                        ? "text-zinc-700 dark:text-zinc-300"
                        : "text-zinc-400 dark:text-zinc-600"
                    }
                  `}
                />

                {myPrediction ? (
                  <span
                    className={`
                      absolute -right-2 -top-2
                      flex h-4 w-4 items-center justify-center
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
                        pulse-animation absolute -right-1 -top-1
                        h-2 w-2 rounded-full bg-emerald-500
                        ring-2 ring-white dark:ring-zinc-900
                      "
                    />
                  )
                )}
              </div>
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

    // Support older Safari as well.
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
        <SparklineLoading />
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
    return <SparklineLoading />;
  }

  if (!data) {
    return <span className="text-zinc-400">—</span>;
  }

  return (
    <TrendSparkline
      data={data.history}
      isPositive={data.isPositive}
      lunchStartMs={data.lunchStartMs}
      lunchEndMs={data.lunchEndMs}
      sessionStartMs={sessionStartMs}
      sessionEndMs={sessionEndMs}
    />
  );
}
