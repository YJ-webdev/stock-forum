// app/components/search-input.tsx
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

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

  const inputRef = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const touchYRef = useRef<number | null>(null);

  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [searchResultSymbols, setSearchResultSymbols] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const [panelMaxHeight, setPanelMaxHeight] = useState<number | null>(null);

  const resetSearchNavigation = useCallback(() => {
    setInput("");
    setSearchQuery("");
    setSelectedIndex(-1);
    setSearchResultSymbols([]);
  }, []);

  const handleOpen = useCallback(() => {
    if (!isOpen) {
      resetSearchNavigation();
      onOpenChange(true);
    }

    // タッチ操作中に直接focusしてキーボードを開く。
    inputRef.current?.focus({ preventScroll: true });
  }, [isOpen, onOpenChange, resetSearchNavigation]);

  const handleClose = useCallback(() => {
    inputRef.current?.blur();
    onOpenChange(false);
    resetSearchNavigation();
  }, [onOpenChange, resetSearchNavigation]);

  const handleAssetSelected = useCallback(() => {
    handleClose();
  }, [handleClose]);

  function handleNavigate(symbol: string) {
    handleAssetSelected();

    router.push(`/market/${encodeURIComponent(symbol)}`, {
      scroll: true,
    });
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;

    setInput(value);
    setSearchQuery(value);
    setSelectedIndex(-1);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      searchPanelRef.current
        ?.querySelector<HTMLButtonElement>('[data-market-category="true"]')
        ?.focus();

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
      const symbol = searchResultSymbols[targetIndex];

      if (symbol) {
        handleNavigate(symbol);
      }
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      const isSearchShortcut =
        event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey);

      if (isSearchShortcut) {
        event.preventDefault();
        event.stopPropagation();

        handleOpen();
        return;
      }

      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        event.stopPropagation();

        handleClose();
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [isOpen, handleOpen, handleClose]);

  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const root = document.documentElement;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const previousBodyStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    const previousRootOverflow = root.style.overflow;

    // 背景ページの位置を固定。
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = `-${scrollX}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";

    const viewport = window.visualViewport;
    let resizeFrame = 0;

    function updatePanelHeight() {
      const panel = searchPanelRef.current;
      if (!panel) return;

      const visibleBottom = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight;

      const panelTop = panel.getBoundingClientRect().top;

      setPanelMaxHeight(Math.max(0, Math.floor(visibleBottom - panelTop)));
    }

    function schedulePanelUpdate() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(updatePanelHeight);
    }

    // タッチ方向を記録。
    function handleTouchStart(event: TouchEvent) {
      touchYRef.current = event.touches[0]?.clientY ?? null;
    }

    function preventScroll(event: TouchEvent) {
      if (event.cancelable) {
        event.preventDefault();
      }
    }

    function handleTouchMove(event: TouchEvent) {
      const target = event.target;
      const currentY = event.touches[0]?.clientY;

      if (
        !(target instanceof Element) ||
        currentY === undefined ||
        event.touches.length !== 1
      ) {
        return;
      }

      const previousY = touchYRef.current;
      touchYRef.current = currentY;

      const panel = searchPanelRef.current;

      if (!panel?.contains(target)) {
        preventScroll(event);
        return;
      }

      if (previousY === null) return;

      const deltaY = currentY - previousY;

      // 検索結果内で、その方向にスクロール可能な要素を探す。
      // MarketOverview内部のスクロール領域にも対応。
      let element: HTMLElement | null =
        target instanceof HTMLElement ? target : target.parentElement;

      while (element && panel.contains(element)) {
        const overflowY = window.getComputedStyle(element).overflowY;
        const canScroll =
          /^(auto|scroll|overlay)$/.test(overflowY) &&
          element.scrollHeight > element.clientHeight + 1;

        if (canScroll) {
          const maxScroll = element.scrollHeight - element.clientHeight;

          const canMoveUp = deltaY > 0 && element.scrollTop > 0;
          const canMoveDown = deltaY < 0 && element.scrollTop < maxScroll - 1;

          if (deltaY === 0 || canMoveUp || canMoveDown) {
            return;
          }
        }

        if (element === panel) break;
        element = element.parentElement;
      }

      // リスト端から背景へスクロールが伝わるのを防ぐ。
      preventScroll(event);
    }

    function handleTouchEnd() {
      touchYRef.current = null;
    }

    function handleWheel(event: WheelEvent) {
      const target = event.target;

      if (target instanceof Node && searchPanelRef.current?.contains(target)) {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }
    }

    schedulePanelUpdate();

    const observer = new ResizeObserver(schedulePanelUpdate);

    if (searchPanelRef.current) {
      observer.observe(searchPanelRef.current);
    }

    viewport?.addEventListener("resize", schedulePanelUpdate);
    viewport?.addEventListener("scroll", schedulePanelUpdate);
    window.addEventListener("resize", schedulePanelUpdate);

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchEnd);
    document.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();

      viewport?.removeEventListener("resize", schedulePanelUpdate);
      viewport?.removeEventListener("scroll", schedulePanelUpdate);
      window.removeEventListener("resize", schedulePanelUpdate);

      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
      document.removeEventListener("wheel", handleWheel);

      touchYRef.current = null;

      Object.assign(body.style, previousBodyStyles);
      root.style.overflow = previousRootOverflow;

      window.scrollTo(scrollX, scrollY);
    };
  }, [isOpen]);

  return (
    <>
      {mounted &&
        isOpen &&
        createPortal(
          <div
            aria-hidden="true"
            className="fixed inset-0 z-20 touch-none bg-transparent backdrop-blur-[1px]"
            onClick={handleClose}
          />,
          document.body,
        )}

      <div className="relative z-40 w-full">
        <div
          className="flex h-12 w-full cursor-text items-center rounded-full bg-zinc-100 px-5 dark:bg-zinc-800"
          onClick={handleOpen}
        >
          <SearchSparkIcon className="mr-2.5 h-6 w-6 shrink-0 text-zinc-700 dark:text-zinc-200" />

          <input
            ref={inputRef}
            id="market-search-input"
            type="text"
            value={input}
            placeholder="Search..."
            aria-label="Search markets"
            aria-expanded={isOpen}
            aria-controls={isOpen ? "market-search-results" : undefined}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={30}
            className="min-w-0 w-full bg-transparent text-base font-normal outline-none ring-0 placeholder:text-black focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 dark:placeholder:text-white lg:w-2xl"
            onChange={handleInputChange}
            onFocus={() => {
              if (!isOpen) {
                resetSearchNavigation();
                onOpenChange(true);
              }
            }}
            onKeyDown={handleInputKeyDown}
          />

          <div className="ml-2 hidden shrink-0 items-center lg:flex">
            <KbdMarkup />
          </div>
        </div>

        {isOpen && (
          <div
            ref={searchPanelRef}
            id="market-search-results"
            style={
              {
                maxHeight: panelMaxHeight ?? undefined,
                "--search-panel-height":
                  panelMaxHeight !== null ? `${panelMaxHeight}px` : undefined,
              } as React.CSSProperties
            }
            className="
  fixed inset-x-0 top-18 bottom-0
  z-40! flex min-h-0 flex-col
  h-(--search-panel-height)
  overflow-hidden overscroll-contain
  bg-zinc-100 pt-3
  dark:bg-zinc-800

  lg:left-1/2 lg:right-auto lg:bottom-auto
  lg:h-auto lg:w-[min(72rem,calc(100vw-2rem))]
  lg:-translate-x-1/2 lg:rounded-xl
  lg:bg-white lg:py-4 lg:shadow-2xl
"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              ref={resultsScrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              <MarketOverview
                query={searchQuery}
                selectedIndex={selectedIndex}
                onSearchResultsChange={setSearchResultSymbols}
                onNavigate={handleAssetSelected}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
