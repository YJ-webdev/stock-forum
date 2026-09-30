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

  const panelBRef = useRef<PanelImperativeHandle>(null);

  // ---------------------------------------------------------------------------
  // Left panel
  // ---------------------------------------------------------------------------

  const handleToggleLeftPanel = () => {
    // Desktop
    if (window.innerWidth >= 1280) {
      setIsDesktopPanelOpen((prev) => !prev);
      return;
    }

    // Mobile / Tablet
    // Close any open user menu first.
    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(false);

    setIsMobilePanelOpen((prev) => !prev);
  };

  // ---------------------------------------------------------------------------
  // Section B responsive size
  //
  // Mobile:
  //   Section B = 0%
  //   Main = 100%
  //
  // Tablet / Desktop:
  //   Section B = 30%
  //
  // matchMedia only fires when crossing the md breakpoint.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");

    const updateSectionB = () => {
      if (media.matches) {
        panelBRef.current?.resize("30%");
      } else {
        panelBRef.current?.resize("0%");
      }
    };

    updateSectionB();

    media.addEventListener("change", updateSectionB);

    return () => {
      media.removeEventListener("change", updateSectionB);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Section B helpers
  // ---------------------------------------------------------------------------

  const resetPanelB = () => {
    // On mobile Section B must stay at 0%.
    // Mobile uses the full-width overlay instead.
    if (window.innerWidth >= 768) {
      panelBRef.current?.resize("30%");
    }
  };

  const handleWrite = () => {
    setIsMobilePanelOpen(false);

    resetPanelB();

    setOnWrite(true);
    setOnAccount(false);
    setOnNotification(false);
  };

  const handleAccount = () => {
    setIsMobilePanelOpen(false);

    resetPanelB();

    setOnWrite(false);
    setOnAccount(true);
    setOnNotification(false);
  };

  const handleNotification = () => {
    setIsMobilePanelOpen(false);

    resetPanelB();

    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(true);

    setNotificationRefreshKey((prev) => prev + 1);
  };

  // ---------------------------------------------------------------------------
  // Mobile Section B overlay
  // ---------------------------------------------------------------------------

  const mobilePanelOpen = !!user && (onWrite || onAccount || onNotification);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <UserProvider user={user}>
      <PointBalanceProvider>
        <div
          className="
    relative
    flex
    min-h-screen
    flex-col

    md:h-screen
    md:overflow-hidden
  "
        >
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
          {/* Mobile / tablet left drawer                                      */}
          {/* ---------------------------------------------------------------- */}

          <PanelLeftMobile
            isOpen={isMobilePanelOpen}
            setIsOpen={setIsMobilePanelOpen}
            comments={comments}
            popularBoards={popularBoards}
          />

          {/* ---------------------------------------------------------------- */}
          {/* Page layout                                                      */}
          {/*                                                                  */}
          {/* < md                                                             */}
          {/*   Main = 100%                                                    */}
          {/*   Section B = 0%                                                 */}
          {/*                                                                  */}
          {/* md - xl                                                          */}
          {/*   Main ~70%                                                      */}
          {/*   Section B ~30%                                                 */}
          {/*                                                                  */}
          {/* xl+                                                              */}
          {/*   PanelLeft 320px                                                */}
          {/*   + Main/Section B                                               */}
          {/* ---------------------------------------------------------------- */}

          <div
            className={`
    min-h-0
    flex-1

    md:h-screen
    md:overflow-hidden

    xl:grid
    xl:transition-[grid-template-columns]
    xl:duration-300
    xl:ease-out

    ${
      isDesktopPanelOpen
        ? "xl:grid-cols-[320px_minmax(0,1fr)]"
        : "xl:grid-cols-[0px_minmax(0,1fr)]"
    }
  `}
          >
            {/* -------------------------------------------------------------- */}
            {/* Desktop left panel                                             */}
            {/* -------------------------------------------------------------- */}

            <div
              className="
                hidden
                min-w-0
                overflow-hidden
                xl:block
                h-screen
             
              "
            >
              <PanelLeft comments={comments} popularBoards={popularBoards} />
            </div>

            {/* -------------------------------------------------------------- */}
            {/* Main + Section B                                               */}
            {/* -------------------------------------------------------------- */}

            <div className="min-w-0">
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                {/* ---------------------------------------------------------- */}
                {/* Main content                                               */}
                {/* ---------------------------------------------------------- */}

                <ResizablePanel
                  defaultSize="70%"
                  minSize="30%"
                  className="
    min-w-0
    min-h-0
    overflow-hidden
    mt-16
  "
                >
                  <section
                    className="
      h-screen
      w-full
      min-w-0
      min-h-0
pb-14

      overflow-y-auto
      overflow-x-hidden

      bg-white
      dark:bg-zinc-900
    "
                  >
                    <div className="min-h-full">
                      {pathname !== "/" && <BreadCrumbs />}

                      {children}
                    </div>
                  </section>
                </ResizablePanel>

                {/* ---------------------------------------------------------- */}
                {/* Resize handle                                              */}
                {/* ---------------------------------------------------------- */}

                <ResizableHandle
                  className="
                    hidden
                    w-0
                    border-gray-50
                    md:flex
                  "
                />

                {/* ---------------------------------------------------------- */}
                {/* Section B                                                  */}
                {/*                                                                  */}
                {/* Mobile: 0%                                                 */}
                {/* md+: 30%                                                   */}
                {/* ---------------------------------------------------------- */}

                <ResizablePanel
                  panelRef={panelBRef}
                  defaultSize="30%"
                  minSize="0%"
                  className="
    h-screen
    min-w-0
    overflow-hidden
z-2

    border-l
    border-gray-100
    bg-white

    dark:border-zinc-800
    dark:bg-zinc-900
  "
                >
                  {/* -------------------------------------------------------- */}
                  {/* Section B content                                        */}
                  {/*                                                          */}
                  {/* hidden on mobile                                         */}
                  {/* -------------------------------------------------------- */}

                  <div
                    className="
      hidden
      h-[calc(100vh-56px)]
      mt-14
      min-h-0
      min-w-0

      flex-col
      gap-3

      overflow-x-hidden
      overflow-y-auto

      bg-white

      md:flex

      dark:bg-zinc-900
    "
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

                    {/* Default Section B */}

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
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Mobile Section B overlay                                         */}
          {/*                                                                  */}
          {/* On mobile Section B itself stays at 0%.                          */}
          {/* Write / Account / Notification uses this full-width overlay.     */}
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
                w-full
                flex-col

                overflow-x-hidden
                overflow-y-auto

                bg-white

                md:hidden

                dark:bg-zinc-900
              "
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
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Footer                                                           */}
          {/* ---------------------------------------------------------------- */}

          <Footer />
        </div>
      </PointBalanceProvider>
    </UserProvider>
  );
}
