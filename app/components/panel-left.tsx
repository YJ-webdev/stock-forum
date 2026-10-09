"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

import { MostLikedComments } from "./most-liked-comments";
import { PopularBoards } from "./major-indices";

import type { MostLikedComment, PopularBoard } from "../actions/query";

interface PanelLeftProps {
  comments: MostLikedComment[];
  popularBoards: PopularBoard[];
}

export default function PanelLeft({ comments, popularBoards }: PanelLeftProps) {
  return (
    <div className="flex h-full w-full flex-col border-r border-zinc-100 bg-white py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <ScrollArea className="min-h-0 flex-1">
        <section aria-label="Popular boards">
          <h2 className=" sr-only">Popular boards</h2>

          <p
            aria-hidden="true"
            className="mb-2 pt-0.5 px-5 truncate text-xs font-normal tracking-wider text-muted-foreground/50"
          >
            Popular boards
          </p>
          <PopularBoards boards={popularBoards} />
        </section>

        <section aria-label="Most liked comments" className="mt-3 p-4">
          <h2 className="sr-only">Most liked comments</h2>

          <p
            aria-hidden="true"
            className="mb-2 truncate text-xs font-normal tracking-wider text-muted-foreground/50"
          >
            Most liked comments
          </p>

          {comments.length > 0 ? (
            <MostLikedComments comments={comments} />
          ) : (
            <p className="truncate py-4 text-center text-sm text-muted-foreground/50">
              No comments yet.
            </p>
          )}
        </section>
      </ScrollArea>
    </div>
  );
}
