"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
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
import { hasEditorContent } from "@/lib/utils/tiptap-utils";

interface PostEditorProps {
  userId: string;
  setOnWrite: Dispatch<SetStateAction<boolean>>;
}

interface PostDraft {
  version: 1;
  content: JSONContent;
  assetSymbols: string[];
}

const RECENT_ASSETS_KEY = "recent-post-assets";
const MAX_RECENT_ASSETS = 5;

function createEmptyContent(): JSONContent {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

function isEditorDocument(value: unknown): value is JSONContent {
  if (!value || typeof value !== "object") return false;

  const node = value as Record<string, unknown>;

  return node.type === "doc" && Array.isArray(node.content);
}

export function PostEditor({ userId, setOnWrite }: PostEditorProps) {
  const params = useParams<{ symbol?: string }>();
  const router = useRouter();

  const symbol = params.symbol ? decodeURIComponent(params.symbol) : "";
  const draftKey = `post-comment-draft:v1:${userId}`;

  const topicRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);

  const [draftReady, setDraftReady] = useState(false);
  const [content, setContent] = useState<JSONContent>(createEmptyContent);
  const [editorKey, setEditorKey] = useState(0);

  const [assetQuery, setAssetQuery] = useState("");
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [highlightedAssetIndex, setHighlightedAssetIndex] = useState(-1);
  const [selectedAssets, setSelectedAssets] = useState<MarketSymbolItem[]>([]);
  const [recentAssetSymbols, setRecentAssetSymbols] = useState<string[]>([]);

  const [isPending, startTransition] = useTransition();

  const currentAsset = useMemo(() => {
    if (!symbol) return null;

    return (
      ALL_MARKET_SYMBOLS.find(
        (asset) => asset.symbol === symbol || asset.displaySymbol === symbol,
      ) ?? null
    );
  }, [symbol]);

  useEffect(() => {
    setDraftReady(false);

    let restoredContent = createEmptyContent();
    let restoredAssets: MarketSymbolItem[] = [];

    try {
      const stored = localStorage.getItem(draftKey);

      if (stored) {
        const draft = JSON.parse(stored) as Partial<PostDraft> | null;

        if (
          draft?.version === 1 &&
          isEditorDocument(draft.content) &&
          Array.isArray(draft.assetSymbols)
        ) {
          restoredContent = draft.content;

          restoredAssets = ALL_MARKET_SYMBOLS.filter((asset) =>
            draft.assetSymbols!.includes(asset.symbol),
          ).slice(0, 1);
        }
      }
    } catch {
      // Invalid or unavailable storage does not block the editor.
    }

    setContent(restoredContent);
    setSelectedAssets(restoredAssets);
    setAssetQuery("");
    setAssetSelectorOpen(false);
    setHighlightedAssetIndex(-1);
    setEditorKey((current) => current + 1);
    setDraftReady(true);
  }, [draftKey]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_ASSETS_KEY);
      if (!stored) return;

      const parsed: unknown = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        setRecentAssetSymbols(
          parsed
            .filter((item): item is string => typeof item === "string")
            .slice(0, MAX_RECENT_ASSETS),
        );
      }
    } catch {
      // Ignore unavailable storage.
    }
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !topicRef.current?.contains(event.target)
      ) {
        setAssetSelectorOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const recentAssets = useMemo(
    () =>
      recentAssetSymbols
        .map((recentSymbol) =>
          ALL_MARKET_SYMBOLS.find((asset) => asset.symbol === recentSymbol),
        )
        .filter((asset): asset is MarketSymbolItem => Boolean(asset)),
    [recentAssetSymbols],
  );

  const suggestedAssets = useMemo(() => {
    const assets = currentAsset ? [currentAsset] : [];

    for (const asset of recentAssets) {
      if (!assets.some((item) => item.symbol === asset.symbol)) {
        assets.push(asset);
      }
    }

    return assets.slice(0, MAX_RECENT_ASSETS + 1);
  }, [currentAsset, recentAssets]);

  const searchResults = useMemo(() => {
    const query = assetQuery.trim().toLowerCase();
    if (!query) return [];

    return ALL_MARKET_SYMBOLS.filter(
      (asset) =>
        asset.name.toLowerCase().includes(query) ||
        asset.displaySymbol.toLowerCase().includes(query) ||
        asset.symbol.toLowerCase().includes(query),
    ).slice(0, 10);
  }, [assetQuery]);

  const isSearching = assetQuery.trim().length > 0;
  const visibleAssets = isSearching ? searchResults : suggestedAssets;
  const canPost = draftReady && hasEditorContent(content);

  function saveDraft(nextContent: JSONContent, nextAssets: MarketSymbolItem[]) {
    const draft: PostDraft = {
      version: 1,
      content: nextContent,
      assetSymbols: nextAssets.map((asset) => asset.symbol),
    };

    try {
      if (!hasEditorContent(nextContent) && nextAssets.length === 0) {
        localStorage.removeItem(draftKey);
      } else {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      }
    } catch {
      // Keep editing even if browser storage is unavailable or full.
    }
  }

  function handleContentChange(nextContent: JSONContent) {
    if (!draftReady || submittingRef.current) return;

    setContent(nextContent);
    saveDraft(nextContent, selectedAssets);
  }

  function toggleAsset(asset: MarketSymbolItem) {
    if (submittingRef.current) return;

    const nextAssets =
      selectedAssets[0]?.symbol === asset.symbol ? [] : [asset];

    setSelectedAssets(nextAssets);
    saveDraft(content, nextAssets);

    setAssetQuery("");
    setAssetSelectorOpen(false);
    setHighlightedAssetIndex(-1);
  }

  function saveRecentAssets(assets: MarketSymbolItem[]) {
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
      // Ignore unavailable storage.
    }
  }

  function handleClose() {
    if (submittingRef.current) return;

    if (draftReady) {
      saveDraft(content, selectedAssets);
    }

    setOnWrite(false);
  }

  function handleSubmit() {
    if (!draftReady || submittingRef.current) return;

    const targetAsset = selectedAssets[0];

    if (!targetAsset) {
      toast.error("Please select a board.");
      return;
    }

    if (!hasEditorContent(content)) {
      toast.error("Please write something.");
      return;
    }

    submittingRef.current = true;

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

        try {
          localStorage.removeItem(draftKey);
        } catch {
          // Posting succeeded even if storage cleanup fails.
        }

        setContent(createEmptyContent());
        setSelectedAssets([]);
        setAssetQuery("");
        setAssetSelectorOpen(false);
        setHighlightedAssetIndex(-1);
        setEditorKey((current) => current + 1);

        setOnWrite(false);
        toast.success("Comment posted.");

        router.push(
          `/market/${encodeURIComponent(targetAsset.symbol)}?comment=${encodeURIComponent(result.commentId)}`,
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to post comment.",
        );
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <section
      aria-labelledby="post-editor-heading"
      className="flex h-full min-h-0 w-full flex-col space-y-2 px-5 pt-5"
    >
      <h2 id="post-editor-heading" className="sr-only">
        Write a post
      </h2>
      <div
        ref={topicRef}
        className="relative mb-4 flex shrink-0 flex-wrap items-center gap-4"
      >
        {selectedAssets.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedAssets.map((asset) => (
              <button
                key={asset.symbol}
                type="button"
                disabled={isPending}
                onClick={() => toggleAsset(asset)}
                title={`Remove ${asset.name}`}
                className="
                  inline-flex cursor-pointer rounded-full
                  border border-zinc-400 bg-transparent px-2.5 py-1
                  text-[12px] font-medium text-zinc-600
                  disabled:cursor-default disabled:opacity-50
                  dark:border-zinc-600 dark:text-zinc-300
                "
              >
                {asset.displaySymbol}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-gray-500/50 dark:text-zinc-700" />

            <input
              type="text"
              value={assetQuery}
              disabled={!draftReady || isPending}
              onFocus={() => setAssetSelectorOpen(true)}
              onChange={(event) => {
                setAssetQuery(event.target.value);
                setAssetSelectorOpen(true);
                setHighlightedAssetIndex(-1);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setAssetSelectorOpen(false);
                  setHighlightedAssetIndex(-1);
                  return;
                }

                if (!assetSelectorOpen || visibleAssets.length === 0) {
                  return;
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlightedAssetIndex((current) =>
                    current < visibleAssets.length - 1 ? current + 1 : 0,
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlightedAssetIndex((current) =>
                    current > 0 ? current - 1 : visibleAssets.length - 1,
                  );
                } else if (event.key === "Enter") {
                  event.preventDefault();

                  const asset =
                    visibleAssets[Math.max(highlightedAssetIndex, 0)];

                  if (asset) toggleAsset(asset);
                }
              }}
              placeholder="Search assets..."
              autoComplete="off"
              className="
                w-full bg-transparent text-[15px] text-zinc-800 outline-none
                placeholder:text-gray-500/50
                dark:text-zinc-300 dark:placeholder:text-zinc-700
              "
            />
          </div>
        )}

        {selectedAssets.length === 0 && assetSelectorOpen && (
          <div
            className="
              absolute inset-x-0 top-full z-50 max-h-75
              overflow-y-auto rounded-xl bg-white p-1.5 shadow-lg
              dark:bg-black
            "
          >
            {visibleAssets.map((asset, index) => {
              const showRecentLabel =
                !isSearching &&
                asset.symbol !== currentAsset?.symbol &&
                index === (currentAsset ? 1 : 0);

              return (
                <div key={asset.symbol}>
                  {showRecentLabel && (
                    <p className="mt-1 px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
                      Recent
                    </p>
                  )}

                  <AssetOption
                    asset={asset}
                    highlighted={highlightedAssetIndex === index}
                    onMouseEnter={() => setHighlightedAssetIndex(index)}
                    onClick={() => toggleAsset(asset)}
                  />
                </div>
              );
            })}

            {visibleAssets.length === 0 && (
              <div className="px-3 py-4 text-center text-[13px] text-zinc-400">
                {isSearching
                  ? "No assets found"
                  : "Start typing to search assets"}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hide-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
        {!draftReady || isPending ? (
          <div className="flex h-full items-center justify-center">
            <div className="size-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200" />
          </div>
        ) : (
          <Tiptap
            key={`${draftKey}:${editorKey}`}
            content={content}
            onChange={handleContentChange}
          />
        )}
      </div>

      <div className="ml-auto flex shrink-0 gap-2 pb-4">
        <Button
          type="button"
          variant="outline"
          className="text-[15px]"
          disabled={!draftReady || isPending}
          onClick={handleClose}
        >
          Cancel
        </Button>

        <Button
          type="button"
          className="w-18 text-[15px]"
          disabled={isPending || !canPost}
          onClick={handleSubmit}
        >
          {isPending ? "Posting..." : "Post"}
        </Button>
      </div>
    </section>
  );
}

function AssetOption({
  asset,
  highlighted,
  onClick,
  onMouseEnter,
}: {
  asset: MarketSymbolItem;
  highlighted: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      title={asset.name}
      className={`
        flex w-full cursor-pointer items-center rounded-lg
        px-2.5 py-2 text-left transition-colors
        ${
          highlighted
            ? "bg-zinc-100 dark:bg-zinc-800"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }
      `}
    >
      <span className="min-w-19 text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
        {asset.displaySymbol}
      </span>

      <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-500 dark:text-zinc-400">
        {asset.name}
      </span>
    </button>
  );
}
