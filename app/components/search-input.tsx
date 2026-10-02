"use client";

import { useEffect, useRef, useState } from "react";

import { KbdMarkup } from "./kbd-markup";
import { SearchSparkIcon } from "./search-sparkle-icon";
import MarketOverview from "./market-overview";

export default function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = async () => {
    if (input.trim().length > 0) {
      console.log("handleSearch:", input);
    }
  };

  const handleContainerClick = () => {
    setIsOpen(true);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
          onClick={() => {
            setIsOpen(false);
            inputRef.current?.blur();
          }}
        />
      )}

      <div className="relative z-50 w-full">
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
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />

          <div className="ml-2 hidden shrink-0 items-center lg:flex">
            <KbdMarkup />
          </div>
        </div>

        {isOpen && (
          <div
            className="
              absolute left-1/2 top-full
              mt-3
              w-[min(72rem,calc(100vw-2rem))]
              -translate-x-1/2
              overflow-hidden
              rounded-xl
              border border-zinc-200
              bg-white
              py-4
              shadow-2xl
              dark:border-zinc-700
              dark:bg-zinc-900
            "
            onClick={(e) => e.stopPropagation()}
          >
            <MarketOverview />
          </div>
        )}
      </div>
    </>
  );
}
