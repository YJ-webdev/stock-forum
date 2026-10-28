"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, Search, X } from "lucide-react";
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
} from "@floating-ui/dom";

export interface GifResult {
  id: string;
  title: string;
  src: string;
  preview: string;
  width: number;
  height: number;
}

interface GifPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (gif: GifResult) => void;
  triggerRef?: RefObject<HTMLElement | null>;
}

interface GifApiResponse {
  results: GifResult[];
  next: string | null;
}

interface FetchGifsOptions {
  search?: string;
  pos?: string | null;
  append?: boolean;
}

class GifRequestError extends Error {
  constructor(
    message: string,
    public readonly detail: string,
  ) {
    super(message);
    this.name = "GifRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGifResult(value: unknown): value is GifResult {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.src === "string" &&
    typeof value.preview === "string" &&
    typeof value.width === "number" &&
    typeof value.height === "number"
  );
}

function isGifApiResponse(value: unknown): value is GifApiResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.results) &&
    value.results.every(isGifResult) &&
    (value.next === null || typeof value.next === "string")
  );
}

export function GifPicker({
  open,
  onOpenChange,
  onSelect,
  triggerRef,
}: GifPickerProps) {
  const titleId = useId();

  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [next, setNext] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  const [positionReady, setPositionReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cancelRequest = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const fetchGifs = useCallback(
    async ({ search, pos, append = false }: FetchGifsOptions = {}) => {
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const requestId = ++requestIdRef.current;

      setErrorMessage(null);
      setLoading(!append);
      setLoadingMore(append);

      if (!append) {
        setNext(null);
      }

      try {
        const params = new URLSearchParams();

        if (search?.trim()) {
          params.set("q", search.trim());
        }

        if (pos && pos !== "0") {
          params.set("pos", pos);
        }

        const response = await fetch(`/api/klipy?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text();

          let message = "Could not load GIFs. Please try again.";

          try {
            const payload: unknown = JSON.parse(body);

            if (isRecord(payload) && typeof payload.error === "string") {
              message = payload.error;
            }
          } catch {
            // The response may be HTML or plain text.
          }

          throw new GifRequestError(
            message,
            `GIF API request failed (${response.status}): ${body}`,
          );
        }

        const data: unknown = await response.json();

        if (!isGifApiResponse(data)) {
          throw new GifRequestError(
            "GIF service returned an invalid response.",
            "GIF API response does not match the expected structure.",
          );
        }

        if (requestId !== requestIdRef.current) {
          return;
        }

        setGifs((current) => {
          const items = append ? [...current, ...data.results] : data.results;

          return Array.from(
            new Map(items.map((gif) => [gif.id, gif])).values(),
          );
        });

        setNext(data.next && data.next !== "0" ? data.next : null);
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        console.error(
          error instanceof GifRequestError
            ? error.detail
            : "Failed to fetch GIFs:",
          ...(error instanceof GifRequestError ? [] : [error]),
        );

        setErrorMessage(
          error instanceof GifRequestError
            ? error.message
            : "Could not load GIFs. Please try again.",
        );

        if (!append) {
          setGifs([]);
          setNext(null);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);

          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
        }
      }
    },
    [],
  );

  // Load featured GIFs or debounce search.
  // Cancel outstanding requests immediately when the query changes.
  useEffect(() => {
    if (!open) {
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    setErrorMessage(null);
    setGifs([]);
    setNext(null);
    setLoading(true);
    setLoadingMore(false);

    const timeout = window.setTimeout(
      () => {
        void fetchGifs({ search: query });
      },
      query.trim() ? 300 : 0,
    );

    return () => {
      window.clearTimeout(timeout);
      cancelRequest();
    };
  }, [open, query, fetchGifs, cancelRequest]);

  // Position the picker relative to its trigger, or center it.
  useEffect(() => {
    if (!open || !mounted) return;

    const picker = pickerRef.current;

    if (!picker) return;

    let active = true;
    setPositionReady(false);

    const trigger = triggerRef?.current;

    if (!trigger) {
      Object.assign(picker.style, {
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        maxHeight: "calc(100dvh - 24px)",
      });

      setPositionReady(true);
      return;
    }

    const updatePosition = async () => {
      const result = await computePosition(trigger, picker, {
        strategy: "fixed",
        placement: "top-start",
        middleware: [
          offset(8),
          flip({
            fallbackPlacements: [
              "bottom-start",
              "top-end",
              "bottom-end",
              "right-start",
              "left-start",
              "right",
              "left",
            ],
            padding: 12,
          }),
          shift({
            padding: 12,
            crossAxis: true,
          }),
          size({
            padding: 12,
            apply({ availableHeight, elements }) {
              if (!active) return;

              elements.floating.style.maxHeight = `${Math.max(
                0,
                availableHeight,
              )}px`;
            },
          }),
        ],
      });

      if (!active) return;

      Object.assign(picker.style, {
        position: "fixed",
        left: `${result.x}px`,
        top: `${result.y}px`,
        transform: "none",
      });

      setPositionReady(true);
    };

    const cleanup = autoUpdate(trigger, picker, updatePosition, {
      ancestorScroll: true,
      ancestorResize: true,
      elementResize: true,
      layoutShift: true,
    });

    return () => {
      active = false;
      cleanup();
    };
  }, [open, mounted, triggerRef]);

  useEffect(() => {
    if (!open || !mounted) return;

    const timeout = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        triggerRef?.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange, triggerRef]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) return;
      if (pickerRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;

      onOpenChange(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, onOpenChange, triggerRef]);

  const handleSelect = (gif: GifResult) => {
    onSelect(gif);
    onOpenChange(false);
  };

  const handleLoadMore = () => {
    if (!next || loading || loadingMore) return;

    void fetchGifs({
      search: query,
      pos: next,
      append: true,
    });
  };

  const handleRetry = () => {
    if (loading || loadingMore) return;

    if (gifs.length > 0 && next) {
      void fetchGifs({
        search: query,
        pos: next,
        append: true,
      });
      return;
    }

    void fetchGifs({ search: query });
  };

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      ref={pickerRef}
      role="dialog"
      aria-labelledby={titleId}
      className="
        fixed z-9999
        flex h-120 w-95
        max-w-[calc(100vw-24px)]
        flex-col overflow-hidden
        rounded-xl border border-zinc-200
        bg-white shadow-xl
        dark:border-zinc-700 dark:bg-zinc-900
      "
      style={{
        visibility: positionReady ? "visible" : "hidden",
      }}
    >
      <h2 id={titleId} className="sr-only">
        Choose a GIF
      </h2>

      {/* Search */}
      <div
        className="
          flex shrink-0 items-center gap-2
          border-b border-zinc-200 px-3 py-2.5
          dark:border-zinc-800
        "
      >
        <div
          className="
            flex min-w-0 flex-1 items-center gap-2
            rounded-lg bg-zinc-100 px-3
            dark:bg-zinc-800
          "
        >
          <Search
            size={16}
            aria-hidden="true"
            className="shrink-0 text-zinc-400"
          />

          <input
            ref={searchInputRef}
            type="text"
            aria-label="Search KLIPY"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search KLIPY"
            autoComplete="off"
            spellCheck={false}
            className="
              h-9 min-w-0 flex-1
              bg-transparent text-[14px]
              text-zinc-800 outline-none
              placeholder:text-zinc-400
              dark:text-zinc-200
            "
          />

          {query && (
            <button
              type="button"
              aria-label="Clear GIF search"
              onClick={() => setQuery("")}
              className="
                flex size-6 shrink-0 cursor-pointer
                items-center justify-center rounded-md
                text-zinc-400
                hover:bg-zinc-200 hover:text-zinc-700
                dark:hover:bg-zinc-700 dark:hover:text-zinc-200
              "
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label="Close GIF picker"
          onClick={() => {
            onOpenChange(false);
            triggerRef?.current?.focus();
          }}
          className="
            flex size-8 shrink-0 cursor-pointer
            items-center justify-center rounded-md
            text-zinc-400
            hover:bg-zinc-100 hover:text-zinc-700
            dark:hover:bg-zinc-800 dark:hover:text-zinc-200
          "
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      {/* Results */}
      <div
        aria-busy={loading || loadingMore}
        className="min-h-0 flex-1 overflow-y-auto p-2"
      >
        {loading ? (
          <div
            role="status"
            className="flex h-full items-center justify-center text-zinc-400"
          >
            <LoaderCircle
              size={22}
              aria-hidden="true"
              className="animate-spin"
            />
            <span className="sr-only">Loading GIFs</span>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div
                role="alert"
                className="
                  mb-2 rounded-lg
                  bg-red-50 px-3 py-3
                  text-center text-[13px] text-red-600
                  dark:bg-red-950/30 dark:text-red-400
                "
              >
                <p>{errorMessage}</p>

                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={loadingMore}
                  className="
                    mt-2 cursor-pointer
                    font-medium underline underline-offset-2
                    disabled:cursor-default disabled:opacity-50
                  "
                >
                  {loadingMore ? "Retrying..." : "Try again"}
                </button>
              </div>
            )}

            {gifs.length === 0 ? (
              !errorMessage && (
                <div
                  className="
                    flex h-full items-center justify-center
                    px-6 text-center text-[13px] text-zinc-400
                  "
                >
                  {query.trim()
                    ? `No GIFs found for "${query.trim()}"`
                    : "No GIFs available"}
                </div>
              )
            ) : (
              <>
                <div className="columns-2 gap-1.5">
                  {gifs.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      onClick={() => handleSelect(gif)}
                      title={gif.title}
                      className="
                        group relative mb-1.5 block w-full
                        cursor-pointer break-inside-avoid
                        overflow-hidden rounded-md
                        bg-zinc-100 dark:bg-zinc-800
                      "
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gif.preview || gif.src}
                        alt={gif.title}
                        width={gif.width || undefined}
                        height={gif.height || undefined}
                        loading="lazy"
                        className="
                          block h-auto w-full
                          transition-opacity group-hover:opacity-85
                        "
                      />
                    </button>
                  ))}
                </div>

                {next && !errorMessage && (
                  <button
                    type="button"
                    disabled={loading || loadingMore}
                    onClick={handleLoadMore}
                    className="
                      mt-2 flex h-9 w-full cursor-pointer
                      items-center justify-center rounded-md
                      text-[13px] font-medium text-zinc-500
                      hover:bg-zinc-100
                      disabled:cursor-default disabled:opacity-50
                      dark:text-zinc-400 dark:hover:bg-zinc-800
                    "
                  >
                    {loadingMore ? (
                      <>
                        <LoaderCircle
                          size={16}
                          aria-hidden="true"
                          className="animate-spin"
                        />
                        <span className="sr-only">Loading more GIFs</span>
                      </>
                    ) : (
                      "Load more"
                    )}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div
        className="
          shrink-0 border-t border-zinc-200
          px-3 py-2 text-right text-[11px] text-zinc-400
          dark:border-zinc-800
        "
      >
        Powered by KLIPY
      </div>
    </div>,
    document.body,
  );
}
