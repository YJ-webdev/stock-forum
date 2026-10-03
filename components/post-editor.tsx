"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

import Tiptap from "./tiptap";
import { Button } from "./ui/button";
import { createComment } from "@/app/actions/post";

import {
  ALL_MARKET_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";

interface PostEditorProps {
  setOnWrite: React.Dispatch<React.SetStateAction<boolean>>;
}

const RECENT_ASSETS_KEY = "recent-post-assets";
const MAX_RECENT_ASSETS = 5;

export function PostEditor({ setOnWrite }: PostEditorProps) {
  const params = useParams<{ symbol: string }>();

  const symbol = params.symbol ? decodeURIComponent(params.symbol) : "";

  const topicRef = useRef<HTMLDivElement>(null);

  const [content, setContent] = useState<JSONContent>({
    type: "doc",
    content: [{ type: "paragraph" }],
  });

  const [editorKey, setEditorKey] = useState(0);
  const [assetQuery, setAssetQuery] = useState("");
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [highlightedAssetIndex, setHighlightedAssetIndex] = useState(-1);
  const [selectedAssets, setSelectedAssets] = useState<MarketSymbolItem[]>([]);
  const [recentAssetSymbols, setRecentAssetSymbols] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  const currentAsset = useMemo(() => {
    if (!symbol) return null;

    return (
      ALL_MARKET_SYMBOLS.find((asset) => asset.symbol === symbol) ??
      ALL_MARKET_SYMBOLS.find((asset) => asset.displaySymbol === symbol) ??
      null
    );
  }, [symbol]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_ASSETS_KEY);

      if (!stored) return;

      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        setRecentAssetSymbols(
          parsed.filter((item): item is string => typeof item === "string"),
        );
      }
    } catch {
      // Ignore invalid localStorage data.
    }
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        topicRef.current &&
        !topicRef.current.contains(event.target as Node)
      ) {
        setAssetSelectorOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const recentAssets = useMemo(() => {
    return recentAssetSymbols
      .map((recentSymbol) =>
        ALL_MARKET_SYMBOLS.find((asset) => asset.symbol === recentSymbol),
      )
      .filter((asset): asset is MarketSymbolItem => Boolean(asset));
  }, [recentAssetSymbols]);

  const suggestedAssets = useMemo(() => {
    const suggestions: MarketSymbolItem[] = [];

    if (currentAsset) {
      suggestions.push(currentAsset);
    }

    for (const asset of recentAssets) {
      if (
        !suggestions.some((suggestion) => suggestion.symbol === asset.symbol)
      ) {
        suggestions.push(asset);
      }
    }

    return suggestions.slice(0, MAX_RECENT_ASSETS + 1);
  }, [currentAsset, recentAssets]);

  const searchResults = useMemo(() => {
    const query = assetQuery.trim().toLowerCase();

    if (!query) return [];

    return ALL_MARKET_SYMBOLS.filter((asset) => {
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.displaySymbol.toLowerCase().includes(query) ||
        asset.symbol.toLowerCase().includes(query)
      );
    }).slice(0, 10);
  }, [assetQuery]);

  const visibleAssets =
    assetQuery.trim().length > 0 ? searchResults : suggestedAssets;

  const isAssetSelected = (asset: MarketSymbolItem) => {
    return selectedAssets.some((selected) => selected.symbol === asset.symbol);
  };

  const MAX_SELECTED_ASSETS = 1;

  const toggleAsset = (asset: MarketSymbolItem) => {
    setSelectedAssets((prev) =>
      prev[0]?.symbol === asset.symbol ? [] : [asset],
    );

    setAssetQuery("");
    setAssetSelectorOpen(false);
    setHighlightedAssetIndex(-1);
  };

  const saveRecentAssets = (assets: MarketSymbolItem[]) => {
    if (assets.length === 0) return;

    const selectedSymbols = assets.map((asset) => asset.symbol);

    const next = [
      ...selectedSymbols,
      ...recentAssetSymbols.filter(
        (recentSymbol) => !selectedSymbols.includes(recentSymbol),
      ),
    ].slice(0, MAX_RECENT_ASSETS);

    setRecentAssetSymbols(next);

    try {
      localStorage.setItem(RECENT_ASSETS_KEY, JSON.stringify(next));
    } catch {
      // Ignore localStorage errors.
    }
  };

  const hasEditorContent = (node: JSONContent): boolean => {
    if (node.text?.trim()) {
      return true;
    }

    if (node.type === "image") {
      return true;
    }

    return node.content?.some(hasEditorContent) ?? false;
  };

  const handleSubmit = () => {
    if (selectedAssets.length === 0) {
      toast.error("Please select a board.");
      return;
    }

    if (!hasEditorContent(content)) {
      toast.error("Please write something.");
      return;
    }

    startTransition(async () => {
      try {
        const plainContent = JSON.parse(JSON.stringify(content));

        const result = await createComment({
          content: plainContent,
          assetSymbols: selectedAssets.map((asset) => asset.symbol),
        });

        if (!result.commentId) {
          throw new Error("Comment was created without an ID.");
        }

        saveRecentAssets(selectedAssets);

        setContent({
          type: "doc",
          content: [{ type: "paragraph" }],
        });

        setSelectedAssets([]);
        setAssetQuery("");
        setAssetSelectorOpen(false);

        setEditorKey((prev) => prev + 1);

        setOnWrite(false);

        toast.success("Comment posted.");

        const targetUrl = `/${encodeURIComponent(
          selectedAssets[0]?.symbol ?? symbol,
        )}?comment=${encodeURIComponent(result.commentId)}`;

        router.push(targetUrl);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to post comment.",
        );
      }
    });
  };

  useEffect(() => {
    setHighlightedAssetIndex(-1);
  }, [assetQuery]);

  return (
    <div className="flex h-full min-h-0 w-full space-y-2 flex-col px-4 pt-2">
      <div
        className="
            flex shrink-0 items-center justify-between
            pt-1
           
          "
      >
        <p className="text-xs -translate-y-1 font-normal tracking-wider text-muted-foreground/50">
          Write your thoughts
        </p>
        <div className="shrink-0">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOnWrite(false)}
              className="size-8 ml-auto"
              aria-label="Close account"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
      <div
        ref={topicRef}
        className="relative flex flex-wrap gap-4 items-center shrink-0 mb-4"
      >
        {selectedAssets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedAssets.map((asset) => (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => toggleAsset(asset)}
                title={`Remove ${asset.name}`}
                className="
    inline-flex cursor-pointer rounded-full
    px-2.5 py-1 border border-zinc-400 dark:border-zinc-600
    text-[12px] font-medium text-zinc-600
     dark:text-zinc-300 bg-transparent
  "
              >
                {asset.displaySymbol}
              </button>
            ))}
          </div>
        )}

        <div
          className="
            flex items-center gap-2
          "
        >
          {selectedAssets.length === 0 && (
            <div className="flex items-center gap-2">
              <Search
                className="
              h-4 w-4 shrink-0
              text-gray-500/50 dark:text-zinc-700
            "
              />
              <input
                type="text"
                value={assetQuery}
                onFocus={() => setAssetSelectorOpen(true)}
                onChange={(e) => {
                  setAssetQuery(e.target.value);
                  setAssetSelectorOpen(true);
                }}
                onKeyDown={(e) => {
                  if (!assetSelectorOpen || visibleAssets.length === 0) {
                    return;
                  }

                  if (e.key === "ArrowDown") {
                    e.preventDefault();

                    setHighlightedAssetIndex((prev) =>
                      prev < visibleAssets.length - 1 ? prev + 1 : 0,
                    );

                    return;
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();

                    setHighlightedAssetIndex((prev) =>
                      prev > 0 ? prev - 1 : visibleAssets.length - 1,
                    );

                    return;
                  }

                  if (e.key === "Enter") {
                    e.preventDefault();

                    const asset =
                      visibleAssets[
                        highlightedAssetIndex >= 0 ? highlightedAssetIndex : 0
                      ];

                    if (asset) {
                      toggleAsset(asset);
                      setHighlightedAssetIndex(-1);
                    }

                    return;
                  }

                  if (e.key === "Escape") {
                    e.preventDefault();

                    setAssetSelectorOpen(false);
                    setHighlightedAssetIndex(-1);
                  }
                }}
                placeholder="Search assets..."
                autoComplete="off"
                className="
    placeholder:text-gray-500/50
    dark:placeholder:text-zinc-700
    text-zinc-800
    dark:text-zinc-300
    w-full
    bg-transparent
    text-[15px]
    outline-none
  "
              />{" "}
            </div>
          )}
        </div>

        {selectedAssets.length === 0 && assetSelectorOpen && (
          <div
            className="
              absolute left-0 right-0 top-full z-50
              max-h-75
              overflow-y-auto
              rounded-xl
              p-1.5
              shadow-lg
              bg-white
              dark:bg-black
            "
          >
            {!assetQuery.trim() && (
              <>
                {currentAsset && (
                  <AssetOption
                    asset={currentAsset}
                    selected={isAssetSelected(currentAsset)}
                    onClick={() => toggleAsset(currentAsset)}
                    onMouseEnter={() => setHighlightedAssetIndex(0)}
                    highlighted={highlightedAssetIndex === 0}
                  />
                )}

                {recentAssets.some(
                  (asset) => asset.symbol !== currentAsset?.symbol,
                ) && (
                  <p
                    className="
                      mt-1
                      px-2 pb-1 pt-2
                      text-[11px] font-medium
                      uppercase tracking-wide
                      text-zinc-400 cursor-pointer
                    "
                  >
                    Recent
                  </p>
                )}

                {recentAssets
                  .filter((asset) => asset.symbol !== currentAsset?.symbol)
                  .slice(0, MAX_RECENT_ASSETS)
                  .map((asset, index) => {
                    const optionIndex = index + 1;

                    return (
                      <AssetOption
                        key={asset.symbol}
                        asset={asset}
                        selected={isAssetSelected(asset)}
                        onClick={() => toggleAsset(asset)}
                        onMouseEnter={() =>
                          setHighlightedAssetIndex(optionIndex)
                        }
                        highlighted={highlightedAssetIndex === optionIndex}
                      />
                    );
                  })}

                {visibleAssets.length === 0 && (
                  <div
                    className="
                      px-3 py-4
                      text-center text-[13px]
                      text-zinc-400
                    "
                  >
                    Start typing to search assets
                  </div>
                )}
              </>
            )}

            {assetQuery.trim() && (
              <>
                {searchResults.length > 0 ? (
                  searchResults.map((asset, index) => (
                    <AssetOption
                      key={asset.symbol}
                      asset={asset}
                      selected={isAssetSelected(asset)}
                      highlighted={highlightedAssetIndex === index}
                      onMouseEnter={() => setHighlightedAssetIndex(index)}
                      onClick={() => {
                        toggleAsset(asset);
                        setHighlightedAssetIndex(-1);
                      }}
                    />
                  ))
                ) : (
                  <div
                    className="
                      px-3 py-4
                      text-center text-[13px]
                      text-zinc-400
                    "
                  >
                    No assets found
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="hide-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
        {isPending ? (
          <div className="flex h-full items-center justify-center">
            <div
              className="
          size-5
          animate-spin
          rounded-full
          border-2
          border-zinc-200
          border-t-zinc-700
          dark:border-zinc-700
          dark:border-t-zinc-200
        "
            />
          </div>
        ) : (
          <Tiptap key={editorKey} content={content} onChange={setContent} />
        )}
      </div>

      <div className="ml-auto pb-4 flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          className="text-[15px]"
          disabled={isPending}
          onClick={() => setOnWrite(false)}
        >
          Cancel
        </Button>

        <Button
          type="button"
          className="w-18 text-[15px]"
          disabled={isPending || !hasEditorContent(content)}
          onClick={handleSubmit}
        >
          {isPending ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}

function AssetOption({
  asset,
  selected,
  highlighted,
  onClick,
  onMouseEnter,
}: {
  asset: MarketSymbolItem;
  selected: boolean;
  highlighted: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      title={asset.name}
      className={`
        flex w-full
        items-center
        rounded-lg
        px-2.5 py-2
        text-left
        cursor-pointer
        transition-colors

        ${
          selected || highlighted
            ? "bg-zinc-100 dark:bg-zinc-800"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }
      `}
    >
      <span
        className="
          min-w-19
          text-[14px] font-semibold
          text-zinc-900
          dark:text-zinc-100
        "
      >
        {asset.displaySymbol}
      </span>

      <span
        className="
          min-w-0 flex-1 truncate
          text-[13px]
          text-zinc-500
          dark:text-zinc-400
        "
      >
        {asset.name}
      </span>

      {selected && (
        <span
          className="
            ml-3 shrink-0
            text-[12px] font-medium
            text-zinc-500
          "
        >
          Selected
        </span>
      )}
    </button>
  );
}
