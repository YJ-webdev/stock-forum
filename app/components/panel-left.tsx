"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect } from "react";

import { CategoryWithCount, ForumList } from "./forum-card";

import { PostCard } from "./post-card";
import { PostWithRelations } from "./post-card";
import { NewsCarousel } from "./news-card";
import { NewsItem } from "@/types";
import { ModeToggle } from "./mode-toggle";

interface PanelLeftProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  news: NewsItem[];
  categories: CategoryWithCount[]; // Add live categories prop
  posts?: PostWithRelations[];
}

export default function PanelLeft({
  isOpen,
  setIsOpen,
  news,
  posts,
  categories,
}: PanelLeftProps) {
  return (
    <>
      {/* Sidebar Panel - No overlay, stays open on outside click */}
      <aside
        className={`fixed top-0 left-0 h-screen w-full sm:w-[320px] lg:border-r border-zinc-100 dark:border-r-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transform-gpu transition-transform duration-300 ease-out z-30 lg:z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ScrollArea className="h-full w-full mt-10">
          <div className="flex min-h-full flex-col">
            {/* News Section */}
            <div className="mt-8">
              <NewsCarousel news={news} />
            </div>

            {/* Topics */}
            <div className="mt-5 p-4">
              <p className="text-muted-foreground text-xs text-light mb-2 tracking-wider">
                TOPICS
              </p>
              <ForumList categories={categories} />
            </div>

            {/* Recent Posts Section */}
            <div className="mt-8 p-4">
              <p className="text-muted-foreground text-xs text-light mb-2 tracking-wider">
                RECENT POSTS
              </p>
              {posts?.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
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
