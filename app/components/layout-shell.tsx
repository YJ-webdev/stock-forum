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
import { BreadCrumbs } from "./breadcrumbs";
import { SideDataLoading } from "./side-data-loading";
import PanelLeftStream from "./panel-left-stream";
import PanelLeftMobileStream from "./panel-left-mobile-stream";
import { LeaderBoardStream } from "./leader-board-stream";
import { OnboardingCard } from "./onboarding-card";

import { UserProvider } from "../context/user-context";
import { PointBalanceProvider } from "../context/point-balance-context";

import type { User } from "@/types/user";
import type { LayoutSideData } from "../actions/query";
import { Footer } from "./footer";

const FOOTER_PATHS = new Set([
  "/",
  "/help",
  "/feedback",
  "/privacy-terms",
  "/disclaimer",
]);

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
  const showFooter = FOOTER_PATHS.has(pathname);

  const panelBRef = useRef<PanelImperativeHandle>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

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
    const media = window.matchMedia("(min-width: 1024px)");

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey || event.key.toLowerCase() !== "b") return;

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
        )
      ) {
        return;
      }

      event.preventDefault();

      if (window.matchMedia("(min-width: 640px)").matches) {
        setIsDesktopPanelOpen((current) => !current);
        return;
      }

      setActivePanel(null);
      setIsMobilePanelOpen((current) => !current);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function setActivePanel(
    panel: "write" | "account" | "notifications" | "watchlist" | null,
  ) {
    setOnWrite(panel === "write");
    setOnAccount(panel === "account");
    setOnNotification(panel === "notifications");
    setOnFavotites(panel === "watchlist");
  }

  function handleOpenSearch() {
    setIsMobilePanelOpen(false);
    setActivePanel(null);
  }

  function handleToggleLeftPanel() {
    if (window.matchMedia("(min-width: 640px)").matches) {
      setIsDesktopPanelOpen((current) => !current);
      return;
    }

    setActivePanel(null);
    setIsMobilePanelOpen((current) => !current);
  }

  function openPanel(
    panel: "write" | "account" | "notifications" | "watchlist",
  ) {
    if (!user) return;

    setIsMobilePanelOpen(false);
    setActivePanel(panel);

    if (window.matchMedia("(min-width: 1024px)").matches) {
      panelBRef.current?.resize("30%");
    }
  }

  function handleWrite() {
    openPanel("write");
  }

  function handleAccount() {
    openPanel("account");
  }

  function handleNotification() {
    if (!user) return;

    openPanel("notifications");
    setNotificationRefreshKey((current) => current + 1);
  }

  function handleFavotites() {
    openPanel("watchlist");
  }

  const hasActivePanel = onWrite || onAccount || onNotification || onFavotites;

  const mobilePanelOpen = Boolean(user) && hasActivePanel;
  const showLeaderboard = !hasActivePanel;

  function renderActivePanel() {
    if (!user) return null;

    if (onWrite) {
      return <PostEditor userId={user.id} setOnWrite={setOnWrite} />;
    }

    if (onAccount) {
      return <AccountPanel setOnAccount={setOnAccount} />;
    }

    if (onNotification) {
      return (
        <NotificationPanel
          refreshKey={notificationRefreshKey}
          setOnNotification={setOnNotification}
          currentUser={user}
        />
      );
    }

    return null;
  }

  return (
    <UserProvider user={user}>
      <PointBalanceProvider>
        <OnboardingCard />

        <div className="relative box-border flex h-screen min-h-0 flex-col overflow-hidden pt-18 supports-[height:100dvh]:h-dvh">
          <Navbar
            onOpenSearch={handleOpenSearch}
            onTogglePanel={handleToggleLeftPanel}
            onWrite={handleWrite}
            onAccount={handleAccount}
            onNotification={handleNotification}
            onFavotites={handleFavotites}
            user={user}
          />

          {!layoutReady && (
            <div className="fixed inset-x-0 top-18 bottom-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-900">
              <div className="size-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200" />
            </div>
          )}

          <Suspense
            fallback={
              isMobilePanelOpen ? (
                <div className="fixed inset-x-0 top-18 bottom-0 z-40 bg-white sm:hidden dark:bg-zinc-950">
                  <SideDataLoading />
                </div>
              ) : null
            }
          >
            <PanelLeftMobileStream
              sideDataPromise={sideDataPromise}
              isOpen={isMobilePanelOpen}
              setIsOpen={setIsMobilePanelOpen}
              user={user}
            />
          </Suspense>

          <div
            className={`
              min-h-0 min-w-0 flex-1 overflow-hidden
              sm:grid sm:transition-[grid-template-columns]
              sm:duration-300 sm:ease-out
              ${
                isDesktopPanelOpen
                  ? "sm:grid-cols-[320px_minmax(0,1fr)]"
                  : "sm:grid-cols-[0px_minmax(0,1fr)]"
              }
            `}
          >
            <div className="hidden h-full min-h-0 min-w-0 overflow-hidden sm:block">
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
                  <div
                    ref={mainScrollRef}
                    className="
    h-full min-h-0 w-full min-w-0
    overflow-x-hidden overflow-y-auto
    bg-white dark:bg-zinc-900
  "
                  >
                    <div
                      className={`min-h-full ${
                        showFooter ? "flex flex-col" : "pb-14"
                      }`}
                    >
                      {pathname !== "/" && <BreadCrumbs />}
                      {children}
                      {showFooter && <Footer />}
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle className="hidden w-0 border-gray-50 lg:flex" />

                <ResizablePanel
                  panelRef={panelBRef}
                  defaultSize="30%"
                  minSize="0%"
                  className="
                    z-2 min-h-0 min-w-0 overflow-hidden
                    border-l border-gray-100 bg-white
                    dark:border-zinc-800 dark:bg-zinc-900
                  "
                >
                  <div className="hidden h-full min-h-0 min-w-0 flex-col overflow-hidden lg:flex">
                    <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
                      {renderActivePanel()}

                      {showLeaderboard && (
                        <Suspense fallback={<SideDataLoading />}>
                          <LeaderBoardStream
                            sideDataPromise={sideDataPromise}
                            user={user}
                          />
                        </Suspense>
                      )}
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>

          {mobilePanelOpen && (
            <div
              className="
                fixed inset-x-0 top-18 bottom-0 z-40
                flex min-h-0 flex-col overflow-hidden
                bg-white dark:bg-zinc-900
                sm:left-auto sm:w-3/5 sm:shadow-2xl
                lg:hidden
              "
            >
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                {renderActivePanel()}
              </div>
            </div>
          )}
        </div>
      </PointBalanceProvider>
    </UserProvider>
  );
}
