"use client";

import * as React from "react";
import { Sun } from "lucide-react";
import { BsMoon } from "react-icons/bs";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  // Returns true on the client after mount, false on the server
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const toggleTheme = () => {
    // If currently dark, switch to light; otherwise switch to dark
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="default"
      onClick={toggleTheme}
      className="flex items-center text-auto bg-transparent hover:bg-transparent cursor-pointer"
    >
      {!mounted ? (
        // Placeholder to prevent hydration shift
        <span className="size-6" />
      ) : resolvedTheme === "dark" ? (
        <BsMoon className="size-4.5 transition-all" strokeWidth={0.25} />
      ) : (
        <Sun className="size-5 transition-all" strokeWidth={1.75} />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
