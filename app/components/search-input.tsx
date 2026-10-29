"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import { Popover, PopoverContent } from "@/components/ui/popover";

import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import { SEARCH_LABELS } from "@/lib/data/translations";

import { KbdMarkup } from "./kbd-markup";
import { SearchSparkIcon } from "./search-sparkle-icon";

// -----------------------------------------------------------------------------
// Lazy content
// -----------------------------------------------------------------------------

const MarketOverview = dynamic(() => import("./market-overview"), {
  loading: () => (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-40 items-center justify-center"
    >
      <span
        aria-hidden="true"
        className="
          size-5 animate-spin rounded-full
          border-2 border-zinc-300 border-t-zinc-700
          motion-reduce:animate-none
          dark:border-zinc-600 dark:border-t-zinc-200
        "
      />
    </div>
  ),
});

// -----------------------------------------------------------------------------
// Constants / types
// -----------------------------------------------------------------------------

const SEARCH_INPUT_ID = "market-search-input";
const SEARCH_RESULTS_ID = "market-search-results";
const TOUR_SEARCH_EVENT = "bullbearvote:tour-search";

interface SearchInputProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

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
  const panelRef = useRef<HTMLDivElement>(null);

  const onOpenChangeRef = useRef(onOpenChange);
  const tourPreviewRef = useRef(false);

  const [input, setInput] = useState("");
  const [resultSymbols, setResultSymbols] = useState<string[]>([]);
  const [tourPreview, setTourPreview] = useState(false);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  // ---------------------------------------------------------------------------
  // Search actions
  // ---------------------------------------------------------------------------

  const resetSearch = useCallback(() => {
    setInput("");
    setResultSymbols([]);
  }, []);

  const openSearch = useCallback(() => {
    if (tourPreviewRef.current) return;

    if (!isOpen) {
      resetSearch();
      onOpenChangeRef.current(true);
    }

    inputRef.current?.focus({ preventScroll: true });
  }, [isOpen, resetSearch]);

  const closeSearch = useCallback(() => {
    if (tourPreviewRef.current) return;

    inputRef.current?.blur();
    onOpenChangeRef.current(false);
    resetSearch();
  }, [resetSearch]);

  function navigateToMarket(symbol: string) {
    if (tourPreviewRef.current) return;

    closeSearch();

    router.push(`/market/${encodeURIComponent(symbol)}`, {
      scroll: true,
    });
  }

  function focusCategory() {
    const panel = panelRef.current;

    const category =
      panel?.querySelector<HTMLButtonElement>(
        '[data-active-category="true"]',
      ) ??
      panel?.querySelector<HTMLButtonElement>('[data-market-category="true"]');

    category?.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------------------
  // Input events
  // ---------------------------------------------------------------------------

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (tourPreviewRef.current) return;

    setInput(event.target.value);
    setResultSymbols([]);
  }

  function handleInputFocus() {
    if (tourPreviewRef.current) {
      inputRef.current?.blur();
      return;
    }

    if (!isOpen) {
      resetSearch();
      onOpenChangeRef.current(true);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (tourPreviewRef.current) return;

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closeSearch();
        break;

      case "ArrowDown":
        event.preventDefault();
        focusCategory();
        break;

      case "Enter": {
        event.preventDefault();

        const symbol = resultSymbols[0];

        if (symbol) {
          navigateToMarket(symbol);
        }

        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Tour / keyboard shortcut
  // ---------------------------------------------------------------------------

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

    window.addEventListener(TOUR_SEARCH_EVENT, handleTourSearch);

    return () => {
      window.removeEventListener(TOUR_SEARCH_EVENT, handleTourSearch);
    };
  }, [resetSearch]);

  useEffect(() => {
    function handleShortcut(event: globalThis.KeyboardEvent) {
      if (tourPreviewRef.current) return;

      const isSearchShortcut =
        event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey);

      if (!isSearchShortcut) return;

      event.preventDefault();
      event.stopPropagation();
      openSearch();
    }

    window.addEventListener("keydown", handleShortcut, true);

    return () => {
      window.removeEventListener("keydown", handleShortcut, true);
    };
  }, [openSearch]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Popover
      open={isOpen}
      modal={false}
      onOpenChange={(open, details) => {
        if (tourPreviewRef.current) {
          details.cancel();
          return;
        }

        if (open) {
          openSearch();
          return;
        }

        const target = details.event?.target;

        const interactingWithInput =
          target instanceof Node && anchorRef.current?.contains(target);

        if (interactingWithInput && details.reason !== "escape-key") {
          details.cancel();
          return;
        }

        closeSearch();
      }}
    >
      <div
        ref={anchorRef}
        data-tour="search"
        onClick={openSearch}
        className="
          relative z-40 flex h-12 w-full min-w-0
          cursor-text items-center rounded-full
          bg-zinc-100 px-5 dark:bg-zinc-800
        "
      >
        <span aria-hidden="true" className="mr-2.5 shrink-0">
          <SearchSparkIcon className="size-6 text-zinc-700 dark:text-zinc-200" />
        </span>

        <input
          ref={inputRef}
          id={SEARCH_INPUT_ID}
          type="text"
          value={input}
          readOnly={tourPreview}
          placeholder={labels.placeholder}
          aria-label={labels.search_markets}
          aria-expanded={isOpen}
          aria-controls={isOpen ? SEARCH_RESULTS_ID : undefined}
          aria-haspopup="dialog"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={30}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          className="
            w-full min-w-0 flex-1 bg-transparent
            text-base font-normal text-zinc-900
            outline-none ring-0 placeholder:text-black
            focus:outline-none focus:ring-0
            focus-visible:outline-none focus-visible:ring-0
            dark:text-zinc-100 dark:placeholder:text-white
          "
        />

        <div className="ml-2 hidden shrink-0 items-center lg:flex">
          <KbdMarkup />
        </div>
      </div>

      <PopoverContent
        ref={panelRef}
        anchor={anchorRef}
        id={SEARCH_RESULTS_ID}
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
          max-h-(--available-height)
          w-[calc(100vw-16px)]
          max-w-(--available-width)
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
            flex min-h-0 w-full min-w-0 flex-col
            overflow-auto overscroll-contain py-2 md:py-3

            **:[[role=group]]:flex
            **:[[role=group]]:flex-nowrap
            **:[[role=group]]:justify-start
            **:[[role=group]]:gap-1
            **:[[role=group]]:overflow-x-auto
            **:[[role=group]]:overscroll-x-contain
            **:[[role=group]]:px-3
            **:[[role=group]]:py-1
            **:[[role=group]]:scrollbar-none
            [&_[role=group]::-webkit-scrollbar]:hidden

            **:data-[market-category=true]:w-auto
            **:data-[market-category=true]:shrink-0
            **:data-[market-category=true]:whitespace-nowrap
            **:data-[market-category=true]:px-3
            max-md:**:data-[market-category=true]:text-xs
          "
        >
          <MarketOverview
            query={input}
            selectedIndex={-1}
            onSearchResultsChange={setResultSymbols}
            onNavigate={closeSearch}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
