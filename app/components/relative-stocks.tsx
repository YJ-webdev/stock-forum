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
import { Check, TrendingUp, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { TZDate } from "@date-fns/tz";

import { useCurrentUser } from "@/app/context/user-context";
import {
  TRADING_HOURS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";
import { resolveLanguage } from "@/lib/data/languages";
import {
  MARKET_TABLE_LABELS,
  STATISTICS_LABELS,
  MARKET_PREDICTION_LABELS,
} from "@/lib/data/translations";

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

export interface MarketPredictionRequest {
  item: MarketSymbolItem;
  mode: "create" | "change";
  sessionDate: Date;
  initialVote?: {
    direction: "BULL" | "BEAR";
    pointsBet: number;
  };
  // Call only after a successful create/update, so statistics refresh.
  onSuccess: () => void;
}

interface RelativeStocksProps {
  // Open the existing prediction popup in the parent. Keep the overview mounted.
  onPredictionRequest: (request: MarketPredictionRequest) => void;
  items: MarketSymbolItem[];
  setActiveRange?: Dispatch<SetStateAction<SelectedRange>>;
  selectedIndex?: number;
  onNavigate?: () => void;
}

interface RelativeStockRowProps {
  item: MarketSymbolItem;
  setActiveRange?: Dispatch<SetStateAction<SelectedRange>>;
  voteStats?: MarketVoteListStats;
  canVote: boolean;
  showVotingColumns: boolean;
  isSelected: boolean;
  rowRef?: RefObject<HTMLTableRowElement | null>;
  onNavigate?: () => void;
  priceQuote?: RelativeQuote;
  quotesLoading: boolean;
  desktop: boolean;
  noVoteYetLabel: string;
  statsLoading: boolean;
  sessionDateMs?: number;
  onPredictionRequest: RelativeStocksProps["onPredictionRequest"];
  onVoteSuccess: () => void;
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
  // Buttons inside rows handle their own keyboard events.
  if (event.target !== event.currentTarget) return;

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
  onPredictionRequest,
  setActiveRange,
  selectedIndex = -1,
  onNavigate,
}: RelativeStocksProps) {
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);
  const labels = MARKET_TABLE_LABELS[language];
  const statisticsLabels = STATISTICS_LABELS[language];

  const [returnRefreshVersion, setReturnRefreshVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [voteCache, setVoteCache] = useState<
    Record<
      string,
      {
        stats: MarketVoteListStats;
        refreshVersion: number;
      }
    >
  >({});
  const voteCacheRef = useRef(voteCache);
  voteCacheRef.current = voteCache;
  const [failedVoteKeys, setFailedVoteKeys] = useState<Set<string>>(new Set());
  const pendingVoteKeysRef = useRef(new Set<string>());
  const voteRevisionRef = useRef(new Map<string, number>());
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const desktop = useDesktopScreen();

  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    let lastRefreshMs = 0;

    function refreshOnReturn() {
      if (document.visibilityState !== "visible") return;
      // The active prediction popup handles its own state and save refresh.
      if (document.querySelector('[id^="overview-prediction-"]')) return;
      const currentTime = Date.now();
      // Tab restoration can fire visibilitychange and focus together.
      if (currentTime - lastRefreshMs < 1000) return;
      lastRefreshMs = currentTime;
      setNow(currentTime);
      setReturnRefreshVersion((value) => value + 1);
    }

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("pageshow", refreshOnReturn);
    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.removeEventListener("pageshow", refreshOnReturn);
    };
  }, []);

  const symbols = useMemo(() => items.map((item) => item.symbol), [items]);
  const { quotes, loading: quotesLoading } = useRelativeQuotes(symbols);

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

  const viewerKey = user?.id ?? "guest";
  function getVoteCacheKey(symbol: string, sessionMs: number) {
    return JSON.stringify([viewerKey, symbol, sessionMs]);
  }

  const voteStats: MarketVoteListStatsMap = {};
  for (const status of votingStatuses) {
    const sessionMs = status.predictionFor?.getTime();
    if (sessionMs !== undefined) {
      const cached = voteCache[getVoteCacheKey(status.symbol, sessionMs)];
      if (cached) voteStats[status.symbol] = cached.stats;
    }
  }

  async function refreshMarketVote(symbol: string, sessionDateMs: number) {
    const key = getVoteCacheKey(symbol, sessionDateMs);
    const revision = (voteRevisionRef.current.get(key) ?? 0) + 1;
    voteRevisionRef.current.set(key, revision);
    try {
      const result = await getMarketVoteListStats({
        markets: [{ symbol, sessionDate: new Date(sessionDateMs) }],
      });
      if (!mountedRef.current || voteRevisionRef.current.get(key) !== revision)
        return;
      const stats = result[symbol];
      if (!stats) return;
      setVoteCache((previous) => ({
        ...previous,
        [key]: { stats, refreshVersion: returnRefreshVersion },
      }));
    } catch (error) {
      console.error(`Failed to refresh vote stats for ${symbol}:`, error);
    }
  }

  useEffect(() => {
    const allRequests = JSON.parse(votingRequestKey) as VotingRequest[];
    const requests = allRequests.filter((request) => {
      const key = JSON.stringify([
        viewerKey,
        request.symbol,
        request.sessionDateMs,
      ]);
      const cached = voteCacheRef.current[key];
      return (
        (!cached || cached.refreshVersion < returnRefreshVersion) &&
        !pendingVoteKeysRef.current.has(key)
      );
    });
    if (requests.length === 0) return;

    const entries = requests.map((request) => {
      const key = JSON.stringify([
        viewerKey,
        request.symbol,
        request.sessionDateMs,
      ]);
      pendingVoteKeysRef.current.add(key);
      return {
        ...request,
        key,
        revision: voteRevisionRef.current.get(key) ?? 0,
      };
    });
    setFailedVoteKeys((previous) => {
      const next = new Set(previous);
      for (const entry of entries) next.delete(entry.key);
      return next;
    });

    async function loadVoteStats() {
      try {
        const result = await getMarketVoteListStats({
          markets: requests.map((request) => ({
            symbol: request.symbol,
            sessionDate: new Date(request.sessionDateMs),
          })),
        });
        if (!mountedRef.current) return;
        setVoteCache((previous) => {
          const next = { ...previous };
          for (const entry of entries) {
            if (
              (voteRevisionRef.current.get(entry.key) ?? 0) !== entry.revision
            )
              continue;
            const stats = result[entry.symbol];
            if (stats)
              next[entry.key] = { stats, refreshVersion: returnRefreshVersion };
          }
          return next;
        });
        setFailedVoteKeys((previous) => {
          const next = new Set(previous);
          for (const entry of entries)
            if (!result[entry.symbol]) next.add(entry.key);
          return next;
        });
      } catch (error) {
        console.error("Failed to load market vote stats:", error);
        if (mountedRef.current)
          setFailedVoteKeys((previous) => {
            const next = new Set(previous);
            for (const entry of entries) next.add(entry.key);
            return next;
          });
      } finally {
        for (const entry of entries)
          pendingVoteKeysRef.current.delete(entry.key);
      }
    }
    // Keep requests alive across category switches so their results enter the cache.
    void loadVoteStats();
  }, [votingRequestKey, viewerKey, returnRefreshVersion]);

  useEffect(() => {
    if (selectedIndex >= 0) {
      selectedRowRef.current?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  return (
    <div className="flex max-h-[calc(100vh-165px)] w-full flex-col overflow-y-auto lg:max-h-[calc(100vh-260px)]">
      <div className="w-full rounded-lg">
        <table className="w-full table-fixed">
          <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-800 [&_th]:font-normal">
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-400 dark:border-zinc-700/50 dark:text-zinc-500">
              <th
                scope="col"
                className={
                  showVotingColumns
                    ? "w-[25%] py-3 pl-4 text-left md:w-[14%]"
                    : "w-[36%] py-3 pl-4 text-left md:w-[10%]"
                }
              >
                {labels.asset}
              </th>

              <th
                scope="col"
                className={`hidden text-center md:table-cell ${showVotingColumns ? "md:w-[12%]" : "md:w-[10%]"}`}
              >
                {labels.trend}
              </th>

              <th
                scope="col"
                className={
                  showVotingColumns
                    ? "w-[25%] pr-2 text-right md:w-[13%]"
                    : "w-[32%] pr-2 text-right md:w-[10%]"
                }
              >
                {labels.today}
              </th>

              <th
                scope="col"
                className={
                  showVotingColumns
                    ? "hidden text-right md:table-cell md:w-[13%] md:py-3"
                    : "w-[32%] pr-4 text-right md:w-[10%] md:py-3 md:pr-0"
                }
              >
                {labels.prev}
              </th>

              <th
                scope="col"
                className="hidden truncate text-right md:table-cell md:w-[10%]"
              >
                {labels.percent}
              </th>

              <th
                scope="col"
                className={
                  showVotingColumns
                    ? "hidden text-right md:table-cell md:w-[12%]"
                    : "hidden text-right md:table-cell md:w-[10%] md:pr-4"
                }
              >
                {labels.change}
              </th>

              {showVotingColumns && (
                <>
                  <th
                    scope="col"
                    className="w-[30%] pl-2 text-center md:w-[18%] md:pl-3 lg:pl-6"
                  >
                    {labels.statistics}
                  </th>

                  <th
                    scope="col"
                    className="w-[20%] px-1 text-center md:w-[8%] md:px-2"
                  >
                    {labels.vote}
                  </th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
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
                  desktop={desktop}
                  quotesLoading={quotesLoading}
                  noVoteYetLabel={statisticsLabels.no_vote_yet}
                  statsLoading={
                    status?.predictionFor !== undefined &&
                    status?.predictionFor !== null &&
                    !voteStats[item.symbol] &&
                    !failedVoteKeys.has(
                      getVoteCacheKey(
                        item.symbol,
                        status.predictionFor.getTime(),
                      ),
                    )
                  }
                  sessionDateMs={status?.predictionFor?.getTime()}
                  onPredictionRequest={onPredictionRequest}
                  onVoteSuccess={() => {
                    const sessionMs = status?.predictionFor?.getTime();
                    if (sessionMs !== undefined) {
                      void refreshMarketVote(item.symbol, sessionMs);
                    }
                  }}
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
  desktop,
  noVoteYetLabel,
  statsLoading,
  sessionDateMs,
  onPredictionRequest,
  onVoteSuccess,
}: RelativeStockRowProps) {
  const router = useRouter();
  const decimals = 2;
  const isInitialLoading = !priceQuote && quotesLoading;

  // Display all prices as numbers, including crypto.
  const formattedPrice = priceQuote
    ? priceQuote.price.toLocaleString("en-US", {
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
    setActiveRange?.("1D");
    onNavigate?.();

    router.push(`/market/${encodeURIComponent(item.symbol)}`, {
      scroll: true,
    });
  }

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
        dark:border-zinc-700/50 dark:text-zinc-300
        dark:hover:bg-zinc-700/20 dark:focus:bg-zinc-700/60
        md:text-[15px]
        ${isSelected ? "bg-zinc-100 dark:bg-zinc-700/60" : ""}
      `}
    >
      <td className="overflow-hidden py-3 align-middle leading-snug">
        <div className="ml-4 min-w-0">
          <div
            title={item.displaySymbol ?? item.symbol}
            className="truncate text-[16px] font-medium leading-4.5 md:text-[17px] dark:text-zinc-100"
          >
            {item.displaySymbol ?? item.symbol}
          </div>

          <p
            title={item.name}
            className="mt-0.5 block truncate pr-2 text-[12px] font-normal text-zinc-500 dark:text-zinc-400 md:text-[13px]"
          >
            {item.name}
          </p>
        </div>
      </td>

      <td className="hidden overflow-hidden align-middle md:table-cell">
        <div className="flex w-full justify-center overflow-hidden">
          {desktop && <RelativeSparkline item={item} />}
        </div>
      </td>

      <td className="whitespace-nowrap pr-2 align-middle text-right font-medium ">
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
          ${showVotingColumns ? "hidden md:table-cell" : "pr-4 md:pr-0"}
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

        {!showVotingColumns && (
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
              <Numeric decimals={decimals}>{formattedChange ?? "—"}</Numeric>
            )}
          </div>
        )}
      </td>

      <td
        className={`
          hidden whitespace-nowrap py-3.5 align-middle
          text-right font-medium  md:table-cell
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
          hidden whitespace-nowrap py-3.5 align-middle text-right
          font-medium  md:table-cell
          ${showVotingColumns ? "" : "md:pr-4"}
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
        <VotingCells
          item={item}
          voteStats={voteStats}
          canVote={canVote}
          noVoteYetLabel={noVoteYetLabel}
          statsLoading={statsLoading}
          sessionDateMs={sessionDateMs}
          onPredictionRequest={onPredictionRequest}
          onVoteSuccess={onVoteSuccess}
        />
      )}
    </tr>
  );
}

function VotingCells({
  item,
  voteStats,
  canVote,
  noVoteYetLabel,
  statsLoading,
  sessionDateMs,
  onPredictionRequest,
  onVoteSuccess,
}: Pick<
  RelativeStockRowProps,
  | "item"
  | "voteStats"
  | "canVote"
  | "noVoteYetLabel"
  | "statsLoading"
  | "sessionDateMs"
  | "onPredictionRequest"
  | "onVoteSuccess"
>) {
  const user = useCurrentUser();
  const labels = MARKET_PREDICTION_LABELS[resolveLanguage(user?.language)];
  const eligible = isVotingAsset(item);
  const myPrediction = eligible ? voteStats?.myPrediction : null;
  const ready = !statsLoading && voteStats !== undefined;
  const hasVotes = (voteStats?.totalVotes ?? 0) > 0;
  const bullPercent = voteStats?.bullPercent ?? 0;
  const bearPercent = voteStats?.bearPercent ?? 0;
  const canCreate =
    eligible &&
    canVote &&
    ready &&
    !myPrediction &&
    sessionDateMs !== undefined;
  const canChange =
    eligible &&
    canVote &&
    ready &&
    !!myPrediction &&
    sessionDateMs !== undefined;
  const showStats = eligible && ready;
  const isBull = myPrediction?.direction === "BULL";

  function openPrediction(mode: MarketPredictionRequest["mode"]) {
    if (sessionDateMs === undefined || !canVote) return;
    onPredictionRequest({
      item,
      mode,
      sessionDate: new Date(sessionDateMs),
      initialVote: myPrediction
        ? {
            direction: myPrediction.direction,
            pointsBet: myPrediction.pointsBet,
          }
        : undefined,
      onSuccess: onVoteSuccess,
    });
  }

  const mark = myPrediction ? (
    <span
      className={`inline-flex items-center gap-0.5 ${
        isBull
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-[#cf0000] dark:text-[#ff4545]"
      }`}
    >
      {isBull ? (
        <TrendingUp className="size-4" aria-hidden="true" />
      ) : (
        <TrendingDown className="size-4" aria-hidden="true" />
      )}
      <Check className="size-3" aria-hidden="true" />
    </span>
  ) : null;
  const predictionTitle = myPrediction
    ? `${myPrediction.direction === "BULL" ? "Bull" : "Bear"}${myPrediction.pointsBet > 0 ? ` · ${myPrediction.pointsBet} pts` : ""}`
    : "";

  return (
    <>
      <td
        className="pl-2 align-middle md:pl-3 lg:pl-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto flex min-h-10 w-30 max-w-full items-center justify-center">
          {!eligible ? (
            <span className="text-zinc-400">—</span>
          ) : statsLoading ? (
            <span className="text-center text-[11px] text-zinc-500 dark:text-zinc-400">
              {noVoteYetLabel}
            </span>
          ) : showStats ? (
            <div
              role="img"
              aria-label={
                hasVotes
                  ? `${item.name}: Bull ${bullPercent}%, Bear ${bearPercent}%, ${voteStats.totalVotes}`
                  : noVoteYetLabel
              }
              title={
                hasVotes
                  ? `${voteStats.bullVotes} Bull / ${voteStats.bearVotes} Bear`
                  : noVoteYetLabel
              }
              className="w-full min-w-0 py-1"
            >
              {hasVotes ? (
                <>
                  <div
                    aria-hidden="true"
                    className="flex items-center justify-between gap-1 text-[11px] tabular-nums md:text-xs"
                  >
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {bullPercent}%
                    </span>
                    <span className="text-[#cf0000] dark:text-[#ff4545]">
                      {bearPercent}%
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700"
                  >
                    <div
                      className="h-full bg-emerald-600 dark:bg-emerald-400"
                      style={{ width: `${bullPercent}%` }}
                    />
                    <div
                      className="h-full bg-[#cf0000] dark:bg-[#ff4545]"
                      style={{ width: `${bearPercent}%` }}
                    />
                  </div>
                </>
              ) : (
                <span className="block text-center text-[11px] text-zinc-500 dark:text-zinc-400">
                  {noVoteYetLabel}
                </span>
              )}
            </div>
          ) : (
            <span
              title={labels.unavailable}
              aria-label={labels.unavailable}
              className="text-zinc-400"
            >
              —
            </span>
          )}
        </div>
      </td>
      <td
        className="px-1 text-center align-middle md:px-2"
        onClick={(event) => event.stopPropagation()}
      >
        {!eligible ? (
          <span className="text-zinc-400">—</span>
        ) : statsLoading ? (
          <span
            role="status"
            aria-label={labels.loading}
            className="mx-auto flex size-10 items-center justify-center"
          >
            <MarketSkeleton className="size-3 rounded-full" />
          </span>
        ) : canCreate ? (
          <button
            type="button"
            onClick={() => openPrediction("create")}
            aria-label={`${item.name}: ${labels.predict}`}
            aria-haspopup="dialog"
            className="mx-auto inline-flex min-h-9 shrink-0 cursor-pointer whitespace-nowrap items-center justify-center rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:border-zinc-500 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:focus-visible:ring-offset-zinc-800"
          >
            {labels.predict}
          </button>
        ) : myPrediction ? (
          canChange ? (
            <button
              type="button"
              onClick={() => openPrediction("change")}
              aria-label={`${item.name}: ${predictionTitle}. ${labels.change}`}
              aria-haspopup="dialog"
              title={`${predictionTitle} · ${labels.change}`}
              className="mx-auto flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-zinc-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:bg-zinc-600/50"
            >
              {mark}
            </button>
          ) : (
            <span
              role="img"
              aria-label={`${item.name}: ${predictionTitle}. ${labels.closed}`}
              title={`${predictionTitle} · ${labels.closed}`}
              className="mx-auto flex size-10 items-center justify-center"
            >
              {mark}
            </span>
          )
        ) : (
          <span
            role="img"
            title={canVote ? labels.open : labels.closed}
            aria-label={canVote ? labels.open : labels.closed}
            className="mx-auto flex size-10 items-center justify-center"
          >
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${
                canVote
                  ? "bg-emerald-500 dark:bg-emerald-400"
                  : "bg-zinc-300 dark:bg-zinc-600"
              }`}
            />
          </span>
        )}
      </td>
    </>
  );
}

function useDesktopScreen() {
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

  return desktop;
}

function RelativeSparkline({ item }: { item: MarketSymbolItem }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    if (nearViewport) {
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
  }, [nearViewport]);

  return (
    <div
      ref={containerRef}
      className="flex h-10 w-full items-center justify-center"
    >
      {nearViewport ? (
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
