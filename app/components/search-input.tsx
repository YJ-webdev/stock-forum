"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";

import { Popover, PopoverContent } from "@/components/ui/popover";

import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import { SEARCH_LABELS } from "@/lib/data/translations";

import { KbdMarkup } from "./kbd-markup";
import { SearchSparkIcon } from "./search-sparkle-icon";
import MarketOverview from "./market-overview";

interface SearchInputProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchInput({
  isOpen,
  onOpenChange,
}: SearchInputProps) {
  const router = useRouter();
  const user = useCurrentUser();

  const language = resolveLanguage(user?.language);
  const labels = SEARCH_LABELS[language];

  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  const onOpenChangeRef = useRef(onOpenChange);
  const tourPreviewRef = useRef(false);

  const [input, setInput] = useState("");
  const [searchResultSymbols, setSearchResultSymbols] = useState<string[]>([]);
  const [tourPreview, setTourPreview] = useState(false);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const resetSearch = useCallback(() => {
    setInput("");
    setSearchResultSymbols([]);
  }, []);

  const handleOpen = useCallback(() => {
    if (tourPreviewRef.current) return;

    if (!isOpen) {
      resetSearch();
      onOpenChangeRef.current(true);
    }

    inputRef.current?.focus({ preventScroll: true });
  }, [isOpen, resetSearch]);

  const handleClose = useCallback(() => {
    if (tourPreviewRef.current) return;

    inputRef.current?.blur();
    onOpenChangeRef.current(false);
    resetSearch();
  }, [resetSearch]);

  const handleAssetSelected = useCallback(() => {
    handleClose();
  }, [handleClose]);

  function handleNavigate(symbol: string) {
    if (tourPreviewRef.current) return;

    handleClose();

    router.push(`/market/${encodeURIComponent(symbol)}`, {
      scroll: true,
    });
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (tourPreviewRef.current) return;

    setInput(event.target.value);
    setSearchResultSymbols([]);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (tourPreviewRef.current) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      handleClose();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      const panel = searchPanelRef.current;

      const category =
        panel?.querySelector<HTMLButtonElement>(
          '[data-active-category="true"]',
        ) ??
        panel?.querySelector<HTMLButtonElement>(
          '[data-market-category="true"]',
        );

      category?.focus({ preventScroll: true });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const symbol = searchResultSymbols[0];

      if (symbol) {
        handleNavigate(symbol);
      }
    }
  }

  // HomeTour opens the panel without focusing the input.
  useEffect(() => {
    function handleTourSearch(event: Event) {
      const detail = (event as CustomEvent<{ open: boolean } | undefined>)
        .detail;

      if (typeof detail?.open !== "boolean") return;

      tourPreviewRef.current = detail.open;

      inputRef.current?.blur();
      resetSearch();

      setTourPreview(detail.open);
      onOpenChangeRef.current(detail.open);
    }

    window.addEventListener("bullbearvote:tour-search", handleTourSearch);

    return () => {
      window.removeEventListener("bullbearvote:tour-search", handleTourSearch);
    };
  }, [resetSearch]);

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if (tourPreviewRef.current) return;

      const isSearchShortcut =
        event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey);

      if (!isSearchShortcut) return;

      event.preventDefault();
      event.stopPropagation();

      handleOpen();
    }

    window.addEventListener("keydown", handleGlobalKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [handleOpen]);

  return (
    <Popover
      open={isOpen}
      modal={false}
      onOpenChange={(open, details) => {
        if (tourPreviewRef.current) {
          details.cancel();
          return;
        }

        if (!open) {
          const target = details.event?.target;

          // Keep the popup open when interacting with its search input.
          if (
            target instanceof Node &&
            anchorRef.current?.contains(target) &&
            details.reason !== "escape-key"
          ) {
            details.cancel();
            return;
          }

          handleClose();
          return;
        }

        handleOpen();
      }}
    >
      <div
        ref={anchorRef}
        data-tour="search"
        className="
          relative z-40 flex h-12 w-full min-w-0
          cursor-text items-center rounded-full
          bg-zinc-100 px-5 dark:bg-zinc-800
        "
        onClick={handleOpen}
      >
        <span aria-hidden="true" className="mr-2.5 shrink-0">
          <SearchSparkIcon className="size-6 text-zinc-700 dark:text-zinc-200" />
        </span>

        <input
          ref={inputRef}
          id="market-search-input"
          type="text"
          value={input}
          readOnly={tourPreview}
          placeholder={labels.placeholder}
          aria-label={labels.search_markets}
          aria-expanded={isOpen}
          aria-controls={isOpen ? "market-search-results" : undefined}
          aria-haspopup="dialog"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={30}
          className="
            w-full min-w-0 flex-1 bg-transparent
            text-base font-normal text-zinc-900
            outline-none ring-0 placeholder:text-black
            focus:outline-none focus:ring-0
            focus-visible:outline-none focus-visible:ring-0
            dark:text-zinc-100 dark:placeholder:text-white
          "
          onChange={handleInputChange}
          onFocus={() => {
            if (tourPreviewRef.current) {
              inputRef.current?.blur();
              return;
            }

            if (!isOpen) {
              resetSearch();
              onOpenChangeRef.current(true);
            }
          }}
          onKeyDown={handleInputKeyDown}
        />

        <div className="ml-2 hidden shrink-0 items-center lg:flex">
          <KbdMarkup />
        </div>
      </div>

      <PopoverContent
        ref={searchPanelRef}
        anchor={anchorRef}
        id="market-search-results"
        data-tour="search"
        aria-label={labels.results}
        side="bottom"
        align="center"
        sideOffset={8}
        collisionPadding={8}
        initialFocus={false}
        finalFocus={false}
        className="
    flex h-auto min-h-0
    max-h-[var(--available-height)]
    w-[calc(100vw-16px)]
    max-w-[var(--available-width)]
    flex-col gap-0 overflow-hidden
    rounded-xl border border-zinc-200
    bg-white p-0 text-zinc-900
    shadow-xl ring-0 outline-none
    data-open:animate-none data-closed:animate-none
    md:w-[min(72rem,calc(100vw-32px))]
    dark:border-zinc-700 dark:bg-zinc-800
    dark:text-zinc-100
  "
      >
        <div
          className="
    flex w-full min-h-0 min-w-0 flex-col
    overflow-auto overscroll-contain py-2 md:py-3

    [&_[role=group]]:flex
    [&_[role=group]]:flex-nowrap
    [&_[role=group]]:justify-start
    [&_[role=group]]:gap-1
    [&_[role=group]]:overflow-x-auto
    [&_[role=group]]:overscroll-x-contain
    [&_[role=group]]:px-3
    [&_[role=group]]:py-1
    [&_[role=group]]:[scrollbar-width:none]
    [&_[role=group]::-webkit-scrollbar]:hidden

    [&_[data-market-category=true]]:w-auto
    [&_[data-market-category=true]]:shrink-0
    [&_[data-market-category=true]]:whitespace-nowrap
    [&_[data-market-category=true]]:px-3
    max-md:[&_[data-market-category=true]]:text-xs
  "
        >
          <MarketOverview
            query={input}
            selectedIndex={-1}
            onSearchResultsChange={setSearchResultSymbols}
            onNavigate={handleAssetSelected}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
