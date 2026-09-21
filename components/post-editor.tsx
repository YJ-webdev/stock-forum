"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import Tiptap from "./tiptap";
import { Button } from "./ui/button";
import { createComment } from "@/app/actions/post";

import {
  ALL_MARKET_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";
import { useCommentRefresh } from "@/app/context/comment-refresh-context";

interface PostEditorProps {
  isLoggedIn: boolean;
  nationality: string | null;
  setOnWrite: React.Dispatch<React.SetStateAction<boolean>>;
  onCommentCreated: () => Promise<void>;
}

const RECENT_ASSETS_KEY = "recent-post-assets";
const MAX_RECENT_ASSETS = 5;

export function PostEditor({
  isLoggedIn,
  nationality,
  setOnWrite,
  onCommentCreated,
}: PostEditorProps) {
  const searchParams = useSearchParams();
  const symbol = searchParams.get("symbol");
  const topicRef = useRef<HTMLDivElement>(null);

  const [content, setContent] = useState<JSONContent>({
    type: "doc",
    content: [{ type: "paragraph" }],
  });

  const [editorKey, setEditorKey] = useState(0);

  // ---------------------------------------------------------------------------
  // ASSET SELECTOR
  // ---------------------------------------------------------------------------

  const [assetQuery, setAssetQuery] = useState("");
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);

  const [selectedAssets, setSelectedAssets] = useState<MarketSymbolItem[]>([]);
  const [recentAssetSymbols, setRecentAssetSymbols] = useState<string[]>([]);

  const [isPending, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // CURRENT ASSET
  // ---------------------------------------------------------------------------

  const currentAsset = useMemo(() => {
    if (!symbol) return null;

    return (
      ALL_MARKET_SYMBOLS.find((asset) => asset.symbol === symbol) ??
      ALL_MARKET_SYMBOLS.find((asset) => asset.displaySymbol === symbol) ??
      null
    );
  }, [symbol]);

  const { notifyCommentChanged } = useCommentRefresh();

  // ---------------------------------------------------------------------------
  // LOAD RECENT ASSETS
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // CLOSE SELECTOR WHEN CLICKING OUTSIDE
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // RECENT ASSETS
  // ---------------------------------------------------------------------------

  const recentAssets = useMemo(() => {
    return recentAssetSymbols
      .map((recentSymbol) =>
        ALL_MARKET_SYMBOLS.find((asset) => asset.symbol === recentSymbol),
      )
      .filter((asset): asset is MarketSymbolItem => Boolean(asset));
  }, [recentAssetSymbols]);

  // ---------------------------------------------------------------------------
  // EMPTY INPUT SUGGESTIONS
  //
  // Current asset first.
  // Then recently used assets.
  // No huge asset list until the user starts typing.
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // AUTOCOMPLETE RESULTS
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // SELECT / DESELECT
  // ---------------------------------------------------------------------------

  const isAssetSelected = (asset: MarketSymbolItem) => {
    return selectedAssets.some((selected) => selected.symbol === asset.symbol);
  };

  const MAX_SELECTED_ASSETS = 2;

  const toggleAsset = (asset: MarketSymbolItem) => {
    setSelectedAssets((prev) => {
      const alreadySelected = prev.some(
        (selected) => selected.symbol === asset.symbol,
      );

      // Allow deselecting anytime
      if (alreadySelected) {
        return prev.filter((selected) => selected.symbol !== asset.symbol);
      }

      // Maximum 2 assets
      if (prev.length >= MAX_SELECTED_ASSETS) {
        toast.error("You can select up to 2 boards.");
        return prev;
      }

      return [...prev, asset];
    });

    setAssetQuery("");
    setAssetSelectorOpen(false);
  };
  // ---------------------------------------------------------------------------
  // SAVE RECENT ASSETS
  //
  // Only call this AFTER the post was successfully created.
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // SUBMIT
  // ---------------------------------------------------------------------------

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        if (selectedAssets.length === 0) {
          toast.error("Please select at least one board.");
          return;
        }

        const plainContent = JSON.parse(JSON.stringify(content));

        await createComment({
          content: plainContent,
          assetSymbols: selectedAssets.map((asset) => asset.symbol),
        });

        notifyCommentChanged();
        // Only successfully posted assets become Recent.
        saveRecentAssets(selectedAssets);

        // Reset editor.
        setContent({
          type: "doc",
          content: [{ type: "paragraph" }],
        });

        // Reset asset selector.
        setSelectedAssets([]);
        setAssetQuery("");
        setAssetSelectorOpen(false);

        // Reset TipTap.
        setEditorKey((prev) => prev + 1);

        toast.success("Comment posted.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to post comment.",
        );
      }
    });
  };
  return (
    <div className="mt-5 flex h-full min-h-0 w-full space-y-2 flex-col px-4">
      {/* ============================================================= */}
      {/* ASSET / TOPIC SELECTOR                                        */}
      {/* ============================================================= */}

      <div
        ref={topicRef}
        className="relative flex flex-wrap gap-4 items-center mt-4 shrink-0 mb-5"
      >
        {/* Selected assets */}

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

        {/* Search input */}

        <div
          className="
            flex items-center gap-2
          "
        >
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
          />
        </div>

        {/* =========================================================== */}
        {/* AUTOCOMPLETE                                                */}
        {/* =========================================================== */}

        {assetSelectorOpen && (
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
            {/* ------------------------------------------------------- */}
            {/* Empty query                                             */}
            {/* Current + recent only                                   */}
            {/* ------------------------------------------------------- */}

            {!assetQuery.trim() && (
              <>
                {currentAsset && (
                  <AssetOption
                    asset={currentAsset}
                    selected={isAssetSelected(currentAsset)}
                    onClick={() => toggleAsset(currentAsset)}
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
                  .map((asset) => (
                    <AssetOption
                      key={asset.symbol}
                      asset={asset}
                      selected={isAssetSelected(asset)}
                      onClick={() => toggleAsset(asset)}
                    />
                  ))}

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

            {/* ------------------------------------------------------- */}
            {/* Search mode                                             */}
            {/* ------------------------------------------------------- */}

            {assetQuery.trim() && (
              <>
                {searchResults.length > 0 ? (
                  searchResults.map((asset) => (
                    <AssetOption
                      key={asset.symbol}
                      asset={asset}
                      selected={isAssetSelected(asset)}
                      onClick={() => toggleAsset(asset)}
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

      {/* ============================================================= */}
      {/* EDITOR                                                        */}
      {/* ============================================================= */}

      <div className="hide-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Tiptap key={editorKey} content={content} onChange={setContent} />
      </div>

      {/* ============================================================= */}
      {/* ACTIONS                                                       */}
      {/* ============================================================= */}

      <div className="ml-auto mb-4 mt-2 flex shrink-0 gap-2">
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
          disabled={isPending}
          onClick={handleSubmit}
        >
          {isPending ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// ASSET OPTION
// =============================================================================

function AssetOption({
  asset,
  selected,
  onClick,
}: {
  asset: MarketSymbolItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
          selected
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
