// app/components/layout-shell.tsx
"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { PanelImperativeHandle } from "react-resizable-panels";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { BreadCrumbs } from "./breadcrumbs";
import { SideDataLoading } from "./side-data-loading";
import PanelLeftStream from "./panel-left-stream";
import PanelLeftMobileStream from "./panel-left-mobile-stream";
import { LeaderBoardStream } from "./leader-board-stream";
import { OnboardingCard } from "./onboarding-card";
import { WatchlistPanel } from "./watchlist-panel";

import { UserProvider } from "../context/user-context";
import { PointBalanceProvider } from "../context/point-balance-context";

import type { User } from "@/types/user";
import type { LayoutSideData } from "../actions/query";

const PanelLoading = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="size-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200" />
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
  children: ReactNode;
  sideDataPromise: Promise<LayoutSideData>;
}

export default function LayoutShell({
  user,
  children,
  sideDataPromise,
}: LayoutShellProps) {
  const pathname = usePathname();

  const panelBRef = useRef<PanelImperativeHandle>(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  const [layoutReady, setLayoutReady] = useState(false);

  const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const [onWrite, setOnWrite] = useState(false);
  const [onAccount, setOnAccount] = useState(false);
  const [onNotification, setOnNotification] = useState(false);
  const [onFavotites, setOnFavotites] = useState(false);

  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);

  useEffect(() => {
    mainScrollRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");

    function updateSectionB() {
      panelBRef.current?.resize(media.matches ? "30%" : "0%");
    }

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
      cancelAnimationFrame(frame2);
      media.removeEventListener("change", updateSectionB);
    };
  }, []);

  function handleToggleLeftPanel() {
    if (window.innerWidth >= 1280) {
      setIsDesktopPanelOpen((current) => !current);
      return;
    }

    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(false);
    setOnFavotites(false);

    setIsMobilePanelOpen((current) => !current);
  }

  function resetPanelB() {
    setIsMobilePanelOpen(false);

    if (window.innerWidth >= 768) {
      panelBRef.current?.resize("30%");
    }
  }

  function handleWrite() {
    resetPanelB();

    setOnWrite(true);
    setOnAccount(false);
    setOnNotification(false);
    setOnFavotites(false);
  }

  function handleAccount() {
    resetPanelB();

    setOnWrite(false);
    setOnAccount(true);
    setOnNotification(false);
    setOnFavotites(false);
  }

  function handleNotification() {
    resetPanelB();

    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(true);
    setOnFavotites(false);

    setNotificationRefreshKey((current) => current + 1);
  }

  function handleFavotites() {
    resetPanelB();

    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(false);
    setOnFavotites(true);
  }

  const mobilePanelOpen =
    Boolean(user) && (onWrite || onAccount || onNotification || onFavotites);

  const showLeaderboard =
    !onWrite && !onAccount && !onNotification && !onFavotites;

  return (
    <UserProvider user={user}>
      <PointBalanceProvider>
        <OnboardingCard />

        {/* Fixed navbar 높이 72px을 여기서 한 번만 확보 */}
        <div className="relative box-border flex h-screen min-h-0 flex-col overflow-hidden pt-18 supports-[height:100dvh]:h-dvh">
          <Navbar
            onTogglePanel={handleToggleLeftPanel}
            onWrite={handleWrite}
            onAccount={handleAccount}
            onNotification={handleNotification}
            onFavotites={handleFavotites}
          />

          {!layoutReady && (
            <div className="fixed inset-x-0 bottom-0 top-18 z-50 flex items-center justify-center bg-white dark:bg-zinc-900">
              <div className="size-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200" />
            </div>
          )}

          <Suspense
            fallback={
              isMobilePanelOpen ? (
                <div className="fixed inset-x-0 bottom-0 top-18 z-40 bg-white dark:bg-zinc-950">
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

          {/* Navbar 아래의 남은 높이를 모든 패널이 공유 */}
          <div
            className={`min-h-0 min-w-0 flex-1 overflow-hidden xl:grid xl:transition-[grid-template-columns] xl:duration-300 xl:ease-out ${
              isDesktopPanelOpen
                ? "xl:grid-cols-[320px_minmax(0,1fr)]"
                : "xl:grid-cols-[0px_minmax(0,1fr)]"
            }`}
          >
            {/* Desktop PanelLeft: 기존 grid 토글 유지 */}
            <div className="hidden h-full min-h-0 min-w-0 overflow-hidden xl:block">
              <Suspense fallback={<SideDataLoading />}>
                <PanelLeftStream sideDataPromise={sideDataPromise} />
              </Suspense>
            </div>

            <div className="h-full min-h-0 min-w-0 overflow-hidden">
              <ResizablePanelGroup
                orientation="horizontal"
                className="h-full min-h-0"
              >
                <ResizablePanel
                  defaultSize="70%"
                  minSize="30%"
                  className="min-h-0 min-w-0 overflow-hidden"
                >
                  <section
                    ref={mainScrollRef}
                    className="h-full min-h-0 w-full min-w-0 overflow-x-hidden overflow-y-auto bg-white pb-14 dark:bg-zinc-900"
                  >
                    <div className="min-h-full">
                      {pathname !== "/" && <BreadCrumbs />}
                      {children}
                    </div>
                  </section>
                </ResizablePanel>

                <ResizableHandle className="hidden w-0 border-gray-50 md:flex" />

                <ResizablePanel
                  panelRef={panelBRef}
                  defaultSize="30%"
                  minSize="0%"
                  className="z-2 min-h-0 min-w-0 overflow-hidden border-l border-gray-100 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="hidden h-full min-h-0 min-w-0 flex-col overflow-hidden md:flex">
                    {/* 오른쪽 콘텐츠만 스크롤 */}
                    <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
                      {user && onWrite && (
                        <PostEditor setOnWrite={setOnWrite} />
                      )}

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

                      {showLeaderboard && (
                        <Suspense fallback={<SideDataLoading />}>
                          <LeaderBoardStream
                            sideDataPromise={sideDataPromise}
                          />
                        </Suspense>
                      )}
                    </div>

                    {/* Footer는 스크롤 영역 밖 */}
                    <Footer />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>

          {mobilePanelOpen && (
            <div className="fixed inset-x-0 bottom-0 top-18 z-40 flex min-h-0 flex-col overflow-hidden bg-white md:hidden dark:bg-zinc-900">
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
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
              </div>

              <Footer />
            </div>
          )}
        </div>
      </PointBalanceProvider>
    </UserProvider>
  );
}
