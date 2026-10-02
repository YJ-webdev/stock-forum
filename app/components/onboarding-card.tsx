"use client";

import { useState, useTransition } from "react";
import { Check, Globe2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { NATIONALITIES } from "@/lib/data/nationalities";
import { LANGUAGES } from "@/lib/data/languages";

import { updateAccountPreferences } from "@/app/actions/update-account-preferences";

import { useCurrentUser, useSetCurrentUser } from "../context/user-context";

export function OnboardingCard() {
  const user = useCurrentUser();
  const setCurrentUser = useSetCurrentUser();

  const [nationality, setNationality] = useState("");
  const [language, setLanguage] = useState("en");

  const [isPending, startTransition] = useTransition();

  if (!user || user.nationality) {
    return null;
  }

  const handleComplete = () => {
    if (!nationality || isPending) {
      return;
    }

    startTransition(async () => {
      try {
        const updatedUser = await updateAccountPreferences({
          name: user.name ?? "",
          image: user.image ?? null,
          nationality,
          language,
        });

        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                name: updatedUser.name,
                image: updatedUser.image,
                nationality: updatedUser.nationality,
                language: updatedUser.language,
              }
            : prev,
        );

        toast.success("Profile setup complete.");
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to complete profile setup.",
        );
      }
    });
  };

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className="
    flex h-dvh w-screen max-w-none flex-col
    rounded-none border-0 p-0
    text-zinc-800
    dark:text-zinc-300

    sm:h-auto sm:w-full sm:max-w-md
    sm:rounded-xl sm:border
  "
      >
        <div
          className="
            flex flex-1 flex-col
            px-6 py-8
            sm:flex-none sm:px-7 sm:py-7
          "
        >
          {/* Header */}
          <DialogHeader className="gap-2 text-left">
            <div
              className="
                mb-2 flex h-10 w-10
                items-center justify-center
                rounded-full
                bg-zinc-100
                dark:bg-zinc-800
              "
            >
              <Globe2
                strokeWidth={1.7}
                className="
                  h-5 w-5
                  text-zinc-700
                  dark:text-zinc-300
                "
              />
            </div>

            <DialogTitle className="text-xl font-medium">
              Welcome to {process.env.NEXT_PUBLIC_SITE_NAME}
            </DialogTitle>

            <DialogDescription className="text-sm leading-6">
              Set up your profile to get started.
            </DialogDescription>
          </DialogHeader>

          {/* Settings */}
          <div className="mt-8 space-y-6">
            {/* Nationality */}
            <div className="space-y-2">
              <label
                htmlFor="onboarding-nationality"
                className="mb-2 block text-sm font-normal"
              >
                Nationality
                <span className="ml-1 text-rose-500">*</span>
              </label>

              <Select
                value={nationality}
                disabled={isPending}
                onValueChange={(value) => {
                  if (value !== null) {
                    setNationality(value);
                  }
                }}
              >
                <SelectTrigger
                  id="onboarding-nationality"
                  className="h-11 w-full"
                >
                  <SelectValue>
                    {NATIONALITIES.find(
                      (country) => country.value === nationality,
                    )?.label ?? "Select your nationality"}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent className="max-h-[65dvh]">
                  {NATIONALITIES.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <label
                htmlFor="onboarding-language"
                className="mb-2 block text-sm font-normal"
              >
                Language
              </label>

              <Select
                value={language}
                disabled={isPending}
                onValueChange={(value) => {
                  if (value !== null) {
                    setLanguage(value);
                  }
                }}
              >
                <SelectTrigger id="onboarding-language" className="h-11 w-full">
                  <SelectValue>
                    {LANGUAGES.find((item) => item.value === language)?.label ??
                      "Select your language"}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {LANGUAGES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              Your nationality is used for regional market statistics and
              community insights.
            </p>
          </div>

          {/* Push button to bottom on mobile */}
          <div className="flex-1 sm:hidden" />

          {/* Continue */}
          <div className="mt-8">
            <Button
              type="button"
              className="h-11 w-full text-[15px]"
              disabled={!nationality || isPending}
              onClick={handleComplete}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span
                    className="
                      size-3.5 animate-spin rounded-full
                      border-2 border-white/40 border-t-white
                    "
                  />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Continue
                  {nationality && <Check className="h-4 w-4" strokeWidth={2} />}
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
