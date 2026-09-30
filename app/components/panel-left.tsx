"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

import { MostLikedComments } from "./most-liked-comments";
import { PopularBoards } from "./major-indices";

import type { MostLikedComment } from "../actions/post";
import type { PopularBoard } from "../actions/query";

interface PanelLeftProps {
  comments: MostLikedComment[];
  popularBoards: PopularBoard[];
}

export default function PanelLeft({ comments, popularBoards }: PanelLeftProps) {
  return (
    <aside
      className="
    hidden
    h-full
    w-[320px]
    min-h-0
    shrink-0

    overflow-hidden

    border-r
    border-zinc-100

    bg-white
    text-zinc-900

    xl:block

    dark:border-zinc-800
    dark:bg-zinc-900
    dark:text-zinc-100
  "
    >
      <ScrollArea className="h-full w-full">
        <div className="flex min-h-full flex-col pb-10">
          <p className="mb-3.5 px-4 text-xs font-light tracking-wider text-muted-foreground/50">
            Popular boards
          </p>

          <PopularBoards boards={popularBoards} />

          <div className="mt-3 p-4">
            <p className="mb-2 text-xs font-light tracking-wider text-muted-foreground/50">
              Most liked comments
            </p>

            <MostLikedComments comments={comments} />
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
