"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import type { SlashMenuItem } from "./slash-menu-items";

export interface SlashMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SlashMenuProps {
  items: SlashMenuItem[];
  command: (item: SlashMenuItem) => void;
}

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];

      if (item) {
        command(item);
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    if (!items.length) {
      return (
        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-500 shadow-lg dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
          No results
        </div>
      );
    }

    return (
      <div className="max-h-[320px] w-[260px] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
        {items.map((item, index) => {
          const Icon = item.icon;
          const selected = index === selectedIndex;

          return (
            <button
              key={item.title}
              type="button"
              onClick={() => selectItem(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left ${
                selected
                  ? "bg-zinc-100 dark:bg-zinc-700"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-800">
                <Icon size={16} />
              </div>

              <div className="min-w-0">
                <div className="text-[14px] font-medium text-zinc-800 dark:text-zinc-200">
                  {item.title}
                </div>

                <div className="truncate text-[12px] text-zinc-400">
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  },
);

SlashMenu.displayName = "SlashMenu";
