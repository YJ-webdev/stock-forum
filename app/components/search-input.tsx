"use client";

import { useEffect, useRef, useState } from "react";
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

  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  const [searchResultSymbols, setSearchResultSymbols] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const resetSearchNavigation = () => {
    setSearchQuery("");
    setSelectedIndex(-1);
    setSearchResultSymbols([]);
  };

  const handleOpen = () => {
    resetSearchNavigation();

    onOpenChange(true);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleClose = () => {
    resetSearchNavigation();

    onOpenChange(false);
    inputRef.current?.blur();
  };

  const handleAssetSelected = () => {
    setInput("");
    setSearchQuery("");
    setSelectedIndex(-1);
    setSearchResultSymbols([]);

    onOpenChange(false);
    inputRef.current?.blur();
  };

  const handleContainerClick = () => {
    handleOpen();
  };

  const handleNavigate = (symbol: string) => {
    handleAssetSelected();

    router.push(`/${encodeURIComponent(symbol)}`, {
      scroll: true,
    });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    setInput(value);
    setSearchQuery(value);
    setSelectedIndex(-1);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      const firstCategory = document.querySelector<HTMLButtonElement>(
        '[data-market-category="true"]',
      );

      firstCategory?.focus();

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (searchResultSymbols.length === 0) {
        return;
      }

      const targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
      const symbol = searchResultSymbols[targetIndex];

      if (symbol) {
        handleNavigate(symbol);
      }
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const isSearchShortcut =
        event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey);

      if (isSearchShortcut) {
        event.preventDefault();
        event.stopPropagation();

        setSearchQuery("");
        setSelectedIndex(-1);
        setSearchResultSymbols([]);

        onOpenChange(true);

        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });

        return;
      }

      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        event.stopPropagation();

        setSearchQuery("");
        setSelectedIndex(-1);
        setSearchResultSymbols([]);

        onOpenChange(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown, {
      capture: true,
    });

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, {
        capture: true,
      });
    };
  }, [isOpen, onOpenChange]);

  return (
    <>
      {mounted &&
        isOpen &&
        createPortal(
          <div
            className="
              fixed inset-0
              z-20
              bg-transparent
              backdrop-blur-[1px]
            "
            onClick={handleClose}
          />,
          document.body,
        )}

      <div className="relative z-40 w-full">
        <div
          className="
            flex h-12 w-full
            cursor-text items-center
            rounded-full
            bg-zinc-100
            px-5
            dark:bg-zinc-800
          "
          onClick={handleContainerClick}
        >
          <SearchSparkIcon className="mr-2.5 h-6 w-6 shrink-0 text-zinc-700 dark:text-zinc-200" />

          <input
            ref={inputRef}
            id="market-search-input"
            type="text"
            value={input}
            placeholder="Search..."
            className="
              w-full bg-transparent
              font-normal
              outline-none ring-0
              placeholder:text-black
              focus:outline-none
              focus:ring-0
              focus-visible:outline-none
              focus-visible:ring-0
              dark:placeholder:text-white
              lg:w-2xl
            "
            maxLength={30}
            onChange={handleInputChange}
            onFocus={() => onOpenChange(true)}
            onKeyDown={handleInputKeyDown}
          />

          <div className="ml-2 hidden shrink-0 items-center lg:flex">
            <KbdMarkup />
          </div>
        </div>

        {isOpen && (
          <div
            className="
    fixed
    left-0
    right-0
    top-18
    bottom-0
    z-40
    overflow-hidden
    bg-zinc-100
    pt-3

    dark:bg-zinc-800

    md:absolute
    md:left-1/2
    md:right-auto
    md:top-full
    md:bottom-auto
    md:mt-3
    md:w-[min(72rem,calc(100vw-2rem))]
    md:-translate-x-1/2
    md:rounded-xl
    md:py-4
    md:shadow-2xl
    md:bg-white
  "
            onClick={(e) => e.stopPropagation()}
          >
            <MarketOverview
              query={searchQuery}
              selectedIndex={selectedIndex}
              onSearchResultsChange={setSearchResultSymbols}
              onNavigate={handleAssetSelected}
            />
          </div>
        )}
      </div>
    </>
  );
}
