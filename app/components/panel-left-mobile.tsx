"use client";

import React from "react";

import { ScrollArea } from "@/components/ui/scroll-area";

import { MostLikedComments } from "./most-liked-comments";
import { PopularBoards } from "./major-indices";
import { ModeToggle } from "./mode-toggle";

import type { MostLikedComment, PopularBoard } from "../actions/query";

type User = {
  id: string;
};

interface PanelLeftMobileProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  comments: MostLikedComment[];
  popularBoards: PopularBoard[];
  user: User | null;
}

export default function PanelLeftMobile({
  isOpen,
  setIsOpen,
  comments,
  popularBoards,
  user,
}: PanelLeftMobileProps) {
  const handlePanelClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;

    if (event.target.closest("button, a")) {
      setIsOpen(false);
    }
  };

  return (
    <aside
      className={`
        fixed top-18 left-0 z-30
        h-[calc(100dvh-72px)] w-full
        border-r border-zinc-100 bg-white
        transition-transform duration-300 ease-out
        dark:border-zinc-800 dark:bg-zinc-900
        sm:hidden
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      <div onClick={handlePanelClick} className="h-full w-full">
        <ScrollArea className="h-full">
          <div className="flex min-h-[calc(100dvh-72px)] flex-col py-3">
            <section aria-label="Popular boards">
              <h2 className="sr-only">Popular boards</h2>

              <PopularBoards boards={popularBoards} />
            </section>

            <section aria-label="Most liked comments" className="mt-3 p-4">
              <h2 className="sr-only">Most liked comments</h2>

              {/* <p
                aria-hidden="true"
                className="mb-2 text-xs font-normal tracking-wider text-muted-foreground/50"
              >
                Most liked comments
              </p> */}

              {comments.length > 0 ? (
                <MostLikedComments comments={comments} />
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground/50">
                  No comments yet.
                </p>
              )}
            </section>

            {!user && (
              <div className="mt-auto flex justify-end px-4 pt-4">
                <ModeToggle />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
