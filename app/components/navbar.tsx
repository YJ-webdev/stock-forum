"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ModeToggle } from "./mode-toggle";
import { LoginDialog } from "./log-in-dialog";
import { handleSignOut } from "../actions/auth";
import { hasUnreadNotifications } from "../actions/notification";
import SearchInput from "./search-input";

import { useCurrentUser } from "../context/user-context";

import {
  Bell,
  BellIcon,
  LogOutIcon,
  User as UserIcon,
  Sun,
  SquarePen,
  TextAlignJustify as MenuButton,
  Settings,
  ShieldCogCorner,
  HeartIcon,
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

interface HeaderProps {
  onTogglePanel: () => void;
  onWrite: () => void;
  onAccount: () => void;
  onNotification: () => void;
  onFavotites: () => void;
}

interface UserMenuProps {
  onSignOut?: () => Promise<void>;
  onLoginClick?: () => void;

  onWrite: () => void;
  onAccount: () => void;
  onNotification: () => void;
  onFavotites: () => void;
}

export function Navbar({
  onTogglePanel,
  onWrite,
  onAccount,
  onNotification,
  onFavotites,
}: HeaderProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <nav
      className="
        fixed top-0 right-0 left-0 z-30
        flex h-18.5 items-center justify-between
        border-b border-gray-100
        bg-white
        dark:border-zinc-800 dark:bg-zinc-900
      "
    >
      {isSearchOpen && (
        <button
          type="button"
          aria-label="Close search"
          className="
            absolute inset-0 z-10
            cursor-default
            backdrop-blur-[1px]
          "
          onClick={() => setIsSearchOpen(false)}
        />
      )}

      <button
        type="button"
        onClick={onTogglePanel}
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
        />

        <div className="hidden items-center xl:flex">
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
  onFavotites,
}: UserMenuProps) {
  const user = useCurrentUser();

  const [isPending, startTransition] = useTransition();
  const [hasUnread, setHasUnread] = useState(false);

  const { setTheme, theme } = useTheme();
  const router = useRouter();

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

    // Check immediately.
    void checkUnread();

    // Check every 30 seconds.
    const interval = window.setInterval(() => {
      void checkUnread();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

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

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || "U";

  const handleSignOutClick = () => {
    startTransition(async () => {
      await onSignOut?.();
      router.refresh();
    });
  };

  const toggleTheme = (e: React.MouseEvent) => {
    e.preventDefault();

    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="
            flex cursor-pointer items-center gap-2
            rounded-full
            transition
            
            
          "
          aria-label="User menu"
        >
          <div className="flex items-center gap-2">
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

            <p
              className="
                relative hidden
                rounded-full
                px-2 py-2.75
                text-zinc-900
                transition-all
                sm:inline
                dark:text-zinc-100
              "
            >
              {`Hi, ${user.name || user.email || "User"}`}

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
                    fill-amber-100
                    text-zinc-800
                    hover:animate-[bell-ring_1s_ease-in-out_infinite]
                    dark:fill-amber-200
                    dark:text-zinc-300
                  "
                />
              )}
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
              className="
                h-11 cursor-pointer
                text-[15px]
              "
            >
              <SquarePen className="mr-2 size-4.5" strokeWidth={1.5} />
              Write
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={onFavotites}
              className="
                h-11 cursor-pointer
                text-[15px]
              "
            >
              <HeartIcon className="mr-2 size-4.5" strokeWidth={1.5} />
              Favorite markets
            </DropdownMenuItem>

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

            <DropdownMenuItem
              onClick={onAccount}
              className="
                h-11 cursor-pointer
                text-[15px]
              "
            >
              <Settings className="mr-2 size-4.5" strokeWidth={1.5} />
              Settings
            </DropdownMenuItem>

            {user.role === "ADMIN" && (
              <DropdownMenuItem
                onClick={() => router.push("/admin")}
                className="
                
              h-11 cursor-pointer
              text-[15px]
            "
              >
                <ShieldCogCorner className="mr-2 size-4.5" strokeWidth={1.5} />
                Admin
              </DropdownMenuItem>
            )}

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
