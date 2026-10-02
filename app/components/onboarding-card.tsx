"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Check } from "lucide-react";
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
import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

import { updateAccountPreferences } from "@/app/actions/update-account-preferences";

import { useCurrentUser, useSetCurrentUser } from "../context/user-context";
import { addMarketsToWatchlist } from "../actions/watchlist";

type OnboardingStep = 1 | 2;

// -----------------------------------------------------------------------------
// Market groups
// -----------------------------------------------------------------------------

const MARKET_GROUPS = Object.entries(
  ALL_MARKET_SYMBOLS.reduce<
    Record<string, Record<string, typeof ALL_MARKET_SYMBOLS>>
  >((groups, asset) => {
    const group =
      asset.region.toLowerCase() === "global" ? asset.assetType : asset.region;

    const assetType = asset.assetType;

    if (!groups[group]) {
      groups[group] = {};
    }

    if (!groups[group][assetType]) {
      groups[group][assetType] = [];
    }

    groups[group][assetType].push(asset);

    return groups;
  }, {}),
);

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function OnboardingCard() {
  const user = useCurrentUser();
  const setCurrentUser = useSetCurrentUser();

  const [step, setStep] = useState<OnboardingStep>(1);

  const [nationality, setNationality] = useState("");
  const [language, setLanguage] = useState("en");

  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);

  const [isPending, startTransition] = useTransition();

  if (!user || user.nationality) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Market selection
  // ---------------------------------------------------------------------------

  const toggleMarket = (symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol)
        ? prev.filter((item) => item !== symbol)
        : [...prev, symbol],
    );
  };

  // ---------------------------------------------------------------------------
  // Step navigation
  // ---------------------------------------------------------------------------

  const handleContinue = () => {
    if (!nationality || isPending) {
      return;
    }

    setStep(2);
  };

  const handleBack = () => {
    if (isPending) {
      return;
    }

    setStep(1);
  };

  // ---------------------------------------------------------------------------
  // Complete onboarding
  // ---------------------------------------------------------------------------

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

        if (selectedSymbols.length > 0) {
          await addMarketsToWatchlist(selectedSymbols);
        }

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
            flex min-h-0 flex-1 flex-col
            px-6 py-8
            sm:flex-none sm:px-7 sm:py-7
          "
        >
          {/* ---------------------------------------------------------------- */}
          {/* Progress */}
          {/* ---------------------------------------------------------------- */}

          <div className="mb-8 flex w-full shrink-0 items-center">
            {/* Profile */}
            <div className="flex items-center gap-2">
              <div
                className={`
                  flex size-5 shrink-0 items-center justify-center
                  rounded-full border text-[10px]
                  transition-colors
                  ${
                    step === 1
                      ? `
                        border-zinc-800 bg-zinc-800 text-white
                        dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900
                      `
                      : `
                        border-zinc-300 bg-zinc-100 text-zinc-600
                        dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300
                      `
                  }
                `}
              >
                {step === 2 ? (
                  <Check className="size-3" strokeWidth={2} />
                ) : (
                  "1"
                )}
              </div>

              <span
                className={`
                  whitespace-nowrap text-xs
                  ${
                    step === 1
                      ? "font-medium text-zinc-900 dark:text-zinc-200"
                      : "text-zinc-500 dark:text-zinc-400"
                  }
                `}
              >
                Profile
              </span>
            </div>

            {/* Connector */}
            <div
              className={`
                mx-3 h-px flex-1
                transition-colors duration-300
                ${
                  step === 2
                    ? "bg-zinc-400 dark:bg-zinc-600"
                    : "bg-zinc-200 dark:bg-zinc-700"
                }
              `}
            />

            {/* Markets */}
            <div className="flex items-center gap-2">
              <div
                className={`
                  flex size-5 shrink-0 items-center justify-center
                  rounded-full border text-[10px]
                  transition-colors
                  ${
                    step === 2
                      ? `
                        border-zinc-800 bg-zinc-800 text-white
                        dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900
                      `
                      : `
                        border-zinc-300 text-zinc-400
                        dark:border-zinc-700 dark:text-zinc-500
                      `
                  }
                `}
              >
                2
              </div>

              <span
                className={`
                  whitespace-nowrap text-xs
                  ${
                    step === 2
                      ? "font-medium text-zinc-900 dark:text-zinc-200"
                      : "text-zinc-400 dark:text-zinc-500"
                  }
                `}
              >
                Markets
              </span>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Step 1: Profile */}
          {/* ---------------------------------------------------------------- */}

          {step === 1 && (
            <>
              <DialogHeader className="shrink-0 gap-2 text-left">
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
                    <SelectTrigger
                      id="onboarding-language"
                      className="h-11 w-full"
                    >
                      <SelectValue>
                        {LANGUAGES.find((item) => item.value === language)
                          ?.label ?? "Select your language"}
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
              <div className="mt-8 shrink-0">
                <Button
                  type="button"
                  className="h-11 w-full text-[15px]"
                  disabled={!nationality || isPending}
                  onClick={handleContinue}
                >
                  <span className="flex items-center gap-2">
                    Continue
                    {nationality && (
                      <Check className="h-4 w-4" strokeWidth={2} />
                    )}
                  </span>
                </Button>
              </div>
            </>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Step 2: Markets */}
          {/* ---------------------------------------------------------------- */}

          {step === 2 && (
            <>
              <DialogHeader className="shrink-0 gap-2 text-left">
                <DialogTitle className="text-xl font-medium">
                  Choose your markets
                </DialogTitle>

                <DialogDescription className="text-sm leading-6">
                  Select the markets you'd like to follow.
                  {selectedSymbols.length > 0 && (
                    <span className="ml-1">
                      {selectedSymbols.length} selected.
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {/* ------------------------------------------------------------ */}
              {/* Market list */}
              {/* ------------------------------------------------------------ */}

              <div
                className="
                  mt-7 min-h-0 flex-1
                  overflow-y-auto pr-1
                  sm:max-h-95
                "
              >
                <div className="space-y-8">
                  {MARKET_GROUPS.map(([region, assetTypes]) => (
                    <section key={region}>
                      {/* Region */}
                      <div
                        className="
                          mb-4 text-xs font-medium
                          uppercase tracking-wide
                          text-zinc-500
                          dark:text-zinc-400
                        "
                      >
                        {region}
                      </div>

                      <div className="space-y-5">
                        {Object.entries(assetTypes).map(
                          ([assetType, assets]) => (
                            <div key={assetType}>
                              {/* Assets */}
                              <div className="grid grid-cols-2 gap-2">
                                {assets.map((asset) => {
                                  const selected = selectedSymbols.includes(
                                    asset.symbol,
                                  );

                                  return (
                                    <button
                                      key={asset.symbol}
                                      type="button"
                                      disabled={isPending}
                                      onClick={() => toggleMarket(asset.symbol)}
                                      className={`
                                        flex min-h-10 min-w-0
                                        items-center justify-between
                                        gap-2 rounded-lg border
                                        px-3 py-2
                                        text-left text-sm
                                        transition-colors
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50

                                        ${
                                          selected
                                            ? `
                                              border-zinc-400
                                              bg-zinc-100
                                              text-zinc-900

                                              dark:border-zinc-600
                                              dark:bg-zinc-800
                                              dark:text-zinc-100
                                            `
                                            : `
                                              border-zinc-200
                                              bg-transparent
                                              text-zinc-600

                                              hover:bg-zinc-50

                                              dark:border-zinc-700
                                              dark:text-zinc-300
                                              dark:hover:bg-zinc-800/50
                                            `
                                        }
                                      `}
                                    >
                                      <span className="min-w-0 truncate">
                                        {asset.name}
                                      </span>

                                      {selected && (
                                        <Check
                                          className="size-3.5 shrink-0"
                                          strokeWidth={2}
                                        />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* Actions */}
              {/* ------------------------------------------------------------ */}

              <div className="mt-7 flex shrink-0 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 text-[15px]"
                  disabled={isPending}
                  onClick={handleBack}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" strokeWidth={1.7} />
                  Back
                </Button>

                <Button
                  type="button"
                  className="h-11 flex-1 text-[15px]"
                  disabled={isPending}
                  onClick={handleComplete}
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="
                          size-3.5 animate-spin rounded-full
                          border-2 border-white/40
                          border-t-white
                        "
                      />
                      Saving...
                    </span>
                  ) : (
                    "Finish"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
