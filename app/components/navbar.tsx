"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  BellIcon,
  LogOutIcon,
  User as UserIcon,
  SquarePen,
  TextAlignJustify as MenuButton,
  Settings,
  ShieldCogCorner,
} from "lucide-react";

import { TbUser } from "react-icons/tb";
import { FaBell } from "react-icons/fa6";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { User } from "@/types/user";

import { ModeToggle } from "./mode-toggle";
import { LoginDialog } from "./log-in-dialog";
import SearchInput from "./search-input";

import { handleSignOut } from "../actions/auth";
import { getUnreadNotificationCount } from "../actions/notification";

interface NavbarProps {
  onTogglePanel: () => void;
  onWrite: () => void;
  onAccount: () => void;
  onNotification: () => void;
  onFavotites: () => void;
  user: User | null;
}

interface UserMenuProps {
  onSignOut?: () => Promise<void>;
  onLoginClick?: () => void;
  onWrite: () => void;
  onAccount: () => void;
  onNotification: () => void;
  onFavotites: () => void;
  user: User | null;
}

export function Navbar({
  onTogglePanel,
  onWrite,
  onAccount,
  onNotification,
  onFavotites,
  user,
}: NavbarProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <nav
      className="
        fixed top-0 right-0 left-0 z-30
        flex h-18.5 items-center justify-between
        border-b border-gray-100 bg-white
        dark:border-zinc-800 dark:bg-zinc-900
      "
    >
      {isSearchOpen && (
        <button
          type="button"
          aria-label="Close search"
          className="
            absolute inset-0 z-10
            cursor-default backdrop-blur-[1px]
          "
          onClick={() => setIsSearchOpen(false)}
        />
      )}

      <button
        type="button"
        onClick={onTogglePanel}
        aria-label="Toggle Sidebar"
        className="
          m-2 shrink-0 cursor-pointer
          rounded-md p-2.5 transition md:m-4
        "
      >
        <MenuButton className="h-5 w-5 text-foreground" strokeWidth={1.5} />
      </button>

      <div className="relative z-20 mx-auto max-w-xl flex-1">
        <SearchInput isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
      </div>

      <div className="mx-4 flex shrink-0 items-center">
        <UserMenu
          onSignOut={handleSignOut}
          onLoginClick={() => setIsLoginOpen(true)}
          onWrite={onWrite}
          onAccount={onAccount}
          onNotification={onNotification}
          onFavotites={onFavotites}
          user={user}
        />

        <div className="hidden items-center sm:flex">
          <ModeToggle />
        </div>
      </div>

      <LoginDialog isOpen={isLoginOpen} setIsOpen={setIsLoginOpen} />
    </nav>
  );
}

export default function UserMenu({
  onSignOut,
  onLoginClick,
  onWrite,
  onAccount,
  onNotification,
  user,
}: UserMenuProps) {
  const [isPending, startTransition] = useTransition();
  const [unreadCount, setUnreadCount] = useState(0);

  const router = useRouter();
  const userId = user?.id;

  // All Hooks must run before the logged-out early return.
  useEffect(() => {
    setUnreadCount(0);

    if (!userId) return;

    let cancelled = false;
    let fetching = false;

    async function checkUnread() {
      if (cancelled || fetching) return;

      fetching = true;

      try {
        const count = await getUnreadNotificationCount();

        if (!cancelled) {
          setUnreadCount(count);
        }
      } catch (error) {
        console.error("Failed to load unread notification count:", error);
      } finally {
        fetching = false;
      }
    }

    void checkUnread();

    const intervalId = window.setInterval(() => {
      void checkUnread();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [userId]);

  if (!user) {
    return (
      <Button
        variant="default"
        onClick={onLoginClick}
        aria-label="Log in"
        className="
          -ml-2.75 -mr-2
          flex cursor-pointer items-center
          bg-transparent hover:bg-transparent
        "
      >
        <TbUser
          className="size-6 text-zinc-700 dark:text-zinc-200"
          strokeWidth={1.5}
        />
      </Button>
    );
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || "U";

  function handleSignOutClick() {
    startTransition(async () => {
      await onSignOut?.();
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="
          relative isolate flex cursor-pointer
          items-center gap-2 rounded-full
        "
        aria-label={
          unreadCount > 0
            ? `User menu, ${unreadCount} unread notifications`
            : "User menu"
        }
      >
        {unreadCount > 0 && (
          <FaBell
            aria-hidden="true"
            className="
              absolute top-0 -left-2 size-4.5
              origin-top text-yellow-300
              motion-safe:animate-[bell-ring_1s_linear_infinite]
            "
          />
        )}

        <div className="relative flex items-center gap-2">
          <div className="flex items-center justify-center sm:hidden">
            <Avatar className="h-12 w-12">
              {user.image && (
                <AvatarImage
                  src={user.image}
                  alt={user.name || "User avatar"}
                />
              )}

              <AvatarFallback
                className="
                  bg-zinc-200 text-xs font-semibold
                  dark:bg-zinc-800
                "
              >
                {user.image ? (
                  initials
                ) : (
                  <UserIcon
                    className="
                      h-4 w-4 text-zinc-600
                      dark:text-zinc-300
                    "
                  />
                )}
              </AvatarFallback>
            </Avatar>
          </div>

          <p
            className="
              hidden rounded-full px-2 py-2.75
              text-zinc-900 sm:inline dark:text-zinc-100
            "
          >
            {`Hi, ${user.name || user.email || "User"}`}
          </p>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="z-60 mt-1 w-56 dark:bg-zinc-800"
      >
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={onWrite}
            className="h-11 cursor-pointer text-[15px]"
          >
            <SquarePen className="mr-2 size-4.5" strokeWidth={1.5} />
            Write
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={onNotification}
            className="h-11 cursor-pointer text-[15px]"
          >
            <BellIcon className="mr-2 size-4.5" strokeWidth={1.5} />
            Notifications
            {unreadCount > 0 && (
              <span
                className="
                  ml-auto text-xs tabular-nums
                  text-zinc-500 dark:text-zinc-400
                "
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={onAccount}
            className="h-11 cursor-pointer text-[15px]"
          >
            <Settings className="mr-2 size-4.5" strokeWidth={1.5} />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {/* ModeToggle already renders its own button. */}
        <div className="flex h-11 items-center px-2 text-[15px] sm:hidden">
          <ModeToggle />
          <span>Mode</span>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={(event) => {
            event.preventDefault();
            handleSignOutClick();
          }}
          disabled={isPending}
          className="cursor-pointer text-[15px]"
        >
          <LogOutIcon className="mr-2 size-4.5" strokeWidth={1.5} />

          {isPending ? "Signing out..." : "Sign Out"}
        </DropdownMenuItem>

        {user.role === "ADMIN" && (
          <DropdownMenuItem
            onClick={() => router.push("/admin")}
            className="h-11 cursor-pointer text-[15px]"
          >
            <ShieldCogCorner className="mr-2 size-4.5" strokeWidth={1.5} />
            Admin
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
