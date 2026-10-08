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
  onOpenSearch: () => void;
  onTogglePanel: () => void;
  onWrite: () => void;
  onAccount: () => void;
  onNotification: () => void;
  onFavotites: () => void;
  user: User | null;
}

interface UserMenuProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut?: () => Promise<void>;
  onLoginClick: () => void;
  onWrite: () => void;
  onAccount: () => void;
  onNotification: () => void;
}

function getInitials(user: User) {
  const initials = user.name
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || user.email?.slice(0, 2).toUpperCase() || "U";
}

export function Navbar({
  onOpenSearch,
  onTogglePanel,
  onWrite,
  onAccount,
  onNotification,
  user,
}: NavbarProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  function closeNavbarOverlays() {
    setIsSearchOpen(false);
    setIsLoginOpen(false);
    setIsUserMenuOpen(false);
  }

  function handleSearchOpenChange(open: boolean) {
    if (open) {
      onOpenSearch();
      setIsLoginOpen(false);
      setIsUserMenuOpen(false);
    }

    setIsSearchOpen(open);
  }

  function handleUserMenuOpenChange(open: boolean) {
    if (open) {
      setIsSearchOpen(false);
      setIsLoginOpen(false);
    }

    setIsUserMenuOpen(open);
  }

  function handleLoginClick() {
    setIsSearchOpen(false);
    setIsUserMenuOpen(false);
    setIsLoginOpen(true);
  }

  function handlePanelAction(action: () => void) {
    closeNavbarOverlays();
    action();
  }

  return (
    <nav
      className="
        fixed inset-x-0 top-0 z-30
        flex h-18 items-center justify-between
        border-b border-gray-100 bg-white
        dark:border-zinc-800 dark:bg-zinc-900
      "
    >
      {isSearchOpen && (
        <button
          type="button"
          aria-label="Close search"
          className="absolute inset-0 z-10 cursor-default backdrop-blur-[1px]"
          onClick={() => handleSearchOpenChange(false)}
        />
      )}

      <button
        type="button"
        onClick={() => handlePanelAction(onTogglePanel)}
        aria-label="Toggle Sidebar"
        className="
          m-2 shrink-0 cursor-pointer
          rounded-md p-2.5 transition md:m-4
        "
      >
        <MenuButton className="size-5 text-foreground" strokeWidth={1.5} />
      </button>

      <div className="relative z-20 mx-auto min-w-0 max-w-xl flex-1">
        <SearchInput
          isOpen={isSearchOpen}
          onOpenChange={handleSearchOpenChange}
        />
      </div>

      <div className="mx-4 flex shrink-0 items-center">
        <UserMenu
          user={user}
          isOpen={isUserMenuOpen}
          onOpenChange={handleUserMenuOpenChange}
          onSignOut={handleSignOut}
          onLoginClick={handleLoginClick}
          onWrite={() => handlePanelAction(onWrite)}
          onAccount={() => handlePanelAction(onAccount)}
          onNotification={() => handlePanelAction(onNotification)}
        />

        {!user && (
          <div className="hidden items-center sm:flex">
            <ModeToggle />
          </div>
        )}
      </div>

      <LoginDialog isOpen={isLoginOpen} setIsOpen={setIsLoginOpen} />
    </nav>
  );
}

export default function UserMenu({
  user,
  isOpen,
  onOpenChange,
  onSignOut,
  onLoginClick,
  onWrite,
  onAccount,
  onNotification,
}: UserMenuProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [unreadCount, setUnreadCount] = useState(0);

  const userId = user?.id;

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

  function handleSignOutClick() {
    startTransition(async () => {
      await onSignOut?.();
      onOpenChange(false);
      router.refresh();
    });
  }

  if (!user) {
    return (
      <Button
        variant="default"
        onClick={onLoginClick}
        aria-label="Log in"
        className="
          -ml-2.75 -mr-2 flex cursor-pointer items-center
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

  const initials = getInitials(user);

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        className="
          relative isolate flex cursor-pointer
          items-center gap-2 rounded-full md:mr-2
        "
        aria-label={
          unreadCount > 0
            ? `User menu, ${unreadCount} unread notifications`
            : "User menu"
        }
      >
        {unreadCount > 0 && (
          <div
            aria-hidden="true"
            className="
              absolute top-1.5 -left-1 z-10
              size-2.5 rounded-full bg-[#2474ed]
              outline-3 outline-white dark:outline-zinc-900
            "
          />
        )}

        <Avatar
          className={`size-12 hover:grayscale-0 ${
            isOpen ? "grayscale-0" : "grayscale"
          }`}
        >
          {user.image && (
            <AvatarImage src={user.image} alt={user.name || "User avatar"} />
          )}

          <AvatarFallback className="bg-zinc-200 text-lg font-semibold dark:bg-zinc-800">
            {user.image ? (
              initials
            ) : (
              <UserIcon className="size-4 text-zinc-600 dark:text-zinc-300" />
            )}
          </AvatarFallback>
        </Avatar>
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
              <span className="ml-auto text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
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

          <DropdownMenuItem className="h-11 cursor-pointer p-0 text-[15px]">
            <ModeToggle text="Mode" />
          </DropdownMenuItem>
        </DropdownMenuGroup>

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
            onClick={() => {
              onOpenChange(false);
              router.push("/admin");
            }}
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
