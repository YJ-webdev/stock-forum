"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DUMMY_DATA } from "../data/dummy";
import { NewsList } from "./news-card";
import { PostList } from "./post-card";
import { ForumList } from "./forum-card";

interface PanelLeftProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function PanelLeft({ isOpen, setIsOpen }: PanelLeftProps) {
  const pathname = usePathname();

  // Auto-close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

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
        className={`fixed top-0 left-0 h-screen w-[320px] border-r border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transform-gpu transition-transform duration-500 ease-out z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ScrollArea className="h-full w-full p-5 mt-10 pb-20">
          {/* News Section */}
          <div className="mt-2">
            <p className="text-muted-foreground text-xs text-light tracking-wider">
              NEWS
            </p>
            <NewsList />
          </div>

          {/* Topics */}
          <div className="mt-5">
            <p className="text-muted-foreground text-xs text-light mb-2 tracking-wider">
              TOPICS
            </p>
            <ForumList />
          </div>

          {/* Recent Posts Section */}
          <div className="mt-8">
            <p className="text-muted-foreground text-xs text-light mb-2 tracking-wider">
              RECENT POSTS
            </p>
            <PostList />
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
