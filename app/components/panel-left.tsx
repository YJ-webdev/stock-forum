"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { NewsCarousel } from "./news-card";
import { NewsItem } from "@/types";
import { ModeToggle } from "./mode-toggle";
import Link from "next/link";
import { MostViewedPost } from "./layout-shell";

interface PanelLeftProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  news: NewsItem[];
  posts: MostViewedPost[];
}

export default function PanelLeft({ isOpen, news, posts }: PanelLeftProps) {
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
            <div className="mt-6">
              <NewsCarousel news={news} />
            </div>

            {/* Topics */}
            <div className=" p-4">
              <p className="text-muted-foreground text-xs text-light mb-2 tracking-wider">
                Most discussed
              </p>
              <div className="flex flex-col gap-2">
                {posts?.map((post) => (
                  <Link
                    key={post.id}
                    href={`/${post.assetSymbol ?? "general"}/post/${post.slug}`}
                  >
                    <p className="text-lg">{post.title}</p>

                    {/* {post.thumbnail && (
                      <img
                        src={post.thumbnail}
                        alt={post.title ?? ""}
                        className="aspect-7/3 w-full object-cover"
                      />
                    )} */}
                  </Link>
                ))}
              </div>
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
