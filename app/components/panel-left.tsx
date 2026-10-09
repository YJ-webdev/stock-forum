"use client";

import { useId } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import { PANEL_LEFT_LABELS } from "@/lib/data/translations";

import { MostLikedComments } from "./most-liked-comments";
import { PopularBoards } from "./major-indices";

import type { MostLikedComment, PopularBoard } from "../actions/query";

interface PanelLeftProps {
  comments: MostLikedComment[];
  popularBoards: PopularBoard[];
}

export default function PanelLeft({ comments, popularBoards }: PanelLeftProps) {
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);
  const labels = PANEL_LEFT_LABELS[language];

  const boardsHeadingId = useId();
  const commentsHeadingId = useId();

  return (
    <div className="flex h-full w-full flex-col border-r border-zinc-100 bg-white py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <ScrollArea className="min-h-0 flex-1">
        <section aria-labelledby={boardsHeadingId}>
          <h2 id={boardsHeadingId} className="sr-only">
            {labels.popular_boards}
          </h2>

          <p
            aria-hidden="true"
            className="mb-2 truncate px-5 pt-0.5 text-xs font-normal tracking-wider text-muted-foreground/50"
          >
            {labels.popular_boards}
          </p>

          <PopularBoards boards={popularBoards} />
        </section>

        <section aria-labelledby={commentsHeadingId} className="mt-3 p-4">
          <h2 id={commentsHeadingId} className="sr-only">
            {labels.most_liked_comments}
          </h2>

          <p
            aria-hidden="true"
            className="mb-2 truncate text-xs font-normal tracking-wider text-muted-foreground/50"
          >
            {labels.most_liked_comments}
          </p>

          {comments.length > 0 ? (
            <MostLikedComments comments={comments} />
          ) : (
            <p className="truncate py-4 text-center text-sm text-muted-foreground/50">
              {labels.no_comments}
            </p>
          )}
        </section>
      </ScrollArea>
    </div>
  );
}
