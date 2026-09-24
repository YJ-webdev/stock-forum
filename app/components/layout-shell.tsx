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

import { getMostLikedComments, MostLikedComment } from "../actions/post";
import { PopularBoard } from "../actions/query";

import { NewsItem } from "@/types";
import { User } from "@/types/user";
import { LeaderboardUser } from "../actions/leaderboard";

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

  const [mostLikedComments, setMostLikedComments] =
    useState<MostLikedComment[]>(comments);

  const pathname = usePathname();

  // ---------------------------------------------------------------------------
  // SECTION B
  // ---------------------------------------------------------------------------

  const sectionBRef = useRef<HTMLDivElement>(null);
  const panelBRef = useRef<PanelImperativeHandle>(null);

  const [sectionBPosition, setSectionBPosition] = useState({
    left: 0,
    width: 0,
  });

  const [isMobileLayout, setIsMobileLayout] = useState(false);

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // LEFT PANEL
  // ---------------------------------------------------------------------------

  const handleToggleLeftPanel = () => {
    setIsOpen((prev) => !prev);

    // PanelLeft and Section B are mutually exclusive only on mobile.
    if (isMobile()) {
      closeSectionB();
    }
  };

  // ---------------------------------------------------------------------------
  // WRITE
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // ACCOUNT
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // MOBILE SECTION B
  // ---------------------------------------------------------------------------

  const mobilePanelOpen =
    isMobileLayout && !!user && (onWrite || onAccount || onNotification);

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
  // RESPONSIVE BEHAVIOR
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;

      setIsMobileLayout(mobile);

      // -----------------------------------------------------------------------
      // LEFT PANEL
      // -----------------------------------------------------------------------

      if (window.innerWidth >= 1280) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }

      // -----------------------------------------------------------------------
      // RIGHT PANEL
      //
      // Mobile:
      // collapse desktop Section B so Section A gets 100%.
      //
      // Desktop/tablet:
      // restore Section B to 30%.
      // -----------------------------------------------------------------------

      if (mobile) {
        panelBRef.current?.resize("0%");
      } else {
        panelBRef.current?.resize("30%");
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
  // Ctrl+B / Cmd+B = toggle PanelLeft
  // Escape = close PanelLeft / Section B
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

  // ---------------------------------------------------------------------------
  // TRACK DESKTOP / TABLET SECTION B POSITION
  // ---------------------------------------------------------------------------

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
          {/* -----------------------------------------------------------------
              NAVBAR
          ------------------------------------------------------------------ */}

          <Navbar
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
              MAIN LAYOUT

              IMPORTANT:
              {children} exists ONLY ONCE.
          ================================================================== */}

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
              {/* -------------------------------------------------------------
                  SECTION A

                  This is the ONLY place children is rendered.
              -------------------------------------------------------------- */}

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

              {/* -------------------------------------------------------------
                  RESIZE HANDLE

                  Hidden visually on mobile.
              -------------------------------------------------------------- */}

              <ResizableHandle
                className="
                  hidden
                  w-0
                  border-gray-50
                  md:flex
                "
              />

              {/* -------------------------------------------------------------
                  DESKTOP / TABLET SECTION B

                  On mobile its panel size becomes 0%.
                  We do NOT use display:none on ResizablePanel itself.
              -------------------------------------------------------------- */}

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

                      {/* DEFAULT */}

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

          {/* =================================================================
              MOBILE SECTION B

              Separate overlay.

              It does NOT contain {children}, so there is still only one
              copy of your comments / market page in the DOM.
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
