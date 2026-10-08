"use client";

import * as React from "react";
import { Sun } from "lucide-react";
import { BsMoon } from "react-icons/bs";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

export function ModeToggle({ text }: { text?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  // Returns true on the client after mount, false on the server
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const toggleTheme = (e: React.MouseEvent) => {
    e.preventDefault();
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="default"
      onClick={toggleTheme}
      className="flex items-center w-full justify-end text-auto bg-transparent hover:bg-transparent cursor-pointer"
    >
      {!mounted ? (
        // Placeholder to prevent hydration shift
        <span className="size-6" />
      ) : resolvedTheme === "dark" ? (
        <BsMoon
          className="size-4.5 transition-all text-zinc-700 dark:text-zinc-200"
          strokeWidth={0.25}
        />
      ) : (
        <Sun
          className="size-5 transition-all text-zinc-700 dark:text-zinc-200"
          strokeWidth={1.75}
        />
      )}

      {text && (
        <span className="mr-auto pl-2.5 text-[15px] font-normal">{text}</span>
      )}
    </Button>
  );
}
