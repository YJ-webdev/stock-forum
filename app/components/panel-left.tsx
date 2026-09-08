"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect } from "react";

import { CategoryWithCount, ForumList } from "./forum-card";
import { NewsItem } from "../data/type";
import { PostCard } from "./post-card";
import { PostWithRelations } from "./post-card";
import { NewsCarousel } from "./news-card";

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
  // Keyboard shortcuts: Ctrl+B / Cmd+B to toggle, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        const activeElement = document.activeElement;
        const isInputField =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement)?.isContentEditable;

        if (!isInputField) {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  return (
    <>
      {/* Sidebar Panel - No overlay, stays open on outside click */}
      <aside
        className={`fixed top-0 left-0 h-screen w-full md:w-[320px] md:border-r border-zinc-100 dark:border-r-zinc-900 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transform-gpu transition-transform duration-500 ease-out z-60 md:z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ScrollArea className="h-full w-full p-5 mt-10 pb-20">
          {/* News Section */}
          <div>
            <NewsCarousel news={news} />
          </div>

          {/* Topics */}
          <div className="mt-5">
            <p className="text-muted-foreground text-xs text-light mb-2 tracking-wider">
              TOPICS
            </p>
            <ForumList categories={categories} />
          </div>

          {/* Recent Posts Section */}
          <div className="mt-8">
            <p className="text-muted-foreground text-xs text-light mb-2 tracking-wider">
              RECENT POSTS
            </p>
            {posts?.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
