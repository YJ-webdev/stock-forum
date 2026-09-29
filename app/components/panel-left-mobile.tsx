"use client";

import React from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeToggle } from "./mode-toggle";
import { MostLikedComments } from "./most-liked-comments";
import { PopularBoards } from "./major-indices";

import type { MostLikedComment } from "../actions/post";
import type { PopularBoard } from "../actions/query";

interface PanelLeftMobileProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  comments: MostLikedComment[];
  popularBoards: PopularBoard[];
}

export default function PanelLeftMobile({
  isOpen,
  setIsOpen,
  comments,
  popularBoards,
}: PanelLeftMobileProps) {
  const handlePanelClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;

    if (target.closest("button, a")) {
      setIsOpen(false);
    }
  };

  return (
    <aside
      onClick={handlePanelClick}
      className={`
        fixed top-0 left-0 z-40
        h-screen w-full
        bg-white text-zinc-900
        transform-gpu
        transition-transform duration-300 ease-out
        dark:bg-zinc-900
        dark:text-zinc-100
        sm:w-[320px]
        xl:hidden

        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      <ScrollArea className="mt-10 h-full w-full pb-10">
        <div className="flex min-h-screen flex-col">
          <div className="mt-12">
            <p className="mb-3.5 px-4 text-xs font-light tracking-wider text-muted-foreground/50">
              Popular boards
            </p>

            <PopularBoards boards={popularBoards} />
          </div>

          <div className="mt-3 p-4">
            <p className="mb-2 text-xs font-light tracking-wider text-muted-foreground/50">
              Most liked comments
            </p>

            <MostLikedComments comments={comments} />
          </div>

          <div className="mt-auto self-end p-4">
            <ModeToggle />
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
