"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { cn } from "@/lib/utils";

export function ResponsiveToaster() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");

    const update = () => setIsMobile(media.matches);

    update();

    media.addEventListener("change", update);

    return () => {
      media.removeEventListener("change", update);
    };
  }, []);

  return (
    <Toaster
      position={isMobile ? "top-center" : "bottom-center"}
      duration={5000}
      offset={16}
      mobileOffset={16}
      className="left-1/2! right-auto! translate-none! transform-[translateX(-50%)]!"
      toastOptions={{
        classNames: {
          toast: cn(
            "left-1/2! right-auto! -translate-x-1/2!",
            "w-max! max-w-[calc(100vw-32px)]!",
            "border-none! px-5! py-4! text-[15px]!",
            "bg-zinc-900! text-white!",
            "dark:bg-white! dark:text-zinc-950!",
          ),
          title: cn(
            "min-w-0! text-[15px]! font-medium! text-inherit!",
            "whitespace-normal! break-words!",
            "sm:whitespace-nowrap!",
          ),
          description: cn(
            "text-sm! whitespace-normal! break-words!",
            "text-zinc-100! dark:text-zinc-600!",
          ),
        },
      }}
    />
  );
}
