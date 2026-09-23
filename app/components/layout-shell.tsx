"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { PanelImperativeHandle } from "react-resizable-panels";

import { Header } from "./header";
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
import { TopTraders } from "./top-trader";

import { UserProvider } from "../context/user-context";
import { PointBalanceProvider } from "../context/point-balance-context";

import { getMostLikedComments, MostLikedComment } from "../actions/post";
import { PopularBoard } from "../actions/query";

import { NewsItem } from "@/types";
import { User } from "@/types/user";

interface LayoutShellProps {
  user: User | null;
  news: NewsItem[];
  children: React.ReactNode;
  comments: MostLikedComment[];
  popularBoards: PopularBoard[];
}

export default function LayoutShell({
  user,
  news,
  children,
  comments,
  popularBoards,
}: LayoutShellProps) {
  const [isOpen, setIsOpen] = useState(true);

  const [onWrite, setOnWrite] = useState(false);
  const [onAccount, setOnAccount] = useState(false);
  const [onNotification, setOnNotification] = useState(false);

  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);

  const [mostLikedComments, setMostLikedComments] =
    useState<MostLikedComment[]>(comments);

  const pathname = usePathname();

  // ---------------------------------------------------------------------------
  // DESKTOP / TABLET RIGHT PANEL
  // ---------------------------------------------------------------------------

  const sectionBRef = useRef<HTMLDivElement>(null);
  const panelBRef = useRef<PanelImperativeHandle>(null);

  const [sectionBPosition, setSectionBPosition] = useState({
    left: 0,
    width: 0,
  });

  const resetPanelB = () => {
    panelBRef.current?.resize("30%");
  };

  const isMobile = () => window.innerWidth < 768;

  const closeSectionB = () => {
    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(false);
  };

  const handleToggleLeftPanel = () => {
    setIsOpen((prev) => !prev);

    // Only close Section B on mobile
    if (isMobile()) {
      closeSectionB();
    }
  };

  const handleWrite = () => {
    resetPanelB();

    // Only close PanelLeft on mobile
    if (isMobile()) {
      setIsOpen(false);
    }

    setOnWrite(true);
    setOnAccount(false);
    setOnNotification(false);
  };

  const handleAccount = () => {
    resetPanelB();

    // Only close PanelLeft on mobile
    if (isMobile()) {
      setIsOpen(false);
    }

    setOnWrite(false);
    setOnAccount(true);
    setOnNotification(false);
  };

  const handleNotification = () => {
    resetPanelB();

    // Only close PanelLeft on mobile
    if (isMobile()) {
      setIsOpen(false);
    }

    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(true);

    setNotificationRefreshKey((prev) => prev + 1);
  };

  // ---------------------------------------------------------------------------
  // MOBILE SECTION B STATE
  // ---------------------------------------------------------------------------

  const mobilePanelOpen = !!user && (onWrite || onAccount || onNotification);

  // ---------------------------------------------------------------------------
  // COMMENTS
  // ---------------------------------------------------------------------------

  const handleCommentCreated = async () => {
    const updatedComments = await getMostLikedComments();

    setMostLikedComments(updatedComments);
  };

  useEffect(() => {
    setMostLikedComments(comments);
  }, [comments]);

  // ---------------------------------------------------------------------------
  // LEFT PANEL RESPONSIVE BEHAVIOR
  // ---------------------------------------------------------------------------

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
  }, []);

  // ---------------------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  //
  // Ctrl+B / Cmd+B = toggle left panel
  // Escape = close left panel / mobile Section B
  // ---------------------------------------------------------------------------

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

          closeSectionB();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onWrite, onAccount, onNotification]);

  // ---------------------------------------------------------------------------
  // TRACK DESKTOP / TABLET RIGHT PANEL POSITION
  // ---------------------------------------------------------------------------

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
    <UserProvider user={user}>
      <PointBalanceProvider>
        <div className="relative flex min-h-screen flex-col">
          {/* -----------------------------------------------------------------
              HEADER
          ------------------------------------------------------------------ */}

          <Header
            user={user}
            onTogglePanel={handleToggleLeftPanel}
            onWrite={handleWrite}
            onAccount={handleAccount}
            onNotification={handleNotification}
          />

          {/* -----------------------------------------------------------------
              LEFT PANEL
          ------------------------------------------------------------------ */}

          <PanelLeft
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            news={news}
            comments={mostLikedComments}
            popularBoards={popularBoards}
          />

          {/* =================================================================
              MOBILE SECTION A

              No ResizablePanelGroup on mobile.
              Section A gets 100% width.
          ================================================================== */}

          <div className="w-full pt-14 md:hidden">
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
          </div>

          {/* =================================================================
              TABLET / DESKTOP LAYOUT
          ================================================================== */}

          <div
            className={`
              hidden
              pt-14
              transition-all
              duration-300
              ease-in-out
              md:flex

              ${
                isOpen
                  ? "w-full xl:ml-80 xl:w-[calc(100%-320px)]"
                  : "ml-0 w-full"
              }
            `}
          >
            <ResizablePanelGroup orientation="horizontal">
              {/* -------------------------------------------------------------
                  SECTION A
              -------------------------------------------------------------- */}

              <ResizablePanel>
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

              {/* -------------------------------------------------------------
                  RESIZE HANDLE
              -------------------------------------------------------------- */}

              <ResizableHandle className="w-0 border-gray-50" />

              {/* -------------------------------------------------------------
                  SECTION B
              -------------------------------------------------------------- */}

              <ResizablePanel
                panelRef={panelBRef}
                defaultSize="30%"
                minSize="1%"
                className="
                  z-20
                  border-l
                  border-gray-100
                  bg-white
                  dark:border-zinc-800
                  dark:bg-zinc-900
                "
              >
                <div ref={sectionBRef} className="w-full min-w-0">
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
                    {/* WRITE */}

                    {user && onWrite && (
                      <PostEditor
                        isLoggedIn={!!user}
                        nationality={user.nationality ?? null}
                        setOnWrite={setOnWrite}
                        onCommentCreated={handleCommentCreated}
                      />
                    )}

                    {/* ACCOUNT */}

                    {user && onAccount && !onWrite && (
                      <AccountPanel user={user} setOnAccount={setOnAccount} />
                    )}

                    {/* NOTIFICATIONS */}

                    {user && onNotification && (
                      <NotificationPanel
                        refreshKey={notificationRefreshKey}
                        setOnNotification={setOnNotification}
                      />
                    )}
                    {/* DEFAULT RIGHT PANEL */}

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

                        <TopTraders />

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
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {/* =================================================================
              MOBILE SECTION B

              Completely independent from the desktop ResizablePanelGroup.
              Covers Section A below the Header.
          ================================================================== */}

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
              {/* WRITE */}

              {user && onWrite && (
                <PostEditor
                  isLoggedIn={!!user}
                  nationality={user.nationality ?? null}
                  setOnWrite={setOnWrite}
                  onCommentCreated={handleCommentCreated}
                />
              )}

              {/* ACCOUNT */}

              {user && onAccount && !onWrite && (
                <AccountPanel user={user} setOnAccount={setOnAccount} />
              )}

              {/* NOTIFICATIONS */}

              {user && onNotification && (
                <NotificationPanel
                  refreshKey={notificationRefreshKey}
                  setOnNotification={setOnNotification}
                />
              )}
            </div>
          )}

          {/* -----------------------------------------------------------------
              FOOTER
          ------------------------------------------------------------------ */}

          <Footer />
        </div>
      </PointBalanceProvider>
    </UserProvider>
  );
}
