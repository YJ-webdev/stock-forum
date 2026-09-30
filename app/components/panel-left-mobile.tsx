"use client";

import React from "react";

import { ScrollArea } from "@/components/ui/scroll-area";

import { MostLikedComments } from "./most-liked-comments";
import { PopularBoards } from "./major-indices";

import type { MostLikedComment, PopularBoard } from "../actions/query";

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
  const handlePanelClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    // Mobile only:
    // close drawer after clicking a link/button.
    if (target.closest("button, a")) {
      setIsOpen(false);
    }
  };

  return (
    <aside
      className={`
        fixed
        top-18
        left-0
        z-40

        h-[calc(100vh-72px)]
        w-full

        border-r
        border-zinc-100
        bg-white

        transition-transform
        duration-300
        ease-out

        dark:border-zinc-800
        dark:bg-zinc-900

        xl:hidden

        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      <div onClick={handlePanelClick} className="h-full w-full">
        <ScrollArea className="h-full">
          <div className="flex min-h-full flex-col pb-10">
            <p className="mb-3.5 px-4 pt-4 text-xs font-normal tracking-wider text-muted-foreground/50">
              Popular boards
            </p>

            <PopularBoards boards={popularBoards} />

            <div className="mt-3 p-4">
              <p className="mb-2 text-xs font-normal tracking-wider text-muted-foreground/50">
                Most liked comments
              </p>

              {comments.length > 0 ? (
                <MostLikedComments comments={comments} />
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground/50">
                  No comments yet.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
