"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function UserAccountNav() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="text-sm font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
      >
        Sign In
      </Link>
    );
  }

  const { name, email, image } = session.user;

  return (
    <div className="relative">
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 focus:outline-none"
      >
        {image ? (
          <Image
            src={image}
            alt={name || "User avatar"}
            width={36}
            height={36}
            className="rounded-full border border-border"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold text-sm text-foreground border border-border">
            {name ? name[0].toUpperCase() : "U"}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-background p-2 shadow-lg z-50 text-sm"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="font-semibold text-foreground truncate">
              {name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>

          <Link
            href="/portfolio"
            className="block px-3 py-2 rounded-md hover:bg-muted font-medium text-foreground"
            onClick={() => setIsOpen(false)}
          >
            Portfolio
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left px-3 py-2 rounded-md text-rose-500 hover:bg-rose-500/10 font-semibold"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
