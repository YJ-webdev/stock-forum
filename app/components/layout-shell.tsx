// app/components/layout-shell.tsx
"use client";

import {
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { UserProvider } from "../context/user-context";
import { PointBalanceProvider } from "../context/point-balance-context";

import { getLayoutSideData, type LayoutSideData } from "../actions/query";

import { Navbar } from "./navbar";
import { BreadCrumbs } from "./breadcrumbs";
import { Footer } from "./footer";
import { OAuthFragmentCleanup } from "./oauth-fragment-cleanup";
import { SideDataLoading } from "./side-data-loading";

import type { User } from "@/types/user";
import dynamic from "next/dynamic";

const OnboardingCard = dynamic(
  () => import("./onboarding-card").then((module) => module.OnboardingCard),
  {
    ssr: false,
  },
);

const PanelLeftStream = dynamic(() => import("./panel-left-stream"), {
  ssr: false,
  loading: LeftPanelLoading,
});

const PanelLeftMobileStream = dynamic(
  () => import("./panel-left-mobile-stream"),
  {
    ssr: false,
    loading: MobileLeftLoading,
  },
);

const LeaderBoardStream = dynamic(
  () =>
    import("./leader-board-stream").then((module) => module.LeaderBoardStream),
  {
    ssr: false,
    loading: SideDataLoading,
  },
);

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MEDIUM_SCREEN_QUERY = "(min-width: 640px)";
const LARGE_SCREEN_QUERY = "(min-width: 1024px)";

const FOOTER_PATHS = new Set([
  "/",
  "/help",
  "/feedback",
  "/privacy-terms",
  "/disclaimer",
]);

// -----------------------------------------------------------------------------
// Loading states
// -----------------------------------------------------------------------------

function PanelLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        className="
          size-5 animate-spin rounded-full
          border-2 border-zinc-200 border-t-zinc-700
          dark:border-zinc-700 dark:border-t-zinc-200
        "
      />
    </div>
  );
}

function LeftPanelLoading() {
  return (
    <div className="relative h-full min-h-0 w-full">
      <div className="absolute inset-0 flex items-center justify-center">
        <SideDataLoading />
      </div>
    </div>
  );
}

function MobileLeftLoading() {
  return (
    <div
      className="
        fixed inset-x-0 top-18 bottom-0 z-40
        bg-white sm:hidden dark:bg-zinc-950
      "
    >
      <LeftPanelLoading />
    </div>
  );
}

const AccountPanel = dynamic(
  () => import("./account-panel").then((module) => module.AccountPanel),
  {
    ssr: false,
    loading: PanelLoading,
  },
);

const NotificationPanel = dynamic(
  () =>
    import("./notification-panel").then((module) => module.NotificationPanel),
  {
    ssr: false,
    loading: PanelLoading,
  },
);

const HistoryPanel = dynamic(
  () => import("./history-panel").then((module) => module.HistoryPanel),
  {
    ssr: false,
    loading: PanelLoading,
  },
);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface LayoutShellProps {
  user: User | null;
  children: ReactNode;
}

type ActivePanel = "write" | "account" | "notifications" | "history" | null;

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

interface ContentPanelsProps {
  children: ReactNode;
  sidePanel: ReactNode;
  sideWidth: number;
  onSideWidthChange: (width: number) => void;
}

function ContentPanels({
  children,
  sidePanel,
  sideWidth,
  onSideWidthChange,
}: ContentPanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainPanelId = useId();
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    containerWidth: number;
    startWidth: number;
  } | null>(null);

  function updateWidth(width: number) {
    onSideWidthChange(Math.min(70, Math.max(0, width)));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    const width = container.getBoundingClientRect().width;
    if (width <= 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      containerWidth: width,
      startWidth: sideWidth,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = ((drag.startX - event.clientX) / drag.containerWidth) * 100;
    updateWidth(drag.startWidth + delta);
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 2;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        updateWidth(sideWidth + step);
        break;
      case "ArrowRight":
        event.preventDefault();
        updateWidth(sideWidth - step);
        break;
      case "Home":
        event.preventDefault();
        updateWidth(70);
        break;
      case "End":
        event.preventDefault();
        updateWidth(0);
        break;
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 min-w-0 overflow-hidden"
    >
      <div
        id={mainPanelId}
        className="h-full min-h-0 min-w-0 flex-1 overflow-hidden"
      >
        {children}
      </div>
      <div
        role="separator"
        aria-label="Resize main content"
        aria-controls={mainPanelId}
        aria-orientation="vertical"
        aria-valuemin={30}
        aria-valuemax={100}
        aria-valuenow={Math.round(100 - sideWidth)}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={() => {
          dragRef.current = null;
        }}
        onKeyDown={handleKeyDown}
        onDoubleClick={() => updateWidth(30)}
        className="
          relative z-10 hidden w-0 shrink-0 touch-none
          cursor-col-resize select-none
          before:absolute before:inset-y-0 before:-left-1 before:w-2
          focus-visible:outline-none focus-visible:before:bg-zinc-400/40
          lg:block
        "
      />
      <div
        inert={sideWidth === 0}
        style={{
          width: `${sideWidth}%`,
          borderLeftWidth: sideWidth > 0 ? 1 : 0,
        }}
        className="
    relative z-2 hidden h-full min-h-0 min-w-0
    shrink-0 overflow-hidden
    border-gray-100 bg-white lg:block
    dark:border-zinc-800 dark:bg-zinc-900
  "
      >
        {sidePanel}
      </div>
    </div>
  );
}

export default function LayoutShell({ user, children }: LayoutShellProps) {
  const pathname = usePathname();
  const showFooter = FOOTER_PATHS.has(pathname);

  const [sidePanelWidth, setSidePanelWidth] = useState(30);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const sideDataRequestRef = useRef<Promise<LayoutSideData> | null>(null);

  const [sideDataPromise, setSideDataPromise] =
    useState<Promise<LayoutSideData> | null>(null);

  const [isMediumScreen, setIsMediumScreen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const [onAccount, setOnAccount] = useState(false);
  const [onNotification, setOnNotification] = useState(false);
  const [onHistory, setOnHistory] = useState(false);

  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const needsOnboarding =
    !!user && (user.nationality == null || user.nationality === "");

  const hasActivePanel = onAccount || onNotification || onHistory;
  const showLeaderboard = !hasActivePanel || user === null;

  const showDesktopLeftPanel = isMediumScreen && isDesktopPanelOpen;
  const showMobileLeftPanel = !isMediumScreen && isMobilePanelOpen;

  const showMobileActivePanel =
    !isLargeScreen && Boolean(user) && hasActivePanel;

  const needsSideData =
    showDesktopLeftPanel ||
    showMobileLeftPanel ||
    (isLargeScreen && showLeaderboard);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    mainScrollRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname]);

  useEffect(() => {
    const mediumMedia = window.matchMedia(MEDIUM_SCREEN_QUERY);
    const largeMedia = window.matchMedia(LARGE_SCREEN_QUERY);

    function updateMediumScreen() {
      setIsMediumScreen(mediumMedia.matches);
    }

    function updateLargeScreen() {
      setIsLargeScreen(largeMedia.matches);
    }

    updateMediumScreen();
    updateLargeScreen();

    mediumMedia.addEventListener("change", updateMediumScreen);
    largeMedia.addEventListener("change", updateLargeScreen);

    return () => {
      mediumMedia.removeEventListener("change", updateMediumScreen);
      largeMedia.removeEventListener("change", updateLargeScreen);
    };
  }, []);

  useEffect(() => {
    if (!needsSideData) return;

    let request = sideDataRequestRef.current;

    if (!request) {
      request = getLayoutSideData();
      sideDataRequestRef.current = request;
    }

    setSideDataPromise(request);
  }, [needsSideData]);

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

      if (window.matchMedia(MEDIUM_SCREEN_QUERY).matches) {
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

  // ---------------------------------------------------------------------------
  // Panel actions
  // ---------------------------------------------------------------------------

  function setActivePanel(panel: ActivePanel) {
    setOnAccount(panel === "account");
    setOnNotification(panel === "notifications");
    setOnHistory(panel === "history");
  }

  function handleOpenSearch() {
    setIsMobilePanelOpen(false);
    setActivePanel(null);
  }

  function handleToggleLeftPanel() {
    if (window.matchMedia(MEDIUM_SCREEN_QUERY).matches) {
      setIsDesktopPanelOpen((current) => !current);
      return;
    }

    setActivePanel(null);
    setIsMobilePanelOpen((current) => !current);
  }

  function openPanel(panel: Exclude<ActivePanel, null>) {
    if (!user) return;

    setIsMobilePanelOpen(false);
    setActivePanel(panel);

    if (window.matchMedia(LARGE_SCREEN_QUERY).matches) {
      setSidePanelWidth(30);
    }
  }

  function handleAccount() {
    openPanel("account");
  }

  function handleNotification() {
    if (!user) return;

    openPanel("notifications");
    setNotificationRefreshKey((current) => current + 1);
  }

  function handleHistory() {
    if (!user) return;

    openPanel("history");
    setHistoryRefreshKey((current) => current + 1);
  }

  function closeMobileActivePanel() {
    if (window.matchMedia(LARGE_SCREEN_QUERY).matches) return;

    setActivePanel(null);
  }

  // ---------------------------------------------------------------------------
  // Panel content
  // ---------------------------------------------------------------------------

  function renderActivePanel() {
    if (!user) return null;

    if (onAccount) {
      return (
        <AccountPanel
          setOnAccount={setOnAccount}
          onNavigate={closeMobileActivePanel}
        />
      );
    }

    if (onNotification) {
      return (
        <NotificationPanel
          refreshKey={notificationRefreshKey}
          setOnNotification={setOnNotification}
          currentUser={user}
          onNavigate={closeMobileActivePanel}
        />
      );
    }

    if (onHistory) {
      return (
        <HistoryPanel
          refreshKey={historyRefreshKey}
          setOnHistory={setOnHistory}
          currentUser={user}
          onNavigate={closeMobileActivePanel}
        />
      );
    }

    return null;
  }

  const mainContent = (
    <div
      ref={mainScrollRef}
      data-main-scroll
      className="
      h-full min-h-0 w-full min-w-0
      overflow-x-hidden overflow-y-auto
      bg-white dark:bg-zinc-900
    "
    >
      <div className={`min-h-full ${showFooter ? "flex flex-col" : "pb-14"}`}>
        {pathname !== "/" && <BreadCrumbs />}
        {children}
        {showFooter && <Footer />}
      </div>
    </div>
  );

  return (
    <UserProvider user={user}>
      <PointBalanceProvider>
        <OAuthFragmentCleanup />

        {needsOnboarding && <OnboardingCard />}

        <div
          className="
            relative box-border flex h-screen min-h-0
            flex-col overflow-hidden pt-18
            supports-[height:100dvh]:h-dvh
          "
        >
          <Navbar
            onOpenSearch={handleOpenSearch}
            onTogglePanel={handleToggleLeftPanel}
            onAccount={handleAccount}
            onNotification={handleNotification}
            onHistory={handleHistory}
            user={user}
          />

          {/* Mobile left panel */}
          {showMobileLeftPanel && (
            <Suspense fallback={<MobileLeftLoading />}>
              {sideDataPromise ? (
                <PanelLeftMobileStream
                  sideDataPromise={sideDataPromise}
                  isOpen={isMobilePanelOpen}
                  setIsOpen={setIsMobilePanelOpen}
                  user={user}
                />
              ) : (
                <MobileLeftLoading />
              )}
            </Suspense>
          )}

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
            {/* Desktop left panel */}
            <div
              className="
    hidden h-full min-h-0 min-w-0
    overflow-hidden sm:block
  "
            >
              {showDesktopLeftPanel && (
                <Suspense fallback={<LeftPanelLoading />}>
                  {sideDataPromise ? (
                    <PanelLeftStream sideDataPromise={sideDataPromise} />
                  ) : (
                    <LeftPanelLoading />
                  )}
                </Suspense>
              )}
            </div>

            {/* The main content stays mounted across screen sizes. */}
            <div className="h-full min-h-0 min-w-0 overflow-hidden">
              <ContentPanels
                sideWidth={sidePanelWidth}
                onSideWidthChange={setSidePanelWidth}
                sidePanel={
                  isLargeScreen ? (
                    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                      <div
                        className={`min-h-0 min-w-0 ${
                          showLeaderboard
                            ? "flex h-[45%] shrink-0 flex-col overflow-hidden"
                            : "flex-1 overflow-x-hidden overflow-y-auto"
                        }`}
                      >
                        {renderActivePanel()}
                        {showLeaderboard && (
                          <Suspense fallback={<SideDataLoading />}>
                            {sideDataPromise ? (
                              <LeaderBoardStream
                                sideDataPromise={sideDataPromise}
                                user={user}
                              />
                            ) : (
                              <SideDataLoading />
                            )}
                          </Suspense>
                        )}
                      </div>
                    </div>
                  ) : null
                }
              >
                {mainContent}
              </ContentPanels>
            </div>
          </div>

          {/* Mobile/tablet active panel */}
          {showMobileActivePanel && (
            <div
              className="
                fixed inset-x-0 top-18 bottom-0 z-40
                flex min-h-0 flex-col overflow-hidden
                bg-white dark:bg-zinc-900
                sm:left-auto sm:w-3/5 sm:shadow-2xl
                lg:hidden
              "
              onClick={(event) => {
                if (
                  event.defaultPrevented ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }

                const target = event.target;

                if (!(target instanceof Element)) return;

                const link = target.closest<HTMLAnchorElement>("a[href]");

                if (
                  !link ||
                  !event.currentTarget.contains(link) ||
                  link.hasAttribute("download") ||
                  (link.target && link.target !== "_self")
                ) {
                  return;
                }

                closeMobileActivePanel();
              }}
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
