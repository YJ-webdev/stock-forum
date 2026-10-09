"use client";

import React, { useId } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import { PANEL_LEFT_LABELS } from "@/lib/data/translations";

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
  const currentUser = useCurrentUser();
  const language = resolveLanguage(currentUser?.language);
  const labels = PANEL_LEFT_LABELS[language];

  const boardsHeadingId = useId();
  const commentsHeadingId = useId();

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
            <section aria-labelledby={boardsHeadingId}>
              <h2 id={boardsHeadingId} className="sr-only">
                {labels.popular_boards}
              </h2>

              <PopularBoards boards={popularBoards} />
            </section>

            <section aria-labelledby={commentsHeadingId} className="mt-3 p-4">
              <h2 id={commentsHeadingId} className="sr-only">
                {labels.most_liked_comments}
              </h2>

              {comments.length > 0 ? (
                <MostLikedComments comments={comments} />
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground/50">
                  {labels.no_comments}
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
