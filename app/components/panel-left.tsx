"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { NewsItem } from "@/types";
import { ModeToggle } from "./mode-toggle";
import { MostLikedComments } from "./most-liked-comments";
import { PopularBoards } from "./major-indices";
import React from "react";
import { MostLikedComment } from "../actions/post";

interface PanelLeftProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  news: NewsItem[];
  comments: MostLikedComment[];
}

export default function PanelLeft({ isOpen, news, comments }: PanelLeftProps) {
  return (
    <>
      {/* Sidebar Panel - No overlay, stays open on outside click */}
      <aside
        className={`fixed top-0 left-0 h-screen w-full sm:w-[320px] lg:border-r border-zinc-100 dark:border-r-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transform-gpu transition-transform duration-300 ease-out z-30 lg:z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ScrollArea className="h-full w-full mt-10">
          <div className="flex min-h-full flex-col pb-20">
            {/* News Section */}
            {/* <div className="mt-8">
                <NewsCarousel news={news} />
              </div> */}

            {/* Topics */}
            <div className=" mt-12">
              <p className="px-4 text-muted-foreground/50 text-xs text-light mb-3.5 tracking-wider">
                Popular boards
              </p>
              <PopularBoards />
            </div>

            {/* Topics */}
            <div className=" p-4 mt-3">
              <p className="text-muted-foreground/50  text-xs text-light mb-2 tracking-wider">
                Popular comments
              </p>
              <MostLikedComments comments={comments} />
            </div>

            <div className="md:hidden mt-auto p-3 -translate-y-10 self-end">
              <ModeToggle />
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
