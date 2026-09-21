"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";

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
}

interface GifApiResponse {
  results: GifResult[];
  next: string | null;
}

export function GifPicker({ open, onOpenChange, onSelect }: GifPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);

  const [next, setNext] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const requestIdRef = useRef(0);

  // ---------------------------------------------------------------------------
  // FETCH GIFS
  // ---------------------------------------------------------------------------

  const fetchGifs = useCallback(
    async ({
      search,
      pos,
      append = false,
    }: {
      search?: string;
      pos?: string | null;
      append?: boolean;
    } = {}) => {
      const requestId = ++requestIdRef.current;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();

        if (search?.trim()) {
          params.set("q", search.trim());
        }

        if (pos) {
          params.set("pos", pos);
        }

        const response = await fetch(`/api/klipy?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to load GIFs");
        }

        const data = (await response.json()) as GifApiResponse;

        // Ignore an older request that finished after a newer one.
        if (requestId !== requestIdRef.current) {
          return;
        }

        setGifs((current) =>
          append ? [...current, ...(data.results ?? [])] : (data.results ?? []),
        );

        setNext(data.next ?? null);
      } catch (error) {
        console.error("Failed to fetch GIFs:", error);

        if (!append && requestId === requestIdRef.current) {
          setGifs([]);
          setNext(null);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // INITIAL / SEARCH
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(
      () => {
        fetchGifs({
          search: query,
        });
      },
      query.trim() ? 300 : 0,
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [open, query, fetchGifs]);

  // ---------------------------------------------------------------------------
  // FOCUS SEARCH WHEN OPENED
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [open]);

  // ---------------------------------------------------------------------------
  // ESCAPE
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  // ---------------------------------------------------------------------------
  // CLICK OUTSIDE
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, onOpenChange]);

  // ---------------------------------------------------------------------------
  // SELECT
  // ---------------------------------------------------------------------------

  const handleSelect = (gif: GifResult) => {
    onSelect(gif);
    onOpenChange(false);
  };

  // ---------------------------------------------------------------------------
  // LOAD MORE
  // ---------------------------------------------------------------------------

  const handleLoadMore = () => {
    if (!next || loadingMore) return;

    fetchGifs({
      search: query,
      pos: next,
      append: true,
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div
      ref={pickerRef}
      className="
        absolute
top-full left-0
mt-2
        z-100
        flex
        h-120 w-95
        max-h-[min(480px,70vh)]
        max-w-[calc(100vw-32px)]
        flex-col
        overflow-hidden
        rounded-xl
        border border-zinc-200
        bg-white
        shadow-xl
        dark:border-zinc-700
        dark:bg-zinc-900
      "
    >
      {/* =============================================================== */}
      {/* HEADER                                                          */}
      {/* =============================================================== */}

      <div
        className="
          flex shrink-0
          items-center
          gap-2
          border-b border-zinc-200
          px-3 py-2.5
          dark:border-zinc-800
        "
      >
        <div
          className="
            flex min-w-0 flex-1
            items-center gap-2
            rounded-lg
            bg-zinc-100
            px-3
            dark:bg-zinc-800
          "
        >
          <Search size={16} className="shrink-0 text-zinc-400" />

          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search KLIPY"
            autoComplete="off"
            spellCheck={false}
            className="
              h-9 min-w-0 flex-1
              bg-transparent
              text-[14px]
              text-zinc-800
              outline-none
              placeholder:text-zinc-400
              dark:text-zinc-200
            "
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="
                flex size-6 shrink-0
                cursor-pointer
                items-center justify-center
                rounded-md
                text-zinc-400
                hover:bg-zinc-200
                hover:text-zinc-700
                dark:hover:bg-zinc-700
                dark:hover:text-zinc-200
              "
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="
            flex size-8 shrink-0
            cursor-pointer
            items-center justify-center
            rounded-md
            text-zinc-400
            hover:bg-zinc-100
            hover:text-zinc-700
            dark:hover:bg-zinc-800
            dark:hover:text-zinc-200
          "
        >
          <X size={17} />
        </button>
      </div>

      {/* =============================================================== */}
      {/* CONTENT                                                         */}
      {/* =============================================================== */}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div
            className="
              flex h-full
              items-center justify-center
              text-zinc-400
            "
          >
            <LoaderCircle size={22} className="animate-spin" />
          </div>
        ) : gifs.length === 0 ? (
          <div
            className="
              flex h-full
              items-center justify-center
              px-6
              text-center
              text-[13px]
              text-zinc-400
            "
          >
            {query.trim()
              ? `No GIFs found for "${query.trim()}"`
              : "No GIFs available"}
          </div>
        ) : (
          <>
            {/* Masonry-style columns */}

            <div className="columns-2 gap-1.5">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handleSelect(gif)}
                  title={gif.title}
                  className="
                    group
                    relative
                    mb-1.5
                    block
                    w-full
                    cursor-pointer
                    break-inside-avoid
                    overflow-hidden
                    rounded-md
                    bg-zinc-100
                    dark:bg-zinc-800
                  "
                >
                  <img
                    src={gif.preview || gif.src}
                    alt={gif.title}
                    width={gif.width || undefined}
                    height={gif.height || undefined}
                    loading="lazy"
                    className="
                      block
                      h-auto w-full
                      transition-opacity
                      group-hover:opacity-85
                    "
                  />
                </button>
              ))}
            </div>

            {next && (
              <button
                type="button"
                disabled={loadingMore}
                onClick={handleLoadMore}
                className="
                  mt-2 flex h-9 w-full
                  cursor-pointer
                  items-center justify-center
                  rounded-md
                  text-[13px] font-medium
                  text-zinc-500
                  hover:bg-zinc-100
                  disabled:cursor-default
                  disabled:opacity-50
                  dark:text-zinc-400
                  dark:hover:bg-zinc-800
                "
              >
                {loadingMore ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  "Load more"
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* =============================================================== */}
      {/* FOOTER                                                          */}
      {/* =============================================================== */}

      <div
        className="
          shrink-0
          border-t border-zinc-200
          px-3 py-2
          text-right
          text-[11px]
          text-zinc-400
          dark:border-zinc-800
        "
      >
        Powered by KLIPY
      </div>
    </div>
  );
}
