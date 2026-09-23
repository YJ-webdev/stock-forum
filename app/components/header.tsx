"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ModeToggle } from "./mode-toggle";
import { LoginDialog } from "./log-in-dialog";
import { handleSignOut } from "../actions/auth";
import { hasUnreadNotifications } from "../actions/notification";
import SearchInput from "./search-input";

import {
  BadgeCheckIcon,
  Bell,
  BellIcon,
  LogOutIcon,
  User as UserIcon,
  Sun,
  SquarePen,
  TextAlignJustify as MenuButton,
} from "lucide-react";

import { TbUser } from "react-icons/tb";
import { BsMoon } from "react-icons/bs";

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

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface HeaderProps {
  user?: User | null;

  onTogglePanel: () => void;
  onWrite: () => void;
  onAccount: () => void;
  onNotification: () => void;
}

interface UserMenuProps {
  user?: User | null;

  onSignOut?: () => Promise<void>;
  onLoginClick?: () => void;

  onWrite: () => void;
  onAccount: () => void;
  onNotification: () => void;
}

// -----------------------------------------------------------------------------
// HEADER
// -----------------------------------------------------------------------------

export function Header({
  user,
  onTogglePanel,
  onWrite,
  onAccount,
  onNotification,
}: HeaderProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <header
      className="
        fixed top-0 right-0 left-0 z-50
        flex h-18.5 items-center justify-between
        border-b border-gray-100
        bg-white
        dark:border-zinc-800 dark:bg-zinc-900
      "
    >
      {/* Left: Sidebar Toggle */}
      <button
        onClick={onTogglePanel}
        type="button"
        className="
          m-2 shrink-0 cursor-pointer
          rounded-md p-2.5
          transition
          md:m-4
        "
        aria-label="Toggle Sidebar"
      >
        <MenuButton className="h-5 w-5 text-foreground" strokeWidth={1.5} />
      </button>

      {/* Center: Search */}
      <div className="mx-auto max-w-xl flex-1">
        <SearchInput />
      </div>

      {/* Right */}
      <div className="mx-4 flex shrink-0 items-center">
        <UserMenu
          user={user}
          onSignOut={handleSignOut}
          onLoginClick={() => setIsLoginOpen(true)}
          onWrite={onWrite}
          onAccount={onAccount}
          onNotification={onNotification}
        />

        <div className="hidden items-center sm:flex">
          <ModeToggle />
        </div>
      </div>

      <LoginDialog isOpen={isLoginOpen} setIsOpen={setIsLoginOpen} />
    </header>
  );
}

// -----------------------------------------------------------------------------
// USER MENU
// -----------------------------------------------------------------------------

export default function UserMenu({
  user,
  onSignOut,
  onLoginClick,
  onWrite,
  onAccount,
  onNotification,
}: UserMenuProps) {
  const [isPending, startTransition] = useTransition();
  const [hasUnread, setHasUnread] = useState(false);

  const { setTheme, theme } = useTheme();
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // CHECK UNREAD NOTIFICATIONS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!user) {
      setHasUnread(false);
      return;
    }

    let cancelled = false;

    async function checkUnread() {
      try {
        const unread = await hasUnreadNotifications();

        if (!cancelled) {
          setHasUnread(unread);
        }
      } catch (error) {
        console.error("Failed to check unread notifications:", error);
      }
    }

    // Check immediately
    void checkUnread();

    // Check every 30 seconds
    const interval = window.setInterval(() => {
      void checkUnread();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  // ---------------------------------------------------------------------------
  // NOT LOGGED IN
  // ---------------------------------------------------------------------------

  if (!user) {
    return (
      <Button
        variant="default"
        onClick={onLoginClick}
        className="
          -ml-2.75 -mr-2
          flex cursor-pointer items-center
          bg-transparent
          hover:bg-transparent
        "
      >
        <TbUser
          className="size-6 text-zinc-700 dark:text-zinc-200"
          strokeWidth={1.5}
        />
      </Button>
    );
  }

  // ---------------------------------------------------------------------------
  // USER INITIALS
  // ---------------------------------------------------------------------------

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || "U";

  // ---------------------------------------------------------------------------
  // SIGN OUT
  // ---------------------------------------------------------------------------

  const handleSignOutClick = () => {
    startTransition(async () => {
      await onSignOut?.();
      router.refresh();
    });
  };

  // ---------------------------------------------------------------------------
  // THEME
  // ---------------------------------------------------------------------------

  const toggleTheme = (e: React.MouseEvent) => {
    e.preventDefault();

    setTheme(theme === "dark" ? "light" : "dark");
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="
            flex cursor-pointer items-center gap-2
            rounded-full
            transition
            hover:bg-zinc-100
            dark:hover:bg-zinc-800
          "
          aria-label="User menu"
        >
          <div className="flex items-center gap-2">
            {/* ---------------------------------------------------------------
                SMALL SCREEN AVATAR
            ---------------------------------------------------------------- */}

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
                    bg-zinc-200
                    text-xs font-semibold
                    dark:bg-zinc-800
                  "
                >
                  {user.image ? (
                    initials
                  ) : (
                    <UserIcon
                      className="
                        h-4 w-4
                        text-zinc-600
                        dark:text-zinc-300
                      "
                    />
                  )}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* ---------------------------------------------------------------
                DESKTOP GREETING
            ---------------------------------------------------------------- */}

            <p
              className="
                relative hidden
                rounded-full
                px-2 py-2.75
                transition-all
                hover:bg-white
                sm:inline
                dark:text-zinc-100
                dark:hover:bg-zinc-900
              "
            >
              {`Hi, ${user.name || user.email || "User"}`}

              {/* -------------------------------------------------------------
                  UNREAD NOTIFICATION BELL

                  pointerdown must be stopped because DropdownMenuTrigger
                  responds before the normal click event.
              -------------------------------------------------------------- */}

              {hasUnread && (
                <Bell
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    onNotification();
                  }}
                  strokeWidth={1}
                  className="
                    absolute top-0 left-0
                    h-5 w-5 -translate-x-3
                    origin-top
                    cursor-pointer
                    text-zinc-800
                    fill-amber-100
                    dark:text-zinc-300
                    dark:fill-amber-200
                  "
                />
              )}
            </p>
          </div>
        </DropdownMenuTrigger>

        {/* -------------------------------------------------------------------
            DROPDOWN
        -------------------------------------------------------------------- */}

        <DropdownMenuContent align="end" className="z-60 mt-1 w-56">
          <DropdownMenuGroup>
            {/* Write */}

            <DropdownMenuItem
              onClick={onWrite}
              className="
                h-11 cursor-pointer
                text-[15px]
              "
            >
              <SquarePen className="mr-2 size-4.5" strokeWidth={1.5} />
              Write
            </DropdownMenuItem>

            {/* Account */}

            <DropdownMenuItem
              onClick={onAccount}
              className="
                h-11 cursor-pointer
                text-[15px]
              "
            >
              <BadgeCheckIcon className="mr-2 size-4.5" strokeWidth={1.5} />
              Account
            </DropdownMenuItem>

            {/* Notifications */}

            <DropdownMenuItem
              onClick={onNotification}
              className="
                h-11 cursor-pointer
                text-[15px]
              "
            >
              <BellIcon className="mr-2 size-4.5" strokeWidth={1.5} />
              Notifications
            </DropdownMenuItem>

            {/* Mobile Theme Toggle */}

            <DropdownMenuItem
              onClick={toggleTheme}
              className="relative cursor-pointer sm:hidden"
            >
              <Sun
                className="
                  mr-2 h-4 w-4
                  rotate-0 scale-100
                  transition-all
                  dark:-rotate-90 dark:scale-0
                "
              />

              <BsMoon
                className="
                  absolute h-4 w-4
                  rotate-90 scale-0
                  transition-all
                  dark:rotate-0 dark:scale-100
                "
              />

              <span>Mode</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Sign Out */}

          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              handleSignOutClick();
            }}
            disabled={isPending}
            className="
              cursor-pointer
              text-[15px]
            "
          >
            <LogOutIcon className="mr-2 size-4.5" strokeWidth={1.5} />

            {isPending ? "Signing out..." : "Sign Out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
