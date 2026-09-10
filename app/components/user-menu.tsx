"use client";

import { useEffect, useTransition } from "react";
import { useTheme } from "next-themes";
import {
  BadgeCheckIcon,
  BellIcon,
  LogOutIcon,
  User as UserIcon,
  Sun,
  SquarePen,
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
import { useRouter } from "next/navigation";

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface UserMenuProps {
  user?: User | null;
  onSignOut?: () => Promise<void>;
  onLoginClick?: () => void;
  onOpenEditor?: () => void | undefined;
}

export default function UserMenu({
  user,
  onSignOut,
  onLoginClick,
  onOpenEditor = undefined,
}: UserMenuProps) {
  const [isPending, startTransition] = useTransition();
  const { setTheme, theme } = useTheme();

  const router = useRouter();

  useEffect(() => {
    // Listen for saved content or events from the editor window
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SAVE_DOCUMENT") {
        console.log("Received document content:", event.data.payload);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!user) {
    return (
      <Button
        variant="default"
        onClick={onLoginClick}
        className="flex items-center text-auto bg-transparent hover:bg-transparent cursor-pointer"
      >
        <TbUser className="size-6" strokeWidth={1.5} />
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
          className="rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer flex items-center gap-2"
          aria-label="User menu"
        >
          <div className="flex items-center gap-2">
            {/* Small Screens: Icon/Avatar */}
            <div className="sm:hidden flex items-center justify-center">
              <Avatar className="h-12 w-12">
                {user.image && (
                  <AvatarImage
                    src={user.image}
                    alt={user.name || "User avatar"}
                  />
                )}
                <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold">
                  {user.image ? (
                    initials
                  ) : (
                    <UserIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                  )}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Medium & Larger Screens: Text Greeting */}
            <span className="hidden sm:inline px-2 py-2.75 hover:bg-white dark:hover:bg-zinc-900 dark:text-zinc-100 rounded-full transition-all">
              {`Hi, ${user.name || user.email || "User"}`}
            </span>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 mt-1z-60">
          <DropdownMenuGroup>
            {/* Attached window trigger here */}
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault(); // Prevents Radix menu closure from swallowing the click
                onOpenEditor?.();
              }}
              className="cursor-pointer h-11 text-[15px]"
            >
              <SquarePen className="mr-2 size-4.5" strokeWidth={1.5} />
              Write
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer h-11 text-[15px]">
              <BadgeCheckIcon className="mr-2 size-4.5" strokeWidth={1.5} />
              Account
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer h-11 text-[15px]">
              <BellIcon className="mr-2 size-4.5" strokeWidth={1.5} />
              Notifications
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={toggleTheme}
              className="cursor-pointer sm:hidden"
            >
              <Sun className="h-4 w-4 mr-2 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <BsMoon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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
            className="text-muted- cursor-pointer text-[15px]"
          >
            <LogOutIcon className="mr-2 size-4.5" strokeWidth={1.5} />
            {isPending ? "Signing out..." : "Sign Out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
