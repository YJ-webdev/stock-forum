"use client";

import { useTransition } from "react";
import { useTheme } from "next-themes";
import {
  BadgeCheckIcon,
  BellIcon,
  CreditCardIcon,
  LogOutIcon,
  User as UserIcon,
  Sun,
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
}

export default function UserMenu({
  user,
  onSignOut,
  onLoginClick,
}: UserMenuProps) {
  const [isPending, startTransition] = useTransition();
  const { setTheme, theme } = useTheme();
  const router = useRouter();

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
    <DropdownMenu>
      <DropdownMenuTrigger>
        <button
          type="button"
          className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition outline-none cursor-pointer flex items-center gap-2"
          aria-label="User menu"
        >
          {/* Small Screens: Icon/Avatar */}
          <div className="sm:hidden flex items-center justify-center">
            <Avatar className="h-8 w-8">
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
          <span className="hidden sm:inline px-2">
            {`Hi, ${user.name || user.email || "User"}`}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 mt-2 z-60">
        <div className="flex items-center justify-start gap-2 p-2">
          <Avatar className="h-8 w-8">
            {user.image && (
              <AvatarImage src={user.image} alt={user.name || "User avatar"} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1 leading-none">
            {user.name && <p className="font-medium text-sm">{user.name}</p>}
            {user.email && (
              <p className="w-40 truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer">
            <BadgeCheckIcon className="mr-2 h-4 w-4" />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <CreditCardIcon className="mr-2 h-4 w-4" />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <BellIcon className="mr-2 h-4 w-4" />
            Notifications
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={toggleTheme}
            className="cursor-pointer sm:hidden"
          >
            <Sun className="h-4 w-4 mr-2 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <BsMoon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="">Mode</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            handleSignOutClick();
          }}
          disabled={isPending}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOutIcon className="mr-2 h-4 w-4" />
          {isPending ? "Signing out..." : "Sign Out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
