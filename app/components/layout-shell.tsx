"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import type { PanelImperativeHandle } from "react-resizable-panels";

import { Navbar } from "./navbar";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { Footer } from "./footer";
import { BreadCrumbs } from "./breadcrumbs";

import { UserProvider } from "../context/user-context";
import { PointBalanceProvider } from "../context/point-balance-context";

import type { User } from "@/types/user";
import { LayoutSideData } from "../actions/query";
import { SideDataLoading } from "./side-data-loading";
import PanelLeftStream from "./panel-left-stream";
import { LeaderBoardStream } from "./leader-board-stream";
import PanelLeftMobileStream from "./panel-left-mobile-stream";

const PanelLoading = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div
      className="
        size-5
        animate-spin
        rounded-full
        border-2
        border-zinc-200
        border-t-zinc-700
        dark:border-zinc-700
        dark:border-t-zinc-200
      "
    />
  </div>
);

const PostEditor = dynamic(
  () => import("@/components/post-editor").then((mod) => mod.PostEditor),
  {
    ssr: false,
    loading: PanelLoading,
  },
);

const AccountPanel = dynamic(
  () => import("./account-panel").then((mod) => mod.AccountPanel),
  {
    ssr: false,
    loading: PanelLoading,
  },
);

const NotificationPanel = dynamic(
  () => import("./notification-panel").then((mod) => mod.NotificationPanel),
  {
    ssr: false,
    loading: PanelLoading,
  },
);

interface LayoutShellProps {
  user: User | null;
  children: React.ReactNode;
  sideDataPromise: Promise<LayoutSideData>;
}

export default function LayoutShell({
  user,
  children,
  sideDataPromise,
}: LayoutShellProps) {
  const [layoutReady, setLayoutReady] = useState(false);

  const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const [onWrite, setOnWrite] = useState(false);
  const [onAccount, setOnAccount] = useState(false);
  const [onNotification, setOnNotification] = useState(false);

  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);

  const pathname = usePathname();

  const panelBRef = useRef<PanelImperativeHandle>(null);

  // Main content has its own scroll container.
  const mainScrollRef = useRef<HTMLElement>(null);

  // ---------------------------------------------------------------------------
  // Reset main scroll on page navigation
  //
  // Important:
  // Only Section A is reset.
  //
  // Panel Left and Section B keep their own independent scroll positions.
  //
  // Query-only navigation such as:
  //   ?comment=...
  //   ?reply=...
  //
  // does NOT trigger this because pathname does not change.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    mainScrollRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname]);

  // ---------------------------------------------------------------------------
  // Left panel
  // ---------------------------------------------------------------------------

  const handleToggleLeftPanel = () => {
    if (window.innerWidth >= 1280) {
      setIsDesktopPanelOpen((prev) => !prev);
      return;
    }

    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(false);

    setIsMobilePanelOpen((prev) => !prev);
  };

  // ---------------------------------------------------------------------------
  // Section B responsive size
  //
  // Mobile:
  //   Main = 100%
  //   Section B = 0%
  //
  // Tablet / Desktop:
  //   Main = 70%
  //   Section B = 30%
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");

    const updateSectionB = () => {
      panelBRef.current?.resize(media.matches ? "30%" : "0%");
    };

    // Apply correct panel size first.
    updateSectionB();

    // Wait until react-resizable-panels has applied
    // the initial layout before revealing the page.
    let frame2 = 0;

    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        setLayoutReady(true);
      });
    });

    media.addEventListener("change", updateSectionB);

    return () => {
      cancelAnimationFrame(frame1);

      if (frame2) {
        cancelAnimationFrame(frame2);
      }

      media.removeEventListener("change", updateSectionB);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Section B helpers
  // ---------------------------------------------------------------------------

  const resetPanelB = () => {
    // Mobile uses the full-width overlay.
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
            onTogglePanel={handleToggleLeftPanel}
            onWrite={handleWrite}
            onAccount={handleAccount}
            onNotification={handleNotification}
          />

          {/* ---------------------------------------------------------------- */}
          {/* Initial layout loading                                           */}
          {/*                                                                  */}
          {/* Navbar remains visible immediately.                             */}
          {/* Everything below the 72px navbar is covered while the           */}
          {/* resizable layout is being initialized.                          */}
          {/* ---------------------------------------------------------------- */}

          {!layoutReady && (
            <div
              className="
                fixed
                top-18
                right-0
                bottom-0
                left-0
                z-50

                flex
                items-center
                justify-center

                bg-white
                dark:bg-zinc-900
              "
            >
              <div
                className="
                  size-6
                  animate-spin
                  rounded-full
                  border-2
                  border-zinc-200
                  border-t-zinc-700

                  dark:border-zinc-700
                  dark:border-t-zinc-200
                "
              />
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Mobile / tablet left drawer                                     */}
          {/* ---------------------------------------------------------------- */}

          <Suspense
            fallback={
              isMobilePanelOpen ? (
                <div
                  className="
                    fixed
                    top-18
                    right-0
                    bottom-0
                    left-0
                    z-40
                    bg-white
                    dark:bg-zinc-950
                  "
                >
                  <SideDataLoading />
                </div>
              ) : null
            }
          >
            <PanelLeftMobileStream
              sideDataPromise={sideDataPromise}
              isOpen={isMobilePanelOpen}
              setIsOpen={setIsMobilePanelOpen}
            />
          </Suspense>

          {/* ---------------------------------------------------------------- */}
          {/* Page layout                                                     */}
          {/*                                                                  */}
          {/* < md                                                            */}
          {/*   Main = 100%                                                   */}
          {/*   Section B = 0%                                                */}
          {/*                                                                  */}
          {/* md - xl                                                         */}
          {/*   Main ~70%                                                     */}
          {/*   Section B ~30%                                                */}
          {/*                                                                  */}
          {/* xl+                                                             */}
          {/*   PanelLeft 320px                                               */}
          {/*   + Main / Section B                                            */}
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
                mt-18
                hidden
                h-[calc(100vh-72px)]
                min-h-0
                min-w-0
                overflow-hidden
                xl:block
              "
            >
              <Suspense fallback={<SideDataLoading />}>
                <PanelLeftStream sideDataPromise={sideDataPromise} />
              </Suspense>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* Main + Section B                                               */}
            {/* -------------------------------------------------------------- */}

            <div className="min-w-0 overflow-hidden">
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                {/* ---------------------------------------------------------- */}
                {/* Main content / Section A                                   */}
                {/* ---------------------------------------------------------- */}

                <ResizablePanel
                  defaultSize="70%"
                  minSize="30%"
                  className="
                    mt-18
                    min-h-0
                    min-w-0
                    overflow-hidden
                  "
                >
                  <section
                    ref={mainScrollRef}
                    className="
                      h-[calc(100vh-72px)]
                      w-full
                      min-h-0
                      min-w-0

                      overflow-x-hidden
                      overflow-y-auto

                      bg-white
                      pb-14

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
                {/*                                                            */}
                {/* Mobile: 0%                                                 */}
                {/* md+: 30%                                                   */}
                {/* ---------------------------------------------------------- */}

                <ResizablePanel
                  panelRef={panelBRef}
                  defaultSize="30%"
                  minSize="0%"
                  className="
                    z-2
                    h-screen
                    min-w-0
                    overflow-hidden

                    border-l
                    border-gray-100
                    bg-white

                    dark:border-zinc-800
                    dark:bg-zinc-900
                  "
                >
                  {/* -------------------------------------------------------- */}
                  {/* Desktop / tablet Section B                               */}
                  {/* -------------------------------------------------------- */}

                  <div
                    className="
                      mt-18
                      hidden
                      h-[calc(100vh-72px)]
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
                      <AccountPanel setOnAccount={setOnAccount} />
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
                      <Suspense fallback={<SideDataLoading />}>
                        <LeaderBoardStream sideDataPromise={sideDataPromise} />
                      </Suspense>
                    )}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Mobile Section B overlay                                         */}
          {/*                                                                  */}
          {/* Mobile uses its own full-width panel instead of ResizablePanel.  */}
          {/* ---------------------------------------------------------------- */}

          {mobilePanelOpen && (
            <div
              className="
                fixed
                top-18
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
                <AccountPanel setOnAccount={setOnAccount} />
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
