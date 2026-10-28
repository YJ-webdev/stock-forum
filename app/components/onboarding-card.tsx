"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import {
  LANGUAGES,
  resolveLanguage,
  type Language,
} from "@/lib/data/languages";
import { ONBOARDING_LABELS } from "@/lib/data/translations";

import { updateAccountPreferences } from "@/app/actions/update-account-preferences";
import { updateAccountLanguage } from "../actions/update-account-language";
import { addMarketsToWatchlist } from "../actions/watchlist";
import { useCurrentUser, useSetCurrentUser } from "../context/user-context";
import { MarketPicker } from "./market-picker";

type OnboardingStep = 1 | 2;

export function OnboardingCard() {
  const user = useCurrentUser();
  const setCurrentUser = useSetCurrentUser();
  const router = useRouter();

  const [step, setStep] = useState<OnboardingStep>(1);
  const [nationality, setNationality] = useState("");
  const [language, setLanguage] = useState<Language>(
    resolveLanguage(user?.language),
  );
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([
    "^GSPC",
    "^IXIC",
    "^DJI",
  ]);

  const [dismissed, setDismissed] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  const userId = user?.id;
  const storageKey = userId
    ? `bullbearvote:onboarding-dismissed:${userId}`
    : null;

  useEffect(() => {
    if (!storageKey) {
      setStorageReady(false);
      setDismissed(false);
      return;
    }

    try {
      setDismissed(sessionStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }

    setStorageReady(true);
  }, [storageKey]);

  const labels = ONBOARDING_LABELS[language];
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "BullBearVote";

  const countryNames = new Intl.DisplayNames([language], {
    type: "region",
  });

  const selectedCountry = NATIONALITIES.find(
    (country) => country.value === nationality,
  );

  function getCountryName(value: string, fallback: string) {
    if (!/^[A-Z]{2}$/.test(value)) return fallback;

    return countryNames.of(value) ?? fallback;
  }

  function dismissOnboarding() {
    if (storageKey) {
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        // Still close the dialog if browser storage is unavailable.
      }
    }

    setDismissed(true);
  }

  function toggleMarket(symbol: string) {
    if (isPending) return;

    setSelectedSymbols((previous) =>
      previous.includes(symbol)
        ? previous.filter((item) => item !== symbol)
        : previous.length < 20
          ? [...previous, symbol]
          : previous,
    );
  }

  function handleNationalityChange(value: string | null) {
    if (
      !value ||
      isPending ||
      !NATIONALITIES.some((country) => country.value === value)
    ) {
      return;
    }

    setNationality(value);
  }

  function handleLanguageChange(value: string | null) {
    if (
      !user ||
      !value ||
      isPending ||
      !LANGUAGES.some((item) => item.value === value)
    ) {
      return;
    }

    const nextLanguage = resolveLanguage(value);

    if (nextLanguage === language) return;

    const previousLanguage = language;
    const currentUserId = user.id;

    setLanguage(nextLanguage);

    setCurrentUser((previous) =>
      previous?.id === currentUserId
        ? { ...previous, language: nextLanguage }
        : previous,
    );

    startTransition(async () => {
      try {
        await updateAccountLanguage(nextLanguage);
        router.refresh();
      } catch (error) {
        setLanguage(previousLanguage);

        setCurrentUser((previous) =>
          previous?.id === currentUserId
            ? { ...previous, language: previousLanguage }
            : previous,
        );

        console.error("Failed to update language:", error);
        toast.error(ONBOARDING_LABELS[previousLanguage].failed);
      }
    });
  }

  function handleContinue() {
    if (isPending) return;

    setStep(2);
  }

  function handleBack() {
    if (isPending) return;

    setStep(1);
  }

  function handleComplete() {
    if (!user || isPending) return;

    const currentUserId = user.id;
    const selectedNationality = nationality.trim() || "OTHER";

    startTransition(async () => {
      try {
        if (selectedSymbols.length > 0) {
          await addMarketsToWatchlist(selectedSymbols);
        }

        const updatedUser = await updateAccountPreferences({
          name: user.name ?? "",
          image: user.image ?? null,
          nationality: selectedNationality,
          language,
          statusMessage: user.statusMessage ?? null,
        });

        dismissOnboarding();

        setCurrentUser((previous) =>
          previous?.id === currentUserId
            ? {
                ...previous,
                name: updatedUser.name,
                image: updatedUser.image,
                nationality: updatedUser.nationality,
                language: updatedUser.language,
              }
            : previous,
        );

        router.refresh();
        toast.success(labels.success);
      } catch (error) {
        console.error("Failed to complete onboarding:", error);
        toast.error(labels.failed);
      }
    });
  }

  if (!storageReady || dismissed) {
    return null;
  }

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className="
          flex h-dvh w-screen max-w-none flex-col
          rounded-none border-0 p-0
          text-zinc-800 dark:text-zinc-100
          sm:h-auto sm:w-full sm:max-w-md
          sm:rounded-xl sm:border
        "
      >
        <div
          className="
            flex min-h-0 flex-1 flex-col px-6 py-8
            sm:flex-none sm:px-7 sm:py-7
          "
        >
          <div className="mb-8 flex w-full shrink-0 items-center">
            <div className="flex items-center gap-2">
              <div
                className={`
                  flex size-5 shrink-0 items-center justify-center
                  rounded-full border text-[10px] transition-colors
                  ${
                    step === 1
                      ? `
                        border-zinc-800 bg-zinc-800 text-white
                        dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900
                      `
                      : `
                        border-zinc-100 bg-zinc-100 text-zinc-600
                        dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100
                      `
                  }
                `}
              >
                {step === 2 ? (
                  <Check
                    className="size-3"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
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
                {labels.profile}
              </span>
            </div>

            <div
              className={`
                mx-3 h-px flex-1 transition-colors duration-300
                ${
                  step === 2
                    ? "bg-zinc-400 dark:bg-zinc-600"
                    : "bg-zinc-200 dark:bg-zinc-700"
                }
              `}
            />

            <div className="flex items-center gap-2">
              <div
                className={`
                  flex size-5 shrink-0 items-center justify-center
                  rounded-full border text-[10px] transition-colors
                  ${
                    step === 2
                      ? `
                        border-zinc-800 bg-zinc-800 text-white
                        dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900
                      `
                      : `
                        border-zinc-100 text-zinc-400
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
                {labels.markets}
              </span>
            </div>
          </div>

          {step === 1 && (
            <>
              <DialogHeader className="shrink-0 gap-2 text-left">
                <DialogTitle className="text-xl font-medium">
                  {labels.welcome.replace("{site}", siteName)}
                </DialogTitle>

                <DialogDescription className="text-sm leading-6">
                  {labels.description}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-8 space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="onboarding-nationality"
                    className="mb-2 block text-sm font-normal"
                  >
                    {labels.nationality}
                  </label>

                  <Select
                    value={nationality}
                    disabled={isPending}
                    onValueChange={handleNationalityChange}
                  >
                    <SelectTrigger
                      id="onboarding-nationality"
                      className="h-11 w-full"
                    >
                      <SelectValue>
                        {selectedCountry
                          ? getCountryName(
                              selectedCountry.value,
                              selectedCountry.label,
                            )
                          : labels.select_nationality}
                      </SelectValue>
                    </SelectTrigger>

                    <SelectContent className="max-h-[65dvh]">
                      {NATIONALITIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {getCountryName(country.value, country.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="onboarding-language"
                    className="mb-2 block text-sm font-normal"
                  >
                    {labels.language}
                  </label>

                  <Select
                    value={language}
                    disabled={isPending}
                    onValueChange={handleLanguageChange}
                  >
                    <SelectTrigger
                      id="onboarding-language"
                      className="h-11 w-full"
                    >
                      <SelectValue>
                        {LANGUAGES.find((item) => item.value === language)
                          ?.label ?? labels.select_language}
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
                  {labels.nationality_hint}
                </p>
              </div>

              <div className="flex-1 sm:hidden" />

              <div className="mt-8 shrink-0">
                <Button
                  type="button"
                  className="h-11 w-full text-[15px]"
                  disabled={isPending}
                  onClick={handleContinue}
                >
                  <span className="flex items-center gap-2">
                    {nationality ? labels.continue : labels.skip}

                    {nationality && (
                      <Check
                        className="size-4"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <DialogHeader className="shrink-0 gap-2 text-left">
                <DialogTitle className="text-xl font-medium">
                  {labels.choose_markets}
                </DialogTitle>

                <DialogDescription className="text-sm leading-6">
                  {labels.markets_description}
                  {selectedSymbols.length > 0 && (
                    <span className="ml-1">
                      {labels.selected.replace(
                        "{count}",
                        selectedSymbols.length.toLocaleString(language),
                      )}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div
                className="
                  mt-7 min-h-0 flex-1 overflow-y-auto pr-1
                  sm:max-h-95
                "
              >
                <MarketPicker
                  selectedSymbols={selectedSymbols}
                  onToggle={toggleMarket}
                  disabled={isPending}
                  language={language}
                />
              </div>

              <div className="mt-7 flex shrink-0 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 text-[15px]"
                  disabled={isPending}
                  onClick={handleBack}
                >
                  <ArrowLeft
                    className="mr-1 size-4"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                  {labels.back}
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
                        aria-hidden="true"
                        className="
                          size-3.5 animate-spin rounded-full
                          border-2 border-white/40 border-t-white
                        "
                      />
                      {labels.saving}
                    </span>
                  ) : (
                    labels.finish
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
