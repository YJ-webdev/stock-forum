"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "./header";
import PanelLeft from "./panel-left";
import { LeaderboardChart } from "./leader-board-chart";
import { NewsItem } from "@/types";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Footer } from "./footer";
import { PostEditor } from "@/components/post-editor";
import { CategoryWithCount } from "@/types/forum";
import type { PanelImperativeHandle } from "react-resizable-panels";

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface LayoutShellProps {
  user: User | null;
  // marketData: MarketAssetClient[];
  news: NewsItem[];
  categories: CategoryWithCount[];
  children: React.ReactNode;
}

export default function LayoutShell({
  user,
  news,
  categories,
  children,
}: LayoutShellProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [onWrite, setOnWrite] = useState(false);
  const [onAccount, setOnAccount] = useState(false);
  const [onNotification, setOnNotification] = useState(false);
  const sectionBRef = useRef<HTMLDivElement>(null);

  const [sectionBPosition, setSectionBPosition] = useState({
    left: 0,
    width: 0,
  });

  const panelBRef = useRef<PanelImperativeHandle>(null);
  const resetPanelB = () => {
    panelBRef.current?.resize("30%");
  };

  const handleWrite = () => {
    resetPanelB();

    setOnWrite(true);
    setOnAccount(false);
    setOnNotification(false);
  };

  const handleAccount = () => {
    resetPanelB();

    setOnWrite(false);
    setOnAccount(true);
    setOnNotification(false);
  };

  const handleNotification = () => {
    resetPanelB();

    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(true);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [setIsOpen]);

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

  useEffect(() => {
    const panel = sectionBRef.current;
    if (!panel) return;

    const updatePosition = () => {
      const rect = panel.getBoundingClientRect();

      setSectionBPosition({
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();

    const observer = new ResizeObserver(updatePosition);

    observer.observe(panel);
    window.addEventListener("resize", updatePosition);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  return (
    <div className="relative flex flex-col min-h-screen">
      <Header
        user={user}
        onTogglePanel={() => setIsOpen((prev) => !prev)}
        onWrite={handleWrite}
        onAccount={handleAccount}
        onNotification={handleNotification}
      />
      <PanelLeft
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        news={news}
        categories={categories}
      />
      <div
        className={`pt-14 flex flex-col md:flex-row transition-all duration-300 ease-in-out ${
          isOpen
            ? "xl:ml-80 xl:w-[calc(100%-320px)] w-full ml-0"
            : "ml-0 w-full"
        }`}
      >
        <ResizablePanelGroup orientation="horizontal" className="">
          <ResizablePanel>
            <section className="w-full flex flex-col min-w-0 bg-white dark:bg-zinc-900">
              <div className="flex-1">{children}</div>
            </section>
          </ResizablePanel>
          <ResizableHandle className="border-gray-50 w-0" />
          <ResizablePanel
            panelRef={panelBRef}
            defaultSize="30%"
            className="
    bg-white dark:bg-zinc-900
    border-l border-gray-100 dark:border-zinc-800
  "
          >
            {/* This stays inside ResizablePanel and tracks its actual width */}
            <div ref={sectionBRef} className="hidden lg:block w-full min-w-0">
              <div
                className="
        fixed
        top-14
        bottom-0
        min-w-0
        overflow-x-hidden
        overflow-y-auto
        p-4
        flex flex-col gap-4
        bg-white dark:bg-zinc-900
      "
                style={{
                  left: sectionBPosition.left,
                  width: sectionBPosition.width,
                }}
              >
                {onWrite && (
                  <PostEditor
                    categories={categories}
                    onCancel={() => setOnWrite(false)}
                  />
                )}

                {onAccount && <>Account</>}

                {onNotification && <>Notifications</>}

                {!onWrite && !onAccount && !onNotification && (
                  <div className="flex flex-col w-full min-w-0 gap-4">
                    <div>
                      <p className="text-muted-foreground text-xs font-light tracking-wider uppercase">
                        top traders
                      </p>

                      <LeaderboardChart />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>{" "}
      </div>{" "}
      <Footer />
    </div>
  );
}
