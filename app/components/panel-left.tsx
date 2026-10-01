"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

import { MostLikedComments } from "./most-liked-comments";
import { PopularBoards } from "./major-indices";

import type { MostLikedComment, PopularBoard } from "../actions/query";
import { Footer } from "./footer";

interface PanelLeftProps {
  comments: MostLikedComment[];
  popularBoards: PopularBoard[];
}

export default function PanelLeft({ comments, popularBoards }: PanelLeftProps) {
  return (
    <div
      className="
      flex
      h-full
      w-full
      flex-col
      pb-2

      border-r
      border-zinc-100

      bg-white

      dark:border-zinc-800
      dark:bg-zinc-900
    "
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="">
          <p className="mb-3.5 px-4 pt-4 text-xs font-normal tracking-wider text-muted-foreground/50 truncate">
            Popular boards
          </p>

          <PopularBoards boards={popularBoards} />

          <div className="mt-3 p-4">
            <p className="mb-2 text-xs font-normal tracking-wider text-muted-foreground/50 truncate">
              Most liked comments
            </p>

            {comments.length > 0 ? (
              <MostLikedComments comments={comments} />
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground/50 truncate">
                No comments yet.
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
