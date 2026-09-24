"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { PanelImperativeHandle } from "react-resizable-panels";

import { Navbar } from "./navbar";
import PanelLeft from "./panel-left";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { Footer } from "./footer";
import { PostEditor } from "@/components/post-editor";
import { AccountPanel } from "./account-panel";
import { NotificationPanel } from "./notification-panel";
import { BreadCrumbs } from "./breadcrumbs";
import { LeaderBoard } from "./leader-board";

import { UserProvider } from "../context/user-context";
import { PointBalanceProvider } from "../context/point-balance-context";

import type { MostLikedComment } from "../actions/post";
import type { PopularBoard } from "../actions/query";
import type { LeaderboardUser } from "../actions/leaderboard";

import type { NewsItem } from "@/types";
import type { User } from "@/types/user";

interface LayoutShellProps {
  user: User | null;
  news: NewsItem[];
  children: React.ReactNode;
  comments: MostLikedComment[];
  popularBoards: PopularBoard[];
  traders: LeaderboardUser[];
}

export default function LayoutShell({
  user,
  news,
  children,
  comments,
  popularBoards,
  traders,
}: LayoutShellProps) {
  const [isOpen, setIsOpen] = useState(true);

  const [onWrite, setOnWrite] = useState(false);
  const [onAccount, setOnAccount] = useState(false);
  const [onNotification, setOnNotification] = useState(false);

  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);

  const pathname = usePathname();
  const sectionBRef = useRef<HTMLDivElement>(null);
  const panelBRef = useRef<PanelImperativeHandle>(null);

  const [sectionBPosition, setSectionBPosition] = useState({
    left: 0,
    width: 0,
  });

  const [isMobileLayout, setIsMobileLayout] = useState(false);

  const isMobile = () => {
    return window.innerWidth < 768;
  };

  const closeSectionB = () => {
    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(false);
  };

  const resetPanelB = () => {
    if (isMobile()) {
      return;
    }

    panelBRef.current?.resize("30%");
  };

  const handleToggleLeftPanel = () => {
    setIsOpen((prev) => !prev);

    if (isMobile()) {
      closeSectionB();
    }
  };

  const handleWrite = () => {
    if (isMobile()) {
      setIsOpen(false);
    } else {
      resetPanelB();
    }

    setOnWrite(true);
    setOnAccount(false);
    setOnNotification(false);
  };

  const handleAccount = () => {
    if (isMobile()) {
      setIsOpen(false);
    } else {
      resetPanelB();
    }

    setOnWrite(false);
    setOnAccount(true);
    setOnNotification(false);
  };

  const handleNotification = () => {
    if (isMobile()) {
      setIsOpen(false);
    } else {
      resetPanelB();
    }

    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(true);

    setNotificationRefreshKey((prev) => prev + 1);
  };

  const mobilePanelOpen =
    isMobileLayout && !!user && (onWrite || onAccount || onNotification);

  useEffect(() => {
    type LayoutMode = "mobile" | "tablet" | "desktop";

    const getLayoutMode = (): LayoutMode => {
      const width = window.innerWidth;

      if (width < 768) {
        return "mobile";
      }

      if (width < 1280) {
        return "tablet";
      }

      return "desktop";
    };

    let previousMode: LayoutMode = getLayoutMode();

    const applyLayout = (mode: LayoutMode) => {
      const mobile = mode === "mobile";

      setIsMobileLayout(mobile);

      if (mode === "desktop") {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }

      if (mobile) {
        panelBRef.current?.resize("0%");
      } else {
        panelBRef.current?.resize("30%");
      }
    };

    applyLayout(previousMode);

    const handleResize = () => {
      const nextMode = getLayoutMode();

      if (nextMode === previousMode) {
        return;
      }

      previousMode = nextMode;

      applyLayout(nextMode);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isOpen) {
          setIsOpen(false);
          return;
        }

        if (onWrite || onAccount || onNotification) {
          closeSectionB();
          return;
        }
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

          // Only close Section B on mobile.
          if (isMobile()) {
            closeSectionB();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onWrite, onAccount, onNotification]);

  useEffect(() => {
    const panel = sectionBRef.current;

    if (!panel) {
      return;
    }

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
    <UserProvider user={user}>
      <PointBalanceProvider>
        <div className="relative flex min-h-screen flex-col">
          <Navbar
            user={user}
            onTogglePanel={handleToggleLeftPanel}
            onWrite={handleWrite}
            onAccount={handleAccount}
            onNotification={handleNotification}
          />

          <PanelLeft
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            news={news}
            comments={comments}
            popularBoards={popularBoards}
          />

          <div
            className={`
              w-full
              pt-14
              transition-all
              duration-300
              ease-in-out

              ${isOpen ? "xl:ml-80 xl:w-[calc(100%-320px)]" : "ml-0 w-full"}
            `}
          >
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel minSize="30%">
                <section
                  className="
                    flex
                    w-full
                    min-w-0
                    flex-col
                    bg-white
                    dark:bg-zinc-900
                  "
                >
                  <div className="flex-1">
                    {pathname !== "/" && <BreadCrumbs />}

                    {children}
                  </div>
                </section>
              </ResizablePanel>

              <ResizableHandle
                className="
                  hidden
                  w-0
                  border-gray-50
                  md:flex
                "
              />

              <ResizablePanel
                panelRef={panelBRef}
                defaultSize="30%"
                minSize="0%"
                className="
                  z-20
                  border-l
                  border-gray-100
                  bg-white
                  dark:border-zinc-800
                  dark:bg-zinc-900
                "
              >
                <div
                  ref={sectionBRef}
                  className="
                    w-full
                    min-w-0
                  "
                >
                  {!isMobileLayout && (
                    <div
                      className="
                        fixed
                        top-14
                        bottom-0

                        flex
                        min-w-0
                        flex-col
                        gap-3

                        overflow-x-hidden
                        overflow-y-auto

                        bg-white
                        dark:bg-zinc-900
                      "
                      style={{
                        left: sectionBPosition.left,
                        width: sectionBPosition.width,
                      }}
                    >
                      {user && onWrite && (
                        <PostEditor setOnWrite={setOnWrite} />
                      )}

                      {user && onAccount && !onWrite && (
                        <AccountPanel user={user} setOnAccount={setOnAccount} />
                      )}

                      {user && onNotification && (
                        <NotificationPanel
                          refreshKey={notificationRefreshKey}
                          setOnNotification={setOnNotification}
                        />
                      )}

                      {!onWrite && !onAccount && !onNotification && (
                        <>
                          <div className="mx-4 mt-8">
                            <p
                              className="
                                  truncate
                                  text-xs
                                  font-light
                                  tracking-wider
                                  text-muted-foreground/50
                                "
                            >
                              Top traders
                            </p>
                          </div>

                          <LeaderBoard traders={traders} />

                          <div
                            className="
                                mx-4
                                h-80
                                rounded-lg
                                border
                                border-zinc-100
                                p-2
                                font-light
                                text-zinc-300
                                dark:border-zinc-800
                                dark:text-zinc-700
                              "
                          >
                            advertisement
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {mobilePanelOpen && (
            <div
              className="
                fixed
                top-14
                right-0
                bottom-0
                left-0
                z-40

                flex
                flex-col

                overflow-x-hidden
                overflow-y-auto

                bg-white

                md:hidden

                dark:bg-zinc-900
              "
            >
              {user && onWrite && <PostEditor setOnWrite={setOnWrite} />}

              {user && onAccount && !onWrite && (
                <AccountPanel user={user} setOnAccount={setOnAccount} />
              )}

              {user && onNotification && (
                <NotificationPanel
                  refreshKey={notificationRefreshKey}
                  setOnNotification={setOnNotification}
                />
              )}
            </div>
          )}

          <Footer />
        </div>
      </PointBalanceProvider>
    </UserProvider>
  );
}
