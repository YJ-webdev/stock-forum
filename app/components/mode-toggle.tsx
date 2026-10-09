"use client";

import * as React from "react";
import { Sun } from "lucide-react";
import { BsMoon } from "react-icons/bs";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import { THEME_LABELS } from "@/lib/data/translations";

const emptySubscribe = () => () => {};

export function useModeToggle() {
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);
  const labels = THEME_LABELS[language];

  const { setTheme, resolvedTheme } = useTheme();

  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const isDark = resolvedTheme === "dark";

  const label = !mounted ? labels.toggle : isDark ? labels.light : labels.dark;

  const accessibleLabel = !mounted
    ? labels.toggle
    : isDark
      ? labels.switch_light
      : labels.switch_dark;

  function toggleTheme() {
    if (!mounted) return;

    setTheme(isDark ? "light" : "dark");
  }

  return {
    mounted,
    isDark,
    label,
    accessibleLabel,
    toggleTheme,
  };
}

interface ModeToggleContentProps {
  mounted: boolean;
  isDark: boolean;
  label?: string;
}

export function ModeToggleContent({
  mounted,
  isDark,
  label,
}: ModeToggleContentProps) {
  return (
    <>
      <span
        aria-hidden="true"
        className="flex size-5 shrink-0 items-center justify-center"
      >
        {mounted &&
          (isDark ? (
            <Sun
              className="size-4.75 text-zinc-800 dark:text-zinc-200"
              strokeWidth={1.75}
            />
          ) : (
            <BsMoon
              className="size-3.75 text-zinc-800 dark:text-zinc-200"
              strokeWidth={0.25}
            />
          ))}
      </span>

      {label && (
        <span className="text-[15px] ml-1.25 font-normal">{label}</span>
      )}
    </>
  );
}

export function ModeToggle({ text }: { text?: string }) {
  const { mounted, isDark, label, accessibleLabel, toggleTheme } =
    useModeToggle();

  return (
    <Button
      type="button"
      variant="default"
      aria-label={accessibleLabel}
      onClick={(event) => {
        event.preventDefault();
        toggleTheme();
      }}
      className="-ml-0.5 flex w-full cursor-pointer items-center justify-end gap-3 bg-transparent hover:bg-transparent"
    >
      <ModeToggleContent
        mounted={mounted}
        isDark={isDark}
        label={text ? label : undefined}
      />
    </Button>
  );
}
