"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "./header";
import PanelLeft from "./panel-left";
import { NewsItem } from "@/types";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Footer } from "./footer";
import { PostEditor } from "@/components/post-editor";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { usePathname } from "next/navigation";
import { SectionBContext } from "../context/section-b-context";
import { UserProvider } from "../context/user-context";
import { AccountPanel } from "./account-panel";
import { NotificationPanel } from "./notification-panel";
import { BreadCrumbs } from "./breadcrumbs";
import { User } from "@/types/user";
import { TopTraders } from "./top-trader";
import { getMostLikedComments, MostLikedComment } from "../actions/post";
import { PopularBoard } from "../actions/query";
import { PointBalanceProvider } from "../context/point-balance-context";

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
  const sectionBRef = useRef<HTMLDivElement>(null);

  const [sectionBPosition, setSectionBPosition] = useState({
    left: 0,
    width: 0,
  });

  const [mostLikedComments, setMostLikedComments] =
    useState<MostLikedComment[]>(comments);

  const panelBRef = useRef<PanelImperativeHandle>(null);
  const resetPanelB = () => {
    panelBRef.current?.resize("30%");
  };
  const pathname = usePathname();
  const isMarketPage = pathname === "/market";

  const handleWrite = () => {
    resetPanelB();

    setOnWrite(true);
    setOnAccount(false);
    setOnNotification(false);
  };

  const handleAccount = () => {
    resetPanelB();

    setOnWrite(false);
    setOnAccount(true);
    setOnNotification(false);
  };

  const handleNotification = () => {
    resetPanelB();

    setOnWrite(false);
    setOnAccount(false);
    setOnNotification(true);
  };

  const handleCommentCreated = async () => {
    const updatedComments = await getMostLikedComments();

    setMostLikedComments(updatedComments);
  };

  useEffect(() => {
    setMostLikedComments(comments);
  }, [comments]);

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
  }, [setIsOpen]);

  // Keyboard shortcuts: Ctrl+B / Cmd+B to toggle, Esc to close

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        return;
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
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

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
    <SectionBContext.Provider
      value={{
        showWrite: handleWrite,
        showAccount: handleAccount,
        showNotification: handleNotification,
      }}
    >
      <UserProvider user={user}>
        <PointBalanceProvider>
          <div className="relative flex flex-col min-h-screen">
            <Header
              user={user}
              onTogglePanel={() => setIsOpen((prev) => !prev)}
              onWrite={handleWrite}
              onAccount={handleAccount}
              onNotification={handleNotification}
            />
            <PanelLeft
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              news={news}
              comments={mostLikedComments}
              popularBoards={popularBoards}
            />
            <div
              className={`pt-14 flex flex-col md:flex-row transition-all duration-300 ease-in-out ${
                isOpen
                  ? "xl:ml-80 xl:w-[calc(100%-320px)] w-full ml-0"
                  : "ml-0 w-full"
              }`}
            >
              <ResizablePanelGroup orientation="horizontal" className="">
                <ResizablePanel>
                  <section className="w-full flex flex-col min-w-0 bg-white dark:bg-zinc-900">
                    <div className="flex-1">
                      {pathname !== "/" && <BreadCrumbs />}
                      {children}
                    </div>
                  </section>
                </ResizablePanel>
                <ResizableHandle className="border-gray-50 w-0" />
                <ResizablePanel
                  panelRef={panelBRef}
                  defaultSize="30%"
                  minSize="1P%"
                  className="z-20 
    bg-white dark:bg-zinc-900
    border-l border-gray-100 dark:border-zinc-800
  "
                >
                  {/* This stays inside ResizablePanel and tracks its actual width */}
                  <div ref={sectionBRef} className="w-full min-w-0">
                    <div
                      className="
        fixed
        top-14
        bottom-0
        min-w-0
        overflow-x-hidden
        overflow-y-auto
        
        flex flex-col gap-3
        bg-white dark:bg-zinc-900
      "
                      style={{
                        left: sectionBPosition.left,
                        width: sectionBPosition.width,
                      }}
                    >
                      {user && onWrite && (
                        <PostEditor
                          isLoggedIn={!!user}
                          nationality={user?.nationality ?? null}
                          setOnWrite={setOnWrite}
                          onCommentCreated={handleCommentCreated}
                        />
                      )}
                      {user && onAccount && !onWrite && (
                        <AccountPanel user={user} setOnAccount={setOnAccount} />
                      )}
                      {user && onNotification && <NotificationPanel />}
                      {!onWrite && !onAccount && !onNotification && (
                        <>
                          <div className="mx-4 mt-8">
                            <p className="text-muted-foreground/50 text-xs text-light tracking-wider truncate">
                              Top traders
                            </p>
                          </div>
                          <TopTraders />
                          <div className="text-zinc-300 dark:text-zinc-700 font-light mx-4 border border-zinc-100 dark:border-zinc-800 rounded-lg p-2 h-80">
                            {" "}
                            advertisement
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>{" "}
            </div>{" "}
            <Footer />
          </div>
        </PointBalanceProvider>
      </UserProvider>
    </SectionBContext.Provider>
  );
}
