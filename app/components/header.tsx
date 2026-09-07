"use client";

import { useState } from "react";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import { LoginDialog } from "./log-in-dialog";
import { handleSignOut } from "../actions/auth";
import SeaerchInput from "./search-input";
import { TextAlignJustify as MenuButton } from "lucide-react";

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface HeaderProps {
  user?: User | null;
  onTogglePanel: () => void;
}

export function Header({ user, onTogglePanel }: HeaderProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 border-b border-b-gray-100 dark:border-b-zinc-900 flex w-full bg-background items-center justify-end py-2 px-2">
      <button
        onClick={onTogglePanel}
        type="button"
        className="p-1 rounded-md transition"
        aria-label="Toggle Sidebar"
      >
        <MenuButton className="h-6 w-6 ml-2" strokeWidth={1.5} />
      </button>
      <div className="self-center m-auto">
        <SeaerchInput />
      </div>
      <UserMenu
        user={user}
        onSignOut={handleSignOut}
        onLoginClick={() => setIsLoginOpen(true)}
      />
      {/* Hide ModeToggle on small screens */}
      <div className="hidden sm:flex items-center">
        <ModeToggle />
      </div>
      <LoginDialog isOpen={isLoginOpen} setIsOpen={setIsLoginOpen} />
    </header>
  );
}
