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
import { OnboardingCard } from "./onboarding-card";
import { WatchlistPanel } from "./watchlist-panel";

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
  const [onFavotites, setOnFavotites] = useState(false);

  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);

  const pathname = usePathname();

  const panelBRef = useRef<PanelImperativeHandle>(null);

  const mainScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainScrollRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname]);

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

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");

    const updateSectionB = () => {
      panelBRef.current?.resize(media.matches ? "30%" : "0%");
    };

    updateSectionB();

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

  const resetPanelB = () => {
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
    setOnFavotites(false);
  };

  const handleAccount = () => {
    setIsMobilePanelOpen(false);

    resetPanelB();

    setOnWrite(false);
    setOnAccount(true);
    setOnNotification(false);
    setOnFavotites(false);
  };

  const handleNotification = () => {
    setIsMobilePanelOpen(false);

    resetPanelB();

    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(true);
    setOnFavotites(false);

    setNotificationRefreshKey((prev) => prev + 1);
  };

  const handleFavotites = () => {
    setIsMobilePanelOpen(false);

    resetPanelB();

    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(false);
    setOnFavotites(true);
  };

  const mobilePanelOpen = !!user && (onWrite || onAccount || onNotification);

  return (
    <UserProvider user={user}>
      <PointBalanceProvider>
        <OnboardingCard />
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
          <Navbar
            onTogglePanel={handleToggleLeftPanel}
            onWrite={handleWrite}
            onAccount={handleAccount}
            onNotification={handleNotification}
            onFavotites={handleFavotites}
          />

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

            <div className="min-w-0 overflow-hidden">
              <ResizablePanelGroup orientation="horizontal" className="h-full">
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
                  <div
                    className="
                      mt-18
                      hidden
                      h-[calc(100vh-72px)]
                      min-h-0
                      min-w-0

                      flex-col
                    

                      overflow-x-hidden
                      overflow-y-auto

                      bg-white

                      md:flex

                      dark:bg-zinc-900
                    "
                  >
                    {user && onWrite && <PostEditor setOnWrite={setOnWrite} />}

                    {user && onAccount && !onWrite && (
                      <AccountPanel setOnAccount={setOnAccount} />
                    )}

                    {user && onNotification && (
                      <NotificationPanel
                        refreshKey={notificationRefreshKey}
                        setOnNotification={setOnNotification}
                      />
                    )}
                    {user && onFavotites && (
                      <WatchlistPanel setOnFavotites={setOnFavotites} />
                    )}

                    {!onWrite &&
                      !onAccount &&
                      !onNotification &&
                      !onFavotites && (
                        <Suspense fallback={<SideDataLoading />}>
                          <LeaderBoardStream
                            sideDataPromise={sideDataPromise}
                          />
                        </Suspense>
                      )}
                    <Footer />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>

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
              {user && onWrite && <PostEditor setOnWrite={setOnWrite} />}

              {user && onAccount && (
                <AccountPanel setOnAccount={setOnAccount} />
              )}

              {user && onNotification && (
                <NotificationPanel
                  refreshKey={notificationRefreshKey}
                  setOnNotification={setOnNotification}
                />
              )}

              {user && onFavotites && (
                <WatchlistPanel setOnFavotites={setOnFavotites} />
              )}

              <Footer />
            </div>
          )}
        </div>
      </PointBalanceProvider>
    </UserProvider>
  );
}
