"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import type { PanelImperativeHandle } from "react-resizable-panels";

import { Navbar } from "./navbar";
import PanelLeft from "./panel-left";
import PanelLeftMobile from "./panel-left-mobile";

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
import type { User } from "@/types/user";

interface LayoutShellProps {
  user: User | null;
  children: React.ReactNode;
  comments: MostLikedComment[];
  popularBoards: PopularBoard[];
  traders: LeaderboardUser[];
}

export default function LayoutShell({
  user,
  children,
  comments,
  popularBoards,
  traders,
}: LayoutShellProps) {
  // ---------------------------------------------------------------------------
  // Left panels
  // ---------------------------------------------------------------------------

  const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Section B
  // ---------------------------------------------------------------------------

  const [onWrite, setOnWrite] = useState(false);
  const [onAccount, setOnAccount] = useState(false);
  const [onNotification, setOnNotification] = useState(false);

  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const pathname = usePathname();

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------

  const sectionBRef = useRef<HTMLDivElement>(null);
  const panelBRef = useRef<PanelImperativeHandle>(null);

  // ---------------------------------------------------------------------------
  // Desktop Section B position
  // ---------------------------------------------------------------------------

  const [sectionBPosition, setSectionBPosition] = useState({
    left: 0,
    width: 0,
  });

  // ---------------------------------------------------------------------------
  // Left panel
  // ---------------------------------------------------------------------------

  const handleToggleLeftPanel = () => {
    if (window.innerWidth >= 1280) {
      setIsDesktopPanelOpen((prev) => !prev);
      return;
    }

    setIsMobilePanelOpen((prev) => !prev);
  };

  // ---------------------------------------------------------------------------
  // Section B helpers
  // ---------------------------------------------------------------------------

  const resetPanelB = () => {
    if (window.innerWidth >= 768) {
      panelBRef.current?.resize("30%");
    }
  };

  const handleWrite = () => {
    // Close mobile left drawer when opening another mobile panel.
    setIsMobilePanelOpen(false);

    resetPanelB();

    setOnWrite(true);
    setOnAccount(false);
    setOnNotification(false);
  };

  const handleAccount = () => {
    // Close mobile left drawer when opening another mobile panel.
    setIsMobilePanelOpen(false);

    resetPanelB();

    setOnWrite(false);
    setOnAccount(true);
    setOnNotification(false);
  };

  const handleNotification = () => {
    // Close mobile left drawer when opening another mobile panel.
    setIsMobilePanelOpen(false);

    resetPanelB();

    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(true);

    setNotificationRefreshKey((prev) => prev + 1);
  };

  // No viewport state is required here.
  // CSS decides whether this overlay is visible through md:hidden.
  const mobilePanelOpen = !!user && (onWrite || onAccount || onNotification);

  // ---------------------------------------------------------------------------
  // Keep the fixed desktop Section B aligned with ResizablePanel.
  //
  // ResizeObserver can fire many times while the layout is moving.
  // requestAnimationFrame limits React state updates to once per frame.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const panel = sectionBRef.current;

    if (!panel) {
      return;
    }

    let frameId: number | null = null;

    const updatePosition = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      frameId = requestAnimationFrame(() => {
        const rect = panel.getBoundingClientRect();

        setSectionBPosition((previous) => {
          if (
            Math.abs(previous.left - rect.left) < 0.5 &&
            Math.abs(previous.width - rect.width) < 0.5
          ) {
            return previous;
          }

          return {
            left: rect.left,
            width: rect.width,
          };
        });

        frameId = null;
      });
    };

    updatePosition();

    const observer = new ResizeObserver(updatePosition);

    observer.observe(panel);

    window.addEventListener("resize", updatePosition);

    return () => {
      observer.disconnect();

      window.removeEventListener("resize", updatePosition);

      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <UserProvider user={user}>
      <PointBalanceProvider>
        <div className="relative flex min-h-screen flex-col">
          {/* ---------------------------------------------------------------- */}
          {/* Navbar                                                           */}
          {/* ---------------------------------------------------------------- */}

          <Navbar
            user={user}
            onTogglePanel={handleToggleLeftPanel}
            onWrite={handleWrite}
            onAccount={handleAccount}
            onNotification={handleNotification}
          />

          {/* ---------------------------------------------------------------- */}
          {/* Desktop left panel                                               */}
          {/* ---------------------------------------------------------------- */}

          <PanelLeft
            isOpen={isDesktopPanelOpen}
            comments={comments}
            popularBoards={popularBoards}
          />

          {/* ---------------------------------------------------------------- */}
          {/* Mobile / tablet left panel                                       */}
          {/* ---------------------------------------------------------------- */}

          <PanelLeftMobile
            isOpen={isMobilePanelOpen}
            setIsOpen={setIsMobilePanelOpen}
            comments={comments}
            popularBoards={popularBoards}
          />

          {/* ---------------------------------------------------------------- */}
          {/* Main layout                                                      */}
          {/* ---------------------------------------------------------------- */}

          <div
            className={`
              w-full
              pt-14

              transition-[margin-left,width]
              duration-300
              ease-out

              ${
                isDesktopPanelOpen
                  ? "xl:ml-80 xl:w-[calc(100%-320px)]"
                  : "xl:ml-0 xl:w-full"
              }
            `}
          >
            <ResizablePanelGroup orientation="horizontal">
              {/* ------------------------------------------------------------ */}
              {/* Main content                                                 */}
              {/* ------------------------------------------------------------ */}

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

              {/* ------------------------------------------------------------ */}
              {/* Resize handle                                                */}
              {/* ------------------------------------------------------------ */}

              <ResizableHandle
                className="
                  hidden
                  w-0
                  border-gray-50
                  md:flex
                "
              />

              {/* ------------------------------------------------------------ */}
              {/* Desktop Section B                                            */}
              {/* ------------------------------------------------------------ */}

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
                  <div
                    className="
                      fixed
                      top-14
                      bottom-0

                      hidden
                      min-w-0
                      flex-col
                      gap-3

                      overflow-x-hidden
                      overflow-y-auto

                      bg-white
                      dark:bg-zinc-900

                      md:flex
                    "
                    style={{
                      left: sectionBPosition.left,
                      width: sectionBPosition.width,
                    }}
                  >
                    {/* Write */}

                    {user && onWrite && <PostEditor setOnWrite={setOnWrite} />}

                    {/* Account */}

                    {user && onAccount && !onWrite && (
                      <AccountPanel user={user} setOnAccount={setOnAccount} />
                    )}

                    {/* Notifications */}

                    {user && onNotification && (
                      <NotificationPanel
                        refreshKey={notificationRefreshKey}
                        setOnNotification={setOnNotification}
                      />
                    )}

                    {/* Default right panel */}

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
                            Leaderboard
                          </p>
                        </div>

                        <LeaderBoard traders={traders} />
                      </>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Mobile Section B overlay                                         */}
          {/* ---------------------------------------------------------------- */}

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
