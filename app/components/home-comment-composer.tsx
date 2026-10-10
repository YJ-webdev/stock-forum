// app/components/home-comment-composer.tsx

"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { SquarePen, X } from "lucide-react";
import { toast } from "sonner";

import { createComment } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";
import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { resolveLanguage } from "@/lib/data/languages";
import {
  HOME_COMMUNITY_LABELS,
  HOME_COMPOSER_LABELS,
} from "@/lib/data/translations";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { GifPicker, type GifResult } from "./gif-picker";

interface HomeCommentComposerProps {
  defaultSymbol: string | null;
  onPublished: (symbol: string) => void;
}

function buildContent(text: string, gif: GifResult | null): JSONContent {
  const trimmedText = text.trim();

  return {
    type: "doc",
    content: [
      ...(trimmedText
        ? trimmedText.split(/\r?\n/).map((line) => ({
            type: "paragraph",
            content: line ? [{ type: "text", text: line }] : [],
          }))
        : []),
      ...(gif
        ? [
            {
              type: "image",
              attrs: {
                src: gif.src,
                alt: gif.title,
              },
            },
          ]
        : []),
    ],
  };
}

export function HomeCommentComposer({
  defaultSymbol,
  onPublished,
}: HomeCommentComposerProps) {
  const user = useCurrentUser();

  const language = resolveLanguage(user?.language);
  const labels = HOME_COMMUNITY_LABELS[language];
  const copy = HOME_COMPOSER_LABELS[language];

  const editorId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);

  const viewerId = user?.id ?? null;
  const viewerIdRef = useRef(viewerId);
  viewerIdRef.current = viewerId;

  const [expanded, setExpanded] = useState(false);
  const [symbol, setSymbol] = useState(defaultSymbol ?? "");
  const [text, setText] = useState("");
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedMarket = ALL_MARKET_SYMBOLS.find(
    (market) => market.symbol === symbol,
  );

  const hasContent = Boolean(text.trim() || selectedGif);
  const canPublish = Boolean(selectedMarket && hasContent && !submitting);

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [expanded]);

  useEffect(() => {
    const input = inputRef.current;

    if (!input || !expanded) return;

    input.style.height = "auto";
    input.style.height = `${Math.max(
      112,
      Math.min(input.scrollHeight, 320),
    )}px`;
  }, [text, expanded]);

  useEffect(() => {
    setText("");
    setSymbol("");
    setSelectedGif(null);
    setGifPickerOpen(false);
    setExpanded(false);
  }, [viewerId]);

  function restoreTriggerFocus() {
    requestAnimationFrame(() => {
      triggerRef.current?.focus({ preventScroll: true });
    });
  }

  function openEditor() {
    if (!user?.id) {
      toast.error(copy.login);
      return;
    }

    // Preserve the selected market when reopening a draft.
    if (!symbol && !hasContent) {
      setSymbol(defaultSymbol ?? "");
    }

    setExpanded(true);
  }

  function collapseEditor() {
    if (submittingRef.current) return;

    setGifPickerOpen(false);
    setExpanded(false);
    restoreTriggerFocus();
  }

  async function publish() {
    if (submittingRef.current) return;

    if (!user?.id) {
      toast.error(copy.login);
      return;
    }

    if (!selectedMarket) {
      toast.error(copy.select_market);
      return;
    }

    if (!hasContent) {
      toast.error(copy.write_comment);
      inputRef.current?.focus({ preventScroll: true });
      return;
    }

    const submittedUserId = user.id;
    const submittedSymbol = selectedMarket.symbol;
    const submittedContent = buildContent(text, selectedGif);

    submittingRef.current = true;
    setSubmitting(true);
    setGifPickerOpen(false);

    try {
      await createComment({
        content: submittedContent,
        assetSymbols: [submittedSymbol],
      });
    } catch (error) {
      if (viewerIdRef.current === submittedUserId) {
        toast.error(error instanceof Error ? error.message : copy.failed);
      }

      return;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }

    // An account change may have happened during the request.
    if (viewerIdRef.current !== submittedUserId) return;

    setText("");
    setSymbol("");
    setSelectedGif(null);
    setExpanded(false);

    toast.success(copy.success);
    onPublished(submittedSymbol);
    restoreTriggerFocus();
  }

  return (
    <div className="mt-8 mb-5">
      <div className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />

          <AvatarFallback
            className="
              bg-zinc-200 text-sm text-zinc-600
              dark:bg-zinc-800 dark:text-zinc-300
            "
          >
            {user?.name?.trim().charAt(0).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="relative min-h-10 min-w-0 flex-1">
          {/* Collapsed trigger */}
          <button
            ref={triggerRef}
            type="button"
            aria-expanded={expanded}
            aria-controls={editorId}
            aria-hidden={expanded}
            inert={expanded}
            onClick={openEditor}
            className={`
              absolute inset-x-0 top-0
              flex h-10 w-full cursor-pointer items-center
              justify-between gap-3 rounded-full
              border border-zinc-300 px-4 text-left text-[15px]
              text-zinc-400
              transition-[opacity,background-color,border-color]
              duration-200 ease-out
              motion-reduce:transition-none
              hover:border-zinc-400 hover:bg-zinc-50
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-zinc-400
              dark:border-zinc-700 dark:text-zinc-500
              dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50
              ${expanded ? "pointer-events-none opacity-0" : "opacity-100"}
            `}
          >
            <span className="truncate">
              {text.trim() ||
                (selectedGif ? copy.gif_draft : labels.share_view)}
            </span>

            <SquarePen
              className="size-4 shrink-0"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </button>

          {/* Animated editor */}
          <div
            aria-hidden={!expanded}
            inert={!expanded}
            className={`
              grid
              transition-[grid-template-rows,opacity]
              duration-300 ease-in-out
              motion-reduce:transition-none
              ${
                expanded
                  ? "grid-rows-[1fr] opacity-100"
                  : "pointer-events-none grid-rows-[0fr] opacity-0"
              }
            `}
          >
            <div className="min-h-0 overflow-hidden">
              <div id={editorId} aria-busy={submitting}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className="
                      text-sm font-medium text-zinc-900
                      dark:text-zinc-100
                    "
                  >
                    {user?.name}
                  </span>

                  <Select
                    value={symbol || null}
                    onValueChange={(value) => setSymbol(value ?? "")}
                    disabled={submitting}
                  >
                    <SelectTrigger
                      aria-label={copy.market}
                      className="h-8 w-auto max-w-full rounded-full text-xs"
                    >
                      <SelectValue placeholder={copy.market}>
                        {selectedMarket?.name ?? copy.market}
                      </SelectValue>
                    </SelectTrigger>

                    <SelectContent
                      className="
                        max-h-72 rounded-xl border-zinc-200 bg-white
                        dark:border-zinc-700 dark:bg-zinc-900
                      "
                    >
                      {ALL_MARKET_SYMBOLS.map((market) => (
                        <SelectItem
                          key={market.symbol}
                          value={market.symbol}
                          className="cursor-pointer rounded-lg"
                        >
                          {market.displaySymbol} · {market.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={labels.share_view}
                  aria-label={labels.share_view}
                  disabled={submitting}
                  rows={4}
                  className="
                    block min-h-28 w-full resize-none overflow-y-auto
                    rounded-xl border border-zinc-300 bg-transparent
                    px-3.5 py-3 text-base leading-6 text-zinc-900
                    placeholder:text-zinc-400
                    focus:border-zinc-400 focus:outline-none
                    disabled:opacity-60
                    dark:border-zinc-700 dark:text-zinc-100
                    dark:placeholder:text-zinc-500
                    dark:focus:border-zinc-500
                    md:text-[15px]
                  "
                />

                {selectedGif && (
                  <div className="relative mt-3 w-fit max-w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedGif.src}
                      alt={selectedGif.title || copy.gif_draft}
                      className="max-h-60 max-w-full rounded-xl object-contain"
                    />

                    <button
                      type="button"
                      aria-label={copy.remove_gif}
                      disabled={submitting}
                      onClick={() => setSelectedGif(null)}
                      className="
                        absolute top-2 right-2 flex size-7
                        cursor-pointer items-center justify-center
                        rounded-full bg-black/60 text-white
                        transition-colors hover:bg-black/80
                        focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-white
                        disabled:cursor-default disabled:opacity-50
                      "
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="relative">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setGifPickerOpen((open) => !open)}
                      aria-label={copy.select_gif}
                      aria-expanded={gifPickerOpen}
                      className="
                        h-8.5 cursor-pointer rounded-md px-2
                        text-sm font-medium text-zinc-500
                        transition-colors hover:bg-zinc-100
                        focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-zinc-400
                        disabled:cursor-default disabled:opacity-50
                        dark:text-zinc-400 dark:hover:bg-zinc-800
                      "
                    >
                      GIF
                    </button>

                    <GifPicker
                      open={gifPickerOpen}
                      onOpenChange={setGifPickerOpen}
                      onSelect={(gif: GifResult) => {
                        if (submittingRef.current) return;

                        setSelectedGif(gif);
                        setGifPickerOpen(false);
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={collapseEditor}
                      disabled={submitting}
                      className="
                        h-8.5 cursor-pointer rounded-full px-4
                        text-sm text-zinc-500 transition-colors
                        hover:bg-zinc-100 hover:text-zinc-900
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-zinc-400
                        disabled:cursor-default disabled:opacity-50
                        dark:text-zinc-400 dark:hover:bg-zinc-800
                        dark:hover:text-zinc-100
                      "
                    >
                      {copy.cancel}
                    </button>

                    <button
                      type="button"
                      onClick={() => void publish()}
                      disabled={!canPublish}
                      aria-busy={submitting}
                      className="
                        inline-flex h-8.5 cursor-pointer items-center
                        justify-center rounded-full bg-zinc-900
                        px-5 text-sm font-medium text-white
                        transition-colors hover:bg-zinc-700
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-zinc-400
                        disabled:cursor-default disabled:opacity-40
                        dark:bg-zinc-100 dark:text-zinc-900
                        dark:hover:bg-zinc-300
                      "
                    >
                      {submitting ? copy.publishing : copy.publish}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
