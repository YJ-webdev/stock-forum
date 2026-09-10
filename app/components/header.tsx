"use client";

import { useState } from "react";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import { LoginDialog } from "./log-in-dialog";
import { handleSignOut } from "../actions/auth";
import SearchInput from "./search-input";
import { TextAlignJustify as MenuButton } from "lucide-react";

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface HeaderProps {
  user?: User | null;
  onTogglePanel: () => void;
  onOpenEditor?: () => void;
}

export function Header({ user, onTogglePanel, onOpenEditor }: HeaderProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-18.5 border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
      {/* Left: Sidebar Toggle */}
      <button
        onClick={onTogglePanel}
        type="button"
        className="p-2.5 m-2 md:m-4 rounded-md transition shrink-0 cursor-pointer"
        aria-label="Toggle Sidebar"
      >
        <MenuButton className="h-5 w-5 text-foreground" strokeWidth={1.5} />
      </button>

      {/* Center: Search Input stretching across available space */}
      <div className="flex-1 max-w-xl mx-auto">
        <SearchInput />
      </div>

      {/* Right: User Menu & Controls */}
      <div className="flex items-center shrink-0 mx-4">
        <UserMenu
          user={user}
          onSignOut={handleSignOut}
          onLoginClick={() => setIsLoginOpen(true)}
          onOpenEditor={onOpenEditor ?? undefined}
        />

        <div className="hidden sm:flex items-center">
          <ModeToggle />
        </div>
      </div>

      <LoginDialog isOpen={isLoginOpen} setIsOpen={setIsLoginOpen} />
    </header>
  );
}
